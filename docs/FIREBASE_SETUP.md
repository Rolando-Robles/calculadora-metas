# Configuración de Firebase

Este documento describe cómo configurar Firebase para el sistema de "Originadores de Excelencia".

## 1. Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto llamado "aviva-originadores"
3. Habilita Google Analytics (opcional)

## 2. Configurar Authentication

1. En el menú lateral, ve a **Build > Authentication**
2. Click en "Get started"
3. Habilita el proveedor **Google**
4. Configura el email de soporte del proyecto
5. Click en "Save"

## 3. Configurar Primer Usuario Admin

**IMPORTANTE**: El primer usuario que inicie sesión con Google será creado como "vendedor" por defecto. Para configurar un administrador:

1. Inicia sesión con tu cuenta de Google (se creará automáticamente como vendedor)
2. Ve a Firestore Database en Firebase Console
3. Encuentra el documento del usuario en la colección `users` (su ID es el correo en minúsculas)
4. Edita el documento y cambia el campo `role` de `"vendedor"` a `"admin"`
5. Refresca la aplicación

> El rol solo se puede cambiar desde la consola o por otro admin: las reglas impiden que un usuario modifique su propio `role`, `category` o `product`.

### Crear un admin antes de que inicie sesión

**Colección**: `users` · **Documento ID**: el correo de la cuenta Google en minúsculas (ej. `admin@ejemplo.com`)
```json
{
  "name": "Admin Aviva",
  "email": "admin@ejemplo.com",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

Al iniciar sesión, la app liga ese documento con su cuenta (guarda `uid` y `lastLoginAt`).

## 4. Configurar Firestore Database

1. Ve a **Build > Firestore Database**
2. Click en "Create database"
3. Selecciona **Start in production mode**
4. Elige la ubicación más cercana (us-central1 para México)
5. Click en "Enable"

## 5. Configurar Reglas de Seguridad

Las reglas vigentes están en [`firestore.rules`](../firestore.rules). Publícalas con:

```bash
firebase deploy --only firestore:rules
```

o copia el contenido del archivo en la pestaña **Rules** de Firestore. Resumen de lo que garantizan:

- **`users/{correo}`**: cada persona lee solo su perfil. En su primer inicio de sesión puede crearlo únicamente como `vendedor`, sin categoría ni producto; después solo puede actualizar `name`, `uid` y `lastLoginAt`. Los admins leen y escriben todo.
- **`userGoals`**: cada vendedor lee solo sus metas (`userEmail` = su correo). Solo los admins escriben, y nunca en un periodo cerrado.
- **`periods/{YYYY-MM}`**: cierre de periodo (`locked: true`); solo admins.
- **`imports`**: historial de importaciones con los valores previos para revertir; solo admins.
- **`config`**: esquema de incentivos; lo lee cualquier usuario autenticado y solo lo escriben admins.

## 6. Crear Documentos Iniciales en Firestore

### Colección: `users`

Crea los documentos usando el correo en minúsculas como ID (los vendedores normalmente se cargan desde **Admin → Importar**):

**Documento ID**: `admin@aviva.com`
```json
{
  "name": "Admin Aviva",
  "email": "admin@aviva.com",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Documento ID**: `vendedor@avivacredito.com`
```json
{
  "name": "Vendedor Demo",
  "email": "vendedor@avivacredito.com",
  "role": "vendedor",
  "category": "G4",
  "product": "aviva_contigo",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Colección: `config`

**Documento ID**: `incentives`

Puedes dejarlo vacío por ahora. Los valores por defecto se cargarán automáticamente desde el código.

## 7. Obtener Credenciales del Proyecto

1. Ve a **Project Settings** (ícono de engranaje)
2. En la sección "Your apps", click en el ícono de Web `</>`
3. Registra una app con el nombre "Aviva Web"
4. Copia la configuración de Firebase

## 8. Configurar Variables de Entorno

1. Crea un archivo `.env.local` en la raíz del proyecto
2. Copia el contenido de `.env.local.example`
3. Reemplaza con tus valores:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
```

## 9. Inicializar Configuración por Defecto

Una vez que hayas configurado todo:

1. Inicia sesión con tu cuenta de Google
2. Si necesitas ser admin, edita tu rol en Firestore (ver paso 3)
3. Ve a **Admin → Esquema de incentivos**
4. Los valores por defecto se cargarán automáticamente
5. Haz click en "Guardar esquema" (o "Restaurar valores por defecto") para persistirlos en Firestore

## 10. Probar el Sistema

### Login con Google

1. Abre la aplicación en `http://localhost:3000/login`
2. Click en "Continuar con Google"
3. Selecciona tu cuenta de Google
4. La primera vez se creará automáticamente tu perfil como vendedor

### Cambiar a Admin

1. Ve a Firebase Console → Firestore Database
2. Encuentra tu usuario en la colección `users`
3. Edita el campo `role` de `"vendedor"` a `"admin"`
4. Refresca la aplicación
5. Ahora verás la opción "Admin" en el menú

### Usar el Sistema

1. **Como Admin**: Acceso completo + panel de administración
2. **Como Vendedor**: Acceso a calculadora y proyecciones
3. **Metas** (Admin): tabla por periodo con búsqueda, filtros, acciones masivas y guardado en lote. "Cerrar periodo" deja las metas de un mes en solo lectura.
4. **Importar** (Admin): CSV o Excel con vista previa antes de aplicar; cada carga queda en el historial y se puede revertir.
5. **Esquema de incentivos** (Admin): porcentajes y multiplicadores; se aplican de inmediato a todos.

### Migrar datos de versiones anteriores

Antes, la importación CSV creaba un perfil con un ID distinto al del login, así que un vendedor podía tener 2-3 documentos en `users`. Si el panel muestra el aviso "perfiles duplicados o con formato anterior", pulsa **Consolidar ahora**: deja un solo `users/{correo}` por vendedor y re-asocia sus metas. Se puede ejecutar varias veces sin problema.

## Estructura de Datos en Firestore

### Colección: `users`
```
users/
  {userId}/
    - name: string
    - email: string
    - role: "admin" | "vendedor"
    - category?: "G1" | "G2" | "G3" | "G4"
    - createdAt: timestamp
```

### Colección: `config`
```
config/
  incentives/
    - goalAchievementLevels: array
    - qualityMultipliers: array
    - growthMultipliers: array
    - updatedAt: timestamp
```

### Colección: `userGoals`
```
userGoals/
  {userId}-{period}/
    - userId: string
    - monthlyGoal: number
    - category: "G1" | "G2" | "G3" | "G4"
    - period: string (YYYY-MM)
    - updatedAt: timestamp
```

## Troubleshooting

### Error: "Missing or insufficient permissions"
- Verifica que las reglas de Firestore estén configuradas correctamente
- Asegúrate de que el usuario tenga el rol correcto en Firestore

### Error: "Firebase: Error (auth/popup-closed-by-user)"
- El usuario cerró el popup de Google antes de completar el login
- Intenta de nuevo

### Error: "Firebase: Error (auth/unauthorized-domain)"
- Agrega tu dominio a la lista de dominios autorizados
- Ve a Authentication → Settings → Authorized domains
- Agrega `localhost` para desarrollo

### Configuración no se guarda
- Verifica la conexión a Firestore
- Revisa la consola del navegador para errores
- Asegúrate de estar logueado como admin
