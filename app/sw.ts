'use client';

/*
  Registration only. This used to hold the install prompt as well: it stashed the
  `beforeinstallprompt` event and then called `prompt()` on it straight from the
  listener. Nothing ever offered install, so nothing called it - and a browser
  rejects a programmatic prompt with no user gesture anyway, so the one code path
  that could have run was the one that could not work. Deleting the stash rather
  than leaving it waiting for a caller keeps the file a single job.
*/
const registerServiceWorker = () => {
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('SW registered:', registration);
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
