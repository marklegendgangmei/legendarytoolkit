// video-audio-converter.js – MP4 to MP3 (robust encoding)
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
                    <p class="mt-2">Click or drag MP4 file here (max 250 MB)</p>
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
                <div class="mt-2 small text-warning text-center">
                    ⚡ For videos larger than 250 MB or without audio, use the free app <a href="https://www.videolan.org/vlc/" target="_blank">VLC</a> (Media → Convert/Save)
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
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > 250) {
                alert(`File is ${sizeMB.toFixed(0)} MB. This converter only supports files up to 250 MB.\n\nFor larger videos, please use VLC (free):\n1. Open VLC → Media → Convert/Save\n2. Add your file → Convert/Save\n3. Choose Audio – MP3 profile\n4. Start`);
                return;
            }
            selectedFile = file;
            dropZone.querySelector('p').innerHTML = `<i class="bi bi-file-earmark-play"></i> ${file.name} (${(sizeMB).toFixed(2)} MB)`;
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
                let audioBuffer;
                try {
                    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                } catch (decodeError) {
                    console.error('decodeAudioData error:', decodeError);
                    throw new Error('Failed to decode audio. The file may have no audio track or uses an unsupported codec.');
                }

                if (!audioBuffer || audioBuffer.numberOfChannels === 0) {
                    throw new Error('This video does not contain an audio track.');
                }

                const channels = audioBuffer.numberOfChannels;
                const sampleRate = audioBuffer.sampleRate;
                const length = audioBuffer.length;

                if (length === 0) {
                    throw new Error('Audio track has zero length.');
                }

                statusMsg.textContent = `Encoding ${channels}-channel MP3...`;

                // Convert AudioBuffer to interleaved Int16 PCM
                const pcmData = new Int16Array(length * channels);
                for (let ch = 0; ch < channels; ch++) {
                    const channelData = audioBuffer.getChannelData(ch);
                    if (!channelData) {
                        throw new Error(`Channel ${ch} data is missing.`);
                    }
                    for (let i = 0; i < length; i++) {
                        const val = Math.max(-32768, Math.min(32767, Math.floor(channelData[i] * 32767)));
                        pcmData[i * channels + ch] = val;
                    }
                }

                if (pcmData.length === 0) {
                    throw new Error('PCM data is empty.');
                }

                const mp3Encoder = new lamejs.Mp3Encoder(channels, sampleRate, parseInt(bitrateSelect.value));
                const mp3Data = [];
                // Use a reasonable chunk size (samples per channel * channels)
                const samplesPerChunk = 1152; // typical MP3 frame size
                const chunkSize = samplesPerChunk * channels;
                let processed = 0;

                for (let i = 0; i < pcmData.length; i += chunkSize) {
                    const end = Math.min(i + chunkSize, pcmData.length);
                    const chunk = pcmData.subarray(i, end);
                    // Only encode if chunk has at least one sample per channel
                    if (chunk.length >= channels) {
                        const mp3buf = mp3Encoder.encodeBuffer(chunk);
                        if (mp3buf && mp3buf.length > 0) {
                            mp3Data.push(new Int8Array(mp3buf));
                        }
                    }
                    processed += chunk.length;
                    const percent = Math.floor((processed / pcmData.length) * 100);
                    progressBar.style.width = percent + '%';
                    progressBar.textContent = percent + '%';
                    await new Promise(r => setTimeout(r, 0));
                }

                const final = mp3Encoder.flush();
                if (final && final.length > 0) {
                    mp3Data.push(new Int8Array(final));
                }

                if (mp3Data.length === 0) {
                    throw new Error('No MP3 data was produced.');
                }

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
                console.error('Conversion error:', err);
                let userMessage = err.message;
                if (err.message.includes('decodeAudioData')) {
                    userMessage = 'The video could not be decoded. It may have no audio track or uses an unsupported codec.';
                } else if (err.message.includes('does not contain an audio track')) {
                    userMessage = 'This video does not contain an audio track.';
                }
                statusMsg.textContent = 'Error: ' + userMessage;
                alert('Conversion failed: ' + userMessage);
                progressArea.style.display = 'none';
            } finally {
                convertBtn.disabled = false;
            }
        }
    }
})();
