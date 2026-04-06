// ChromaSpectra - Green Screen Audio Visualizer for Legendary Toolkit
// Designed to use existing Bootstrap + custom CSS. No extra styles except canvas wrapper.

(function() {
  const container = document.getElementById('chromaspectra-app');
  if (!container) return;

  // Inject tool HTML using Bootstrap + your custom button classes
  container.innerHTML = `
    <div class="card border-0 shadow-sm rounded-4 mb-5">
      <div class="card-body p-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap mb-3 pb-2 border-bottom">
          <h2 class="h3 mb-0 fw-bold">🎙️ ChromaSpectra</h2>
          <span class="badge-soft">real‑time spectrum · green screen · WebM export</span>
        </div>
        <p class="text-secondary mb-4">Upload any audio file. Watch frequency bars react to voice or music. Pure green background (#00FF00) for one‑click chroma key. Export full audio as WebM. Free, no signup.</p>
        
        <div class="green-canvas-wrapper mb-4" style="background: #00FF00; border-radius: 1.5rem; padding: 6px; box-shadow: 0 8px 20px rgba(0,0,0,0.05);">
          <canvas id="chromaCanvas" width="1920" height="540" style="width:100%; height:auto; background:#00FF00; border-radius: 1rem;"></canvas>
        </div>

        <div class="d-flex flex-wrap gap-2 mb-4 align-items-center">
          <label class="btn btn-outline-secondary rounded-pill mb-0">
            📁 Upload Audio <input type="file" id="chromaAudioFile" accept="audio/*" style="display:none">
          </label>
          <button id="chromaPlayBtn" class="btn btn-dark-custom btn-modern rounded-pill">▶ Play</button>
          <button id="chromaPauseBtn" class="btn btn-outline-custom btn-modern rounded-pill">⏸ Pause</button>
          <button id="chromaStopBtn" class="btn btn-outline-custom btn-modern rounded-pill">⏹ Stop</button>
          <button id="chromaExportBtn" class="btn btn-dark-custom btn-modern rounded-pill">🎥 Export Full Audio as WebM</button>
          <button id="chromaStopExportBtn" class="btn btn-outline-secondary rounded-pill" style="display:none;">⏹ Stop Recording</button>
          <span id="chromaStatus" class="badge-soft px-3 py-2">⚡ Ready</span>
          <span id="chromaProgress" class="small text-muted"></span>
        </div>

        <div class="row g-4 mt-2">
          <div class="col-md-7">
            <h3 class="h5 fw-semibold">🎬 Free green‑screen audio visualizer — no signup, no watermark</h3>
            <p><strong>ChromaSpectra</strong> turns any sound into a real‑time frequency spectrum on a <strong>pure green background (#00FF00)</strong>. Perfect for podcast intros, voiceover overlays, and music visualizations.</p>
            <p>✅ <strong>Green screen ready</strong> – key out #00FF00 in Premiere, DaVinci, Final Cut, OBS.<br>
            ✅ <strong>Real‑time frequency response</strong> – each bar reacts independently.<br>
            ✅ <strong>Export WebM</strong> – record full audio length (no time limit).<br>
            ✅ <strong>100% browser‑based</strong> – no uploads, no signup, no tracking.<br>
            🧩 Part of <strong>Legendary Toolkit’s 100 free tools</strong> – more utilities weekly.</p>
            <p>📌 <strong>Need MP4?</strong> Use our companion tool → <a href="#" id="chromaFutureConverter" class="text-decoration-none">WebM2MP4 Converter (coming soon)</a></p>
          </div>
          <div class="col-md-5">
            <div class="bg-light p-3 rounded-4 border-start border-4 border-success">
              <p class="fw-semibold mb-2">🎯 How to use in post‑production</p>
              <p class="small mb-1">1. Export WebM (full track).<br>2. Convert to MP4 if needed.<br>3. Apply chroma key (Ultra Key / Color Key) on green.<br>4. Overlay on your video timeline.</p>
              <p class="small mb-0">⚡ <strong>Long files?</strong> Recording time equals audio duration – works for hours.</p>
            </div>
          </div>
        </div>
        <div class="text-center mt-4 pt-2 small text-secondary">
          ChromaSpectra © Legendary Toolkit – building 100 free creator tools. No signup, no tracking.
        </div>
      </div>
    </div>
  `;

  // ========== VISUALIZER LOGIC (identical to previous working version) ==========
  const canvas = document.getElementById('chromaCanvas');
  const ctx = canvas.getContext('2d');
  const fileInput = document.getElementById('chromaAudioFile');
  const playBtn = document.getElementById('chromaPlayBtn');
  const pauseBtn = document.getElementById('chromaPauseBtn');
  const stopBtn = document.getElementById('chromaStopBtn');
  const exportBtn = document.getElementById('chromaExportBtn');
  const stopExportBtn = document.getElementById('chromaStopExportBtn');
  const statusSpan = document.getElementById('chromaStatus');
  const recordProgressSpan = document.getElementById('chromaProgress');

  let audioContext = null, sourceNode = null, analyserNode = null, audioBuffer = null;
  let isPlaying = false, animationId = null;
  let mediaRecorder = null, recordedChunks = [], recordingTimer = null;

  const canvasWidth = 1920, canvasHeight = 540;
  canvas.width = canvasWidth; canvas.height = canvasHeight;
  const baselineY = canvasHeight - 40;
  const maxBarHeight = canvasHeight * 0.6;

  const totalBars = 401;
  const barWidth = canvasWidth / totalBars;
  const pyramid = new Array(totalBars);
  const centerIdx = Math.floor(totalBars / 2);
  for (let i = 0; i < totalBars; i++) {
    const dist = Math.abs(i - centerIdx);
    let mult = Math.exp(-Math.pow(dist, 2) / 200);
    mult = Math.max(0.05, mult);
    pyramid[i] = mult;
  }

  let currentHeights = new Array(totalBars).fill(0.02);
  const ATTACK = 0.5, DECAY = 0.12;

  function drawBars(heights) {
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.moveTo(0, baselineY);
    ctx.lineTo(canvasWidth, baselineY);
    ctx.stroke();
    for (let i = 0; i < totalBars; i++) {
      let norm = heights[i] || 0.02;
      const barH = norm * maxBarHeight;
      if (barH < 0.5) continue;
      const x = i * barWidth;
      const y = baselineY - barH;
      ctx.fillStyle = 'white';
      ctx.fillRect(x, y, barWidth - 0.3, barH);
    }
  }

  function updateHeights() {
    if (!analyserNode) return;
    const freqData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqData);
    const binCount = freqData.length;
    for (let i = 0; i < totalBars; i++) {
      const startBin = Math.floor((i / totalBars) * binCount);
      const endBin = Math.floor(((i+1) / totalBars) * binCount);
      let sum = 0;
      for (let b = startBin; b < endBin && b < binCount; b++) sum += freqData[b];
      let avg = sum / (endBin - startBin);
      let rawIntensity = avg / 255;
      let target = rawIntensity * pyramid[i];
      target = Math.max(0.02, Math.min(1.0, target));
      let current = currentHeights[i];
      let factor = (target > current) ? ATTACK : DECAY;
      let newHeight = current + (target - current) * factor;
      newHeight = Math.min(1.0, Math.max(0.02, newHeight));
      currentHeights[i] = newHeight;
    }
    drawBars(currentHeights);
  }

  function animate() { if (isPlaying) { updateHeights(); animationId = requestAnimationFrame(animate); } }
  function startAnimation() { if (animationId) cancelAnimationFrame(animationId); animate(); }
  function stopAnimation() {
    if (animationId) cancelAnimationFrame(animationId);
    currentHeights.fill(0.02);
    drawBars(currentHeights);
  }

  async function loadAudio(file) {
    if (audioContext && audioContext.state !== 'closed') await audioContext.close();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.2;
    const arrayBuf = await file.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuf);
    statusSpan.innerText = `✅ Loaded ${file.name} (${audioBuffer.duration.toFixed(1)} sec)`;
    currentHeights.fill(0.02);
    drawBars(currentHeights);
  }

  function playAudio() {
    if (!audioBuffer || !audioContext) { statusSpan.innerText = '⚠️ No audio loaded'; return; }
    if (isPlaying) return;
    if (sourceNode) try { sourceNode.stop(); } catch(e) {}
    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(analyserNode);
    analyserNode.connect(audioContext.destination);
    sourceNode.start(0);
    isPlaying = true;
    audioContext.resume();
    startAnimation();
    statusSpan.innerText = '🎙️ Playing – pyramid reacts to your audio';
    sourceNode.onended = () => { isPlaying = false; stopAnimation(); statusSpan.innerText = '⏹ Finished'; };
  }
  function pauseAudio() { if (!isPlaying) return; audioContext.suspend(); isPlaying = false; stopAnimation(); statusSpan.innerText = '⏸ Paused'; }
  function stopAudio() {
    if (sourceNode) try { sourceNode.stop(); } catch(e) {}
    sourceNode = null; isPlaying = false; stopAnimation();
    if (audioContext) audioContext.resume().then(() => drawBars(currentHeights));
    statusSpan.innerText = '⏹ Stopped';
  }

  async function startRecordingFull() {
    if (!audioBuffer) { statusSpan.innerText = '❌ No audio loaded'; return; }
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    statusSpan.innerText = '🎬 Preparing full-length export...';
    const recordCtx = new AudioContext();
    const recordSource = recordCtx.createBufferSource();
    recordSource.buffer = audioBuffer;
    const recordAnalyser = recordCtx.createAnalyser();
    recordAnalyser.fftSize = 2048;
    recordSource.connect(recordAnalyser);
    recordAnalyser.connect(recordCtx.destination);
    const canvasStream = canvas.captureStream(30);
    const audioDest = recordCtx.createMediaStreamDestination();
    recordSource.connect(audioDest);
    const audioTrack = audioDest.stream.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
    recordedChunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chromaspectra_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      statusSpan.innerText = '✅ Export complete! Chroma key ready.';
      recordProgressSpan.innerText = '';
      if (recordingTimer) clearInterval(recordingTimer);
      recordSource.stop(); recordCtx.close(); mediaRecorder = null;
      stopExportBtn.style.display = 'none'; exportBtn.style.display = 'inline-flex';
    };
    mediaRecorder.start(100);
    recordSource.start();
    statusSpan.innerText = `🔴 Recording full audio (${audioBuffer.duration.toFixed(1)} sec) ...`;
    stopExportBtn.style.display = 'inline-flex'; exportBtn.style.display = 'none';
    recordingTimer = setInterval(() => { recordProgressSpan.innerText = 'Recording...'; }, 500);
    setTimeout(() => { if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop(); }, audioBuffer.duration * 1000 + 500);
    
    let recHeights = new Array(totalBars).fill(0.02);
    function drawRecordingFrame() {
      if (!recordAnalyser || mediaRecorder?.state !== 'recording') return;
      const freqData = new Uint8Array(recordAnalyser.frequencyBinCount);
      recordAnalyser.getByteFrequencyData(freqData);
      const binCount = freqData.length;
      for (let i = 0; i < totalBars; i++) {
        const startBin = Math.floor((i / totalBars) * binCount);
        const endBin = Math.floor(((i+1) / totalBars) * binCount);
        let sum = 0;
        for (let b = startBin; b < endBin && b < binCount; b++) sum += freqData[b];
        let avg = sum / (endBin - startBin);
        let raw = avg / 255;
        let target = raw * pyramid[i];
        target = Math.max(0.02, Math.min(1.0, target));
        let current = recHeights[i];
        let factor = (target > current) ? ATTACK : DECAY;
        recHeights[i] = current + (target - current) * factor;
      }
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.beginPath(); ctx.strokeStyle = 'white'; ctx.lineWidth = 1;
      ctx.moveTo(0, baselineY); ctx.lineTo(canvasWidth, baselineY); ctx.stroke();
      for (let i = 0; i < totalBars; i++) {
        const h = recHeights[i] * maxBarHeight;
        if (h > 0.5) {
          ctx.fillStyle = 'white';
          ctx.fillRect(i * barWidth, baselineY - h, barWidth - 0.3, h);
        }
      }
      requestAnimationFrame(drawRecordingFrame);
    }
    drawRecordingFrame();
  }
  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      if (recordingTimer) clearInterval(recordingTimer);
      statusSpan.innerText = '⏹ Recording stopped.';
      stopExportBtn.style.display = 'none'; exportBtn.style.display = 'inline-flex';
      recordProgressSpan.innerText = '';
    }
  }

  fileInput.addEventListener('change', (e) => { if (e.target.files.length) loadAudio(e.target.files[0]); });
  playBtn.addEventListener('click', playAudio);
  pauseBtn.addEventListener('click', pauseAudio);
  stopBtn.addEventListener('click', stopAudio);
  exportBtn.addEventListener('click', startRecordingFull);
  stopExportBtn.addEventListener('click', stopRecording);
  document.getElementById('chromaFutureConverter')?.addEventListener('click', (e) => {
    e.preventDefault();
    statusSpan.innerText = '🔜 WebM → MP4 converter coming soon as Tool #3!';
  });
  drawBars(currentHeights);
})();
