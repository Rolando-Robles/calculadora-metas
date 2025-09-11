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
        question: '¿De dónde vienen los datos?',
        answer: 'Todos tus datos de desempeño (solicitudes, aprobadas, desembolsos y montos) se sincronizan automáticamente desde HubSpot. No necesitas ingresarlos manualmente. La información se actualiza diariamente.'
    },
    {
        question: '¿Cómo funciona la sección de Incentivos?',
        answer: 'En la pestaña "Incentivos", puedes ver un resumen de tus ganancias históricas y del mes anterior. También encontrarás una tabla con el detalle de pagos por periodo y una gráfica de tus comisiones en los últimos 12 meses.'
    },
    {
        question: '¿Cómo usar el simulador?',
        answer: 'Ve a la pestaña "Simular". Mueve los deslizadores de "Solicitudes creadas" y "Monto desembolsado" para ver cómo diferentes escenarios afectan tu comisión proyectada y el multiplicador que alcanzarías.'
    }
]

export default function PerfilPage() {
  return (
    <div className="flex flex-col h-full bg-background">
       <header className="sticky top-0 z-10 flex h-20 items-center border-b bg-background/80 px-4 backdrop-blur-sm md:h-auto md:bg-transparent md:px-6 md:py-4">
        <h1 className="text-headline-lg font-bold">Mi Perfil</h1>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
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
                  <p className="text-muted-foreground text-body-lg">
                    Kiosco: {mockUser.kiosco}
                  </p>
                  <p className="text-muted-foreground text-body-lg">
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
                     <AccordionTrigger className="text-body-lg text-left">{faq.question}</AccordionTrigger>
                     <AccordionContent className="text-muted-foreground text-body-lg">
                       {faq.answer}
                     </AccordionContent>
                   </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
          
          <Button variant="outline" className="w-full h-12 text-lg">
            <LogOut className="mr-2 h-5 w-5" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
