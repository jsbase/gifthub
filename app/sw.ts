'use client';

let deferredPrompt: any = null;

const showInstallPrompt = async () => {
  if (!deferredPrompt) {
    console.log('No installation prompt available');
    return;
  }

  try {
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(
      `User ${
        outcome === 'accepted' ? 'accepted' : 'dismissed'
      } the install prompt`
    );

    deferredPrompt = null;
  } catch (error) {
    console.error('Error showing the install prompt:', error);
  }
};

const registerServiceWorker = () => {
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('SW registered:', registration);

      if ('beforeinstallprompt' in window) {
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          deferredPrompt = e;
          showInstallPrompt();
        });
      } else {
        console.log('beforeinstallprompt is not supported in this browser');
      }
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  };

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const registerWhenIdle = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(register);
      } else {
        setTimeout(register, 100);
      }
    };

    if (document.readyState === 'complete') {
      registerWhenIdle();
    } else {
      window.addEventListener('load', registerWhenIdle);
    }
  }
};

export default registerServiceWorker;
