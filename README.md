# Calculadora de Incentivos: Originadores de Excelencia

Aplicación web interna de Aviva para el programa de incentivos **Originadores de Excelencia**.

- **Vendedores** (`@avivacredito.com`): ven la meta mensual que les asignó el admin y simulan cuánto bono ganarían.
- **Administradores**: cargan vendedores y metas por mes (en tabla o desde CSV/Excel), cierran periodos y editan el esquema de incentivos.

No hay un backend propio. Es una app Next.js que corre en el navegador y habla directamente con **Firebase Auth** (Google) y **Firestore**. Toda la seguridad está en [`firestore.rules`](firestore.rules).

> **¿Vas a tocar la carga de metas?** Empieza por [docs/CARGA_DE_METAS.md](docs/CARGA_DE_METAS.md).

## Qué hace hoy la aplicación

| Ruta | Quién | Qué hace | Archivo principal |
|---|---|---|---|
| `/login` | Todos | Inicio de sesión con Google. | `src/app/(auth)/login/page.tsx` |
| `/` | — | Redirige a `/originadores`. | `src/app/(app)/page.tsx` |
| `/originadores` | Vendedor y admin | **Calculadora**: carga la meta del mes desde Firestore y simula el bono con la colocación que escribe el vendedor. | `src/app/(app)/originadores/page.tsx` |
| `/proyecciones` | Vendedor y admin | Dado un bono objetivo, propone escenarios de colocación. | `src/app/(app)/proyecciones/page.tsx` |
| `/admin` | Solo admin | Pestañas **Metas**, **Importar** y **Esquema de incentivos**. | `src/app/(app)/admin/page.tsx` |

**Qué no hace (aunque haya restos de código o documentos que lo sugieran):**

- No se integra con HubSpot ni con Google Sheets.
- No conoce la colocación real del vendedor; la escribe él mismo en la calculadora.
- No guarda historial de pagos ni de cálculos. Lo que calcula la calculadora no se persiste (solo queda en `localStorage`).
- No tiene dashboard de KPIs, captura diaria ni recomendaciones con IA.

Ver [Código sin uso](#código-sin-uso-pendiente-de-eliminar).

## Fórmula del bono

```
Bono Final = Colocación × % Bono Base × Multiplicador de Calidad × Multiplicador de Crecimiento/Renovaciones
```

- **Cumplimiento** = Colocación ÷ Meta × 100. Con el cumplimiento se elige el **nivel** (Fuera de juego, En Juego, Cumplido, Dominado, Sobresaliente, Élite). Cada rango es `[mínimo, máximo)`.
- **% Bono Base**: sale de la tabla nivel × categoría. Las categorías son `G1` Formación, `G2` Territorio, `G3` Consolidado y `G4` Élite.
- **Calidad**: A, B, C o D.
- **Crecimiento / Renovaciones**: A, B, C o D. Aviva Contigo, Tu Negocio y Tu Compra usan la tabla de *Renovaciones*. Casa Marchand y Construrama usan la de *Crecimiento*.

Los valores vigentes viven en Firestore (`config/incentives`) y se editan en *Admin → Esquema de incentivos*. Los valores por defecto, y todas las funciones de cálculo, están en [`src/lib/incentives-config.ts`](src/lib/incentives-config.ts).

## Mapa del código

```
src/
├── app/
│   ├── layout.tsx                  # Raíz: AuthProvider + Toaster
│   ├── (auth)/login/page.tsx       # Login con Google
│   └── (app)/                      # Rutas protegidas (ProtectedRoute en layout.tsx)
│       ├── layout.tsx              # Sidebar (escritorio) + BottomNav (móvil)
│       ├── page.tsx                # Redirige a /originadores
│       ├── originadores/page.tsx   # Calculadora del vendedor  ← lee la meta
│       ├── proyecciones/page.tsx   # Escenarios para un bono objetivo  ← lee la meta
│       └── admin/page.tsx          # Panel admin (pestañas)
├── components/
│   ├── admin/                      # ★ Todo el panel de administración
│   │   ├── GoalsManager.tsx        #   Pestaña Metas: carga, edición, guardado, cierre de periodo
│   │   ├── VendorGoalsTable.tsx    #   Tabla virtualizada con edición en línea
│   │   ├── BulkActionsBar.tsx      #   Acciones masivas sobre seleccionados
│   │   ├── ImportWizard.tsx        #   Pestaña Importar: archivo → columnas → vista previa → aplicar
│   │   ├── ImportHistory.tsx       #   Historial y "Revertir"
│   │   ├── IncentiveSchemeEditor.tsx # Pestaña Esquema de incentivos
│   │   ├── PeriodPicker.tsx        #   Selector de mes
│   │   └── LegacyDataBanner.tsx    #   Consolidación de datos de formato anterior
│   ├── auth/ProtectedRoute.tsx     # Redirige a /login; requireAdmin para /admin
│   ├── layout/bottom-nav.tsx       # Navegación móvil
│   └── ui/                         # Componentes shadcn/ui (no tienen lógica de negocio)
├── contexts/AuthContext.tsx        # Login, dominio permitido, creación/ligado del perfil users/{correo}
├── hooks/use-incentive-config.ts   # Lee config/incentives (con valores por defecto)
└── lib/
    ├── firebase.ts                 # Inicializa Firebase (solo en el navegador)
    ├── types.ts                    # Tipos, categorías y productos
    ├── incentives-config.ts        # ★ Valores por defecto y fórmulas del bono
    ├── firestore-service.ts        # Config de incentivos + getUserGoals (lectura del vendedor)
    ├── admin-service.ts            # ★ Escrituras del admin: lotes, importar, revertir, cerrar periodo, consolidar
    ├── import-parser.ts            # ★ Lectura de CSV/XLSX y plan de importación (funciones puras)
    ├── admin-utils.ts              # Correo normalizado, ID de meta, periodos, parseo de montos, CSV
    └── profile-merge.ts            # Fusión de perfiles duplicados de formato anterior
```

## Arranque local

Requisitos: **Node 20** y acceso al proyecto de Firebase.

```bash
npm ci
cp .env.example .env.local   # y llena los valores (Firebase Console → Project settings → Your apps)
npm run dev                   # http://localhost:3000
```

- La configuración web de Firebase **no es secreta**. Los valores de producción ya están en [`apphosting.yaml`](apphosting.yaml) (proyecto `studio-8143131557-91b6c`).
- ⚠️ **No hay emuladores configurados.** Si usas los valores de producción en `.env.local`, tu entorno local lee y escribe en la **base de producción**. Para desarrollar con tranquilidad, crea otro proyecto de Firebase y sigue [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md).
- Para entrar necesitas una cuenta Google `@avivacredito.com`. Para ver `/admin`, tu documento `users/{tu-correo}` debe tener `role: "admin"`.

## Scripts

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack). |
| `npm run build` / `npm start` | Build de producción (`output: 'standalone'`) y servidor. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | **No funciona:** ESLint nunca se configuró en el proyecto. |
| `npm run genkit:dev` / `genkit:watch` | Pertenecen al código de IA sin uso (ver abajo). |

No hay pruebas automatizadas.

## Deploy

Producción corre en **Firebase App Hosting** con despliegue automático desde GitHub, usando [`apphosting.yaml`](apphosting.yaml). Las **reglas de Firestore no se despliegan solas**: se publican a mano. Detalles en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentación

| Documento | Contenido |
|---|---|
| [docs/CARGA_DE_METAS.md](docs/CARGA_DE_METAS.md) | Modelo de datos, flujo tabla e importación, revertir, cierre de periodo, lectura del vendedor, datos de formato anterior y problemas conocidos. |
| [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) | Crear un proyecto de Firebase desde cero, reglas y primer admin. |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Despliegue en Firebase App Hosting. |

## Código sin uso (pendiente de eliminar)

El proyecto nació con la plantilla de Firebase Studio para una idea más amplia ("Aviva Móvil", descrita en `docs/blueprint.md`). Esa idea **nunca se implementó**. Los siguientes archivos son maquetas con datos inventados o funciones sin conectar. **Ningún menú enlaza a ellos y no se deben usar como referencia:**

| Archivo / carpeta | Qué era |
|---|---|
| `src/app/(app)/configuracion/page.tsx` | Primera versión del admin, sustituida por `/admin`. No guarda nada. Es lo único que hace fallar `npm run typecheck`. |
| `src/app/(app)/simular/page.tsx` | Simulador con datos fijos (`MOCK_DATA`). |
| `src/app/(app)/incentivos/page.tsx` | Historial de pagos con datos aleatorios (`src/lib/data.ts`). |
| `src/app/(app)/perfil/page.tsx` | Perfil con usuario ficticio y FAQs que mencionan HubSpot. |
| `src/app/(app)/capturar/page.tsx`, `src/components/capturar/` | Captura diaria. La acción solo hace `console.log`. |
| `src/components/dashboard/` | KPIs, gráficas y recomendaciones de un dashboard que no existe. |
| `src/ai/`, `src/lib/actions.ts` | Recomendaciones con Genkit + Gemini. Nunca se conectó a una pantalla. |
| `src/lib/data.ts`, `src/lib/placeholder-images.*` | Datos simulados para las páginas anteriores. |
| `docs/blueprint.md` | Visión original del producto (HubSpot, Google Sheets, captura offline). No refleja el sistema. |
| `.modified` | Archivo vacío de la plantilla. |

Al borrarlos también se pueden quitar las dependencias que solo usan ellos (`genkit`, `@genkit-ai/*`, `genkit-cli`, `dotenv`), los scripts `genkit:*`, los tipos de `src/lib/types.ts` que solo usan los mocks (`User`, `Kpi`, `KpiData`, `ChartData`, `IncentivePeriod`, `MonthlyCommission`, `TimeRange`) y los componentes de `src/components/ui/` que queden sin importar.

## Licencia

Propiedad de Aviva. Uso interno únicamente.
