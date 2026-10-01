'use client';

import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';
import { useState, useEffect } from 'react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const [position, setPosition] = useState<'top-center' | 'bottom-right'>(
    'top-center'
  );

  useEffect(() => {
    setPosition(window.innerWidth >= 640 ? 'bottom-right' : 'top-center');
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className={cn('toaster', 'group')}
      position={position}
      toastOptions={{
        classNames: {
          toast:
            'group toast rounded-[10px] group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-[0_12px_30px_-10px_rgb(0_0_0/0.24)]',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-accent group-[.toast]:text-accent-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
