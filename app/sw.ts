'use client'

// Store the deferred prompt for later use
let deferredPrompt: any = null;

export function registerServiceWorker() {
  const register = async () => {
    try {
      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('SW registered:', registration);

      // Listen for beforeinstallprompt event
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        // Store the event for later use
        deferredPrompt = e;
      });

    } catch (error) {
      console.error('SW registration failed:', error);
    }
  };

  // Only run on client side and when service worker is supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Use requestIdleCallback or setTimeout to defer registration
    const registerWhenIdle = () => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(register);
      } else {
        setTimeout(register, 100);
      }
    };

    // Register when the window loads
    if (document.readyState === 'complete') {
      registerWhenIdle();
    } else {
      window.addEventListener('load', registerWhenIdle);
    }
  }
}

// Export a function to show the install prompt
export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.log('No installation prompt available');
    return;
  }

  // Show the prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);

  // Clear the saved prompt
  deferredPrompt = null;
}
