// background-blade.js (with brush cursor restored)
(function() {
    const targetId = 'background-blade-app';
    let target = document.getElementById(targetId);
    if (!target) {
        const interval = setInterval(() => {
            target = document.getElementById(targetId);
            if (target) {
                clearInterval(interval);
                initApp(target);
            }
        }, 100);
        return;
    }
    initApp(target);

    async function initApp(container) {
        const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm');

        // --- HTML structure (same as before, plus a div for the brush cursor) ---
        container.innerHTML = `
            <div class="bg-blade-wrapper">
                <div class="bg-blade-mode-selector">
                    <button id="bg-blade-ai-mode" class="bg-blade-btn-active">🧠 Smart Cutout</button>
                    <button id="bg-blade-chroma-mode" class="bg-blade-btn-inactive">🎨 Green Screen</button>
                </div>
                <div id="bg-blade-chroma-controls" style="display: none;" class="bg-blade-chroma-panel">
                    <label>Sensitivity (lower = cleaner) <span id="bg-blade-sens-value">30</span></label>
                    <input type="range" id="bg-blade-sens-slider" min="0" max="100" value="30">
                    <label>Edge Smoothing <span id="bg-blade-smooth-value">10</span></label>
                    <input type="range" id="bg-blade-smooth-slider" min="0" max="100" value="10">
                </div>
                <div class="bg-blade-upload-zone" id="bg-blade-upload-zone">
                    <div>🖼️</div>
                    <input type="file" id="bg-blade-file-input" accept="image/jpeg,image/png,image/webp" style="display:none">
                    <label id="bg-blade-upload-label" class="bg-blade-primary-btn">📂 Choose image</label>
                    <p class="bg-blade-small-text">or drag & drop (max 8MB)</p>
                </div>
                <div id="bg-blade-status" class="bg-blade-status">⚡ Ready. Select an image to start.</div>
                <div class="bg-blade-row">
                    <div class="bg-blade-col" id="bg-blade-original-col" style="display: none;">
                        <div class="bg-blade-col-title">📷 Original</div>
                        <canvas id="bg-blade-original-canvas" width="400" height="400"></canvas>
                    </div>
                    <div class="bg-blade-col" id="bg-blade-result-col" style="display: none;">
                        <div class="bg-blade-col-title">✂️ Result (click & drag to erase)</div>
                        <canvas id="bg-blade-result-canvas" width="400" height="400"></canvas>
                        <div class="bg-blade-toolbar">
                            <div>
                                <span>Brush size:</span>
                                <input type="range" id="bg-blade-brush-size" min="5" max="100" value="20" style="width:100px">
                                <span id="bg-blade-brush-value">20</span>
                            </div>
                            <div>
                                <button id="bg-blade-undo" class="bg-blade-sm-btn" disabled>↩️ Undo</button>
                                <button id="bg-blade-redo" class="bg-blade-sm-btn" disabled>↪️ Redo</button>
                            </div>
                        </div>
                        <div class="bg-blade-actions">
                            <button id="bg-blade-reset" class="bg-blade-sm-btn-outline">Reset edits</button>
                            <button id="bg-blade-download" class="bg-blade-primary-sm" disabled>⬇️ Download PNG</button>
                        </div>
                    </div>
                </div>
                <div class="bg-blade-footer">🔒 Zero uploads – runs entirely on your device. No watermarks.</div>
            </div>
            <!-- Floating brush cursor (will be positioned absolutely) -->
            <div id="bg-blade-brush-cursor" style="position: fixed; width: 20px; height: 20px; border: 2px solid black; border-radius: 50%; background: rgba(255,255,255,0.3); pointer-events: none; z-index: 9999; transform: translate(-50%, -50%); display: none;"></div>
        `;

        // --- CSS (scoped, includes cursor styling) ---
        const style = document.createElement('style');
        style.textContent = `
            .bg-blade-wrapper {
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
                background: #fff;
                border-radius: 2rem;
                padding: 1.5rem;
                box-shadow: 0 8px 20px rgba(0,0,0,0.08);
                margin: 1rem 0;
                position: relative;
            }
            .bg-blade-mode-selector { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.5rem; }
            .bg-blade-btn-active {
                background: #0a0a0a; color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 40px;
                font-weight: 600; cursor: pointer;
            }
            .bg-blade-btn-inactive {
                background: transparent; color: #0a0a0a; border: 1.5px solid #0a0a0a; padding: 0.5rem 1.5rem;
                border-radius: 40px; font-weight: 600; cursor: pointer;
            }
            .bg-blade-chroma-panel { background: #f5f5f5; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; }
            .bg-blade-chroma-panel label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; }
            .bg-blade-chroma-panel input { width: 100%; margin-bottom: 1rem; }
            .bg-blade-upload-zone {
                border: 2px dashed #ccc; border-radius: 2rem; padding: 2rem; text-align: center;
                background: #faf9ff; cursor: pointer; margin-bottom: 1.5rem;
            }
            .bg-blade-primary-btn {
                background: #0a0a0a; color: white; padding: 0.5rem 1.5rem; border-radius: 40px;
                display: inline-block; cursor: pointer; font-weight: 600; margin-top: 0.5rem;
            }
            .bg-blade-small-text { font-size: 0.75rem; color: #666; margin-top: 0.5rem; }
            .bg-blade-status {
                background: #f0f0f0; border-radius: 40px; padding: 0.75rem 1rem; margin-bottom: 1.5rem;
                text-align: center; font-size: 0.9rem; min-height: 65px;
            }
            .bg-blade-row { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 1rem; }
            .bg-blade-col { flex: 1; min-width: 250px; text-align: center; }
            .bg-blade-col-title { font-weight: 600; margin-bottom: 0.5rem; }
            canvas { max-width: 100%; background: repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 20px 20px; border-radius: 1rem; border: 1px solid #ddd; }
            .bg-blade-toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
            .bg-blade-sm-btn, .bg-blade-sm-btn-outline { padding: 0.25rem 0.75rem; border-radius: 40px; font-size: 0.8rem; cursor: pointer; }
            .bg-blade-sm-btn { background: #0a0a0a; color: white; border: none; }
            .bg-blade-sm-btn-outline { background: transparent; border: 1px solid #0a0a0a; color: #0a0a0a; }
            .bg-blade-primary-sm { background: #0a0a0a; color: white; border: none; padding: 0.25rem 1rem; border-radius: 40px; cursor: pointer; }
            .bg-blade-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 0.75rem; }
            .bg-blade-footer { font-size: 0.7rem; text-align: center; color: #888; margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem; }
            @media (max-width: 680px) { .bg-blade-row { flex-direction: column; } }
        `;
        container.appendChild(style);

        // --- DOM references ---
        const fileInput = document.getElementById('bg-blade-file-input');
        const uploadZone = document.getElementById('bg-blade-upload-zone');
        const uploadLabel = document.getElementById('bg-blade-upload-label');
        const statusDiv = document.getElementById('bg-blade-status');
        const originalCol = document.getElementById('bg-blade-original-col');
        const resultCol = document.getElementById('bg-blade-result-col');
        const originalCanvas = document.getElementById('bg-blade-original-canvas');
        const resultCanvas = document.getElementById('bg-blade-result-canvas');
        const aiBtn = document.getElementById('bg-blade-ai-mode');
        const chromaBtn = document.getElementById('bg-blade-chroma-mode');
        const chromaPanel = document.getElementById('bg-blade-chroma-controls');
        const sensSlider = document.getElementById('bg-blade-sens-slider');
        const sensVal = document.getElementById('bg-blade-sens-value');
        const smoothSlider = document.getElementById('bg-blade-smooth-slider');
        const smoothVal = document.getElementById('bg-blade-smooth-value');
        const brushSlider = document.getElementById('bg-blade-brush-size');
        const brushVal = document.getElementById('bg-blade-brush-value');
        const undoBtn = document.getElementById('bg-blade-undo');
        const redoBtn = document.getElementById('bg-blade-redo');
        const resetBtn = document.getElementById('bg-blade-reset');
        const downloadBtn = document.getElementById('bg-blade-download');
        const brushCursor = document.getElementById('bg-blade-brush-cursor');

        let currentMode = 'ai';
        let model = null, processor = null;
        let workingCanvas = null, originalProcessedCanvas = null;
        let undoStack = [], redoStack = [];
        let isDrawing = false;
        let lastX = 0, lastY = 0;
        let currentBrushSize = 20;
        let currentProcessedBlob = null;
        let currentFile = null;

        // --- Brush cursor logic (restored) ---
        function updateBrushCursorSize() {
            brushCursor.style.width = currentBrushSize + 'px';
            brushCursor.style.height = currentBrushSize + 'px';
        }

        function showBrushCursor() {
            brushCursor.style.display = 'block';
        }

        function hideBrushCursor() {
            brushCursor.style.display = 'none';
        }

        function moveBrushCursor(e) {
            if (resultCol.style.display !== 'block') return;
            brushCursor.style.left = e.clientX + 'px';
            brushCursor.style.top = e.clientY + 'px';
        }

        resultCanvas.addEventListener('mouseenter', showBrushCursor);
        resultCanvas.addEventListener('mouseleave', hideBrushCursor);
        resultCanvas.addEventListener('mousemove', moveBrushCursor);
        brushSlider.addEventListener('input', () => {
            currentBrushSize = parseInt(brushSlider.value);
            brushVal.innerText = currentBrushSize;
            updateBrushCursorSize();
        });
        updateBrushCursorSize();

        // --- Helper functions (same as before) ---
        function setStatus(msg, isError = false, showSpinner = false) {
            statusDiv.innerHTML = '';
            if (showSpinner) {
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                spinner.style.cssText = 'display:inline-block; width:20px; height:20px; border:2px solid #ccc; border-top-color:#000; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:8px;';
                statusDiv.appendChild(spinner);
            }
            const span = document.createElement('span');
            span.textContent = msg;
            if (isError) span.style.color = '#c00';
            statusDiv.appendChild(span);
        }

        function loadImageToCanvas(file, canvas, maxDim = 500) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const ctx = canvas.getContext('2d');
                    let w = img.width, h = img.height;
                    if (w > maxDim || h > maxDim) {
                        const ratio = Math.min(maxDim / w, maxDim / h);
                        w = Math.floor(w * ratio);
                        h = Math.floor(h * ratio);
                    }
                    canvas.width = w;
                    canvas.height = h;
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(img);
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(file);
            });
        }

        // --- Eraser functions (pixel‑accurate) ---
        function eraseCircle(x, y, radius) {
            const ctx = workingCanvas.getContext('2d');
            const imgData = ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
            const data = imgData.data;
            const w = workingCanvas.width, h = workingCanvas.height;
            const radiusSq = radius * radius;
            const xMin = Math.max(0, Math.floor(x - radius));
            const xMax = Math.min(w, Math.ceil(x + radius));
            const yMin = Math.max(0, Math.floor(y - radius));
            const yMax = Math.min(h, Math.ceil(y + radius));
            for (let py = yMin; py < yMax; py++) {
                for (let px = xMin; px < xMax; px++) {
                    const dx = px - x, dy = py - y;
                    if (dx*dx + dy*dy <= radiusSq) {
                        const idx = (py * w + px) * 4 + 3;
                        data[idx] = 0;
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }

        function eraseLine(x0, y0, x1, y1, radius) {
            const ctx = workingCanvas.getContext('2d');
            const imgData = ctx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
            const data = imgData.data;
            const w = workingCanvas.width, h = workingCanvas.height;
            const radiusSq = radius * radius;
            const dx = x1 - x0, dy = y1 - y0;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.001) { eraseCircle(x0, y0, radius); return; }
            const steps = Math.ceil(dist / (radius * 0.5));
            for (let t = 0; t <= steps; t++) {
                const frac = t / steps;
                const cx = x0 + dx * frac;
                const cy = y0 + dy * frac;
                const xMin = Math.max(0, Math.floor(cx - radius));
                const xMax = Math.min(w, Math.ceil(cx + radius));
                const yMin = Math.max(0, Math.floor(cy - radius));
                const yMax = Math.min(h, Math.ceil(cy + radius));
                for (let py = yMin; py < yMax; py++) {
                    for (let px = xMin; px < xMax; px++) {
                        const dxc = px - cx, dyc = py - cy;
                        if (dxc*dxc + dyc*dyc <= radiusSq) {
                            const idx = (py * w + px) * 4 + 3;
                            data[idx] = 0;
                        }
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }

        function startDraw(e) {
            e.preventDefault();
            isDrawing = true;
            const pos = getCanvasCoords(e);
            lastX = pos.x; lastY = pos.y;
            eraseCircle(lastX, lastY, currentBrushSize / 2);
            saveToUndo();
            updateDisplay();
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            const pos = getCanvasCoords(e);
            const x = pos.x, y = pos.y;
            eraseLine(lastX, lastY, x, y, currentBrushSize / 2);
            lastX = x; lastY = y;
            updateDisplay();
        }

        function stopDraw() { isDrawing = false; }

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
            updateDisplay();
        }

        function redo() {
            if (redoStack.length === 0) return;
            const curr = workingCanvas.getContext('2d').getImageData(0, 0, workingCanvas.width, workingCanvas.height);
            undoStack.push(curr);
            const next = redoStack.pop();
            workingCanvas.getContext('2d').putImageData(next, 0, 0);
            undoBtn.disabled = false;
            if (redoStack.length === 0) redoBtn.disabled = true;
            updateDisplay();
        }

        function resetEdits() {
            if (!workingCanvas || !originalProcessedCanvas) return;
            saveToUndo();
            const ctx = workingCanvas.getContext('2d');
            ctx.clearRect(0, 0, workingCanvas.width, workingCanvas.height);
            ctx.drawImage(originalProcessedCanvas, 0, 0);
            updateDisplay();
        }

        function updateDisplay() {
            if (!workingCanvas) return;
            const ctx = resultCanvas.getContext('2d');
            resultCanvas.width = workingCanvas.width;
            resultCanvas.height = workingCanvas.height;
            ctx.drawImage(workingCanvas, 0, 0);
            workingCanvas.toBlob(blob => { currentProcessedBlob = blob; downloadBtn.disabled = false; }, 'image/png');
        }

        // --- Artifact removal (median + morphological close) ---
        function cleanMask(canvas) {
            const ctx = canvas.getContext('2d');
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const w = canvas.width, h = canvas.height;
            const alpha = new Uint8Array(w*h);
            for (let i=0; i<w*h; i++) alpha[i] = data[i*4+3];
            const filtered = new Uint8Array(w*h);
            for (let y=0; y<h; y++) {
                for (let x=0; x<w; x++) {
                    const neighbors = [];
                    for (let ky=-2; ky<=2; ky++) {
                        for (let kx=-2; kx<=2; kx++) {
                            const nx = x+kx, ny = y+ky;
                            if (nx>=0 && nx<w && ny>=0 && ny<h) neighbors.push(alpha[ny*w+nx]);
                        }
                    }
                    neighbors.sort((a,b)=>a-b);
                    filtered[y*w+x] = neighbors[Math.floor(neighbors.length/2)];
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

        // --- AI model loading and processing ---
        async function loadAIModel() {
            if (model && processor) return true;
            setStatus('🧠 Loading AI engine (first time ~45MB)...', false, true);
            try {
                const { AutoModel, AutoProcessor, RawImage } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm');
                model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
                    progress_callback: (p) => {
                        if (p.status === 'downloading') setStatus(`📥 Downloading: ${Math.round(p.progress*100)}%`, false, true);
                    }
                });
                processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
                    config: { do_normalize: true, do_resize: true, size: { width: 1024, height: 1024 } }
                });
                setStatus('✅ Engine ready.', false, false);
                return true;
            } catch(e) { console.error(e); setStatus('❌ Engine load failed.', true); return false; }
        }

        async function processAIMode(file) {
            if (!await loadAIModel()) return null;
            setStatus('🎨 Creating smart mask...', false, true);
            const url = URL.createObjectURL(file);
            const { RawImage } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm');
            const img = await RawImage.fromURL(url);
            URL.revokeObjectURL(url);
            const { pixel_values } = await processor(img);
            const { output } = await model({ input: pixel_values });
            const maskTensor = output[0];
            const maskImg = await RawImage.fromTensor(maskTensor.mul(255).to('uint8'));
            const maskCanvas = maskImg.toCanvas();
            const maskResized = document.createElement('canvas');
            maskResized.width = img.width; maskResized.height = img.height;
            const maskCtx = maskResized.getContext('2d');
            maskCtx.drawImage(maskCanvas, 0, 0, img.width, img.height);
            const maskData = maskCtx.getImageData(0, 0, img.width, img.height).data;
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img.toCanvas(), 0, 0);
            const pixelData = ctx.getImageData(0, 0, img.width, img.height);
            for (let i=0; i<img.width*img.height; i++) pixelData.data[i*4+3] = maskData[i*4];
            ctx.putImageData(pixelData, 0, 0);
            cleanMask(canvas);
            const smoothing = parseInt(smoothSlider.value) / 20;
            if (smoothing > 0) {
                for (let s=0; s<smoothing; s++) {
                    ctx.filter = 'blur(1px)';
                    ctx.drawImage(canvas, 0, 0);
                    ctx.filter = 'none';
                }
            }
            return canvas;
        }

        function chromaKeyRemoval(imgElement, sensitivity, smoothing) {
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.width; canvas.height = imgElement.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const thresh = sensitivity * 2.55;
            for (let i=0; i<data.length; i+=4) {
                const g = data[i+1];
                if (g - Math.max(data[i], data[i+2]) > thresh && g > 50) data[i+3] = 0;
            }
            ctx.putImageData(imgData, 0, 0);
            cleanMask(canvas);
            const smoothIter = Math.floor(smoothing / 20);
            if (smoothIter > 0) {
                for (let s=0; s<smoothIter; s++) {
                    ctx.filter = 'blur(1px)';
                    ctx.drawImage(canvas, 0, 0);
                    ctx.filter = 'none';
                }
            }
            return canvas;
        }

        async function processImage(file) {
            if (!file) return;
            if (file.size > 8*1024*1024) { setStatus('❌ Max 8MB', true); return; }
            setStatus('📷 Loading preview...', false, true);
            const img = await loadImageToCanvas(file, originalCanvas, 500);
            originalCol.style.display = 'block';
            resultCol.style.display = 'none';
            setStatus('🖌️ Processing... please wait', false, true);
            let processed;
            if (currentMode === 'ai') {
                processed = await processAIMode(file);
            } else {
                const sens = parseInt(sensSlider.value);
                const smooth = parseInt(smoothSlider.value);
                processed = chromaKeyRemoval(img, sens, smooth);
            }
            if (!processed) throw new Error('Processing failed');
            workingCanvas = document.createElement('canvas');
            workingCanvas.width = processed.width; workingCanvas.height = processed.height;
            workingCanvas.getContext('2d').drawImage(processed, 0, 0);
            originalProcessedCanvas = document.createElement('canvas');
            originalProcessedCanvas.width = processed.width; originalProcessedCanvas.height = processed.height;
            originalProcessedCanvas.getContext('2d').drawImage(processed, 0, 0);
            resultCanvas.width = processed.width; resultCanvas.height = processed.height;
            resultCanvas.getContext('2d').drawImage(processed, 0, 0);
            resultCol.style.display = 'block';
            undoStack = []; redoStack = [];
            undoBtn.disabled = true; redoBtn.disabled = true;
            updateDisplay();
            setStatus('✅ Ready. Use eraser to clean up leftovers.', false);
        }

        function handleFile(file) {
            const allowed = ['image/jpeg','image/png','image/webp'];
            if (!allowed.includes(file.type)) { setStatus('❌ Only JPEG, PNG, WebP', true); return; }
            currentFile = file;
            processImage(file);
        }

        // --- Event listeners ---
        uploadLabel.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
        uploadZone.addEventListener('dragover', e => e.preventDefault());
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
        uploadZone.addEventListener('drop', e => {
            e.preventDefault();
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
        resetBtn.addEventListener('click', resetEdits);

        resultCanvas.addEventListener('mousedown', startDraw);
        resultCanvas.addEventListener('mousemove', draw);
        resultCanvas.addEventListener('mouseup', stopDraw);
        resultCanvas.addEventListener('mouseleave', stopDraw);
        resultCanvas.addEventListener('touchstart', startDraw);
        resultCanvas.addEventListener('touchmove', draw);
        resultCanvas.addEventListener('touchend', stopDraw);

        aiBtn.addEventListener('click', () => {
            currentMode = 'ai';
            aiBtn.className = 'bg-blade-btn-active';
            chromaBtn.className = 'bg-blade-btn-inactive';
            chromaPanel.style.display = 'none';
            if (currentFile) processImage(currentFile);
        });
        chromaBtn.addEventListener('click', () => {
            currentMode = 'chroma';
            chromaBtn.className = 'bg-blade-btn-active';
            aiBtn.className = 'bg-blade-btn-inactive';
            chromaPanel.style.display = 'block';
            if (currentFile) processImage(currentFile);
        });
        sensSlider.addEventListener('input', () => { sensVal.innerText = sensSlider.value; if (currentMode==='chroma' && currentFile) processImage(currentFile); });
        smoothSlider.addEventListener('input', () => { smoothVal.innerText = smoothSlider.value; if (currentMode==='chroma' && currentFile) processImage(currentFile); });

        // Spinner animation
        const spinStyle = document.createElement('style');
        spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(spinStyle);
    }
})();
