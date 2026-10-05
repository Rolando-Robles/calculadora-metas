# Calculadora de Incentivos

Aplicación interna de Aviva Crédito para el programa de incentivos Originadores de Excelencia. La usan dos tipos de usuario:

- Vendedores: consultan la meta mensual que les asignaron y calculan cuánto bono obtendrían según su colocación.
- Administradores: dan de alta a los vendedores, les asignan una meta cada mes y configuran los porcentajes del esquema de incentivos.

## Cómo está construida

Es una aplicación Next.js 15 (App Router) con React 18, TypeScript, Tailwind CSS y componentes de shadcn/ui.

Toda la lógica corre en el navegador. Las páginas leen y escriben directamente en Firestore con el SDK de Firebase, y la sesión se maneja con Firebase Authentication (inicio de sesión con Google). No hay una API propia ni código de servidor.

Como el navegador accede directamente a la base de datos, los permisos se definen en las reglas de Firestore (`firestore.rules`). Ahí se establece qué puede leer o escribir cada rol; ocultar un botón en la interfaz no basta para proteger un dato.

## Pantallas

### Inicio de sesión (`/login`)

Inicio de sesión con Google. Solo pueden entrar correos `@avivacredito.com`, además de las cuentas de otro dominio que ya tengan rol de administrador. La ruta `/` redirige a la calculadora.

### Calculadora (`/originadores`)

Carga la meta del vendedor para el mes en curso. El vendedor escribe su colocación y elige su nivel de calidad y de crecimiento (o de renovaciones, según su producto). La pantalla muestra el porcentaje de cumplimiento, el nivel alcanzado, el desglose del bono y las tablas del esquema vigente.

El resultado no se guarda en la base de datos. Lo que el vendedor captura se recuerda solo en su navegador (`localStorage`).

### Proyecciones (`/proyecciones`)

El vendedor indica cuánto bono quiere ganar y la pantalla calcula la colocación necesaria en tres escenarios:

| Escenario | Calidad | Crecimiento o renovaciones |
|---|---|---|
| Conservador | B | C |
| Balanceado | B | B |
| Optimizado | A | B |

Para cada escenario busca, por bisección sobre la misma fórmula de la calculadora, la colocación que produce el bono pedido, y la redondea a múltiplos de 10,000. Usa la meta y la categoría reales del vendedor.

### Administración (`/admin`)

Solo para administradores. Tiene tres pestañas:

- Metas: tabla con todos los vendedores y su meta del mes seleccionado. Permite editar en línea, aplicar cambios a varios vendedores a la vez, exportar a CSV y cerrar el periodo.
- Importar: carga de vendedores y metas desde un archivo CSV o Excel, con vista previa antes de aplicar e historial para revertir.
- Esquema de incentivos: edición de los niveles de cumplimiento, porcentajes de bono y multiplicadores que usan la calculadora y las proyecciones.

El funcionamiento de Metas e Importar se explica a detalle en [docs/CARGA_DE_METAS.md](docs/CARGA_DE_METAS.md).

## Estructura del repositorio

```
src/
  app/
    layout.tsx                    Layout raíz: fuentes, AuthProvider y Toaster
    globals.css                   Variables de color del tema y estilos base
    (auth)/login/page.tsx         Pantalla de inicio de sesión
    (app)/                        Rutas que requieren sesión
      layout.tsx                  Protege las rutas y arma la navegación (barra lateral y menú inferior)
      page.tsx                    Redirige a /originadores
      originadores/page.tsx       Calculadora
      proyecciones/page.tsx       Proyecciones
      admin/page.tsx              Panel de administración; coordina las tres pestañas
  components/
    admin/
      GoalsManager.tsx            Pestaña Metas: carga datos, filtros, cambios pendientes, guardado y cierre de periodo
      VendorGoalsTable.tsx        Tabla de vendedores con edición en línea (virtualizada para miles de filas)
      BulkActionsBar.tsx          Acciones sobre los vendedores seleccionados
      PeriodPicker.tsx            Selector de mes
      ImportWizard.tsx            Pestaña Importar: archivo, columnas, vista previa y aplicación
      ImportHistory.tsx           Historial de importaciones y opción de revertir
      IncentiveSchemeEditor.tsx   Pestaña Esquema de incentivos
      LegacyDataBanner.tsx        Aviso y botón para consolidar perfiles de versiones anteriores
    auth/ProtectedRoute.tsx       Redirige a /login sin sesión y a / si la ruta exige administrador
    layout/bottom-nav.tsx         Menú inferior en celular
    ui/                           Componentes visuales de shadcn/ui, sin lógica de negocio
  contexts/
    AuthContext.tsx               Sesión de Google, validación de dominio y carga del perfil del usuario
  hooks/
    use-incentive-config.ts       Lee el esquema de incentivos de Firestore, con valores por defecto
    use-toast.ts, use-mobile.tsx  Utilidades de interfaz
  lib/
    firebase.ts                   Inicializa Firebase (solo en el navegador)
    types.ts                      Tipos del dominio y catálogos de categorías y productos
    incentives-config.ts          Valores por defecto del esquema, fórmula del bono y validación de niveles
    firestore-service.ts          Lectura y guardado del esquema; lectura de las metas de un vendedor
    admin-service.ts              Escrituras del administrador: guardado en lotes, importar, revertir, cierre de periodo
    import-parser.ts              Lectura de CSV y Excel, plan de importación y plan de reversión (funciones puras)
    admin-utils.ts                Normalización de correos, ID de metas, periodos, montos y exportación a CSV
    profile-merge.ts              Fusión de perfiles duplicados de versiones anteriores
    utils.ts                      Función cn() para combinar clases de Tailwind
```

Archivos en la raíz:

- `firestore.rules`: reglas de seguridad de Firestore.
- `.env.example`: variables que necesita la app para conectarse a Firebase.
- `apphosting.yaml`: configuración del servidor en Firebase App Hosting, incluidas las variables de Firebase de producción.
- `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`: configuración de Next.js y Tailwind.
- `tsconfig.json`: define el alias `@/`, que apunta a `src/`.
- `components.json`: configuración de shadcn/ui, usada al agregar componentes nuevos a `src/components/ui/`.
- `.idx/`: configuración del espacio de trabajo de Firebase Studio.

## Conceptos del negocio

**Periodo.** Un mes, con formato `YYYY-MM` (por ejemplo `2026-10`). Las metas se asignan por periodo. El mes en curso se calcula con la hora local mediante `currentPeriod()` (`src/lib/admin-utils.ts`), tanto en el panel de administración como en las pantallas del vendedor.

**Vendedor.** Se identifica por su correo en minúsculas. Ese correo es el ID de su documento en la colección `users` y el dato con el que se relacionan sus metas. El `uid` de Firebase solo se guarda como referencia.

**Categoría.** Define el porcentaje de bono base. En la base se guarda el código y en pantalla se muestra el nombre (`src/lib/types.ts`):

| Código | Nombre |
|---|---|
| G1 | Formación |
| G2 | Territorio |
| G3 | Consolidado |
| G4 | Élite |

El código G0 se conserva en los tipos por compatibilidad con datos antiguos, pero no se puede seleccionar.

**Producto.** Define cuál tabla de multiplicadores se usa como tercer factor del bono. Aviva Contigo, Aviva Tu Negocio y Aviva Tu Compra usan la tabla de Renovaciones (tasa de conversión de renovaciones). Casa Marchand y Construrama usan la tabla de Crecimiento. La lista de productos que usan Renovaciones es `RENEWAL_RATE_PRODUCTS` en `types.ts`.

**Meta mensual.** Monto de colocación que el vendedor debe alcanzar en el periodo. La asigna el administrador y se guarda junto con la categoría y el producto que tenía el vendedor en ese periodo.

**Periodo cerrado.** Cuando el administrador cierra un periodo, ya no se pueden crear, editar ni borrar sus metas hasta que alguien lo reabra. Se usa cuando el mes ya se pagó.

## Cálculo del bono

```
Bono final = Colocación × % de bono base × Multiplicador de calidad × Multiplicador de crecimiento o renovaciones
```

La función es `calculateFinalBonus()` en `src/lib/incentives-config.ts`, y la usan tanto la calculadora como las proyecciones. Pasos:

1. Cumplimiento = colocación ÷ meta × 100.
2. Nivel: se recorre la lista de niveles y se toma el primero cuyo rango contiene el cumplimiento. Cada rango incluye el mínimo y excluye el máximo; el último nivel no tiene máximo. Si ningún rango contiene el cumplimiento, se usa el primer nivel de la lista ("Fuera de juego").
3. Porcentaje de bono base: sale de la tabla nivel por categoría.
4. Bono base = colocación × porcentaje de bono base.
5. Bono final = bono base × multiplicador de calidad (A a D) × multiplicador de crecimiento o renovaciones (A a D, según el producto).

Los valores vigentes del esquema se guardan en Firestore, en el documento `config/incentives`, y se editan desde Administración, pestaña Esquema de incentivos. Si ese documento no existe, se usan los valores por defecto definidos en `incentives-config.ts`. Las pantallas los leen con el hook `useIncentiveConfig()` al cargar, así que un cambio en el esquema se ve en cuanto el vendedor recarga la página.

El editor del esquema muestra advertencias, sin impedir el guardado, cuando dos niveles se enciman o cuando queda un rango de cumplimiento sin nivel (`validateLevels()`). Los niveles por defecto incluyen una fila vacía entre Sobresaliente y Élite que el equipo usa como separador visual; no afecta el cálculo.

## Usuarios, roles y sesión

Todo lo relacionado con la sesión está en `src/contexts/AuthContext.tsx`:

1. El usuario entra con Google (`signInWithGoogle`). Si el correo no es `@avivacredito.com` y no tiene un perfil de administrador, se cierra la sesión con un mensaje de acceso denegado.
2. Al detectar la sesión, se busca el perfil en `users/{correo}`. Si el administrador ya lo había dado de alta (por ejemplo, al importar), se le agrega el `uid` y la fecha de último acceso. Si no existe, se crea como vendedor sin categoría ni producto; esos datos los asigna después un administrador.
3. El perfil queda disponible para toda la app con `useAuth()`, que expone `userProfile` e `isAdmin`.

Las rutas dentro de `src/app/(app)/` están envueltas en `ProtectedRoute`, que manda a `/login` a quien no tiene sesión. La página de administración usa `ProtectedRoute requireAdmin`, y el enlace a Admin solo aparece en la navegación para administradores.

El rol vive en el campo `role` del documento `users/{correo}` (`vendedor` o `admin`). Para hacer administrador a alguien se cambia ese campo desde la consola de Firebase, o se crea el documento con `role: "admin"` antes de que la persona inicie sesión. Las reglas de Firestore impiden que un usuario cambie su propio rol, categoría o producto.

## Datos en Firestore

| Colección | Contenido | Quién escribe |
|---|---|---|
| `users/{correo}` | Perfil: nombre, rol, categoría, producto, región, gerente, `uid` y fechas. | Administradores. El propio usuario solo crea su perfil inicial y actualiza sus datos de sesión. |
| `userGoals/{id}` | Meta de un vendedor en un periodo. | Administradores, solo en periodos abiertos. |
| `periods/{YYYY-MM}` | Indica si el periodo está cerrado. | Administradores. |
| `imports/{id}` | Historial de importaciones y datos para revertirlas. | Administradores. |
| `config/incentives` | Esquema de incentivos. | Administradores. |

Cada vendedor puede leer solo su perfil y sus metas. Los campos de cada colección y las reglas de acceso se describen en [docs/CARGA_DE_METAS.md](docs/CARGA_DE_METAS.md). Los cambios a `firestore.rules` en el repositorio no se aplican solos: hay que publicarlos en la consola de Firebase (Firestore, pestaña Reglas).

## Ejecutar en local

Requiere Node 20.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

En `.env.local` va la configuración web del proyecto de Firebase (consola de Firebase, Project settings, Your apps). La app se conecta al proyecto que indiquen esas variables. Como no hay emuladores configurados, si se usan los valores de producción se trabaja sobre los datos reales.

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000`. |
| `npm run build` | Compilación de producción; también revisa los tipos. |
| `npm start` | Sirve la compilación de producción. |
| `npm run typecheck` | Revisión de tipos con TypeScript. |

## Documentación

- [docs/CARGA_DE_METAS.md](docs/CARGA_DE_METAS.md): cómo se asignan, importan, revierten y leen las metas, con el detalle de los datos en Firestore.
