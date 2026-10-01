# Configuración de Firebase

Cómo dejar listo un proyecto de Firebase para esta app, ya sea uno nuevo para desarrollo o pruebas, o para revisar el de producción (`studio-8143131557-91b6c`).

El modelo de datos completo está en [CARGA_DE_METAS.md](CARGA_DE_METAS.md#modelo-de-datos-en-firestore).

## 1. Crear el proyecto

1. Entra a [Firebase Console](https://console.firebase.google.com/) y crea un proyecto.
2. En **Project settings → General → Your apps**, registra una app **Web** (`</>`) y copia su configuración.

## 2. Authentication

1. **Build → Authentication → Get started**.
2. En **Sign-in method**, habilita **Google** y define el correo de soporte.
3. En **Settings → Authorized domains**, confirma que estén `localhost` y el dominio donde se publique la app.

La app solo deja entrar a correos `@avivacredito.com`, salvo cuentas cuyo perfil ya tenga `role: "admin"`. Ver `src/contexts/AuthContext.tsx`.

## 3. Firestore

1. **Build → Firestore Database → Create database**.
2. Elige **production mode** y una región cercana a México (p. ej. `us-central1`).

No se necesitan índices compuestos: todas las consultas filtran u ordenan por un solo campo.

## 4. Variables de entorno

Copia la plantilla y llena los valores del paso 1:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<proyecto>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<proyecto>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<proyecto>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Estos valores son públicos (viajan al navegador). En producción se definen en [`apphosting.yaml`](../apphosting.yaml).

## 5. Reglas de seguridad

Las reglas vigentes están en [`firestore.rules`](../firestore.rules) y **hay que publicarlas a mano** cada vez que cambien. App Hosting no las despliega.

- **Desde la consola:** Firestore → **Rules** → pega el contenido del archivo → **Publish**.
- **Desde la CLI:** el repo no incluye `firebase.json`. Para usar `firebase deploy --only firestore:rules`, crea uno con `{ "firestore": { "rules": "firestore.rules" } }` y selecciona el proyecto con `firebase use <proyecto>`.

Resumen de lo que garantizan:

- **`users/{correo}`**: cada persona lee solo su perfil. En su primer inicio de sesión puede crearlo únicamente como `vendedor`, sin categoría ni producto. Después solo puede actualizar `name`, `uid`, `lastLoginAt` y `updatedAt`. Los admins leen y escriben todo.
- **`userGoals`**: cada vendedor lee solo las metas con su correo. Solo los admins escriben, y nunca en un periodo cerrado.
- **`periods/{YYYY-MM}`**: cierre de periodo. Lo lee cualquier usuario autenticado y solo lo escriben admins.
- **`imports`**: historial de importaciones con los valores previos para revertir. Solo admins.
- **`config`**: esquema de incentivos. Lo lee cualquier usuario autenticado y solo lo escriben admins.

## 6. Primer administrador

Nadie es admin al principio. Hay dos formas de crear el primero:

**A. Crear el perfil antes de que la persona entre.** En Firestore crea el documento `users/{correo en minúsculas}`:

```json
{
  "email": "persona@avivacredito.com",
  "name": "Nombre Apellido",
  "role": "admin",
  "status": "activo",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

Cuando inicie sesión, la app liga el documento a su cuenta (guarda `uid` y `lastLoginAt`). Con este método también puede entrar un admin con correo de otro dominio.

**B. Promover a alguien que ya entró.** La persona inicia sesión una vez, lo que crea `users/{su-correo}` como `vendedor`. Luego, en la consola, cambia su campo `role` a `"admin"` y pídele que recargue la página.

El rol solo se puede cambiar desde la consola o por otro admin. Las reglas impiden que un usuario modifique su propio `role`, `category` o `product`.

## 7. Esquema de incentivos

No hace falta crear `config/incentives` a mano. Mientras no exista, la app usa los valores por defecto de `src/lib/incentives-config.ts`. Para guardarlos en Firestore y poder editarlos, entra a **Admin → Esquema de incentivos** y pulsa **Guardar** (o **Restaurar valores por defecto**).

## 8. Cargar vendedores y metas

Ve a **Admin → Importar**, descarga la plantilla, llénala y súbela. También puedes capturar metas directamente en **Admin → Metas**. El detalle está en [CARGA_DE_METAS.md](CARGA_DE_METAS.md).

## Troubleshooting

| Error | Causa probable |
|---|---|
| `Missing or insufficient permissions` | Las reglas publicadas no son las de `firestore.rules`, el usuario no tiene `role: "admin"` o el periodo está cerrado. |
| `auth/unauthorized-domain` | Falta el dominio en Authentication → Settings → Authorized domains. |
| `auth/popup-closed-by-user` | La persona cerró la ventana de Google. Que lo intente de nuevo. |
| "Acceso denegado. Solo se permite el acceso a usuarios con correo @avivacredito.com" | Cuenta de otro dominio sin perfil admin. Usa la opción A del paso 6. |
| En el admin aparece "perfiles duplicados o con formato anterior" | Hay datos de la versión anterior. Pulsa **Consolidar ahora**. Ver [CARGA_DE_METAS.md](CARGA_DE_METAS.md#datos-de-formato-anterior-código-de-transición). |
