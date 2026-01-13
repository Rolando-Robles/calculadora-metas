'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      // Show specific error message if available, otherwise generic message
      setError(err.message || 'No se pudo iniciar sesión. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mb-4">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Aviva</CardTitle>
          <p className="text-xl font-semibold text-primary mt-2">Originadores de Excelencia</p>
          <CardDescription className="mt-4">
            Inicia sesión con tu cuenta de Google para acceder a tu calculadora de incentivos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 text-base bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-300 shadow-sm"
            variant="outline"
          >
            {loading ? (
              'Iniciando sesión...'
            ) : (
              <>
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar con Google
              </>
            )}
          </Button>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground text-center">
              <strong className="text-primary">¿Primera vez aquí?</strong>
              <br />
              Inicia sesión con tu cuenta de Google corporativa.
              <br />
              Se creará automáticamente tu perfil de vendedor.
            </p>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-900 dark:text-amber-100 text-center">
              <strong>⚠️ Acceso Restringido</strong>
              <br />
              Solo se permite el acceso a usuarios con correo <strong>@avivacredito.com</strong>
              <br />
              Los administradores pueden usar cualquier correo.
            </p>
          </div>

          <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Para acceso de administrador:</strong>
              <br />
              Contacta al equipo de Sales Ops para obtener permisos de admin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
