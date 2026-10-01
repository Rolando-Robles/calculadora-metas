import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Permite abrir el servidor de desarrollo desde Firebase Studio / Cloud Workstations.
  allowedDevOrigins: ['*.cloudworkstations.dev'],
};

export default nextConfig;
