# 🚀 Guía de Deployment - Firebase App Hosting

Esta guía te ayudará a desplegar tu aplicación Next.js en Firebase App Hosting.

## ¿Por qué Firebase App Hosting?

Firebase App Hosting es la forma moderna de desplegar aplicaciones Next.js en Firebase. A diferencia de Firebase Hosting tradicional:

✅ **Soporta todas las características de Next.js**: SSR, API Routes, ISR, etc.
✅ **Deploy automático desde GitHub**: Cada push dispara un nuevo deployment
✅ **Sin configuración manual**: No necesitas compilar ni subir archivos
✅ **Escalado automático**: Se ajusta según el tráfico
✅ **Preview deployments**: Cada PR crea una preview URL automáticamente

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener:

1. ✅ Un proyecto de Firebase creado (si no tienes uno, créalo en [Firebase Console](https://console.firebase.google.com/))
2. ✅ Tu código en un repositorio de GitHub
3. ✅ Permisos de administrador en tu proyecto Firebase
4. ✅ Permisos de administrador en tu repositorio GitHub

## 🔧 Pasos para Desplegar

### Paso 1: Preparar las Variables de Entorno

Necesitarás los valores de configuración de Firebase. Para obtenerlos:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Project Settings** (⚙️ ícono de engranaje)
4. En la sección **General**, baja hasta **Your apps**
5. Si no tienes una app web, haz clic en **Add app** > **Web** (ícono `</>`)
6. Copia los valores de configuración

Guarda estos valores, los necesitarás en el Paso 3.

### Paso 2: Conectar tu Repositorio de GitHub a Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. En el menú lateral, busca **Build** y haz clic en **App Hosting**
4. Haz clic en **Get Started** (o **Create backend** si ya tienes otros backends)
5. Conecta tu cuenta de GitHub si aún no está conectada
6. Selecciona el repositorio: **RolandoRobles12/calculadora-incentivos**
7. Selecciona la rama principal (generalmente `main` o `master`)
8. Firebase detectará automáticamente que es una aplicación Next.js
9. Haz clic en **Next**

### Paso 3: Configurar Variables de Entorno

En la siguiente pantalla, configura las variables de entorno:

```
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key-aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
```

**⚠️ IMPORTANTE**: Usa los valores reales que obtuviste en el Paso 1, no los valores de ejemplo.

### Paso 4: Revisar Configuración y Desplegar

1. Revisa la configuración:
   - **Framework**: Next.js (detectado automáticamente)
   - **Build command**: `npm run build` (por defecto)
   - **Output directory**: `.next` (por defecto)
   - **Install command**: `npm install` (por defecto)

2. Haz clic en **Deploy**

3. Firebase comenzará a construir y desplegar tu aplicación. Este proceso puede tomar 5-10 minutos.

### Paso 5: Verificar el Deployment

1. Una vez completado, verás un mensaje de éxito
2. Firebase te mostrará la URL de tu aplicación (algo como `https://tu-proyecto-id.web.app`)
3. Haz clic en la URL para abrir tu aplicación
4. Deberías ver tu aplicación funcionando, **no la página de bienvenida de Firebase**

## 🔄 Deployments Automáticos

Después de la configuración inicial:

- **Cada push a tu rama principal** disparará un nuevo deployment automáticamente
- **Cada Pull Request** creará una preview URL para que puedas revisar los cambios antes de mergear
- Los deployments anteriores se mantienen, puedes hacer rollback si es necesario

## 🛠️ Actualizar Variables de Entorno

Si necesitas actualizar las variables de entorno después del deployment:

1. Ve a Firebase Console > App Hosting
2. Selecciona tu backend
3. Ve a la pestaña **Environment variables**
4. Edita las variables según necesites
5. Haz clic en **Rollout** para aplicar los cambios

## 📊 Monitoreo y Logs

Para ver logs y métricas:

1. Ve a Firebase Console > App Hosting
2. Selecciona tu backend
3. **Metrics**: Muestra tráfico, errores, latencia
4. **Logs**: Muestra logs de tu aplicación en tiempo real

## 🐛 Troubleshooting

### La aplicación no se despliega

- Verifica que el repositorio de GitHub esté conectado correctamente
- Revisa los logs de build en Firebase Console > App Hosting > tu backend > Build logs
- Asegúrate de que `package.json` tenga el script `build`

### Error 500 o página en blanco

- Verifica que todas las variables de entorno estén configuradas correctamente
- Revisa los logs de runtime en Firebase Console
- Asegúrate de que las credenciales de Firebase sean correctas

### La aplicación muestra la página de bienvenida de Firebase

- Esto significa que estás accediendo a una URL de Firebase Hosting tradicional, no App Hosting
- Asegúrate de usar la URL correcta que te proporcionó App Hosting (termina en `.web.app` o dominio personalizado)
- Si acabas de desplegar, espera 5-10 minutos para que se propague

## 🔐 Configuración de Autenticación

Si usas Firebase Authentication:

1. Ve a Firebase Console > Authentication
2. Haz clic en **Sign-in method**
3. Habilita los métodos que necesites (Email/Password, Google, etc.)
4. En **Authorized domains**, agrega tu dominio de App Hosting si no está

## 📚 Recursos Adicionales

- [Documentación oficial de Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- [Next.js en Firebase](https://firebase.google.com/docs/app-hosting/frameworks/nextjs)
- [Configuración de apphosting.yaml](https://firebase.google.com/docs/app-hosting/configure)

## 💡 Tips

- Los cambios en `apphosting.yaml` se aplican automáticamente en el próximo deployment
- Puedes configurar múltiples backends (staging, production) en el mismo proyecto
- El plan Spark (gratuito) incluye App Hosting con límites generosos
- Para producción, considera el plan Blaze con facturación por uso

---

¿Problemas? Revisa los logs en Firebase Console o abre un issue en el repositorio.
