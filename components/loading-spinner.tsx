'use client';

import React from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const LoadingSpinner: React.FC = () => {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0',
        'bg-background/80',
        'backdrop-blur-sm',
        'z-50',
        'flex',
        'items-center',
        'justify-center'
      )}
      data-testid='loadingSpinner'
    >
      <Image
        src='/loading.svg'
        alt='Loading...'
        width={48}
        height={48}
        className={cn('animate-spin', 'dark:invert')}
        priority
      />
    </div>,
    document.body
  );
};

export default LoadingSpinner;
