// mp4-mp3-loader.js – Auto‑resizing iframe loader for Blogger
(function() {
    var container = document.getElementById('mp4-mp3-app');
    if (!container) {
        console.error('Missing <div id="mp4-mp3-app"></div>');
        return;
    }

    // Create the iframe
    var iframe = document.createElement('iframe');
    iframe.src = 'https://marklegendgangmei.github.io/legendarytoolkit/video-audio/index.html';
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '2rem';
    iframe.style.background = 'transparent';
    iframe.style.overflow = 'hidden';
    
    // Auto height adjustment
    iframe.onload = function() {
        iframe.contentWindow.postMessage({ type: 'getHeight' }, '*');
    };
    
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'setHeight') {
            iframe.style.height = event.data.height + 'px';
        }
    });
    
    container.appendChild(iframe);
})();
