import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // El proyecto no tiene ESLint configurado; los tipos sí se validan en el build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Permite abrir el servidor de desarrollo desde Firebase Studio / Cloud Workstations.
  allowedDevOrigins: ['*.cloudworkstations.dev'],
};

export default nextConfig;
