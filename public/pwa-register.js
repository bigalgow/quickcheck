// pwa-register.js
// Script to register the service worker and handle install prompt

let deferredPrompt;

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// Capture the install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💾 Install prompt available');
  // Prevent the default prompt
  e.preventDefault();
  // Store the event for later use
  deferredPrompt = e;
  
  // Show your custom install button
  showInstallPromotion();
});

// Function to show install promotion (you can customize this)
function showInstallPromotion() {
  const installButton = document.getElementById('pwa-install-button');
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', installApp);
  } else {
    // If no custom button, create a simple banner
    createInstallBanner();
  }
}

// Create a simple install banner
function createInstallBanner() {
  // Check if banner already exists
  if (document.getElementById('pwa-install-banner')) return;
  
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #0ea5e9;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 90%;
    animation: slideUp 0.3s ease-out;
  `;
  
  banner.innerHTML = `
    <span style="flex: 1; font-size: 14px;">
      📱 Install RetirePlan for quick access
    </span>
    <button id="pwa-install-btn" style="
      background: white;
      color: #0ea5e9;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    ">
      Install
    </button>
    <button id="pwa-dismiss-btn" style="
      background: transparent;
      color: white;
      border: none;
      padding: 8px;
      cursor: pointer;
      font-size: 20px;
    ">
      ×
    </button>
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { bottom: -100px; opacity: 0; }
      to { bottom: 20px; opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(banner);
  
  // Add click handlers
  document.getElementById('pwa-install-btn').addEventListener('click', installApp);
  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    banner.remove();
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-dismissed', 'true');
  });
}

// Function to trigger the install prompt
async function installApp() {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user's response
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response: ${outcome}`);
  
  if (outcome === 'accepted') {
    console.log('✅ PWA installed');
  } else {
    console.log('❌ PWA installation declined');
  }
  
  // Clear the deferred prompt
  deferredPrompt = null;
  
  // Hide the install promotion
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.remove();
}

// Detect when PWA is successfully installed
window.addEventListener('appinstalled', (e) => {
  console.log('✅ PWA installed successfully');
  deferredPrompt = null;
  
  // Hide install promotion
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.remove();
  
  // Optional: Track installation
  // analytics.track('pwa_installed');
});

// Check if already running as PWA
function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

if (isPWA()) {
  console.log('✅ Running as PWA');
  // Optional: Add PWA-specific styling or features
  document.body.classList.add('pwa-mode');
}

// Don't show banner if already dismissed this session
if (!sessionStorage.getItem('pwa-dismissed')) {
  // Wait a bit before showing the banner (better UX)
  setTimeout(() => {
    if (deferredPrompt) {
      showInstallPromotion();
    }
  }, 3000); // Show after 3 seconds
}
