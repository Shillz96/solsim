// Font Cache Clear Script for Development
// Run this in browser console to force font cache refresh

(function() {
  console.log('🧹 Clearing font cache...');
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('🗑️ Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('✅ All caches cleared');
    });
  }
  
  // Force reload with cache bypass
  setTimeout(() => {
    console.log('🔄 Reloading with cache bypass...');
    window.location.reload(true);
  }, 1000);
})();
