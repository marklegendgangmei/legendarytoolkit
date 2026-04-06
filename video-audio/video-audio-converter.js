// video-audio-converter.js – Streaming MP4 → Stereo MP3 (handles huge files)
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
                    <h3 class="mt-2">Extract MP3 from MP4 – No file size limit</h3>
                    <p class="text-muted">Streaming processor – handles documentaries, concerts, lectures (any size)</p>
                </div>
                <div id="dropZone" style="border:2px dashed #ccc; border-radius:1.5rem; padding:2rem; text-align:center; cursor:pointer; background:#f9f9f9;">
                    <i class="bi bi-cloud-upload" style="font-size:2rem;"></i>
                    <p class="mt-2">Click or drag MP4 file here (any size)</p>
                    <input type="file" id="fileInput" accept="video/mp4" style="display:none;">
                </div>
                <div class="mt-3">
                    <label class="form-label">Bitrate (kbps)</label>
                    <select id="bitrate" class="form-select w-auto">
                        <option value="96">96 (speech, small file)</option>
                        <option value="128" selected>128 (balanced)</option>
                        <option value="192">192 (music, high quality)</option>
                        <option value="320">320 (best, larger file)</option>
                    </select>
                </div>
                <div class="mt-3">
                    <button id="convertBtn" class="btn btn-dark w-100 py-2" disabled>Convert to MP3</button>
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
            </div>
        `;

        if (!document.querySelector('link[href*="bootstrap-icons"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
            document.head.appendChild(link);
        }

        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const convertBtn = document.getElementById('convertBtn');
        const bitrateSelect = document.getElementById('bitrate');
        const progressArea = document.getElementById('progressArea');
        const progressBar = document.getElementById('progressBar');
        const statusMsg = document.getElementById('statusMsg');
        const resultArea = document.getElementById('resultArea');
        const audioPreview = document.getElementById('audioPreview');
        const downloadLink = document.getElementById('downloadLink');

        let selectedFile = null;
        let abortFlag = false;

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
            selectedFile = file;
            const sizeGB = file.size / (1024*1024*1024);
            dropZone.querySelector('p').innerHTML = `<i class="bi bi-file-earmark-play"></i> ${file.name} (${sizeGB.toFixed(2)} GB)`;
            convertBtn.disabled = false;
            resultArea.style.display = 'none';
        }

        convertBtn.addEventListener('click', startConversion);

        async function startConversion() {
            if (!selectedFile) return;
            convertBtn.disabled = true;
            progressArea.style.display = 'block';
            resultArea.style.display = 'none';
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
            statusMsg.textContent = 'Loading video metadata...';
            abortFlag = false;

            try {
                // Create a video element to get duration and to seek
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.src = URL.createObjectURL(selectedFile);
                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = resolve;
                    video.onerror = reject;
                });

                const duration = video.duration;
                if (!isFinite(duration) || duration <= 0) {
                    throw new Error('Could not determine video duration.');
                }

                const sampleRate = 44100;
                const channels = 2; // stereo
                const bitrate = parseInt(bitrateSelect.value);
                const chunkDuration = 30; // seconds per chunk

                let mp3Encoder = null;
                let encoderInitialized = false;
                let mp3Data = [];
                let totalChunks = Math.ceil(duration / chunkDuration);
                let processedChunks = 0;

                statusMsg.textContent = `Streaming ${duration.toFixed(0)} seconds in ${totalChunks} chunks...`;

                // We'll process each chunk sequentially
                for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                    if (abortFlag) throw new Error('Conversion cancelled by user');

                    const startTime = chunkIndex * chunkDuration;
                    const endTime = Math.min(startTime + chunkDuration, duration);
                    const chunkLen = endTime - startTime;
                    if (chunkLen <= 0) continue;

                    statusMsg.textContent = `Processing chunk ${chunkIndex+1}/${totalChunks} (${Math.floor(startTime/60)}:${(startTime%60).toFixed(0)} – ${Math.floor(endTime/60)}:${(endTime%60).toFixed(0)})`;

                    // Seek video to startTime and capture audio using OfflineAudioContext
                    video.currentTime = startTime;
                    await new Promise(resolve => { video.onseeked = resolve; });

                    // Create OfflineAudioContext with the chunk duration
                    const offlineCtx = new OfflineAudioContext(channels, chunkLen * sampleRate, sampleRate);
                    const source = offlineCtx.createMediaElementSource(video);
                    source.connect(offlineCtx.destination);
                    
                    // Start rendering
                    offlineCtx.startRendering();
                    const renderedBuffer = await new Promise((resolve, reject) => {
                        offlineCtx.oncomplete = (e) => resolve(e.renderedBuffer);
                        offlineCtx.onerror = reject;
                    });

                    // renderedBuffer is an AudioBuffer with the chunk's audio
                    if (!renderedBuffer || renderedBuffer.numberOfChannels === 0) {
                        console.warn(`Chunk ${chunkIndex+1} has no audio, skipping.`);
                        continue;
                    }

                    // Convert AudioBuffer to interleaved Int16 PCM
                    const length = renderedBuffer.length;
                    const actualChannels = renderedBuffer.numberOfChannels;
                    const pcmData = new Int16Array(length * actualChannels);
                    for (let ch = 0; ch < actualChannels; ch++) {
                        const channelData = renderedBuffer.getChannelData(ch);
                        for (let i = 0; i < length; i++) {
                            const val = Math.max(-32768, Math.min(32767, Math.floor(channelData[i] * 32767)));
                            pcmData[i * actualChannels + ch] = val;
                        }
                    }

                    // Initialize encoder on first chunk
                    if (!encoderInitialized) {
                        mp3Encoder = new lamejs.Mp3Encoder(actualChannels, sampleRate, bitrate);
                        encoderInitialized = true;
                    }

                    // Encode this chunk's PCM
                    const chunkSize = 1152 * actualChannels;
                    for (let i = 0; i < pcmData.length; i += chunkSize) {
                        const chunk = pcmData.subarray(i, i + chunkSize);
                        const mp3buf = mp3Encoder.encodeBuffer(chunk);
                        if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));
                    }

                    processedChunks++;
                    const overallProgress = (processedChunks / totalChunks) * 100;
                    progressBar.style.width = overallProgress + '%';
                    progressBar.textContent = Math.floor(overallProgress) + '%';
                    
                    // Allow UI to breathe
                    await new Promise(r => setTimeout(r, 10));
                }

                // Flush encoder
                if (mp3Encoder) {
                    const final = mp3Encoder.flush();
                    if (final.length > 0) mp3Data.push(new Int8Array(final));
                }

                if (mp3Data.length === 0) {
                    throw new Error('No audio data was extracted. The video may have no audio track.');
                }

                // Create MP3 blob
                const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
                const url = URL.createObjectURL(mp3Blob);
                audioPreview.src = url;
                downloadLink.href = url;
                downloadLink.download = selectedFile.name.replace(/\.mp4$/i, '.mp3');
                resultArea.style.display = 'block';
                statusMsg.textContent = 'Conversion complete!';
                progressBar.style.width = '100%';
                progressBar.textContent = '100%';

                // Cleanup
                URL.revokeObjectURL(video.src);
                video.remove();

            } catch (err) {
                console.error(err);
                let userMsg = err.message;
                if (err.name === 'NotSupportedError') userMsg = 'Your browser does not support streaming audio extraction. Please try Chrome or Edge.';
                statusMsg.textContent = 'Error: ' + userMsg;
                alert('Conversion failed: ' + userMsg);
                progressArea.style.display = 'none';
            } finally {
                convertBtn.disabled = false;
            }
        }
    }
})();
