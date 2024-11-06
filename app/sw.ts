'use client'

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/' // Explicitly set scope to root
        });
        console.log('SW registered:', registration);

        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
          // Prevent Chrome 67 and earlier from automatically showing the prompt
          e.preventDefault();
          
          // Store the event for later use
          const promptEvent = e as any;
          
          // Show the prompt after a short delay
          setTimeout(() => {
            promptEvent.prompt();
            promptEvent.userChoice.then((choiceResult: { outcome: string }) => {
              if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
              } else {
                console.log('User dismissed the install prompt');
              }
            });
          }, 1000);
        });

      } catch (error) {
        console.error('SW registration failed:', error);
      }
    });
  }
}
