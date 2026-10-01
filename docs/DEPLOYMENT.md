# Deployment: Firebase App Hosting

Producción corre en **Firebase App Hosting** en el proyecto `studio-8143131557-91b6c`. El backend está conectado a este repositorio de GitHub y **cada push a la rama *live* del backend** (normalmente `main`) dispara un build y un rollout automáticos.

## Qué se despliega y qué no

| Pieza | ¿Cómo llega a producción? |
|---|---|
| Código de la app (Next.js) | Automático con App Hosting al hacer push o merge a la rama *live*. |
| Variables `NEXT_PUBLIC_FIREBASE_*` | Desde [`apphosting.yaml`](../apphosting.yaml), en el mismo build. |
| Recursos del servidor (`runConfig`) | Desde `apphosting.yaml`. Hoy: 1 instancia máx., 0 mín., 1 CPU, 512 MiB. |
| **Reglas de Firestore** (`firestore.rules`) | **A mano.** Ver [FIREBASE_SETUP.md § 5](FIREBASE_SETUP.md#5-reglas-de-seguridad). |
| Esquema de incentivos, vendedores y metas | Son datos. Se editan desde `/admin`, no se despliegan. |

> Si un cambio de código depende de una regla nueva, por ejemplo una colección nueva, publica las reglas **antes** de hacer merge. De lo contrario, producción mostrará `Missing or insufficient permissions` hasta que se publiquen.

## Revisar un deploy

Firebase Console → **Build → App Hosting** → selecciona el backend:

- **Rollouts**: historial de despliegues, estado y logs de build. Desde aquí se puede volver a una versión anterior.
- **Logs** y **Metrics**: logs de ejecución, errores y latencia.
- La URL pública del backend tiene la forma `https://<backend>--<proyecto>.<región>.hosted.app`, salvo que tenga dominio personalizado.

## Crear un backend nuevo (p. ej. un entorno de pruebas)

1. El proyecto de Firebase debe estar en el plan **Blaze**. App Hosting no está disponible en Spark.
2. Configura Authentication y Firestore como indica [FIREBASE_SETUP.md](FIREBASE_SETUP.md).
3. **Build → App Hosting → Create backend**. Conecta GitHub, elige `RolandoRobles12/calculadora-incentivos`, la rama *live* y la raíz del repo (`/`).
4. Si es otro proyecto de Firebase, cambia los valores `NEXT_PUBLIC_FIREBASE_*` de `apphosting.yaml` para ese backend (o defínelos en la consola del backend) y agrega su dominio `*.hosted.app` en **Authentication → Settings → Authorized domains**.
5. Publica `firestore.rules` en ese proyecto.

## Notas del build

- `next.config.ts` usa `output: 'standalone'`. El build **valida tipos**: un error de TypeScript detiene el rollout. Corre `npm run typecheck` antes de hacer merge. ESLint no está configurado (`eslint.ignoreDuringBuilds: true`).
- `maxInstances: 1` alcanza porque casi todo el trabajo ocurre en el navegador contra Firestore. Súbelo en `apphosting.yaml` si ves latencia por concurrencia.

## Troubleshooting

| Síntoma | Qué revisar |
|---|---|
| El rollout falla | Logs del build en *Rollouts*; un error de tipos es la causa más común. Reproduce local con `npm ci && npm run build`. |
| Página en blanco o error al iniciar sesión | Variables `NEXT_PUBLIC_FIREBASE_*` del backend y dominio autorizado en Authentication. |
| `Missing or insufficient permissions` tras un deploy | Las reglas publicadas no coinciden con `firestore.rules` del commit desplegado. |

## Referencias

- [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- [Configurar `apphosting.yaml`](https://firebase.google.com/docs/app-hosting/configure)
