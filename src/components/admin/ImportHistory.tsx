'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatPeriod } from '@/lib/admin-utils';
import { isInterruptedImport, listImports, revertImport, type ImportLog } from '@/lib/admin-service';

const STATUS_LABEL: Record<ImportLog['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  running: { label: 'En curso', variant: 'outline' },
  completed: { label: 'Completa', variant: 'default' },
  partial: { label: 'Parcial', variant: 'destructive' },
  failed: { label: 'Fallida', variant: 'destructive' },
  reverted: { label: 'Revertida', variant: 'secondary' },
};

// Se cerró la pestaña a mitad de la carga: los valores previos ya estaban guardados, así que se puede revertir.
const INTERRUPTED_LABEL = { label: 'Interrumpida', variant: 'destructive' as const };

interface ImportHistoryProps {
  actor: string;
  reloadKey: number;
  onReverted: (period: string) => void;
}

export function ImportHistory({ actor, reloadKey, onReverted }: ImportHistoryProps) {
  const { toast } = useToast();
  const [imports, setImports] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ImportLog | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setImports(await listImports());
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const handleRevert = async (log: ImportLog) => {
    setConfirm(null);
    setReverting(log.id);
    try {
      const { ok, failed, kept } = await revertImport(log, actor);
      const keptNote =
        kept > 0
          ? ` ${kept} conservaron cambios hechos después de la importación (no se sobrescribieron).`
          : '';
      toast({
        title: failed > 0 ? 'Reversión incompleta' : 'Importación revertida',
        description:
          (failed > 0
            ? `${ok} procesados, ${failed} con error (¿el periodo está cerrado?).`
            : `${ok} vendedores procesados.`) + keptNote,
        variant: failed > 0 ? 'destructive' : undefined,
      });
      onReverted(log.period);
      await load();
    } catch (error) {
      console.error('Error revirtiendo importación:', error);
      toast({ title: 'Error', description: 'No se pudo revertir la importación', variant: 'destructive' });
    } finally {
      setReverting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" /> Historial de importaciones
        </CardTitle>
        <CardDescription>Las últimas 20. Revertir regresa perfiles y metas a como estaban antes de esa carga.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : imports.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Aún no hay importaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Archivo</th>
                  <th className="py-2 pr-3 font-medium">Periodo</th>
                  <th className="py-2 pr-3 font-medium">Por</th>
                  <th className="py-2 pr-3 font-medium">Resultado</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {imports.map(log => {
                  const interrupted = isInterruptedImport(log);
                  const status = interrupted ? INTERRUPTED_LABEL : STATUS_LABEL[log.status] || STATUS_LABEL.completed;
                  return (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="max-w-[200px] truncate py-2 pr-3" title={log.fileName}>
                        {log.fileName}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatPeriod(log.period)}</td>
                      <td className="max-w-[180px] truncate py-2 pr-3 text-muted-foreground" title={log.createdBy}>
                        {log.createdBy}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                        {log.counts.new} nuevos · {log.counts.update} cambios · {log.counts.error} errores
                        {log.failed ? ` · ${log.failed} fallidos` : ''}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="py-2 text-right">
                        {log.status !== 'reverted' && (log.status !== 'running' || interrupted) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            disabled={reverting !== null}
                            onClick={() => setConfirm(log)}
                          >
                            {reverting === log.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Revertir
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirm !== null} onOpenChange={open => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revertir esta importación?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">{confirm?.fileName}</strong> ({confirm && formatPeriod(confirm.period)}).
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Las metas y los perfiles que modificó regresan a su valor anterior.</li>
                  <li>Los vendedores que creó se eliminan si nunca han iniciado sesión.</li>
                  {confirm?.tracksAfter ? (
                    <li>
                      Lo que se cambió después de esta importación (a mano o con otra carga) se conserva y no se
                      sobrescribe.
                    </li>
                  ) : (
                    <li>
                      Esta importación es de una versión anterior: si después se editó alguno de esos vendedores, esa
                      edición también se sobrescribe.
                    </li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && handleRevert(confirm)}>Revertir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
