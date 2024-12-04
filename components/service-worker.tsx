'use client';

import { useEffect } from 'react';
import registerServiceWorker from '@/app/sw';

const ServiceWorkerRegistration = () => {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
};

export default ServiceWorkerRegistration;