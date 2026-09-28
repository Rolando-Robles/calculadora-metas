'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { currentPeriod } from '@/lib/admin-utils';
import { GoalsManager } from '@/components/admin/GoalsManager';
import { ImportWizard } from '@/components/admin/ImportWizard';
import { ImportHistory } from '@/components/admin/ImportHistory';
import { IncentiveSchemeEditor } from '@/components/admin/IncentiveSchemeEditor';

type AdminTab = 'goals' | 'import' | 'scheme';

function AdminContent() {
  const { userProfile } = useAuth();
  const actor = userProfile?.email || 'admin';

  const [tab, setTab] = useState<AdminTab>('goals');
  const [period, setPeriod] = useState(currentPeriod);
  // Se incrementa cuando una importación o reversión cambia datos, para recargar Metas.
  const [dataVersion, setDataVersion] = useState(0);
  const [goalsDirty, setGoalsDirty] = useState(false);
  const [schemeDirty, setSchemeDirty] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  const dirty = goalsDirty || schemeDirty || importBusy;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Las metas pendientes pertenecen al periodo abierto: no se cambia de periodo por fuera si hay cambios sin guardar.
  const goalsDirtyRef = useRef(false);
  goalsDirtyRef.current = goalsDirty;
  const showPeriod = useCallback((next: string) => {
    if (!goalsDirtyRef.current) setPeriod(next);
  }, []);

  const handleDataChanged = useCallback(
    (changedPeriod: string) => {
      setDataVersion(v => v + 1);
      showPeriod(changedPeriod);
    },
    [showPeriod]
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="border-b bg-gradient-to-r from-primary to-secondary px-4 py-5 text-white md:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="rounded-full bg-white/20 p-2.5">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold md:text-2xl">Panel de Administración</h1>
            <p className="text-sm text-white/90">Metas, cargas masivas y esquema de incentivos</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 pb-24 md:p-6">
        <div className="mx-auto max-w-7xl">
          <Tabs value={tab} onValueChange={v => setTab(v as AdminTab)}>
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start sm:w-auto">
              <TabsTrigger value="goals">
                Metas{goalsDirty && <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-500" aria-label="cambios sin guardar" />}
              </TabsTrigger>
              <TabsTrigger value="import">Importar</TabsTrigger>
              <TabsTrigger value="scheme">
                Esquema de incentivos
                {schemeDirty && <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-500" aria-label="cambios sin guardar" />}
              </TabsTrigger>
            </TabsList>

            {/* Las pestañas se mantienen montadas para no perder cambios sin guardar ni una importación en curso. */}
            <TabsContent value="goals" forceMount className="mt-0 data-[state=inactive]:hidden">
              <GoalsManager
                period={period}
                onPeriodChange={setPeriod}
                actor={actor}
                reloadKey={dataVersion}
                onDirtyChange={setGoalsDirty}
                onRequestImport={() => setTab('import')}
              />
            </TabsContent>

            <TabsContent value="import" forceMount className="mt-0 space-y-6 data-[state=inactive]:hidden">
              <ImportWizard
                defaultPeriod={period}
                actor={actor}
                onImported={handleDataChanged}
                onBusyChange={setImportBusy}
                onViewGoals={p => {
                  showPeriod(p);
                  setTab('goals');
                }}
              />
              <ImportHistory actor={actor} reloadKey={dataVersion} onReverted={handleDataChanged} />
            </TabsContent>

            <TabsContent value="scheme" forceMount className="mt-0 data-[state=inactive]:hidden">
              <IncentiveSchemeEditor actor={actor} onDirtyChange={setSchemeDirty} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminContent />
    </ProtectedRoute>
  );
}
