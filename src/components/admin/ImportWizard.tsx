'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Lock,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { downloadCsv, formatPeriod } from '@/lib/admin-utils';
import {
  executeImport,
  getPeriodLock,
  loadGoalsForPeriod,
  loadVendors,
} from '@/lib/admin-service';
import {
  IMPORT_FIELDS,
  autoMapColumns,
  buildImportPlan,
  readSpreadsheet,
  type ColumnMapping,
  type ImportPlan,
  type ImportRowPlan,
  type RowStatus,
} from '@/lib/import-parser';
import { PeriodPicker } from './PeriodPicker';

type Step = 'upload' | 'map' | 'preview' | 'running' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Archivo' },
  { key: 'map', label: 'Columnas' },
  { key: 'preview', label: 'Revisión' },
  { key: 'done', label: 'Resultado' },
];

const STATUS_META: Record<RowStatus, { label: string; className: string }> = {
  new: { label: 'Nuevo', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  update: { label: 'Con cambios', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
  unchanged: { label: 'Sin cambios', className: 'bg-muted text-muted-foreground' },
  error: { label: 'Error', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
};

interface ImportWizardProps {
  defaultPeriod: string;
  actor: string;
  onImported: (period: string) => void;
  onBusyChange: (busy: boolean) => void;
  onViewGoals: (period: string) => void;
}

export function ImportWizard({ defaultPeriod, actor, onImported, onBusyChange, onViewGoals }: ImportWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('upload');
  const [period, setPeriod] = useState(defaultPeriod);
  const [periodLocked, setPeriodLocked] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ applied: number; failed: { key: string; error: string }[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'upload') setPeriod(defaultPeriod);
  }, [defaultPeriod, step]);

  useEffect(() => {
    let cancelled = false;
    getPeriodLock(period)
      .then(lock => !cancelled && setPeriodLocked(!!lock?.locked))
      .catch(() => !cancelled && setPeriodLocked(false));
    return () => {
      cancelled = true;
    };
  }, [period]);

  useEffect(() => onBusyChange(step === 'running'), [step, onBusyChange]);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setRows([]);
    setMapping(null);
    setPlan(null);
    setResult(null);
    setReadError(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  // ----- Paso 1: archivo -----
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);
    if (!/\.(csv|txt|xlsx)$/i.test(file.name)) {
      setReadError('Formato no soportado. Usa .csv o .xlsx (si tienes .xls, guárdalo como .xlsx).');
      return;
    }
    setReading(true);
    try {
      const data = await readSpreadsheet(file);
      if (data.length < 2) {
        setReadError('El archivo está vacío o solo tiene encabezados.');
        return;
      }
      setFileName(file.name);
      setRows(data);
      setMapping(autoMapColumns(data[0]));
      setStep('map');
    } catch (error) {
      console.error('Error leyendo archivo:', error);
      setReadError('No se pudo leer el archivo. Verifica que no esté dañado o protegido con contraseña.');
    } finally {
      setReading(false);
    }
  };

  const downloadTemplate = () => {
    downloadCsv(
      'plantilla_metas.csv',
      ['Correo', 'Nombre', 'Categoría', 'Producto', 'Meta Mensual', 'Región', 'Gerente'],
      [
        ['juan.perez@avivacredito.com', 'Juan Pérez', 'territorio', 'aviva_contigo', 200000, 'Centro', 'ana.gerente@avivacredito.com'],
        ['maria.lopez@avivacredito.com', 'María López', 'consolidado', 'aviva_tu_negocio', 300000, 'Norte', 'ana.gerente@avivacredito.com'],
        ['carlos.garcia@avivacredito.com', '', 'formacion', 'aviva_tu_compra', 150000, '', ''],
      ]
    );
  };

  // ----- Paso 2: columnas -----
  const headers = rows[0] || [];
  const sampleRow = rows[1] || [];
  const mappedCount = mapping ? IMPORT_FIELDS.filter(f => f.key !== 'email' && mapping[f.key] >= 0).length : 0;
  const ignoredColumns = mapping
    ? headers.filter((_, i) => !Object.values(mapping).includes(i))
    : [];

  const buildPlan = async () => {
    if (!mapping) return;
    setPlanning(true);
    try {
      const { vendors, idToEmail } = await loadVendors();
      const goals = await loadGoalsForPeriod(period, idToEmail);
      setPlan(
        buildImportPlan({
          rows,
          mapping,
          vendors: new Map(vendors.map(v => [v.email, v])),
          goals,
        })
      );
      setStep('preview');
    } catch (error) {
      console.error('Error preparando la vista previa:', error);
      toast({ title: 'Error', description: 'No se pudieron leer los datos actuales', variant: 'destructive' });
    } finally {
      setPlanning(false);
    }
  };

  // ----- Paso 3: ejecutar -----
  const toApply = plan?.rows.filter(r => r.change) ?? [];

  const runImport = async () => {
    if (!plan) return;
    setStep('running');
    setProgress({ done: 0, total: toApply.length });
    try {
      const res = await executeImport({
        fileName,
        period,
        actor,
        totalRows: plan.rows.length,
        counts: plan.counts,
        changes: toApply.map(r => r.change!),
        revertEntries: toApply.map(r => r.revert!),
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setResult({ applied: res.applied, failed: res.failed });
      onImported(period);
    } catch (error) {
      console.error('Error importando:', error);
      setResult({ applied: 0, failed: [{ key: '', error: 'No se pudo iniciar la importación' }] });
    } finally {
      setStep('done');
    }
  };

  const downloadErrors = () => {
    if (!plan) return;
    const errorRows = plan.rows.filter(r => r.status === 'error');
    downloadCsv(
      `errores_${fileName.replace(/\.[^.]+$/, '')}.csv`,
      ['Fila', ...headers, 'Error'],
      errorRows.map(r => [r.rowNumber, ...(rows[r.rowNumber - 1] || []), r.errors.join('; ')])
    );
  };

  const stepIndex = STEPS.findIndex(s => s.key === (step === 'running' ? 'preview' : step));

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Importar vendedores y metas
          </CardTitle>
          <CardDescription>
            Nada se guarda hasta que revises la vista previa y confirmes. Cada importación queda en el historial y se
            puede revertir.
          </CardDescription>
        </div>
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
                  i < stepIndex && 'border-primary bg-primary text-primary-foreground',
                  i === stepIndex && 'border-primary text-primary'
                )}
              >
                {i + 1}
              </span>
              <span className={cn(i === stepIndex ? 'font-medium' : 'text-muted-foreground')}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
            </li>
          ))}
        </ol>
      </CardHeader>

      <CardContent>
        {step === 'upload' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">¿A qué periodo aplican las metas?</p>
              <PeriodPicker value={period} onChange={setPeriod} />
              {periodLocked && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <Lock className="h-4 w-4" /> {formatPeriod(period)} está cerrado; reábrelo en Metas para importar.
                </p>
              )}
            </div>

            <label
              onDragOver={e => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setDragging(false);
                if (!periodLocked) handleFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'hover:border-primary/50',
                (periodLocked || reading) && 'pointer-events-none opacity-60'
              )}
            >
              {reading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <p className="font-medium">{reading ? 'Leyendo archivo…' : 'Arrastra tu archivo o haz clic para elegirlo'}</p>
              <p className="text-sm text-muted-foreground">CSV (separado por coma o punto y coma) o Excel .xlsx</p>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.txt,.xlsx"
                className="sr-only"
                disabled={periodLocked || reading}
                onChange={e => handleFile(e.target.files?.[0])}
              />
            </label>
            {readError && <p className="text-sm text-destructive">{readError}</p>}

            <div className="grid gap-4 rounded-lg bg-muted/50 p-4 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-medium">Columnas</p>
                <p className="text-muted-foreground">
                  Solo <strong>Correo</strong> es obligatoria. Opcionales: Nombre, Categoría, Producto, Meta Mensual,
                  Región, Gerente. Las columnas que no vengan o vengan vacías no modifican lo que ya existe.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Valores aceptados</p>
                <p className="text-muted-foreground">
                  Categoría: formación, territorio, consolidado, élite (o G1-G4). Producto: código o nombre (&quot;Aviva
                  Contigo&quot;). Meta: 200000, 200,000 o $200,000.
                </p>
              </div>
              <div className="md:col-span-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
                  <FileDown className="h-4 w-4" /> Descargar plantilla
                </Button>
                <span className="ml-3 text-xs text-muted-foreground">
                  Tip: exporta desde Metas, edita en Excel y vuelve a importar el mismo archivo.
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 'map' && mapping && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{fileName}</strong> · {(rows.length - 1).toLocaleString('es-MX')} filas ·
              periodo <strong className="text-foreground">{formatPeriod(period)}</strong>. Confirma qué columna corresponde a
              cada dato.
            </p>
            <div className="divide-y rounded-md border">
              {IMPORT_FIELDS.map(field => {
                const index = mapping[field.key];
                return (
                  <div key={field.key} className="grid grid-cols-1 items-center gap-2 p-3 sm:grid-cols-[180px_240px_1fr]">
                    <p className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </p>
                    <Select
                      value={String(index)}
                      onValueChange={v => setMapping({ ...mapping, [field.key]: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">— No importar —</SelectItem>
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {h || `Columna ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="truncate text-sm text-muted-foreground">
                      {index >= 0 ? (
                        <>
                          Ej.: <span className="font-mono text-foreground">{sampleRow[index] || '(vacío)'}</span>
                        </>
                      ) : (
                        'No se modifica'
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
            {ignoredColumns.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Columnas que se ignoran: {ignoredColumns.filter(Boolean).join(', ')}
              </p>
            )}
            {mapping.email < 0 && <p className="text-sm text-destructive">Elige la columna del correo.</p>}
            {mapping.email >= 0 && mappedCount === 0 && (
              <p className="text-sm text-destructive">Elige al menos una columna para actualizar (meta, categoría…).</p>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={reset} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Cambiar archivo
              </Button>
              <Button onClick={buildPlan} disabled={mapping.email < 0 || mappedCount === 0 || planning}>
                {planning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Revisar cambios
              </Button>
            </div>
          </div>
        )}

        {(step === 'preview' || step === 'running') && plan && (
          <PreviewStep
            plan={plan}
            period={period}
            running={step === 'running'}
            progress={progress}
            applyCount={toApply.length}
            onBack={() => setStep('map')}
            onDownloadErrors={downloadErrors}
            onConfirm={runImport}
          />
        )}

        {step === 'done' && result && (
          <div className="space-y-4">
            {result.failed.length === 0 ? (
              <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium">Importación completa</p>
                  <p className="text-sm text-muted-foreground">
                    {result.applied.toLocaleString('es-MX')} vendedores actualizados en {formatPeriod(period)}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Importación incompleta</p>
                  <p className="text-sm text-muted-foreground">
                    {result.applied.toLocaleString('es-MX')} aplicados, {result.failed.length.toLocaleString('es-MX')} con
                    error: {result.failed[0].error}. Puedes volver a importar el mismo archivo (lo ya aplicado aparecerá
                    &quot;sin cambios&quot;) o revertirla desde el historial.
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onViewGoals(period)}>Ver metas de {formatPeriod(period)}</Button>
              <Button variant="outline" onClick={reset}>
                Nueva importación
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PreviewStepProps {
  plan: ImportPlan;
  period: string;
  running: boolean;
  progress: { done: number; total: number };
  applyCount: number;
  onBack: () => void;
  onDownloadErrors: () => void;
  onConfirm: () => void;
}

function PreviewStep({ plan, period, running, progress, applyCount, onBack, onDownloadErrors, onConfirm }: PreviewStepProps) {
  const [filter, setFilter] = useState<RowStatus | 'warnings' | 'all'>(() =>
    plan.counts.error > 0 ? 'error' : 'all'
  );
  const visible = useMemo(
    () =>
      plan.rows.filter(r =>
        filter === 'all' ? true : filter === 'warnings' ? r.warnings.length > 0 : r.status === filter
      ),
    [plan, filter]
  );

  const chips: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: plan.rows.length },
    { key: 'new', label: 'Nuevos', count: plan.counts.new },
    { key: 'update', label: 'Con cambios', count: plan.counts.update },
    { key: 'unchanged', label: 'Sin cambios', count: plan.counts.unchanged },
    { key: 'error', label: 'Errores', count: plan.counts.error },
    { key: 'warnings', label: 'Advertencias', count: plan.warningCount },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {chips.map(chip => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            disabled={chip.count === 0 && chip.key !== 'all'}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-40',
              filter === chip.key ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50',
              chip.key === 'error' && chip.count > 0 && filter !== chip.key && 'border-red-300 text-red-700',
              chip.key === 'warnings' && chip.count > 0 && filter !== chip.key && 'border-amber-300 text-amber-700'
            )}
          >
            {chip.label} <span className="tabular-nums">{chip.count.toLocaleString('es-MX')}</span>
          </button>
        ))}
      </div>

      {plan.notInFile > 0 && (
        <p className="text-sm text-muted-foreground">
          {plan.notInFile.toLocaleString('es-MX')} vendedores ya tienen meta en {formatPeriod(period)} y no vienen en el
          archivo: sus metas no se modifican.
        </p>
      )}

      <PreviewList rows={visible} />

      {running ? (
        <div className="space-y-2 rounded-md border p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            Importando {progress.done.toLocaleString('es-MX')} / {progress.total.toLocaleString('es-MX')}… no cierres esta
            pestaña.
          </p>
          <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} className="h-2" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onBack} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Columnas
            </Button>
            {plan.counts.error > 0 && (
              <Button variant="outline" onClick={onDownloadErrors} className="gap-1.5">
                <FileDown className="h-4 w-4" /> Descargar errores
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {plan.counts.error > 0 && applyCount > 0 && (
              <span className="text-xs text-muted-foreground">Las filas con error no se importan.</span>
            )}
            <Button onClick={onConfirm} disabled={applyCount === 0}>
              {applyCount === 0
                ? 'No hay cambios que aplicar'
                : `Importar ${applyCount.toLocaleString('es-MX')} cambio${applyCount !== 1 ? 's' : ''} en ${formatPeriod(period)}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewList({ rows }: { rows: ImportRowPlan[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  if (rows.length === 0) {
    return <div className="rounded-md border py-10 text-center text-sm text-muted-foreground">Sin filas en esta vista.</div>;
  }

  return (
    <div ref={parentRef} className="h-[45vh] min-h-[300px] overflow-auto rounded-md border">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => {
          const row = rows[item.index];
          const meta = STATUS_META[row.status];
          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="absolute left-0 grid w-full grid-cols-[56px_minmax(180px,1fr)_110px_2fr] gap-3 border-b px-3 py-2 text-sm"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <span className="text-xs tabular-nums text-muted-foreground">Fila {row.rowNumber}</span>
              <div className="min-w-0">
                <p className="truncate font-medium">{row.name || '—'}</p>
                <p className="truncate text-xs text-muted-foreground">{row.email || '(sin correo)'}</p>
              </div>
              <span>
                <Badge variant="outline" className={cn('border-0', meta.className)}>
                  {meta.label}
                </Badge>
              </span>
              <div className="min-w-0 space-y-0.5 text-xs">
                {row.errors.map((e, i) => (
                  <p key={`e${i}`} className="text-red-700 dark:text-red-300">
                    {e}
                  </p>
                ))}
                {row.diffs.map((d, i) => (
                  <p key={`d${i}`}>
                    <span className="text-muted-foreground">{d.label}:</span> <span className="line-through opacity-60">{d.before}</span>{' '}
                    → <span className="font-medium">{d.after}</span>
                  </p>
                ))}
                {row.warnings.map((w, i) => (
                  <p key={`w${i}`} className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" /> {w}
                  </p>
                ))}
                {row.status === 'unchanged' && <p className="text-muted-foreground">Ya está así</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
