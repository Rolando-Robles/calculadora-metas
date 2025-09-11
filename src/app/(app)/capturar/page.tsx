import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CaptureForm } from '@/components/capturar/capture-form';

export default function CapturarPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/80 px-4 backdrop-blur-sm md:h-auto md:bg-transparent md:px-6 md:pt-4">
        <h1 className="text-3xl font-headline font-bold">Captura Rápida</h1>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Registrar en segundos</CardTitle>
              <CardDescription>
                Ingresa tus números del día. La fecha está preseleccionada en hoy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CaptureForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
