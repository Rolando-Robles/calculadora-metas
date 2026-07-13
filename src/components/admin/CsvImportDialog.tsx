'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileDown, AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { createOrUpdateUserProfile, saveUserGoal } from '@/lib/firestore-service';
import type { UserCategory, ProductType } from '@/lib/types';
import { PRODUCTS } from '@/lib/types';

interface CsvImportResult {
  success: number;
  errors: Array<{ row: number; email: string; error: string }>;
  warnings: Array<{ row: number; email: string; warning: string }>;
}

interface CsvImportDialogProps {
  onImportComplete: () => void;
}

// El CSV usa el nombre de la categoría en minúsculas y sin acento;
// aquí se traduce al código interno (G1-G4) que ya usa el resto del sistema.
const CATEGORY_NAME_TO_CODE: Record<string, UserCategory> = {
  formacion: 'G1',
  territorio: 'G2',
  consolidado: 'G3',
  elite: 'G4',
};
const VALID_CATEGORY_NAMES = Object.keys(CATEGORY_NAME_TO_CODE);
const VALID_PRODUCTS = PRODUCTS.map(p => p.value);

export function CsvImportDialog({ onImportComplete }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    return email.endsWith('@avivacredito.com') && email.includes('@');
  };

  const validateCategory = (category: string): boolean => {
    return category.toLowerCase() in CATEGORY_NAME_TO_CODE;
  };

  const validateProduct = (product: string): boolean => {
    return VALID_PRODUCTS.includes(product as ProductType);
  };

  const validateGoal = (goal: string): boolean => {
    const num = Number(goal);
    return !isNaN(num) && num > 0;
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const processCSV = async (file: File) => {
    setImporting(true);
    setResult(null);

    const importResult: CsvImportResult = {
      success: 0,
      errors: [],
      warnings: [],
    };

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        importResult.errors.push({ row: 0, email: '', error: 'El archivo está vacío o solo tiene encabezados' });
        setResult(importResult);
        setImporting(false);
        return;
      }

      // Skip header row
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

      for (let i = 1; i < lines.length; i++) {
        const row = i + 1;
        const fields = parseCsvLine(lines[i]);

        if (fields.length < 4) {
          importResult.errors.push({
            row,
            email: fields[0] || '',
            error: 'Faltan columnas (se esperan 4: Correo, Categoría, Producto, Meta Mensual)',
          });
          continue;
        }

        const [email, category, product, goalStr] = fields.map(f => f.trim());

        // Validations
        const errors: string[] = [];

        if (!validateEmail(email)) {
          errors.push('Email debe ser @avivacredito.com');
        }

        if (!validateCategory(category)) {
          errors.push(`Categoría inválida (debe ser: ${VALID_CATEGORY_NAMES.join(', ')})`);
        }

        if (!validateProduct(product)) {
          errors.push('Producto inválido');
        }

        if (!validateGoal(goalStr)) {
          errors.push('Meta debe ser un número positivo');
        }

        if (errors.length > 0) {
          importResult.errors.push({
            row,
            email,
            error: errors.join('; '),
          });
          continue;
        }

        // Create/Update user and goal
        try {
          const uid = email.replace('@avivacredito.com', '').replace(/[^a-zA-Z0-9]/g, '_');
          const categoryCode = CATEGORY_NAME_TO_CODE[category.toLowerCase()];

          // Create/Update user profile using firestore-service
          await createOrUpdateUserProfile(uid, {
            email,
            role: 'vendedor',
            category: categoryCode,
            product,
            name: email.split('@')[0],
          });

          // Create/Update goal for current period using userEmail
          await saveUserGoal({
            userEmail: email,
            monthlyGoal: Number(goalStr),
            category: categoryCode,
            product: product as ProductType,
            period: currentPeriod,
          });

          importResult.success++;
        } catch (error) {
          console.error(`Error processing row ${row}:`, error);
          importResult.errors.push({
            row,
            email,
            error: `Error al guardar: ${error}`,
          });
        }
      }

      setResult(importResult);

      // Call callback if there were successful imports
      if (importResult.success > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Error reading CSV:', error);
      importResult.errors.push({
        row: 0,
        email: '',
        error: `Error leyendo archivo: ${error}`,
      });
      setResult(importResult);
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCSV(file);
    }
  };

  const downloadTemplate = () => {
    const template = `Correo,Categoría,Producto,Meta Mensual
juan.perez@avivacredito.com,territorio,aviva_contigo,200000
maria.lopez@avivacredito.com,consolidado,aviva_tu_negocio,300000
carlos.garcia@avivacredito.com,formacion,aviva_tu_compra,150000`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_usuarios.csv';
    link.click();
  };

  const resetDialog = () => {
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Usuarios desde CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV para crear o actualizar usuarios y sus metas mensuales
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              📋 Formato del CSV
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Primera fila:</strong> Encabezados (Correo, Categoría, Producto, Meta Mensual)</li>
              <li>• <strong>Correo:</strong> Debe terminar en @avivacredito.com</li>
              <li>• <strong>Categoría:</strong> formacion, territorio, consolidado, o elite (minúsculas, sin acento)</li>
              <li>• <strong>Producto:</strong> aviva_contigo, aviva_tu_negocio, aviva_tu_compra, casa_marchand, o construrama</li>
              <li>• <strong>Meta Mensual:</strong> Número (ejemplo: 200000)</li>
            </ul>
          </div>

          {/* Important Notice */}
          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
              ✅ Acceso inmediato
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
              Los usuarios importados pueden <strong>iniciar sesión con Google</strong> usando su correo @avivacredito.com
              y acceder inmediatamente a sus metas y configuración.
            </p>
          </div>

          {/* Download Template */}
          <Button onClick={downloadTemplate} variant="outline" className="w-full gap-2">
            <FileDown className="h-4 w-4" />
            Descargar Plantilla CSV
          </Button>

          {/* File Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Seleccionar Archivo CSV
            </label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
              className="cursor-pointer"
            />
          </div>

          {/* Loading */}
          {importing && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Procesando archivo...</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Success Summary */}
              {result.success > 0 && (
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 dark:text-green-100">
                        Importación Exitosa
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {result.success} usuario(s) importados correctamente
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 max-h-40 overflow-y-auto">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                      Advertencias ({result.warnings.length})
                    </h4>
                  </div>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 ml-7">
                    {result.warnings.map((w, i) => (
                      <li key={i}>
                        Fila {w.row} ({w.email}): {w.warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800 max-h-60 overflow-y-auto">
                  <div className="flex items-start gap-2 mb-2">
                    <X className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <h4 className="font-medium text-red-900 dark:text-red-100">
                      Errores ({result.errors.length})
                    </h4>
                  </div>
                  <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 ml-7">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        Fila {e.row} {e.email && `(${e.email})`}: {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
