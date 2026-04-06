// video-audio-converter.js – MP4 to MP3 with cancel button, file size warning, and visibility toast
(function() {
    const container = document.getElementById('video-audio-converter');
    if (!container) {
        console.error('Missing <div id="video-audio-converter"></div>');
        return;
    }

    const lamejsUrl = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
    if (!window.lamejs) {
        const script = document.createElement('script');
        script.src = lamejsUrl;
        script.onload = initUI;
        document.head.appendChild(script);
    } else {
        initUI();
    }

    function initUI() {
        container.innerHTML = `
            <div class="glass-card p-4" style="max-width:800px; margin:0 auto;">
                <div class="text-center mb-3">
                    <span class="badge bg-dark rounded-pill px-3 py-2">🎵 Video → Stereo MP3</span>
                    <h3 class="mt-2">Extract MP3 from MP4</h3>
                    <p class="text-muted">100% local – no upload – works for files up to 250 MB</p>
                </div>
                <div id="dropZone" style="border:2px dashed #ccc; border-radius:1.5rem; padding:2rem; text-align:center; cursor:pointer; background:#f9f9f9;">
                    <i class="bi bi-cloud-upload" style="font-size:2rem;"></i>
                    <p class="mt-2">Click or drag MP4 file here</p>
                    <input type="file" id="fileInput" accept="video/mp4" style="display:none;">
                </div>
                <div class="mt-2" id="fileSizeDisplay" style="font-size:0.9rem; color:#6c757d;"></div>
                <div class="mt-3">
                    <label class="form-label">Bitrate (kbps)</label>
                    <select id="bitrate" class="form-select w-auto">
                        <option value="96">96 (speech, small file)</option>
                        <option value="128" selected>128 (balanced)</option>
                        <option value="192">192 (music, high quality)</option>
                        <option value="320">320 (best, larger file)</option>
                    </select>
                </div>
                <div class="mt-3 d-flex gap-2">
                    <button id="convertBtn" class="btn btn-dark flex-grow-1 py-2" disabled>Convert to MP3</button>
                    <button id="cancelBtn" class="btn btn-outline-secondary py-2" disabled style="min-width:100px;">Cancel</button>
                </div>
                <div id="progressArea" style="display:none;" class="mt-3">
                    <div class="progress">
                        <div id="progressBar" class="progress-bar" style="width:0%">0%</div>
                    </div>
                    <p id="statusMsg" class="small text-muted mt-1">Processing...</p>
                </div>
                <div id="resultArea" style="display:none;" class="mt-3">
                    <audio id="audioPreview" controls class="w-100 mb-2"></audio>
                    <a id="downloadLink" class="btn btn-outline-dark w-100" download>Download MP3</a>
                </div>
                <div class="mt-3 small text-muted text-center">
                    <i class="bi bi-shield-check"></i> Your file never leaves your device
                </div>
                <div class="mt-2 small text-warning text-center">
                    ⚡ For videos larger than 250 MB, use the free app <a href="https://www.videolan.org/vlc/" target="_blank">VLC</a> (Media → Convert/Save)
                </div>
            </div>
            <!-- Bootstrap Toast for visibility warning -->
            <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                <div id="visibilityToast" class="toast bg-dark text-white" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="false">
                    <div class="toast-header bg-dark text-white border-bottom-0">
                        <i class="bi bi-eye-slash me-2"></i>
                        <strong class="me-auto">Conversion Paused</strong>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-body">
                        Conversion paused because you left the page. It will resume when you return.
                    </div>
                </div>
            </div>
        `;

        // Load Bootstrap Icons if missing
        if (!document.querySelector('link[href*="bootstrap-icons"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
            document.head.appendChild(link);
        }

        // Ensure Bootstrap JS is loaded for toast (if not already)
        if (typeof bootstrap === 'undefined') {
            const bootstrapScript = document.createElement('script');
            bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';
            bootstrapScript.onload = () => console.log('Bootstrap JS loaded');
            document.head.appendChild(bootstrapScript);
        }

        // DOM elements
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const convertBtn = document.getElementById('convertBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const bitrateSelect = document.getElementById('bitrate');
        const progressArea = document.getElementById('progressArea');
        const progressBar = document.getElementById('progressBar');
        const statusMsg = document.getElementById('statusMsg');
        const resultArea = document.getElementById('resultArea');
        const audioPreview = document.getElementById('audioPreview');
        const downloadLink = document.getElementById('downloadLink');
        const fileSizeDisplay = document.getElementById('fileSizeDisplay');

        let selectedFile = null;
        let abortFlag = false;
        let currentConversionPromise = null;
        let isConverting = false;
        let toastInstance = null;

        // Helper: format file size
        function formatSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Initialize toast (wait for Bootstrap)
        function initToast() {
            const toastEl = document.getElementById('visibilityToast');
            if (toastEl && typeof bootstrap !== 'undefined') {
                toastInstance = new bootstrap.Toast(toastEl, { autohide: false });
            }
        }
        setTimeout(initToast, 500); // allow Bootstrap to load

        // Visibility change handler
        function handleVisibilityChange() {
            if (!isConverting) return;
            if (document.hidden) {
                // Page hidden: show toast
                if (toastInstance) toastInstance.show();
                statusMsg.innerHTML = '<i class="bi bi-pause-circle"></i> Conversion paused – you left the page. It will resume when you return.';
            } else {
                // Page visible: hide toast
                if (toastInstance) toastInstance.hide();
                statusMsg.innerHTML = 'Resuming conversion...';
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Drag & drop
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#000'; });
        dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = '#ccc');
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#ccc';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('video/')) handleFile(file);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleFile(e.target.files[0]);
        });

        function handleFile(file) {
            const sizeMB = file.size / (1024 * 1024);
            fileSizeDisplay.innerHTML = `📁 ${file.name} – ${formatSize(file.size)}`;
            if (sizeMB > 250) {
                fileSizeDisplay.innerHTML += `<span class="text-danger"> ⚠️ Exceeds 250 MB limit. Please use VLC.</span>`;
                convertBtn.disabled = true;
                selectedFile = null;
                return;
            } else {
                fileSizeDisplay.innerHTML += ` <span class="text-success"> ✓ within limit</span>`;
                selectedFile = file;
                convertBtn.disabled = false;
            }
            resultArea.style.display = 'none';
            cancelBtn.disabled = true;
        }

        convertBtn.addEventListener('click', startConversion);
        cancelBtn.addEventListener('click', () => {
            if (currentConversionPromise) {
                abortFlag = true;
                statusMsg.textContent = 'Cancelling... Please wait.';
                cancelBtn.disabled = true;
            }
        });

        async function startConversion() {
            if (!selectedFile) return;
            abortFlag = false;
            isConverting = true;
            convertBtn.disabled = true;
            cancelBtn.disabled = false;
            progressArea.style.display = 'block';
            resultArea.style.display = 'none';
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
            statusMsg.textContent = 'Loading video...';

            currentConversionPromise = (async () => {
                try {
                    const video = document.createElement('video');
                    video.src = URL.createObjectURL(selectedFile);
                    await new Promise((resolve, reject) => {
                        video.onloadedmetadata = resolve;
                        video.onerror = reject;
                    });

                    if (abortFlag) throw new Error('Cancelled');

                    statusMsg.textContent = 'Decoding audio...';
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const response = await fetch(video.src);
                    const arrayBuffer = await response.arrayBuffer();
                    let audioBuffer;
                    try {
                        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    } catch (decodeError) {
                        throw new Error('Failed to decode audio. The file may have no audio track or uses an unsupported codec.');
                    }

                    if (abortFlag) throw new Error('Cancelled');

                    if (!audioBuffer || audioBuffer.numberOfChannels === 0) {
                        throw new Error('This video does not contain an audio track.');
                    }

                    const channels = audioBuffer.numberOfChannels;
                    const sampleRate = audioBuffer.sampleRate;
                    const length = audioBuffer.length;

                    statusMsg.textContent = `Encoding ${channels}-channel MP3...`;

                    // Separate channel data
                    let left = new Int16Array(length);
                    let right = null;
                    const leftData = audioBuffer.getChannelData(0);
                    for (let i = 0; i < length; i++) {
                        left[i] = Math.max(-32768, Math.min(32767, Math.floor(leftData[i] * 32767)));
                    }
                    if (channels >= 2) {
                        right = new Int16Array(length);
                        const rightData = audioBuffer.getChannelData(1);
                        for (let i = 0; i < length; i++) {
                            right[i] = Math.max(-32768, Math.min(32767, Math.floor(rightData[i] * 32767)));
                        }
                    }

                    const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, parseInt(bitrateSelect.value));
                    const mp3Data = [];
                    const chunkSize = 1152;
                    let processed = 0;

                    if (channels === 1) {
                        for (let i = 0; i < length; i += chunkSize) {
                            if (abortFlag) throw new Error('Cancelled');
                            const chunk = left.subarray(i, i + chunkSize);
                            const mp3buf = mp3Encoder.encodeBuffer(chunk);
                            if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));
                            processed += chunk.length;
                            const percent = Math.floor((processed / length) * 100);
                            progressBar.style.width = percent + '%';
                            progressBar.textContent = percent + '%';
                            await new Promise(r => setTimeout(r, 0));
                        }
                    } else {
                        for (let i = 0; i < length; i += chunkSize) {
                            if (abortFlag) throw new Error('Cancelled');
                            const leftChunk = left.subarray(i, i + chunkSize);
                            const rightChunk = right.subarray(i, i + chunkSize);
                            const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
                            if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));
                            processed += leftChunk.length;
                            const percent = Math.floor((processed / length) * 100);
                            progressBar.style.width = percent + '%';
                            progressBar.textContent = percent + '%';
                            await new Promise(r => setTimeout(r, 0));
                        }
                    }

                    if (abortFlag) throw new Error('Cancelled');

                    const final = mp3Encoder.flush();
                    if (final.length > 0) mp3Data.push(new Int8Array(final));

                    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
                    const url = URL.createObjectURL(mp3Blob);
                    audioPreview.src = url;
                    downloadLink.href = url;
                    downloadLink.download = selectedFile.name.replace(/\.mp4$/i, '.mp3');
                    resultArea.style.display = 'block';
                    statusMsg.textContent = 'Conversion complete!';
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';

                    URL.revokeObjectURL(video.src);
                    await audioContext.close();
                } catch (err) {
                    if (err.message === 'Cancelled') {
                        statusMsg.textContent = 'Conversion cancelled.';
                        progressArea.style.display = 'none';
                    } else {
                        console.error(err);
                        let userMessage = err.message;
                        if (err.message.includes('decodeAudioData')) userMessage = 'The video could not be decoded. It may have no audio track or uses an unsupported codec.';
                        else if (err.message.includes('does not contain an audio track')) userMessage = 'This video does not contain an audio track.';
                        statusMsg.textContent = 'Error: ' + userMessage;
                        alert('Conversion failed: ' + userMessage);
                        progressArea.style.display = 'none';
                    }
                } finally {
                    isConverting = false;
                    convertBtn.disabled = false;
                    cancelBtn.disabled = true;
                    currentConversionPromise = null;
                    abortFlag = false;
                    // Hide toast if still visible
                    if (toastInstance) toastInstance.hide();
                    statusMsg.innerHTML = ''; // clear any pause message
                }
            })();

            await currentConversionPromise;
        }
    }
})();
