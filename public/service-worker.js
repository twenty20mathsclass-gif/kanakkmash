// This service worker is intentionally kept simple to fulfill PWA installation requirements.
// It allows the web app to be installable on devices like iPhones.
self.addEventListener('fetch', (event) => {
  // An empty fetch event listener is sufficient to make the app installable.
});
