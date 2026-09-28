'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { consolidateLegacyData } from '@/lib/admin-service';

interface LegacyDataBannerProps {
  legacyDocCount: number;
  onDone: () => void;
}

/**
 * Las importaciones anteriores creaban un perfil con un ID distinto al del login,
 * así que un vendedor podía tener 2-3 documentos. Este aviso los consolida en uno.
 */
export function LegacyDataBanner({ legacyDocCount, onDone }: LegacyDataBannerProps) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ step: string; done: number; total: number } | null>(null);

  if (legacyDocCount === 0) return null;

  const run = async () => {
    setConfirming(false);
    setRunning(true);
    try {
      const result = await consolidateLegacyData((step, done, total) => setProgress({ step, done, total }));
      toast({
        title: result.failed > 0 ? 'Consolidación con errores' : 'Datos consolidados',
        description:
          `${result.profilesWritten} perfiles unificados, ${result.legacyProfilesDeleted} duplicados eliminados, ` +
          `${result.goalsFixed} metas corregidas.` +
          (result.unresolvedGoals > 0 ? ` ${result.unresolvedGoals} metas sin correo identificable.` : '') +
          (result.orphanProfiles > 0
            ? ` ${result.orphanProfiles} perfiles sin correo se dejaron sin tocar (revísalos en Firestore).`
            : '') +
          (result.failed > 0 ? ` ${result.failed} operaciones fallaron; puedes volver a intentarlo.` : ''),
        variant: result.failed > 0 ? 'destructive' : undefined,
      });
      onDone();
    } catch (error) {
      console.error('Error consolidando datos:', error);
      toast({ title: 'Error', description: 'No se pudo completar la consolidación', variant: 'destructive' });
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 md:flex-row md:items-center">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium">
            Hay {legacyDocCount.toLocaleString('es-MX')} perfil{legacyDocCount !== 1 ? 'es' : ''} duplicado
            {legacyDocCount !== 1 ? 's' : ''} o con formato anterior
          </p>
          <p className="text-amber-800 dark:text-amber-200">
            Vienen de importaciones anteriores. La tabla ya los muestra unificados, pero la categoría y el
            producto no le llegan al vendedor hasta consolidarlos.
          </p>
          {running && progress && (
            <div className="mt-2 space-y-1">
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} className="h-2" />
              <p className="text-xs">
                {progress.step}: {progress.done.toLocaleString('es-MX')} / {progress.total.toLocaleString('es-MX')}
              </p>
            </div>
          )}
        </div>
        <Button onClick={() => setConfirming(true)} disabled={running} className="shrink-0">
          {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {running ? 'Consolidando…' : 'Consolidar ahora'}
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Consolidar perfiles?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Para cada vendedor se deja un solo perfil identificado por su correo:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Por cada campo se conserva el valor más reciente que no esté vacío.</li>
                  <li>El rol de administrador se conserva si cualquiera de sus perfiles lo tenía.</li>
                  <li>Las metas se re-asocian al correo en minúsculas.</li>
                  <li>Los documentos duplicados se borran al final.</li>
                </ul>
                <p>Se puede ejecutar varias veces sin problema.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Consolidar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
