// video-audio-converter.js – MP4 to MP3 Converter (pure JS, no FFmpeg)
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
                    <span class="badge bg-dark rounded-pill px-3 py-2">🎵 Video → Audio</span>
                    <h3 class="mt-2">Extract MP3 from MP4</h3>
                    <p class="text-muted">100% local – no upload, no server</p>
                </div>
                <div id="dropZone" style="border:2px dashed #ccc; border-radius:1.5rem; padding:2rem; text-align:center; cursor:pointer; background:#f9f9f9;">
                    <i class="bi bi-cloud-upload" style="font-size:2rem;"></i>
                    <p class="mt-2">Click or drag MP4 file here</p>
                    <input type="file" id="fileInput" accept="video/mp4" style="display:none;">
                </div>
                <div class="mt-3">
                    <label class="form-label">Bitrate (kbps)</label>
                    <select id="bitrate" class="form-select w-auto">
                        <option value="96">96 (smaller file)</option>
                        <option value="128" selected>128 (balanced)</option>
                        <option value="192">192 (high quality)</option>
                        <option value="320">320 (best)</option>
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
            dropZone.querySelector('p').innerHTML = `<i class="bi bi-file-earmark-play"></i> ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
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
            statusMsg.textContent = 'Loading video...';

            try {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(selectedFile);
                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = resolve;
                    video.onerror = reject;
                });
                
                statusMsg.textContent = 'Decoding audio...';
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const response = await fetch(video.src);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                const samples = audioBuffer.getChannelData(0); // mono
                const sampleRate = audioBuffer.sampleRate;
                const pcmData = new Int16Array(samples.length);
                for (let i = 0; i < samples.length; i++) {
                    pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(samples[i] * 32767)));
                }
                
                statusMsg.textContent = 'Encoding MP3...';
                const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, parseInt(bitrateSelect.value));
                const mp3Data = [];
                const chunkSize = 1152;
                for (let i = 0; i < pcmData.length; i += chunkSize) {
                    const chunk = pcmData.subarray(i, i + chunkSize);
                    const mp3buf = mp3Encoder.encodeBuffer(chunk);
                    if (mp3buf.length > 0) mp3Data.push(new Int8Array(mp3buf));
                    const percent = Math.floor((i / pcmData.length) * 100);
                    progressBar.style.width = percent + '%';
                    progressBar.textContent = percent + '%';
                }
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
                console.error(err);
                statusMsg.textContent = 'Error: ' + err.message;
                alert('Conversion failed: ' + err.message);
            } finally {
                convertBtn.disabled = false;
            }
        }
    }
})();
