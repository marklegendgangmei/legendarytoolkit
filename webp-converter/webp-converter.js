(function() {
  "use strict";

  // Ensure Bootstrap CSS
  if (!document.querySelector('link[href*="bootstrap.min.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css';
    document.head.appendChild(link);
  }

  // Custom styles: glass-card, button, dropzone
  if (!document.getElementById('webpConverterStyles')) {
    const style = document.createElement('style');
    style.id = 'webpConverterStyles';
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
      .quality-slider {
        width: 100%;
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- Helper: Convert WebP to desired format ----------
  async function convertWebPTo(file, outputFormat, quality = 0.92) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        let mimeType = 'image/jpeg';
        let extension = 'jpg';
        let extraOptions = {};
        if (outputFormat === 'png') {
          mimeType = 'image/png';
          extension = 'png';
          // PNG ignores quality
        } else {
          mimeType = 'image/jpeg';
          extension = 'jpg';
          extraOptions = { quality: quality };
        }
        
        canvas.toBlob((blob) => {
          if (!blob) reject(new Error('Canvas conversion failed'));
          const fileName = file.name.replace(/\.webp$/i, '').replace(/\.webp$/i, '') + '.' + extension;
          resolve({ blob, fileName });
        }, mimeType, extraOptions.quality);
      };
      img.onerror = () => reject(new Error('Failed to load WebP image. Is it a valid WebP?'));
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- UI Builder ----------
  function buildUI(container) {
    container.innerHTML = `
      <div class="glass-card">
        <h2 class="h3 mb-2 fw-semibold">🖼️ WebP to JPG / PNG Converter</h2>
        <p class="text-secondary mb-4">Convert WebP images to JPG or PNG format</p>
        
        <div id="webpDropzone" class="dropzone-border p-4 text-center mb-4">
          <div class="fs-1 mb-2">🖼️✨</div>
          <p class="mb-1 fw-semibold">Drag & drop your WebP file here</p>
          <p class="small text-secondary">or click to browse</p>
          <input type="file" id="webpFileInput" class="d-none" accept=".webp,image/webp" />
        </div>

        <div id="webpFileInfoArea" class="d-none mb-3"></div>

        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Output Format</label>
            <select id="outputFormat" class="form-select">
              <option value="jpg">JPEG (.jpg)</option>
              <option value="png">PNG (.png)</option>
            </select>
          </div>
          <div class="col-md-6" id="qualityControl">
            <label class="form-label fw-semibold">JPEG Quality <span id="qualityValue">92</span>%</label>
            <input type="range" id="jpegQuality" class="quality-slider" min="10" max="100" value="92" step="1">
          </div>
        </div>

        <div class="d-flex justify-content-center gap-3 flex-wrap">
          <button id="webpConvertBtn" class="btn-dark-custom" disabled>⟳ Convert Image</button>
        </div>

        <div id="webpStatusMsg" class="alert mt-3 d-none" role="alert"></div>
        <div id="webpDownloadArea" class="mt-4 d-none text-center"></div>
      </div>
    `;

    const dropzone = container.querySelector('#webpDropzone');
    const fileInput = container.querySelector('#webpFileInput');
    const convertBtn = container.querySelector('#webpConvertBtn');
    const fileInfoArea = container.querySelector('#webpFileInfoArea');
    const statusDiv = container.querySelector('#webpStatusMsg');
    const downloadArea = container.querySelector('#webpDownloadArea');
    const outputFormatSelect = container.querySelector('#outputFormat');
    const qualitySlider = container.querySelector('#jpegQuality');
    const qualityValue = container.querySelector('#qualityValue');
    const qualityControl = container.querySelector('#qualityControl');

    let currentFile = null;
    let isConverting = false;

    // Toggle quality slider visibility based on format
    function toggleQualityControl() {
      if (outputFormatSelect.value === 'png') {
        qualityControl.style.display = 'none';
      } else {
        qualityControl.style.display = 'block';
      }
    }
    outputFormatSelect.addEventListener('change', toggleQualityControl);
    qualitySlider.addEventListener('input', () => {
      qualityValue.textContent = qualitySlider.value;
    });
    toggleQualityControl();

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
      if (currentFile) {
        // revoke any pending object URLs if needed
      }
      currentFile = null;
      fileInput.value = '';
      fileInfoArea.classList.add('d-none');
      convertBtn.disabled = true;
      resetDownloadArea();
      clearStatus();
      dropzone.classList.remove('drag-over');
      setStatus('No file selected. Choose a WebP image.', false);
      setTimeout(() => clearStatus(), 2000);
    }

    function displayFileInfo(file) {
      const sizeKB = (file.size / 1024).toFixed(1);
      fileInfoArea.classList.remove('d-none');
      fileInfoArea.innerHTML = `
        <div class="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 flex-wrap gap-2">
          <span><strong>🖼️ ${escapeHtml(file.name)}</strong></span>
          <span class="badge bg-secondary">${sizeKB} KB</span>
          <button id="clearFileBtn" class="btn btn-sm btn-outline-secondary">✖ Change file</button>
        </div>
      `;
      fileInfoArea.querySelector('#clearFileBtn').addEventListener('click', resetSelection);
    }

    async function handleFile(file) {
      if (!file) return;
      if (file.type !== 'image/webp' && !file.name.toLowerCase().endsWith('.webp')) {
        setStatus('❌ Please select a valid WebP image (.webp).', true);
        resetSelection();
        return;
      }
      currentFile = file;
      displayFileInfo(file);
      convertBtn.disabled = false;
      setStatus(`✅ Ready: ${file.name}`, false);
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
      if (isConverting || !currentFile) return;
      isConverting = true;
      convertBtn.disabled = true;
      convertBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Converting...';
      resetDownloadArea();
      setStatus('🔄 Converting image...', false);
      try {
        const format = outputFormatSelect.value;
        const quality = format === 'jpg' ? parseFloat(qualitySlider.value) / 100 : 1;
        const { blob, fileName } = await convertWebPTo(currentFile, format, quality);
        const downloadUrl = URL.createObjectURL(blob);
        downloadArea.classList.remove('d-none');
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
        downloadArea.innerHTML = `
          <a href="${downloadUrl}" download="${escapeHtml(fileName)}" class="btn-dark-custom text-decoration-none me-2">⬇️ Download ${format.toUpperCase()} (${sizeMB} MB)</a>
          <button id="newFileBtn" class="btn btn-outline-secondary btn-sm rounded-pill">↺ New image</button>
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
        convertBtn.innerHTML = '⟳ Convert Image';
      }
    });

    function escapeHtml(str) {
      return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
    }

    setStatus('📁 Drop a WebP image or click to browse', false);
    setTimeout(() => clearStatus(), 3000);
  }

  function init() {
    const target = document.getElementById('webp-converter-app');
    if (!target) {
      setTimeout(init, 200);
      return;
    }
    if (target.getAttribute('data-webp-converter')) return;
    target.setAttribute('data-webp-converter', 'true');
    buildUI(target);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
