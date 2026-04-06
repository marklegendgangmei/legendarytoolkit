// background-blade.js – standalone version of your working HTML (full)
(function() {
    // Ensure Bootstrap CSS is loaded
    if (!document.querySelector('link[href*="bootstrap.min.css"]')) {
        const bootstrapLink = document.createElement('link');
        bootstrapLink.rel = 'stylesheet';
        bootstrapLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css';
        document.head.appendChild(bootstrapLink);
    }

    const TARGET_ID = 'background-blade-app';
    let target = document.getElementById(TARGET_ID);
    if (!target) {
        const observer = new MutationObserver(() => {
            target = document.getElementById(TARGET_ID);
            if (target) {
                observer.disconnect();
                initApp(target);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return;
    }
    initApp(target);

    function initApp(container) {
        // Inject the full HTML (exactly as in your original page)
        container.innerHTML = `
<div class="container">
  <div class="glass-card p-4 p-md-5">
    <h1 class="section-title text-center">✨ Background Blade</h1>
    <p class="text-center text-muted mb-4">Clean cutouts, no uploads, total privacy. Perfect for creators & entrepreneurs.</p>

    <div class="d-flex justify-content-center gap-3 mb-4 flex-wrap">
      <button id="aiModeBtn" class="btn-modern btn-dark-custom active">🧠 Smart Cutout</button>
      <button id="chromaModeBtn" class="btn-modern btn-outline-custom">🎨 Green Screen</button>
    </div>

    <div id="chromaControls" style="display: none;" class="mb-4 p-3 bg-light rounded-4">
      <div class="mb-3">
        <label class="form-label d-flex justify-content-between">
          <span>Sensitivity (lower = cleaner)</span>
          <span id="sensitivityValue">30</span>
        </label>
        <div class="d-flex gap-2 align-items-center">
          <input type="range" id="sensitivitySlider" min="0" max="100" value="30" style="flex:1">
          <input type="number" id="sensitivityNumber" min="0" max="100" value="30" style="width:70px" class="form-control">
        </div>
      </div>
      <div>
        <label class="form-label d-flex justify-content-between">
          <span>Edge Smoothing</span>
          <span id="smoothingValue">10</span>
        </label>
        <div class="d-flex gap-2 align-items-center">
          <input type="range" id="smoothingSlider" min="0" max="100" value="10" style="flex:1">
          <input type="number" id="smoothingNumber" min="0" max="100" value="10" style="width:70px" class="form-control">
        </div>
      </div>
    </div>

    <div class="upload-zone" id="uploadZone">
      <div class="upload-icon fs-1">🖼️</div>
      <input type="file" id="fileInput" class="file-input" accept="image/jpeg,image/png,image/webp" style="display:none">
      <label id="uploadLabel" class="btn-primary d-inline-block mt-2">📂 Choose image</label>
      <p class="mt-3 small text-muted">or drag & drop (max 8MB, JPEG/PNG/WebP)</p>
    </div>

    <div class="status-area" id="statusArea">
      <span>⚡ Ready. Select an image to start.</span>
    </div>

    <div class="row g-4">
      <div class="col-md-6" id="originalColumn" style="display: none;">
        <div class="text-center fw-semibold mb-2">📷 Original</div>
        <canvas id="originalCanvas" width="400" height="400" style="width:100%; height:auto;"></canvas>
      </div>
      <div class="col-md-6" id="resultColumn" style="display: none;">
        <div class="text-center fw-semibold mb-2">✂️ Result (click & drag to erase)</div>
        <canvas id="resultCanvas" width="400" height="400" style="width:100%; height:auto;"></canvas>
        <div class="d-flex justify-content-between align-items-center mt-3">
          <div class="d-flex gap-2 align-items-center">
            <span class="small">Brush size:</span>
            <input type="range" id="brushSize" min="5" max="100" value="20" class="form-range" style="width:140px;">
            <span id="brushSizeValue" class="small">20</span>
          </div>
          <div>
            <button id="undoBtn" class="btn btn-sm btn-outline-secondary" disabled>↩️ Undo</button>
            <button id="redoBtn" class="btn btn-sm btn-outline-secondary" disabled>↪️ Redo</button>
          </div>
        </div>
        <div class="mt-3 d-flex justify-content-center gap-2">
          <button id="resetEditsBtn" class="btn btn-sm btn-outline-danger">Reset edits</button>
          <button id="downloadBtn" class="btn btn-sm btn-dark-custom" disabled>⬇️ Download PNG</button>
        </div>
      </div>
    </div>

    <div class="info-note mt-4">
      🔒 <strong>Zero uploads – everything runs on your device.</strong> No watermarks, no signup.<br>
      🧹 <strong>Smart Cutout</strong> removes backgrounds automatically. Use the <strong>eraser</strong> to fix tricky spots.<br>
      🎨 <strong>Green Screen</strong> mode for solid backdrops – fine‑tune sensitivity.
    </div>
  </div>
</div>
<div id="brushCursor" class="brush-cursor"></div>
        `;

        // Inject the CSS (exactly as in your original)
        const style = document.createElement('style');
        style.textContent = `
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Inter', sans-serif;
              background-color: #fefefe;
              color: #111;
              scroll-behavior: smooth;
              overflow-x: hidden;
              padding: 20px;
            }
            h1, h2, h3, h4, .display-heading, .navbar-brand, .btn, .card-title {
              font-family: 'Space Grotesk', monospace;
              font-weight: 500;
              letter-spacing: -0.02em;
            }
            .glass-card {
              background: rgba(255, 255, 255, 0.85);
              backdrop-filter: blur(8px);
              border: 1px solid rgba(0,0,0,0.05);
              border-radius: 2rem;
              transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
            }
            .glass-card:hover {
              transform: translateY(-6px);
              background: rgba(255, 255, 255, 0.95);
              border-color: rgba(0,0,0,0.1);
              box-shadow: 0 25px 40px -18px rgba(0,0,0,0.2);
            }
            .btn-modern {
              border-radius: 60px;
              padding: 0.75rem 2rem;
              font-weight: 600;
              transition: all 0.25s ease;
              font-family: 'Space Grotesk', monospace;
              letter-spacing: -0.2px;
            }
            .btn-dark-custom {
              background: #0a0a0a;
              color: white;
              border: none;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .btn-dark-custom:hover {
              background: #2c2c2c;
              transform: scale(1.02);
              color: white;
            }
            .btn-outline-custom {
              border: 1.5px solid #111;
              background: transparent;
              color: #111;
            }
            .btn-outline-custom:hover {
              background: #111;
              color: white;
            }
            .section-title {
              font-size: 2rem;
              font-weight: 700;
              letter-spacing: -0.03em;
            }
            .info-note {
              font-size: 0.75rem;
              color: #6c757d;
              text-align: center;
              border-top: 1px solid #e9ecef;
              padding-top: 20px;
              margin-top: 8px;
            }
            .upload-zone {
              border: 2px dashed #c7d2fe;
              border-radius: 28px;
              padding: 40px 20px;
              text-align: center;
              background: #faf9ff;
              cursor: pointer;
              transition: all 0.25s ease;
              margin-bottom: 28px;
            }
            .upload-zone.drag-over {
              border-color: #764ba2;
              background: #f1efff;
              transform: scale(0.99);
            }
            .btn-primary {
              background: #0a0a0a;
              color: white;
              border: none;
              padding: 12px 28px;
              border-radius: 60px;
              font-size: 1rem;
              font-weight: 600;
              cursor: pointer;
              transition: 0.2s;
            }
            .btn-primary:hover {
              background: #2c2c2c;
              transform: scale(1.02);
            }
            .btn-primary:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            canvas {
              max-width: 100%;
              background: repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
              border-radius: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              border: 1px solid #e5e7eb;
            }
            .status-area {
              background: #f3f4f6;
              border-radius: 60px;
              padding: 12px 20px;
              margin-bottom: 28px;
              text-align: center;
              font-size: 0.9rem;
              min-height: 70px;
            }
            .spinner {
              display: inline-block;
              width: 22px;
              height: 22px;
              border: 3px solid #e2e8f0;
              border-top-color: #0a0a0a;
              border-radius: 50%;
              animation: spin 0.7s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            input[type="range"] {
              -webkit-appearance: none;
              width: 100%;
              height: 6px;
              background: #ddd;
              border-radius: 3px;
              outline: none;
            }
            input[type="range"]:focus {
              outline: none;
            }
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #0a0a0a;
              cursor: pointer;
              border: none;
            }
            input[type="range"]::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #0a0a0a;
              cursor: pointer;
            }
            .brush-cursor {
              position: fixed;
              width: 40px;
              height: 40px;
              border: none;
              box-shadow: 0 0 0 1px black;
              border-radius: 50%;
              background: rgba(255,255,255,0.3);
              pointer-events: none;
              z-index: 9999;
              transform: translate(-50%, -50%);
              display: none;
              transition: width 0.05s ease, height 0.05s ease;
            }
        `;
        document.head.appendChild(style);

        // Import map and main script (dynamic import)
        const importMap = document.createElement('script');
        importMap.type = 'importmap';
        importMap.textContent = JSON.stringify({
            imports: {
                "@huggingface/transformers": "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm"
            }
        });
        document.head.appendChild(importMap);

        const moduleScript = document.createElement('script');
        moduleScript.type = 'module';
        moduleScript.textContent = `
            import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers';
            env.useBrowserCache = true;
            env.useIndexedDB = true;

            // DOM elements
            const fileInput = document.getElementById('fileInput');
            const uploadZone = document.getElementById('uploadZone');
            const uploadLabel = document.getElementById('uploadLabel');
            const statusDiv = document.getElementById('statusArea');
            const originalColumn = document.getElementById('originalColumn');
            const resultColumn = document.getElementById('resultColumn');
            const originalCanvas = document.getElementById('originalCanvas');
            const resultCanvas = document.getElementById('resultCanvas');
            const downloadBtn = document.getElementById('downloadBtn');
            const aiModeBtn = document.getElementById('aiModeBtn');
            const chromaModeBtn = document.getElementById('chromaModeBtn');
            const chromaControls = document.getElementById('chromaControls');
            const sensitivitySlider = document.getElementById('sensitivitySlider');
            const sensitivityNumber = document.getElementById('sensitivityNumber');
            const sensitivityValue = document.getElementById('sensitivityValue');
            const smoothingSlider = document.getElementById('smoothingSlider');
            const smoothingNumber = document.getElementById('smoothingNumber');
            const smoothingValue = document.getElementById('smoothingValue');
            const brushSizeSlider = document.getElementById('brushSize');
            const brushSizeValue = document.getElementById('brushSizeValue');
            const undoBtn = document.getElementById('undoBtn');
            const redoBtn = document.getElementById('redoBtn');
            const resetEditsBtn = document.getElementById('resetEditsBtn');

            let currentMode = 'ai';
            let model = null, processor = null;
            let currentProcessedBlob = null;
            let currentOriginalFile = null;
            let workingCanvas = null, originalProcessedCanvas = null;
            let undoStack = [], redoStack = [];
            let isDrawing = false;
            let lastX = 0, lastY = 0;
            const brushCursor = document.getElementById('brushCursor');
            let currentBrushSize = 20;

            function getCanvasDisplayScale() {
                if (!resultCanvas || resultColumn.style.display !== 'block') return 1;
                const rect = resultCanvas.getBoundingClientRect();
                const displayWidth = rect.width > 0 ? rect.width : resultCanvas.offsetWidth;
                return displayWidth > 0 ? resultCanvas.width / displayWidth : 1;
            }
            function updateBrushCursorSize() {
                const scale = getCanvasDisplayScale();
                const cssSize = currentBrushSize / scale;
                brushCursor.style.width = cssSize + 'px';
                brushCursor.style.height = cssSize + 'px';
            }
            function refreshCursorAfterDisplay() {
                setTimeout(() => { if (resultColumn.style.display === 'block') updateBrushCursorSize(); }, 50);
            }
            function showBrushCursor() { brushCursor.style.display = 'block'; }
            function hideBrushCursor() { brushCursor.style.display = 'none'; }
            function moveBrushCursor(e) {
                if (resultColumn.style.display !== 'block') return;
                brushCursor.style.left = e.clientX + 'px';
                brushCursor.style.top = e.clientY + 'px';
            }
            resultCanvas.addEventListener('mouseenter', showBrushCursor);
            resultCanvas.addEventListener('mouseleave', hideBrushCursor);
            resultCanvas.addEventListener('mousemove', moveBrushCursor);
            brushSizeSlider.addEventListener('input', () => {
                currentBrushSize = parseInt(brushSizeSlider.value);
                brushSizeValue.innerText = currentBrushSize;
                updateBrushCursorSize();
            });
            window.addEventListener('resize', () => { if (resultColumn.style.display === 'block') updateBrushCursorSize(); });
            updateBrushCursorSize();

            function eraseCircle(x, y, radius) {
                const ctx = workingCanvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
                const data = imageData.data;
                const w = workingCanvas.width, h = workingCanvas.height;
                const r2 = radius * radius;
                const xMin = Math.max(0, Math.floor(x - radius));
                const xMax = Math.min(w, Math.ceil(x + radius));
                const yMin = Math.max(0, Math.floor(y - radius));
                const yMax = Math.min(h, Math.ceil(y + radius));
                for (let py = yMin; py < yMax; py++) {
                    for (let px = xMin; px < xMax; px++) {
                        const dx = px - x, dy = py - y;
                        if (dx*dx + dy*dy <= r2) {
                            const idx = (py * w + px) * 4 + 3;
                            data[idx] = 0;
                        }
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }
            function eraseLine(x0, y0, x1, y1, radius) {
                const ctx = workingCanvas.getContext('2d');
                const imageData = ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
                const data = imageData.data;
                const w = workingCanvas.width, h = workingCanvas.height;
                const r2 = radius * radius;
                const dx = x1 - x0, dy = y1 - y0;
                const dist = Math.hypot(dx, dy);
                if (dist < 0.001) { eraseCircle(x0, y0, radius); return; }
                const steps = Math.ceil(dist / (radius * 0.5));
                for (let t = 0; t <= steps; t++) {
                    const frac = t / steps;
                    const cx = x0 + dx * frac, cy = y0 + dy * frac;
                    const xMin = Math.max(0, Math.floor(cx - radius));
                    const xMax = Math.min(w, Math.ceil(cx + radius));
                    const yMin = Math.max(0, Math.floor(cy - radius));
                    const yMax = Math.min(h, Math.ceil(cy + radius));
                    for (let py = yMin; py < yMax; py++) {
                        for (let px = xMin; px < xMax; px++) {
                            const dxc = px - cx, dyc = py - cy;
                            if (dxc*dxc + dyc*dyc <= r2) {
                                const idx = (py * w + px) * 4 + 3;
                                data[idx] = 0;
                            }
                        }
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }
            function startDrawing(e) {
                e.preventDefault();
                isDrawing = true;
                const pos = getCanvasCoords(e);
                lastX = pos.x; lastY = pos.y;
                eraseCircle(lastX, lastY, currentBrushSize / 2);
                saveToUndo();
                updateDisplayCanvas();
            }
            function draw(e) {
                if (!isDrawing) return;
                e.preventDefault();
                const pos = getCanvasCoords(e);
                const x = pos.x, y = pos.y;
                eraseLine(lastX, lastY, x, y, currentBrushSize / 2);
                lastX = x; lastY = y;
                updateDisplayCanvas();
            }
            function stopDrawing() { isDrawing = false; }
            function getCanvasCoords(e) {
                const rect = resultCanvas.getBoundingClientRect();
                const scaleX = resultCanvas.width / rect.width;
                const scaleY = resultCanvas.height / rect.height;
                let clientX, clientY;
                if (e.touches) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
                else { clientX = e.clientX; clientY = e.clientY; }
                let x = (clientX - rect.left) * scaleX;
                let y = (clientY - rect.top) * scaleY;
                x = Math.min(Math.max(0, x), resultCanvas.width);
                y = Math.min(Math.max(0, y), resultCanvas.height);
                return { x, y };
            }
            function setStatus(msg, isError = false, showSpinner = false) {
                statusDiv.innerHTML = '';
                if (showSpinner) {
                    const spinner = document.createElement('div');
                    spinner.className = 'spinner';
                    statusDiv.appendChild(spinner);
                }
                const span = document.createElement('span');
                span.textContent = msg;
                if (isError) span.style.color = '#dc2626';
                statusDiv.appendChild(span);
            }
            function saveToUndo() {
                if (!workingCanvas) return;
                const imgData = workingCanvas.getContext('2d').getImageData(0, 0, workingCanvas.width, workingCanvas.height);
                undoStack.push(imgData);
                redoStack = [];
                undoBtn.disabled = false;
                redoBtn.disabled = true;
                if (undoStack.length > 50) undoStack.shift();
            }
            function undo() {
                if (undoStack.length === 0) return;
                const curr = workingCanvas.getContext('2d').getImageData(0, 0, workingCanvas.width, workingCanvas.height);
                redoStack.push(curr);
                const prev = undoStack.pop();
                workingCanvas.getContext('2d').putImageData(prev, 0, 0);
                redoBtn.disabled = false;
                if (undoStack.length === 0) undoBtn.disabled = true;
                updateDisplayCanvas();
            }
            function redo() {
                if (redoStack.length === 0) return;
                const curr = workingCanvas.getContext('2d').getImageData(0, 0, workingCanvas.width, workingCanvas.height);
                undoStack.push(curr);
                const next = redoStack.pop();
                workingCanvas.getContext('2d').putImageData(next, 0, 0);
                undoBtn.disabled = false;
                if (redoStack.length === 0) redoBtn.disabled = true;
                updateDisplayCanvas();
            }
            function resetEdits() {
                if (!workingCanvas || !originalProcessedCanvas) return;
                saveToUndo();
                const ctx = workingCanvas.getContext('2d');
                ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
                ctx.drawImage(originalProcessedCanvas, 0, 0);
                updateDisplayCanvas();
            }
            function updateDisplayCanvas() {
                if (!workingCanvas) return;
                const ctx = resultCanvas.getContext('2d');
                resultCanvas.width = workingCanvas.width;
                resultCanvas.height = workingCanvas.height;
                ctx.drawImage(workingCanvas, 0, 0);
                workingCanvas.toBlob(blob => { currentProcessedBlob = blob; downloadBtn.disabled = false; }, 'image/png');
            }
            function cleanMask(canvas) {
                const ctx = canvas.getContext('2d');
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height, { willReadFrequently: true });
                const data = imgData.data;
                const w = canvas.width, h = canvas.height;
                const alpha = new Uint8Array(w * h);
                for (let i = 0; i < w*h; i++) alpha[i] = data[i*4+3];
                const filtered = new Uint8Array(w*h);
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const neighbors = [];
                        for (let ky = -2; ky <= 2; ky++) {
                            for (let kx = -2; kx <= 2; kx++) {
                                const nx = x + kx, ny = y + ky;
                                if (nx>=0 && nx<w && ny>=0 && ny<h) neighbors.push(alpha[ny*w + nx]);
                            }
                        }
                        neighbors.sort((a,b)=>a-b);
                        filtered[y*w + x] = neighbors[Math.floor(neighbors.length/2)];
                    }
                }
                const eroded = new Uint8Array(w*h);
                for (let y=0; y<h; y++) {
                    for (let x=0; x<w; x++) {
                        let minVal = 255;
                        for (let ky=-1; ky<=1; ky++) {
                            for (let kx=-1; kx<=1; kx++) {
                                const nx = x+kx, ny = y+ky;
                                if (nx>=0 && nx<w && ny>=0 && ny<h) minVal = Math.min(minVal, filtered[ny*w+nx]);
                            }
                        }
                        eroded[y*w+x] = minVal;
                    }
                }
                const dilated = new Uint8Array(w*h);
                for (let y=0; y<h; y++) {
                    for (let x=0; x<w; x++) {
                        let maxVal = 0;
                        for (let ky=-1; ky<=1; ky++) {
                            for (let kx=-1; kx<=1; kx++) {
                                const nx = x+kx, ny = y+ky;
                                if (nx>=0 && nx<w && ny>=0 && ny<h) maxVal = Math.max(maxVal, eroded[ny*w+nx]);
                            }
                        }
                        dilated[y*w+x] = maxVal;
                    }
                }
                for (let i=0; i<w*h; i++) data[i*4+3] = dilated[i];
                ctx.putImageData(imgData, 0, 0);
                return canvas;
            }
            async function preloadModel() {
                try {
                    setStatus('📦 Preloading model for faster future use...', false, true);
                    const cachedModel = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
                        progress_callback: (p) => {
                            if (p.status === 'downloading') setStatus(\`📥 Caching model: \${Math.round(p.progress*100)}%\`, false, true);
                        }
                    });
                    const cachedProcessor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
                        config: { do_normalize: true, do_resize: true, size: { width: 1024, height: 1024 } }
                    });
                    model = cachedModel;
                    processor = cachedProcessor;
                    setStatus('✅ Model ready (cached). Upload an image.', false, false);
                    return true;
                } catch (e) { console.warn('Preload failed', e); return false; }
            }
            async function processAIMode(file) {
                if (!model || !processor) {
                    setStatus('🧠 Loading AI engine (first time ~45MB, then cached)...', false, true);
                    try {
                        model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
                            progress_callback: (p) => {
                                if (p.status === 'downloading') setStatus(\`📥 Downloading: \${Math.round(p.progress*100)}%\`, false, true);
                            }
                        });
                        processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
                            config: { do_normalize: true, do_resize: true, size: { width: 1024, height: 1024 } }
                        });
                        setStatus('✅ Engine ready.', false, false);
                    } catch(e) { console.error(e); setStatus('❌ Engine load failed.', true); return null; }
                }
                setStatus('🎨 Creating smart mask...', false, true);
                const url = URL.createObjectURL(file);
                const img = await RawImage.fromURL(url);
                URL.revokeObjectURL(url);
                const { pixel_values } = await processor(img);
                const { output } = await model({ input: pixel_values });
                const maskTensor = output[0];
                const maskImg = await RawImage.fromTensor(maskTensor.mul(255).to('uint8'));
                const maskCanvas = maskImg.toCanvas();
                const maskResized = document.createElement('canvas');
                maskResized.width = img.width;
                maskResized.height = img.height;
                const maskCtx = maskResized.getContext('2d');
                maskCtx.drawImage(maskCanvas, 0, 0, img.width, img.height);
                const maskData = maskCtx.getImageData(0, 0, img.width, img.height).data;
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img.toCanvas(), 0, 0);
                const pixelData = ctx.getImageData(0, 0, img.width, img.height);
                for (let i = 0; i < img.width * img.height; i++) {
                    pixelData.data[i*4+3] = maskData[i*4];
                }
                ctx.putImageData(pixelData, 0, 0);
                cleanMask(canvas);
                const smoothing = parseInt(smoothingSlider.value) / 20;
                if (smoothing > 0) {
                    for (let s = 0; s < smoothing; s++) {
                        ctx.filter = 'blur(1px)';
                        ctx.drawImage(canvas, 0, 0);
                        ctx.filter = 'none';
                    }
                }
                return canvas;
            }
            function chromaKeyRemoval(imgElement, sensitivity, smoothing) {
                const canvas = document.createElement('canvas');
                canvas.width = imgElement.width;
                canvas.height = imgElement.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(imgElement, 0, 0);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;
                const thresh = sensitivity * 2.55;
                for (let i = 0; i < data.length; i += 4) {
                    const g = data[i+1];
                    if (g - Math.max(data[i], data[i+2]) > thresh && g > 50) {
                        data[i+3] = 0;
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                cleanMask(canvas);
                const smoothIter = Math.floor(smoothing / 20);
                if (smoothIter > 0) {
                    for (let s = 0; s < smoothIter; s++) {
                        ctx.filter = 'blur(1px)';
                        ctx.drawImage(canvas, 0, 0);
                        ctx.filter = 'none';
                    }
                }
                return canvas;
            }
            async function showOriginalAndProcess(file) {
                if (!file) return;
                if (file.size > 8*1024*1024) { setStatus('❌ Max 8MB', true); return; }
                setStatus('📷 Loading preview...', false, true);
                const img = await loadImageToCanvas(file, originalCanvas, 500);
                originalColumn.style.display = 'block';
                resultColumn.style.display = 'none';
                setStatus('🖌️ Processing... please wait', false, true);
                let processed;
                if (currentMode === 'ai') {
                    processed = await processAIMode(file);
                } else {
                    const sensitivity = parseInt(sensitivitySlider.value);
                    const smoothing = parseInt(smoothingSlider.value);
                    processed = chromaKeyRemoval(img, sensitivity, smoothing);
                }
                if (!processed) throw new Error('Processing failed');
                workingCanvas = document.createElement('canvas');
                workingCanvas.width = processed.width;
                workingCanvas.height = processed.height;
                workingCanvas.getContext('2d').drawImage(processed, 0, 0);
                originalProcessedCanvas = document.createElement('canvas');
                originalProcessedCanvas.width = processed.width;
                originalProcessedCanvas.height = processed.height;
                originalProcessedCanvas.getContext('2d').drawImage(processed, 0, 0);
                resultCanvas.width = processed.width;
                resultCanvas.height = processed.height;
                resultCanvas.getContext('2d').drawImage(processed, 0, 0);
                resultColumn.style.display = 'block';
                refreshCursorAfterDisplay();
                undoStack = []; redoStack = [];
                undoBtn.disabled = true; redoBtn.disabled = true;
                updateDisplayCanvas();
                setStatus('✅ Ready. Use eraser to clean up leftovers.', false);
            }
            function loadImageToCanvas(file, canvas, maxDim=500) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        let w = img.width, h = img.height;
                        if (w > maxDim || h > maxDim) {
                            const ratio = Math.min(maxDim/w, maxDim/h);
                            w = Math.floor(w*ratio); h = Math.floor(h*ratio);
                        }
                        canvas.width = w; canvas.height = h;
                        ctx.drawImage(img, 0, 0, w, h);
                        resolve(img);
                    };
                    img.onerror = reject;
                    img.src = URL.createObjectURL(file);
                });
            }
            function handleFile(file) {
                const allowed = ['image/jpeg','image/png','image/webp'];
                if (!allowed.includes(file.type)) { setStatus('❌ Only JPEG, PNG, WebP', true); return; }
                currentOriginalFile = file;
                showOriginalAndProcess(file);
            }
            // Event listeners
            uploadLabel.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
            uploadZone.addEventListener('dragover', e => e.preventDefault());
            uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
            uploadZone.addEventListener('drop', e => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
            downloadBtn.addEventListener('click', () => {
                if (currentProcessedBlob) {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(currentProcessedBlob);
                    a.download = 'clean-cutout.png';
                    a.click();
                    URL.revokeObjectURL(a.href);
                }
            });
            undoBtn.addEventListener('click', undo);
            redoBtn.addEventListener('click', redo);
            resetEditsBtn.addEventListener('click', resetEdits);
            resultCanvas.addEventListener('mousedown', startDrawing);
            resultCanvas.addEventListener('mousemove', draw);
            resultCanvas.addEventListener('mouseup', stopDrawing);
            resultCanvas.addEventListener('mouseleave', stopDrawing);
            resultCanvas.addEventListener('touchstart', startDrawing);
            resultCanvas.addEventListener('touchmove', draw);
            resultCanvas.addEventListener('touchend', stopDrawing);
            aiModeBtn.addEventListener('click', () => {
                currentMode = 'ai';
                aiModeBtn.classList.add('btn-dark-custom'); aiModeBtn.classList.remove('btn-outline-custom');
                chromaModeBtn.classList.add('btn-outline-custom'); chromaModeBtn.classList.remove('btn-dark-custom');
                chromaControls.style.display = 'none';
                if (currentOriginalFile) showOriginalAndProcess(currentOriginalFile);
            });
            chromaModeBtn.addEventListener('click', () => {
                currentMode = 'chroma';
                chromaModeBtn.classList.add('btn-dark-custom'); chromaModeBtn.classList.remove('btn-outline-custom');
                aiModeBtn.classList.add('btn-outline-custom'); aiModeBtn.classList.remove('btn-dark-custom');
                chromaControls.style.display = 'block';
                if (currentOriginalFile) showOriginalAndProcess(currentOriginalFile);
            });
            function syncSensitivity(value) {
                sensitivitySlider.value = value;
                sensitivityNumber.value = value;
                sensitivityValue.innerText = value;
                if (currentMode==='chroma' && currentOriginalFile) showOriginalAndProcess(currentOriginalFile);
            }
            function syncSmoothing(value) {
                smoothingSlider.value = value;
                smoothingNumber.value = value;
                smoothingValue.innerText = value;
                if (currentMode==='chroma' && currentOriginalFile) showOriginalAndProcess(currentOriginalFile);
            }
            sensitivitySlider.addEventListener('input', (e) => syncSensitivity(e.target.value));
            sensitivityNumber.addEventListener('input', (e) => syncSensitivity(e.target.value));
            smoothingSlider.addEventListener('input', (e) => syncSmoothing(e.target.value));
            smoothingNumber.addEventListener('input', (e) => syncSmoothing(e.target.value));
            preloadModel();
        `;
        document.body.appendChild(moduleScript);
    }
})();
