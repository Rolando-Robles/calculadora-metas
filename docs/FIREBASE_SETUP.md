# Configuración de Firebase

Este documento describe cómo configurar Firebase para el sistema de "Originadores de Excelencia".

## 1. Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto llamado "aviva-originadores"
3. Habilita Google Analytics (opcional)

## 2. Configurar Authentication

1. En el menú lateral, ve a **Build > Authentication**
2. Click en "Get started"
3. Habilita el proveedor **Email/Password**
4. Click en "Save"

## 3. Crear Usuarios de Prueba

En la pestaña "Users" de Authentication, crea los siguientes usuarios:

### Usuario Admin
- **Email**: admin@aviva.com
- **Password**: admin123
- **UID**: Copia el UID generado

### Usuario Vendedor
- **Email**: vendedor@aviva.com
- **Password**: vendedor123
- **UID**: Copia el UID generado

## 4. Configurar Firestore Database

1. Ve a **Build > Firestore Database**
2. Click en "Create database"
3. Selecciona **Start in production mode**
4. Elige la ubicación más cercana (us-central1 para México)
5. Click en "Enable"

## 5. Configurar Reglas de Seguridad

En la pestaña "Rules", reemplaza las reglas con:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // Config collection - only admins can write
    match /config/{document} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // User goals - admins can write, users can read their own
    match /userGoals/{goalId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
  }
}
```

## 6. Crear Documentos Iniciales en Firestore

### Colección: `users`

Crea dos documentos con los UIDs de los usuarios creados:

**Documento ID**: `[UID del admin]`
```json
{
  "name": "Admin Aviva",
  "email": "admin@aviva.com",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Documento ID**: `[UID del vendedor]`
```json
{
  "name": "Vendedor Demo",
  "email": "vendedor@aviva.com",
  "role": "vendedor",
  "category": "G4",
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

1. Inicia sesión como admin en la aplicación (admin@aviva.com / admin123)
2. Ve al panel de Admin
3. Los valores por defecto se cargarán automáticamente
4. Haz click en "Guardar Cambios" para persistirlos en Firestore

## 10. Probar el Sistema

1. **Login como Admin**: Puedes acceder al panel de administración
2. **Login como Vendedor**: Solo puedes acceder a calculadora y proyecciones
3. **Editar Valores**: Como admin, puedes editar todos los porcentajes y multiplicadores
4. **Guardar**: Los cambios se guardan en Firestore y se aplican inmediatamente

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

### Error: "Firebase: Error (auth/user-not-found)"
- Crea los usuarios en Authentication
- Verifica que los emails sean correctos

### Configuración no se guarda
- Verifica la conexión a Firestore
- Revisa la consola del navegador para errores
- Asegúrate de estar logueado como admin
