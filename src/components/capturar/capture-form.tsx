'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { saveDailyCapture } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar'}
    </Button>
  );
}

const initialState = {
  message: '',
};

export function CaptureForm() {
  const [state, formAction] = useFormState(saveDailyCapture, initialState);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      if (state.message.includes('Error')) {
        toast({
          title: 'Error',
          description: state.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Éxito',
          description: state.message,
        });
      }
    }
  }, [state, toast]);

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);


  return (
    <form action={formAction} className="space-y-6">
       <input type="hidden" name="date" value={date ? format(date, 'yyyy-MM-dd') : ''} />
      <div>
        <Label>Fecha</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn(
                'w-full justify-start text-left font-normal mt-1',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP', { locale: es }) : <span>Elige una fecha</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              locale={es}
              disabled={(d) => d > new Date() || d < firstDayOfMonth}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="created">Creadas</Label>
        <Input id="created" name="created" type="number" placeholder="0" required min="0" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="approved">Aprobadas</Label>
        <Input id="approved" name="approved" type="number" placeholder="0" required min="0" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="disbursed">Desembolsadas</Label>
        <Input id="disbursed" name="disbursed" type="number" placeholder="0" required min="0" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Monto</Label>
        <Input id="amount" name="amount" type="number" placeholder="0" required min="0" step="0.01" />
      </div>

      <SubmitButton />
    </form>
  );
}
