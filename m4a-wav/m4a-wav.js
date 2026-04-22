(function() {
  "use strict";

  // Ensure Bootstrap CSS (if not already present in your Blogger theme)
  if (!document.querySelector('link[href*="bootstrap.min.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css';
    document.head.appendChild(link);
  }

  // Custom styles: glass-card, button, dropzone
  if (!document.getElementById('m4aWavCustomStyles')) {
    const style = document.createElement('style');
    style.id = 'm4aWavCustomStyles';
    style.textContent = `
      .glass-card {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(12px);
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
        padding: 1.5rem;
        transition: all 0.3s ease;
      }
      @media (prefers-color-scheme: dark) {
        .glass-card {
          background: rgba(20, 20, 30, 0.7);
          border-color: rgba(255, 255, 255, 0.1);
        }
      }
      .btn-dark-custom {
        background: #0a0a0a;
        color: white;
        border-radius: 60px;
        padding: 0.5rem 1.5rem;
        transition: 0.25s;
        display: inline-block;
        text-align: center;
        border: none;
      }
      .btn-dark-custom:hover {
        background: #2c2c2c;
        transform: scale(1.02);
        color: white;
      }
      .dropzone-border {
        border: 2px dashed #ced4da;
        border-radius: 1rem;
        transition: all 0.2s;
        cursor: pointer;
      }
      .dropzone-border.drag-over {
        border-color: #0a0a0a;
        background-color: rgba(0,0,0,0.05);
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- WAV ENCODER (16-bit PCM) ----------
  function writeWavHeader(view, offset, sampleRate, numChannels, numSamples) {
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const totalSize = 36 + dataSize;

    view.setUint32(offset + 0, 0x52494646, false);
    view.setUint32(offset + 4, totalSize, true);
    view.setUint32(offset + 8, 0x57415645, false);
    view.setUint32(offset + 12, 0x666D7420, false);
    view.setUint32(offset + 16, 16, true);
    view.setUint16(offset + 20, 1, true);
    view.setUint16(offset + 22, numChannels, true);
    view.setUint32(offset + 24, sampleRate, true);
    view.setUint32(offset + 28, byteRate, true);
    view.setUint16(offset + 32, blockAlign, true);
    view.setUint16(offset + 34, bytesPerSample * 8, true);
    view.setUint32(offset + 36, 0x64617461, false);
    view.setUint32(offset + 40, dataSize, true);
  }

  function audioBufferToWavBlob(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(buffer);
    writeWavHeader(view, 0, sampleRate, numChannels, length);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = audioBuffer.getChannelData(ch)[i];
        sample = Math.max(-1, Math.min(1, sample));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, int16, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function convertM4aToWav(arrayBuffer, onProgress) {
    onProgress('Decoding M4A/AAC...');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
      audioCtx.close();
      throw new Error(`Decoding failed: ${err.message}`);
    }
    onProgress('Encoding to WAV (16-bit PCM)...');
    const wavBlob = audioBufferToWavBlob(audioBuffer);
    await audioCtx.close();
    return wavBlob;
  }

  // ---------- UI BUILDER (with glass-card wrapper) ----------
  function buildUI(container) {
    container.innerHTML = `
      <div class="glass-card">
        <h2 class="h3 mb-2 fw-semibold">🎵 M4A to WAV Converter</h2>
        <p class="text-secondary mb-4">Convert M4A / AAC files to lossless WAV (PCM 16-bit)</p>
        
        <div id="m4aDropzone" class="dropzone-border p-4 text-center mb-4">
          <div class="fs-1 mb-2">📂🎧</div>
          <p class="mb-1 fw-semibold">Drag & drop your .m4a file here</p>
          <p class="small text-secondary">or click to browse</p>
          <input type="file" id="m4aFileInput" class="d-none" accept=".m4a,.mp4,audio/mp4,audio/x-m4a,audio/aac" />
        </div>

        <div id="m4aFileInfoArea" class="d-none mb-3"></div>

        <div class="d-flex justify-content-center gap-3 flex-wrap">
          <button id="m4aConvertBtn" class="btn-dark-custom" disabled>⟳ Convert to WAV</button>
        </div>

        <div id="m4aStatusMsg" class="alert mt-3 d-none" role="alert"></div>
        <div id="m4aDownloadArea" class="mt-4 d-none text-center"></div>
      </div>
    `;

    const dropzone = container.querySelector('#m4aDropzone');
    const fileInput = container.querySelector('#m4aFileInput');
    const convertBtn = container.querySelector('#m4aConvertBtn');
    const fileInfoArea = container.querySelector('#m4aFileInfoArea');
    const statusDiv = container.querySelector('#m4aStatusMsg');
    const downloadArea = container.querySelector('#m4aDownloadArea');

    let currentFile = null;
    let currentArrayBuffer = null;
    let isConverting = false;

    function setStatus(message, isError = false) {
      statusDiv.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info');
      statusDiv.classList.add(isError ? 'alert-danger' : 'alert-info');
      statusDiv.textContent = message;
    }

    function clearStatus() {
      statusDiv.classList.add('d-none');
    }

    function resetDownloadArea() {
      downloadArea.classList.add('d-none');
      downloadArea.innerHTML = '';
    }

    function resetSelection() {
      currentFile = null;
      currentArrayBuffer = null;
      fileInput.value = '';
      fileInfoArea.classList.add('d-none');
      convertBtn.disabled = true;
      resetDownloadArea();
      clearStatus();
      dropzone.classList.remove('drag-over');
      setStatus('No file selected. Choose an M4A file.', false);
      setTimeout(() => clearStatus(), 2000);
    }

    function displayFileInfo(file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      fileInfoArea.classList.remove('d-none');
      fileInfoArea.innerHTML = `
        <div class="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 flex-wrap gap-2">
          <span><strong>📄 ${escapeHtml(file.name)}</strong></span>
          <span class="badge bg-secondary">${sizeMB} MB</span>
          <button id="clearFileBtn" class="btn btn-sm btn-outline-secondary">✖ Change file</button>
        </div>
      `;
      fileInfoArea.querySelector('#clearFileBtn').addEventListener('click', resetSelection);
    }

    async function handleFile(file) {
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      const validTypes = ['audio/mp4', 'audio/x-m4a', 'audio/aac', 'video/mp4'];
      if (!validTypes.includes(file.type) && !['m4a', 'mp4', 'aac'].includes(ext)) {
        setStatus('❌ Unsupported file. Please select .m4a or .mp4 (AAC).', true);
        resetSelection();
        return;
      }
      currentFile = file;
      displayFileInfo(file);
      convertBtn.disabled = false;
      setStatus(`✅ Ready: ${file.name}`, false);
      try {
        currentArrayBuffer = await file.arrayBuffer();
        setStatus(`File loaded (${(currentArrayBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB). Click convert.`, false);
      } catch (err) {
        setStatus(`Read error: ${err.message}`, true);
        convertBtn.disabled = true;
      }
    }

    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) handleFile(e.target.files[0]);
      else resetSelection();
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    dropzone.addEventListener('click', () => fileInput.click());

    convertBtn.addEventListener('click', async () => {
      if (isConverting || !currentFile || !currentArrayBuffer) return;
      isConverting = true;
      convertBtn.disabled = true;
      convertBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
      resetDownloadArea();
      setStatus('🔄 Decoding & converting... large files may take a moment.', false);
      try {
        const wavBlob = await convertM4aToWav(currentArrayBuffer, (msg) => setStatus(msg, false));
        const originalName = currentFile.name.replace(/\.(m4a|mp4|aac)$/i, '');
        const downloadUrl = URL.createObjectURL(wavBlob);
        downloadArea.classList.remove('d-none');
        downloadArea.innerHTML = `
          <a href="${downloadUrl}" download="${escapeHtml(originalName)}_converted.wav" class="btn-dark-custom text-decoration-none me-2">⬇️ Download WAV (${(wavBlob.size / (1024 * 1024)).toFixed(2)} MB)</a>
          <button id="newFileBtn" class="btn btn-outline-secondary btn-sm rounded-pill">↺ New file</button>
        `;
        downloadArea.querySelector('#newFileBtn').addEventListener('click', () => {
          URL.revokeObjectURL(downloadUrl);
          resetSelection();
        });
        setStatus('✅ Conversion completed!', false);
      } catch (err) {
        setStatus(`❌ Conversion failed: ${err.message}`, true);
      } finally {
        isConverting = false;
        convertBtn.disabled = !currentFile;
        if (currentFile) convertBtn.disabled = false;
        convertBtn.innerHTML = '⟳ Convert to WAV';
      }
    });

    function escapeHtml(str) {
      return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
      });
    }

    setStatus('📁 Drop an M4A file or click to browse', false);
    setTimeout(() => clearStatus(), 3000);
  }

  // Wait for the unique container div
  function init() {
    const target = document.getElementById('m4a-wav-app');
    if (!target) {
      console.warn('Container #m4a-wav-app not found, retrying...');
      setTimeout(init, 200);
      return;
    }
    if (target.getAttribute('data-m4a2wav')) return;
    target.setAttribute('data-m4a2wav', 'true');
    buildUI(target);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
