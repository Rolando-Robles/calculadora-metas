import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { mockUser } from '@/lib/data';
import { LogOut } from 'lucide-react';

const faqs = [
    {
        question: '¿Cómo se calculan mis incentivos?',
        answer: 'Tu comisión base es un porcentaje del monto desembolsado. Puedes ganar multiplicadores (1.05×, 1.10×, etc.) al alcanzar ciertas metas de conteo de desembolsos y/o monto total desembolsado en el mes. Usa el simulador para ver los detalles.'
    },
    {
        question: '¿Cómo usar el simulador?',
        answer: 'Ve a la pestaña "Simular". Mueve los deslizadores de "Solicitudes creadas" y "Monto desembolsado" para ver cómo diferentes escenarios afectan tu comisión proyectada y el multiplicador que alcanzarías.'
    },
    {
        question: '¿Cómo registrar mis números?',
        answer: 'En la pestaña "Capturar", la fecha se selecciona automáticamente a hoy. Simplemente ingresa los conteos de solicitudes creadas, aprobadas, desembolsadas y el monto total del día, y presiona "Guardar". No puedes registrar datos de días futuros o de meses pasados.'
    }
]

export default function PerfilPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/80 px-4 backdrop-blur-sm md:h-auto md:bg-transparent md:px-6 md:pt-4">
        <h1 className="text-3xl font-headline font-bold">Mi Perfil</h1>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold font-headline">{mockUser.name}</h2>
                  <p className="text-muted-foreground">
                    Kiosco: {mockUser.kiosco}
                  </p>
                  <p className="text-muted-foreground">
                    Producto: {mockUser.product}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ayuda Rápida</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                     <AccordionItem value={`item-${index}`} key={index}>
                     <AccordionTrigger>{faq.question}</AccordionTrigger>
                     <AccordionContent className="text-muted-foreground">
                       {faq.answer}
                     </AccordionContent>
                   </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
          
          <Button variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
