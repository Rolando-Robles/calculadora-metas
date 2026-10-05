# Carga de metas

Este documento explica cómo se asignan las metas mensuales a los vendedores y cómo llegan a la calculadora. Es la parte del sistema con más lógica, así que conviene leerlo antes de modificar `src/lib/admin-service.ts`, `src/lib/import-parser.ts` o los componentes de `src/components/admin/`.

## Resumen del flujo

1. El administrador elige un periodo y asigna metas por una de dos vías: editando la tabla de la pestaña Metas o subiendo un archivo en la pestaña Importar.
2. Las dos vías arman una lista de cambios por vendedor (`VendorChange`) y la escriben con la misma función, `saveVendorChanges()` en `src/lib/admin-service.ts`.
3. Cada meta queda guardada como un documento de la colección `userGoals`, con el correo del vendedor y el periodo.
4. Cuando el vendedor abre la calculadora o las proyecciones, `getUserGoals()` (`src/lib/firestore-service.ts`) trae sus metas y la pantalla usa la del mes en curso.

El correo en minúsculas es la llave que une todo: es el ID del perfil del vendedor y el valor del campo `userEmail` de cada una de sus metas. Todas las funciones lo normalizan con `normalizeEmail()` (`src/lib/admin-utils.ts`).

## Datos

### `users/{correo}`

Perfil del vendedor o administrador.

| Campo | Descripción |
|---|---|
| `email` | Correo en minúsculas; coincide con el ID del documento. |
| `role` | `vendedor` o `admin`. |
| `name` | Nombre. Viene del archivo de importación o de la cuenta de Google. |
| `category` | Categoría actual (`G1` a `G4`). |
| `product` | Producto actual (`aviva_contigo`, `aviva_tu_negocio`, `aviva_tu_compra`, `casa_marchand` o `construrama`). |
| `region`, `manager` | Datos de organización; se usan para filtrar en el panel de administración. |
| `status` | Se guarda como `activo` al crear el perfil. |
| `uid` | ID de Firebase Authentication; se llena la primera vez que la persona inicia sesión. |
| `createdAt`, `updatedAt`, `lastLoginAt` | Fechas en formato ISO. |

La categoría y el producto del perfil son los valores vigentes del vendedor. Se usan como valor por defecto cuando se le asigna una meta nueva.

### `userGoals/{id}`

Meta de un vendedor en un periodo.

| Campo | Descripción |
|---|---|
| `userEmail` | Correo del vendedor en minúsculas. |
| `period` | Periodo en formato `YYYY-MM`. |
| `monthlyGoal` | Meta de colocación en pesos (entero). |
| `category` | Categoría del vendedor en ese periodo. Es obligatoria. |
| `product` | Producto del vendedor en ese periodo. |
| `updatedAt`, `updatedBy` | Fecha y correo del administrador que hizo el último cambio. |

El ID del documento se arma con `goalDocId(correo, periodo)`: el correo cambiando `@` por `_at_` y los puntos por guiones bajos, seguido del periodo. Por ejemplo, la meta de `juan.perez@avivacredito.com` en octubre de 2026 es `juan_perez_at_avivacredito_com-2026-10`. Cambiar este formato duplicaría las metas existentes.

La meta guarda la categoría y el producto que tenía el vendedor en ese periodo. Así, si un vendedor sube de categoría en noviembre, su meta de octubre conserva la categoría de octubre. La calculadora usa la categoría y el producto de la meta antes que los del perfil.

### `periods/{YYYY-MM}`

Estado de cierre del periodo: `locked`, `lockedAt`, `lockedBy`, `reopenedAt`, `reopenedBy`. Si `locked` es `true`, las reglas de Firestore rechazan cualquier escritura de metas de ese periodo, incluidas las que hacen la importación y la reversión.

### `imports/{id}`

Registro de cada importación: `fileName`, `period`, `createdAt`, `createdBy`, `status`, `totalRows`, `counts` (filas nuevas, con cambios, sin cambios y con error), `applied`, `failed` y, si se revirtió, `revertedAt`, `revertedBy` y `revertKept`.

El campo `status` puede ser `running` (en curso), `completed`, `partial` (algunos vendedores fallaron), `failed` o `reverted`.

La subcolección `imports/{id}/chunks` guarda, en bloques de hasta 300, una entrada (`RevertEntry`) por cada vendedor que la importación modificó. Cada entrada tiene el valor anterior (`profileBefore`, `goalBefore`) y el valor que escribió la importación (`profileAfter`, `goalAfter`). Con esa información se revierte.

## Carga desde la tabla (pestaña Metas)

Componentes:

- `src/app/(app)/admin/page.tsx`: contiene las pestañas y comparte el periodo seleccionado entre Metas e Importar. Si hay cambios sin guardar, avisa antes de cerrar la página.
- `src/components/admin/GoalsManager.tsx`: concentra la lógica de la pestaña: carga, filtros, cambios pendientes, guardado, exportación y cierre de periodo.
- `src/components/admin/VendorGoalsTable.tsx`: dibuja la tabla. Solo renderiza las filas visibles, para funcionar con miles de vendedores. Al presionar Enter en una meta, el cursor baja a la siguiente fila.
- `src/components/admin/BulkActionsBar.tsx`: acciones sobre los vendedores seleccionados.
- `src/components/admin/PeriodPicker.tsx`: selector de mes.

### Carga

Al abrir la pestaña, `loadVendors()` lee toda la colección `users`, agrupa los documentos por correo y arma un perfil por vendedor. Después `loadGoalsForPeriod()` trae las metas del periodo seleccionado y las del mes anterior, que se muestran como referencia, y `getPeriodLock()` indica si el periodo está cerrado. Los administradores no aparecen en la tabla.

Las tarjetas de la parte superior (vendedores, con meta, sin meta, sin categoría, sin producto, nunca han entrado) cuentan los vendedores en cada situación y sirven como filtro. También se puede buscar por nombre, correo, región o gerente, y filtrar por producto, categoría, región y gerente.

### Edición

Editar una celda no escribe nada en la base. Cada cambio se guarda en memoria, en el estado `pending` de `GoalsManager`, con la forma `{ [correo]: { goal?, category?, product? } }`. Si un valor vuelve a quedar igual al guardado, se elimina de los pendientes. Una meta necesita categoría; si el vendedor no tiene, la fila se marca y ese cambio no se guarda.

Acciones disponibles sobre los seleccionados: fijar una meta, ajustar la meta en un porcentaje (tomando como base la meta actual o la del mes anterior), asignar categoría, asignar producto y quitar la meta. Además, el botón "Completar sin meta" copia la meta del mes anterior a los vendedores que todavía no tienen una.

### Guardado

El botón "Guardar cambios" ejecuta `handleSave()`, que convierte los pendientes en una lista de `VendorChange` y llama a `saveVendorChanges(cambios, periodo, administrador)`:

1. `opsForChange()` arma las operaciones de cada vendedor: actualizar su perfil si cambió la categoría o el producto, y crear, actualizar o borrar su meta del periodo.
2. `commitGroups()` escribe las operaciones en lotes de hasta 450 (Firestore permite 500 por lote). Las operaciones de un mismo vendedor nunca se reparten entre dos lotes, así que cada vendedor queda guardado completo o sin cambios.
3. Si un lote falla, sus vendedores siguen como pendientes y un mensaje muestra el error. Lo más común es que el periodo esté cerrado o que la sesión no tenga rol de administrador.

Cambiar la categoría o el producto en la tabla actualiza el perfil del vendedor, y con eso el valor por defecto para periodos futuros. Si el vendedor ya tenía meta en el periodo abierto, también se actualiza la categoría o el producto guardados en esa meta. Las metas de otros periodos no cambian.

### Exportación

"Exportar" descarga un CSV con las filas visibles y las mismas columnas que acepta la importación. Así se puede exportar, editar en Excel y volver a importar el mismo archivo.

## Carga desde archivo (pestaña Importar)

La interfaz está en `src/components/admin/ImportWizard.tsx`, y el historial con la opción de revertir en `src/components/admin/ImportHistory.tsx`. La lógica de lectura y validación está en `src/lib/import-parser.ts`. Son funciones puras, sin acceso a Firebase, que se pueden probar por separado.

### Formato del archivo

Se aceptan archivos `.csv`, `.txt` y `.xlsx`. De un Excel solo se lee la primera hoja. En un CSV se detecta solo el separador (coma, punto y coma o tabulador).

| Columna | Obligatoria | Valores aceptados |
|---|---|---|
| Correo | Sí | Correo `@avivacredito.com`, sin repetirse en el archivo. |
| Meta mensual | No | `200000`, `200,000` o `$200,000`. Debe ser mayor a 0; se redondea a pesos. |
| Categoría | No | `formacion`, `territorio`, `consolidado`, `elite` o `G1` a `G4`, sin importar mayúsculas ni acentos. |
| Producto | No | El código (`aviva_contigo`) o el nombre (`Aviva Contigo`). |
| Nombre | No | Texto libre. |
| Región | No | Texto libre. |
| Gerente | No | Texto libre o correo. |

Los encabezados se reconocen por nombre (por ejemplo, "Correo", "Email" o "E-mail" son la misma columna; los alias están en `IMPORT_FIELDS`). El administrador puede corregir la asignación de columnas antes de continuar. La pantalla ofrece una plantilla de ejemplo para descargar.

### Pasos

1. Lectura: `readSpreadsheet()` convierte el archivo en una matriz de texto.
2. Columnas: `autoMapColumns()` propone qué columna corresponde a cada dato y el administrador lo confirma.
3. Vista previa: `buildImportPlan()` compara cada fila con lo que ya hay en Firestore y la clasifica como nueva, con cambios, sin cambios o con error. Para cada fila muestra el valor anterior y el nuevo de cada dato que cambia.
4. Aplicación: `executeImport()` crea el registro en `imports` con estado `running`, guarda primero las entradas para revertir en `chunks`, aplica los cambios con `saveVendorChanges()` y al final deja el estado en `completed`, `partial` o `failed`.

### Reglas de la importación

- Una celda vacía no modifica el dato existente. Para cambiar solo las metas basta un archivo con Correo y Meta mensual.
- La importación nunca borra metas. Los vendedores que no vienen en el archivo conservan la suya; la vista previa indica cuántos son.
- Una meta necesita categoría: la del archivo o, si no viene, la que el vendedor ya tiene en su perfil.
- Si un vendedor no existe, se crea su perfil con rol de vendedor.
- El rol de un administrador incluido en el archivo nunca se modifica.
- La vista previa advierte cuando una meta cambia 50 % o más respecto a la actual.
- Las filas con error no se importan y se pueden descargar en un CSV para corregirlas; el resto sí se aplica.
- Importar dos veces el mismo archivo no duplica nada: la segunda vez las filas ya aplicadas aparecen sin cambios.

## Revertir una importación

En el historial de la pestaña Importar, el botón "Revertir" ejecuta `revertImport()` (`src/lib/admin-service.ts`). Esta función lee las entradas guardadas en `chunks`, el perfil actual de cada vendedor y sus metas actuales del periodo, y para cada vendedor decide qué hacer con `planRevertEntry()` (`src/lib/import-parser.ts`):

- Si el dato sigue con el valor que dejó la importación, vuelve a su valor anterior.
- Si el dato ya tiene su valor anterior, no se toca.
- Si el dato tiene otro valor, porque alguien lo cambió después a mano o con otra importación, se conserva. Al terminar, un mensaje indica cuántos vendedores conservaron cambios posteriores.

Los perfiles que la importación creó se borran solo si la persona nunca ha iniciado sesión y nadie los modificó después.

Las importaciones guardadas antes de que existiera el campo `profileAfter` no tienen el valor que escribieron. Al revertirlas se restaura todo a su valor anterior, aunque se pierdan cambios posteriores, y el diálogo de confirmación lo indica. Esas importaciones se reconocen porque su registro no tiene `tracksAfter: true`.

Si alguien cierra la pestaña a mitad de una importación, el registro se queda en estado `running`. Pasados 15 minutos (`IMPORT_STALE_MS`), el historial la muestra como "Interrumpida" y permite revertirla. Es seguro porque los valores anteriores se guardan antes de aplicar cualquier cambio. También se puede terminar volviendo a importar el mismo archivo.

## Cierre de periodo

El botón "Cerrar periodo" de la pestaña Metas llama a `setPeriodLock()`, que marca `periods/{YYYY-MM}` como cerrado. Desde ese momento la tabla queda en solo lectura, la importación no acepta archivos para ese periodo y las reglas de Firestore rechazan cualquier escritura de sus metas. "Reabrir periodo" revierte el cierre. Para cerrar o reabrir, no debe haber cambios pendientes.

## Cómo lee la meta el vendedor

En la calculadora (`src/app/(app)/originadores/page.tsx`):

1. `getUserGoals(correo)` trae todas las metas del vendedor.
2. Se toma la del periodo `currentPeriod()`, es decir, el mes en curso en hora local.
3. Si existe, se usan su `monthlyGoal`, su `category` y su `product`; si la meta no tiene producto, se usa el del perfil. El producto decide si el tercer multiplicador es de Crecimiento o de Renovaciones.
4. Si no existe, la pantalla muestra el aviso "No tienes una meta asignada", deja la meta en cero y usa la categoría y el producto del perfil.

Proyecciones (`src/app/(app)/proyecciones/page.tsx`) lee la meta de la misma forma. Si el vendedor no tiene meta en el mes, no genera escenarios.

## Reglas de seguridad relacionadas

En `firestore.rules`:

- `userGoals`: un vendedor solo puede leer las metas cuyo `userEmail` es su propio correo verificado. Solo los administradores escriben, y solo en periodos abiertos.
- `users`: cada persona lee únicamente su perfil. En su primer inicio de sesión solo puede crearse como vendedor, sin categoría ni producto, y después solo puede actualizar `name`, `uid`, `lastLoginAt` y `updatedAt`. Los administradores leen y escriben todo.
- `periods` y `config`: los lee cualquier usuario con sesión y solo los escriben administradores.
- `imports`: solo administradores.

Cada escritura de una meta hace que las reglas lean el perfil del administrador y el documento del periodo. Firestore limita cuántos documentos distintos pueden leer las reglas en un mismo lote, por eso las escrituras se agrupan por periodo: la tabla y la importación siempre escriben un solo periodo, y la consolidación de datos anteriores procesa un periodo a la vez.

## Perfiles de versiones anteriores

Versiones anteriores de la importación guardaban el perfil con un ID derivado del correo (por ejemplo `juan_perez`), el inicio de sesión creaba otro con el `uid`, y algunas metas usaban el campo `userId` en lugar de `userEmail`. Un mismo vendedor podía tener dos o tres perfiles.

El código actual reconoce esos datos y los puede unificar:

- `src/lib/profile-merge.ts` agrupa los documentos de una misma persona por correo y los combina (`groupUserDocs`, `mergeProfiles`).
- `loadVendors()` arma una tabla de equivalencias de IDs antiguos a correo, y `goalFromDoc()` la usa para asignar las metas que tienen `userId` a su vendedor.
- `AuthContext` busca el perfil del usuario por correo, por `uid` y por el ID antiguo.
- Cuando existen perfiles en formato anterior, la pestaña Metas muestra un aviso (`LegacyDataBanner`) con el botón "Consolidar ahora". Ese botón ejecuta `consolidateLegacyData()`, que deja un solo `users/{correo}` por persona, mueve las metas a su ID correcto y borra los documentos antiguos. Se puede ejecutar varias veces sin problema.
- `firestore.rules` reconoce como administrador tanto a quien tiene `role: "admin"` en `users/{correo}` como en `users/{uid}`.

Cuando el aviso ya no aparezca en producción, este código de compatibilidad se puede retirar.

## Cómo extender

### Agregar una columna a la importación

1. Agregar el campo a `VendorProfile` (`src/lib/types.ts`) y a `ProfileFields` (`src/lib/admin-service.ts`).
2. Agregarlo a `IMPORT_FIELDS` y a `PROFILE_FIELD_LABELS` en `src/lib/import-parser.ts`, y al objeto `incoming` dentro de `buildImportPlan()`.
3. Agregarlo a la plantilla (`downloadTemplate` en `ImportWizard.tsx`) y a la exportación (`handleExport` en `GoalsManager.tsx`), para que el archivo exportado se pueda volver a importar.
4. Si el vendedor necesita verlo, agregarlo a los campos que combina `mergeProfiles()` (`MERGED_FIELDS` en `profile-merge.ts`) y a `UserProfile` en `AuthContext.tsx`.

### Agregar un producto

Agregarlo a `ProductType` y a `PRODUCTS` en `src/lib/types.ts`. Si su tercer multiplicador es de Renovaciones, agregarlo también a `RENEWAL_RATE_PRODUCTS`. La importación lo reconoce automáticamente por su código y por su nombre.

### Agregar una categoría

Agregarla a `UserCategory`, `CATEGORY_LABELS` y `CATEGORIES` en `src/lib/types.ts`, y a `bonusPercentages` en el tipo `GoalAchievementConfig` y en los niveles por defecto de `src/lib/incentives-config.ts`. El editor del esquema y las tablas de la calculadora generan sus columnas a partir de `CATEGORIES`. Si el esquema ya está guardado en Firestore, hay que capturar los porcentajes de la nueva categoría desde el editor.

## Diagnóstico: un vendedor no ve su meta

1. En la consola de Firebase, buscar en `userGoals` un documento con `userEmail` igual al correo del vendedor en minúsculas y `period` igual al mes en curso.
2. Confirmar que el vendedor inicia sesión con esa misma cuenta de Google. La comparación se hace contra el correo de la sesión, que debe estar verificado.
3. Si la meta existe y aparece el error "Missing or insufficient permissions", revisar que las reglas publicadas en Firestore coincidan con `firestore.rules`.
4. Si el problema es al guardar desde el panel, revisar que el periodo no esté cerrado y que el administrador tenga `role: "admin"` en `users/{correo}`.
