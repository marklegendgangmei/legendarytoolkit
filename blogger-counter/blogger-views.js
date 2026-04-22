// ============================================================
// Blogger Real-time Post & Page View Counter
// Uses Firebase Realtime Database
// ============================================================

(function() {
  // ------------------- CONFIGURATION -------------------
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBVYZd9qn1Aj4Pa-ntrTC75YJE0e6cqATQ",
    authDomain: "blogger-views-72aa9.firebaseapp.com",
    databaseURL: "https://blogger-views-72aa9-default-rtdb.firebaseio.com",
    projectId: "blogger-views-72aa9",
    storageBucket: "blogger-views-72aa9.firebasestorage.app",
    messagingSenderId: "503334837588",
    appId: "1:503334837588:web:a2793e1ac921800f803cc1"
  };
  const BLOG_ID = '4270408631536650652';  // Your Blogger Blog ID

  // ------------------- HELPER FUNCTIONS -------------------
  function generatePageId(urlPath) {
    // Remove leading/trailing slashes, replace slashes with hyphens
    let cleanPath = urlPath.replace(/^\/|\/$/g, '').replace(/\//g, '-');
    // Remove .html or .htm extension
    cleanPath = cleanPath.replace(/\.html?$/, '');
    if (cleanPath === '') return 'homepage';
    return cleanPath;
  }

  function getContentId() {
    // 1. Try to detect a blog post (numeric ID from comment form or links)
    const commentForm = document.querySelector('form.comment-form');
    if (commentForm) {
      const input = commentForm.querySelector('input[name="postId"]');
      if (input && input.value) return `post_${input.value}`;
    }
    
    // Look for any link containing /post/ID
    const links = document.querySelectorAll('a[href*="/post/"]');
    for (let link of links) {
      const match = link.href.match(/\/post\/(\d+)/);
      if (match) return `post_${match[1]}`;
    }
    
    // Check canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && canonical.href) {
      let match = canonical.href.match(/\/post\/(\d+)/);
      if (match) return `post_${match[1]}`;
    }
    
    // 2. If not a post, treat as static page
    const pagePath = window.location.pathname;
    return `page_${generatePageId(pagePath)}`;
  }

  // ------------------- FIREBASE INITIALIZATION -------------------
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Please include firebase-app.js and firebase-database.js');
    return;
  }
  
  // Initialize only once
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  const database = firebase.database();

  // ------------------- MAIN COUNTER FUNCTION -------------------
  async function updateAndDisplayViews() {
    const contentId = getContentId();
    if (!contentId) return;
    
    const viewRef = database.ref(`${BLOG_ID}/${contentId}`);
    const counterElement = document.querySelector('.realtime-views');
    
    // Show cached value instantly if available
    try {
      const cached = localStorage.getItem(`views_${contentId}`);
      if (counterElement && cached) {
        counterElement.textContent = `${parseInt(cached).toLocaleString()} views`;
        counterElement.style.visibility = 'visible';
      } else if (counterElement) {
        // Hide until real count arrives
        counterElement.style.visibility = 'hidden';
      }
    } catch(e) { /* localStorage might be disabled, ignore */ }
    
    // Update from Firebase
    try {
      await viewRef.transaction(current => (current || 0) + 1);
      const snapshot = await viewRef.once('value');
      const finalCount = snapshot.val() || 0;
      
      if (counterElement) {
        counterElement.textContent = `${finalCount.toLocaleString()} views`;
        counterElement.style.visibility = 'visible';
        // Cache for next time
        try {
          localStorage.setItem(`views_${contentId}`, finalCount);
        } catch(e) {}
      }
    } catch (error) {
      console.error('Firebase counter error:', error);
      // If Firebase fails, show cached or fallback
      if (counterElement && counterElement.style.visibility !== 'visible') {
        counterElement.textContent = '? views';
        counterElement.style.visibility = 'visible';
      }
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAndDisplayViews);
  } else {
    updateAndDisplayViews();
  }
})();
