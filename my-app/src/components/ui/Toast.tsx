import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      data-name="toaster"
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
