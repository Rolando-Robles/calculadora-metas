# Calculadora de Incentivos - Originadores de Excelencia

Sistema de calculadora de incentivos para el programa "Originadores de Excelencia" de Aviva.

## 🚀 Características

- **Sistema de Autenticación** con roles (Admin/Vendedor)
- **Panel de Administración** para configurar todos los parámetros del sistema
- **Calculadora Interactiva** de incentivos en tiempo real
- **Proyecciones de Ventas** para planificación mensual
- **Backend Firebase** con persistencia de datos
- **Valores Configurables** desde la interfaz de admin

## 📊 Fórmula de Cálculo

```
Bono Final = Colocación × % Bono Base × Multiplicador Calidad × Multiplicador Crecimiento
```

### Componentes:

1. **Colocación**: Monto total colocado en el mes
2. **% Bono Base**: Según nivel de cumplimiento de meta y categoría del usuario
3. **Multiplicador de Calidad**: A (×1.20), B (×1.00), C (×0.60), D (×0.00)
4. **Multiplicador de Crecimiento**: A (×1.15), B (×1.00), C (×0.80), D (×0.60)

## 🛠️ Instalación

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Cuenta de Firebase

### Pasos

1. Clona el repositorio:
```bash
git clone https://github.com/RolandoRobles12/calculadora-incentivos.git
cd calculadora-incentivos
```

2. Instala dependencias:
```bash
npm install
```

3. Configura Firebase:
   - Sigue la guía en [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)
   - Crea el archivo `.env.local` con tus credenciales

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

5. Abre [http://localhost:3000/login](http://localhost:3000/login)

## 👤 Usuarios de Prueba

- **Admin**: admin@aviva.com / admin123
- **Vendedor**: vendedor@aviva.com / vendedor123

## 📱 Páginas Principales

### Para Vendedores:

- `/` - Dashboard con KPIs y recomendaciones
- `/originadores` - Calculadora de incentivos
- `/proyecciones` - Proyecciones de ventas mensuales

### Para Administradores:

- `/admin` - Panel de administración completo
  - Editar niveles de cumplimiento y porcentajes de bono
  - Configurar multiplicadores de calidad y crecimiento
  - Gestionar metas de usuarios
  - Restaurar valores por defecto

## 🔒 Sistema de Roles

### Admin
- Acceso completo a todas las funcionalidades
- Puede editar configuraciones del sistema
- Gestiona metas de usuarios
- Ve todos los datos

### Vendedor
- Acceso a calculadora e incentivos
- Puede crear proyecciones personales
- Ve solo sus propios datos

## 🎨 Personalización

### Colores del Tema

Los colores están configurados en `src/app/globals.css` usando el esquema Aviva:

- **Primary**: Teal (#2B9A8B - HSL: 174 65% 41%)
- **Secondary**: Green (#00A86B - HSL: 147 100% 35%)

### Modificar Valores por Defecto

Los valores por defecto están en `src/lib/incentives-config.ts`. Estos se cargan la primera vez que un admin accede al sistema y se pueden editar desde el panel de administración.

## 📚 Documentación Técnica

### Estructura del Proyecto

```
src/
├── app/
│   ├── (app)/          # Rutas protegidas de la aplicación
│   │   ├── admin/      # Panel de administración
│   │   ├── originadores/  # Calculadora
│   │   └── proyecciones/  # Proyecciones
│   └── (auth)/         # Rutas de autenticación
│       └── login/      # Página de login
├── components/
│   ├── auth/           # Componentes de autenticación
│   ├── layout/         # Layouts y navegación
│   └── ui/             # Componentes UI (shadcn)
├── contexts/
│   └── AuthContext.tsx # Contexto de autenticación
├── lib/
│   ├── firebase.ts     # Configuración de Firebase
│   ├── firestore-service.ts  # Servicios de Firestore
│   ├── incentives-config.ts  # Configuración de incentivos
│   └── types.ts        # Tipos TypeScript
└── hooks/
    └── use-incentive-config.ts  # Hook para cargar config
```

### Stack Tecnológico

- **Framework**: Next.js 15
- **UI**: React 18 + TailwindCSS
- **Componentes**: shadcn/ui + Radix UI
- **Backend**: Firebase (Auth + Firestore)
- **Gráficas**: Recharts
- **TypeScript**: Tipado completo

## 🔧 Scripts

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción
npm start

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 🚀 Deployment

### Firebase App Hosting (Recomendado) ⭐

La forma más sencilla de desplegar esta aplicación Next.js:

1. **Lee la guía completa**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
2. **Conecta tu repositorio** de GitHub en Firebase Console
3. **Configura las variables** de entorno en Firebase
4. **Deploy automático** desde GitHub

**Características:**
- ✅ Deploy automático en cada push
- ✅ Soporte completo para Next.js (SSR, API Routes, etc.)
- ✅ Preview deployments en cada PR
- ✅ Escalado automático
- ✅ Sin configuración manual de build

**📖 Guía paso a paso**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Otras opciones

#### Vercel

1. Conecta tu repositorio a Vercel
2. Agrega las variables de entorno de Firebase
3. Deploy automático

## 📄 Licencia

Propiedad de Aviva - Uso interno únicamente.
