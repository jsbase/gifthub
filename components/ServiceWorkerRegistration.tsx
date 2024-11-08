'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/app/sw';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}
