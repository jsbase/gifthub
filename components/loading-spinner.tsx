'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';

export function LoadingSpinner() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }
  
  return createPortal(
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Image
        src="/loading.svg"
        alt="Loading..."
        width={48}
        height={48}
        className="animate-spin dark:invert"
        priority
      />
    </div>,
    document.body
  );
} 
