// ============================================================
// YouTube Chapter Maker - Professional Tool
// Uses YouTube Data API v3 to auto-fetch descriptions & chapters
// ============================================================

// ===== CONFIGURATION =====
// Paste your YouTube Data API v3 key here (free from Google Cloud Console)
const YOUTUBE_API_KEY = 'AIzaSyCWTYFHABNctNztMeneoyvu_EJDeZM7lG4';  // <-- REPLACE WITH YOUR KEY
// =========================

(function() {
    // Inject extra CSS
    const extraStyles = `
        #chapters-list-area::-webkit-scrollbar { width: 6px; }
        #chapters-list-area::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        #chapters-list-area::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 10px; }
        pre { background: #0a0a0a; color: #eef; border-radius: 1rem; font-size: 0.9rem; }
        .form-control:focus { border-color: #0a0a0a; box-shadow: 0 0 0 3px rgba(10,10,10,0.1); }
        .chapter-list-item { transition: all 0.2s; }
        .chapter-list-item:hover { background: rgba(0,0,0,0.02); }
    `;
    if (!document.getElementById('yt-chapter-maker-styles')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'yt-chapter-maker-styles';
        styleTag.textContent = extraStyles;
        document.head.appendChild(styleTag);
    }

    function init() {
        const container = document.getElementById('YouTube-Chapter-Maker');
        if (!container) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    const retry = document.getElementById('YouTube-Chapter-Maker');
                    if (retry) buildApp(retry);
                });
            }
            return;
        }
        buildApp(container);
    }

    function buildApp(container) {
        container.innerHTML = '';
        const glassCard = document.createElement('div');
        glassCard.className = 'glass-card p-4 p-md-5';
        glassCard.style.borderRadius = '2rem';

        glassCard.innerHTML = `
            <div class="d-flex flex-column gap-3">
                <div class="text-center text-md-start">
                    <h1 class="display-5 fw-bold" style="font-family: 'Space Grotesk', monospace;">
                        <i class="bi bi-youtube text-danger"></i> YouTube Chapter Maker
                    </h1>
                    <p class="text-secondary">Auto‑extract chapters from any video (via YouTube API) or paste description manually.</p>
                </div>

                <!-- URL + Fetch with API -->
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label fw-semibold"><i class="bi bi-link-45deg"></i> YouTube URL or ID</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="chapter-maker-url" placeholder="https://youtu.be/... or video ID">
                            <button class="btn btn-dark-custom btn-modern" id="chapter-maker-fetch-btn"><i class="bi bi-cloud-download"></i> Fetch Video (Auto-extract chapters)</button>
                        </div>
                        <div class="form-text mt-1">Uses YouTube API to get description & extract existing chapters (if any).</div>
                    </div>
                </div>

                <!-- Video info preview -->
                <div id="video-info-panel" style="display: none;">
                    <div class="d-flex gap-3 align-items-center p-3 bg-light rounded-4">
                        <img id="video-thumb-img" width="120" class="rounded-3">
                        <div>
                            <h5 id="video-title-display" class="mb-1"></h5>
                            <a id="video-watch-link" href="#" target="_blank">Watch <i class="bi bi-box-arrow-up-right"></i></a>
                        </div>
                    </div>
                </div>

                <!-- Optional manual description paste (fallback / custom) -->
                <div class="bg-light bg-opacity-50 p-3 rounded-4">
                    <label class="fw-semibold"><i class="bi bi-file-text"></i> Or Paste Description Manually</label>
                    <textarea id="description-textarea" rows="3" class="form-control mt-1" placeholder="Paste any YouTube description here...&#10;Chapters like:&#10;0:00 Intro&#10;2:15 Main topic"></textarea>
                    <button id="extract-chapters-btn" class="btn btn-outline-custom btn-modern mt-2"><i class="bi bi-magic"></i> Extract Chapters from Pasted Text</button>
                    <div class="form-text">Useful if API key is missing or you want to edit chapters from a custom source.</div>
                </div>

                <hr>

                <!-- Add/edit chapter panel -->
                <div class="row g-4">
                    <div class="col-md-5">
                        <div class="bg-white p-3 rounded-4 border">
                            <h5><i class="bi bi-plus-circle"></i> Add / Edit Chapter</h5>
                            <input type="text" class="form-control mb-2" id="chapter-time-input" placeholder="Timestamp (1:30 or 90)">
                            <input type="text" class="form-control mb-2" id="chapter-title-input" placeholder="Chapter title">
                            <button class="btn btn-dark-custom w-100" id="add-chapter-action">+ Add Chapter</button>
                            <button class="btn btn-outline-custom w-100 mt-2" id="clear-all-chapters">Clear All Chapters</button>
                        </div>
                    </div>
                    <div class="col-md-7">
                        <div class="bg-white p-3 rounded-4 border">
                            <h5><i class="bi bi-list-ul"></i> Your Chapters</h5>
                            <div id="chapters-list-area" style="max-height: 340px; overflow-y: auto;"></div>
                        </div>
                    </div>
                </div>

                <hr>
                <div class="d-flex justify-content-between align-items-center">
                    <h5>YouTube‑Ready Output</h5>
                    <button class="btn btn-sm btn-outline-custom" id="copy-output-button"><i class="bi bi-copy"></i> Copy</button>
                </div>
                <pre id="generated-chapters-output" style="background:#0f0f0f; color:#f5f5f5; padding:1rem; border-radius:1rem;">No chapters yet.</pre>
                <div id="global-message-area"></div>
            </div>
        `;

        container.appendChild(glassCard);

        let chaptersArray = [];

        function formatTimestamp(sec) {
            if (isNaN(sec) || sec < 0) return "0:00";
            let hrs = Math.floor(sec / 3600);
            let mins = Math.floor((sec % 3600) / 60);
            let secs = sec % 60;
            if (hrs > 0) return `${hrs}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
            return `${mins}:${secs.toString().padStart(2,'0')}`;
        }

        function parseTimeToSeconds(str) {
            str = str.trim();
            if (/^\d+$/.test(str)) return parseInt(str);
            let parts = str.split(':');
            if (parts.length === 2) {
                let mins = parseInt(parts[0]), secs = parseInt(parts[1]);
                if (isNaN(mins) || isNaN(secs) || secs >= 60) return null;
                return mins * 60 + secs;
            } else if (parts.length === 3) {
                let hrs = parseInt(parts[0]), mins = parseInt(parts[1]), secs = parseInt(parts[2]);
                if (isNaN(hrs) || isNaN(mins) || isNaN(secs) || mins >= 60 || secs >= 60) return null;
                return hrs * 3600 + mins * 60 + secs;
            }
            return null;
        }

        function showMessage(msg, type = "success") {
            const container = document.getElementById("global-message-area");
            if (!container) return;
            const alertDiv = document.createElement("div");
            alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2`;
            alertDiv.innerHTML = `${msg} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
            container.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 4000);
        }

        function renderChapterList() {
            const listDiv = document.getElementById("chapters-list-area");
            if (!listDiv) return;
            if (chaptersArray.length === 0) {
                listDiv.innerHTML = '<div class="text-muted text-center py-4">No chapters yet. Fetch video or paste description.</div>';
                return;
            }
            const sorted = [...chaptersArray].sort((a,b) => a.seconds - b.seconds);
            let html = `<div class="list-group list-group-flush">`;
            sorted.forEach((ch, idx) => {
                const realIdx = chaptersArray.findIndex(c => c.seconds === ch.seconds && c.title === ch.title);
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div><span class="badge bg-dark">${formatTimestamp(ch.seconds)}</span> ${escapeHtml(ch.title)}</div>
                        <div>
                            <button class="btn btn-sm btn-outline-custom edit-chapter" data-idx="${realIdx}"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-chapter" data-idx="${realIdx}"><i class="bi bi-x"></i></button>
                        </div>
                    </div>
                `;
            });
            listDiv.innerHTML = html;

            document.querySelectorAll('.edit-chapter').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    let idx = btn.getAttribute('data-idx');
                    if (idx && chaptersArray[idx]) {
                        document.getElementById('chapter-time-input').value = formatTimestamp(chaptersArray[idx].seconds);
                        document.getElementById('chapter-title-input').value = chaptersArray[idx].title;
                        chaptersArray.splice(idx, 1);
                        renderChapterList();
                        updateOutput();
                        showMessage("Edit the chapter and click Add.", "info");
                    }
                });
            });
            document.querySelectorAll('.delete-chapter').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    let idx = btn.getAttribute('data-idx');
                    if (idx) chaptersArray.splice(idx, 1);
                    renderChapterList();
                    updateOutput();
                    showMessage("Chapter deleted.", "warning");
                });
            });
        }

        function updateOutput() {
            const pre = document.getElementById("generated-chapters-output");
            if (!pre) return;
            if (chaptersArray.length === 0) {
                pre.textContent = "# No chapters yet.";
                return;
            }
            const sorted = [...chaptersArray].sort((a,b) => a.seconds - b.seconds);
            pre.textContent = sorted.map(ch => `${formatTimestamp(ch.seconds)} ${ch.title}`).join('\n');
        }

        function addChapter() {
            let timeVal = document.getElementById('chapter-time-input').value.trim();
            let titleVal = document.getElementById('chapter-title-input').value.trim();
            if (!timeVal || !titleVal) { showMessage("Both timestamp and title required.", "danger"); return; }
            let secs = parseTimeToSeconds(timeVal);
            if (secs === null) { showMessage("Invalid timestamp format.", "danger"); return; }
            chaptersArray.push({ seconds: secs, title: titleVal });
            document.getElementById('chapter-time-input').value = '';
            document.getElementById('chapter-title-input').value = '';
            renderChapterList();
            updateOutput();
            showMessage(`Added "${titleVal}" at ${formatTimestamp(secs)}`);
        }

        function clearAll() {
            if (chaptersArray.length === 0) return;
            chaptersArray = [];
            renderChapterList();
            updateOutput();
            showMessage("All chapters cleared.", "info");
        }

        function copyOutput() {
            let text = document.getElementById("generated-chapters-output").textContent;
            if (!text || text.includes("No chapters")) {
                showMessage("Nothing to copy.", "warning");
                return;
            }
            navigator.clipboard.writeText(text).then(() => showMessage("Copied to clipboard!")).catch(() => showMessage("Copy failed", "danger"));
        }

        // Extract chapters from a text string (used by both API and manual)
        function extractChaptersFromText(description, sourceName = "text") {
            if (!description || !description.trim()) {
                showMessage(`No description ${sourceName} to extract from.`, "warning");
                return false;
            }
            const regex = /(\d{1,2}:?\d{1,2}:\d{2}|\d{1,2}:\d{2})\s+(.+)/g;
            let matches = [...description.matchAll(regex)];
            if (matches.length === 0) {
                showMessage(`No timestamps found in ${sourceName}. Use format like '1:30 Introduction'.`, "danger");
                return false;
            }
            let newChapters = [];
            for (let match of matches) {
                let timeStr = match[1];
                let title = match[2].trim();
                let seconds = parseTimeToSeconds(timeStr);
                if (seconds !== null && title) {
                    newChapters.push({ seconds, title });
                }
            }
            if (newChapters.length === 0) {
                showMessage(`Could not parse any valid timestamps from ${sourceName}.`, "danger");
                return false;
            }
            let existingSeconds = new Set(chaptersArray.map(c => c.seconds));
            let added = 0;
            for (let ch of newChapters) {
                if (!existingSeconds.has(ch.seconds)) {
                    chaptersArray.push(ch);
                    added++;
                }
            }
            if (added === 0) showMessage("All extracted chapters already exist.", "info");
            else showMessage(`Added ${added} new chapter(s) from ${sourceName}.`);
            renderChapterList();
            updateOutput();
            return added > 0;
        }

        // Manual extraction from textarea
        function manualExtract() {
            const description = document.getElementById("description-textarea").value;
            extractChaptersFromText(description, "pasted text");
        }

        // ----- YOUTUBE API INTEGRATION -----
        async function fetchVideoWithAPI() {
            let urlOrId = document.getElementById('chapter-maker-url').value.trim();
            if (!urlOrId) { showMessage("Enter a YouTube URL or ID.", "warning"); return; }
            
            // Extract video ID
            let videoId = null;
            if (urlOrId.includes('youtube.com') || urlOrId.includes('youtu.be')) {
                let match = urlOrId.match(/(?:youtu\.be\/|v=|\/v\/|embed\/|shorts\/)([^&?#]+)/);
                if (match) videoId = match[1];
            } else if (/^[A-Za-z0-9_-]{11}$/.test(urlOrId)) videoId = urlOrId;
            
            if (!videoId) { showMessage("Invalid YouTube URL or ID.", "danger"); return; }
            
            // Show loading indicator on button
            const fetchBtn = document.getElementById('chapter-maker-fetch-btn');
            const originalText = fetchBtn.innerHTML;
            fetchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Fetching...';
            fetchBtn.disabled = true;
            
            try {
                // 1. Get video details (title, description) using API key
                if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_API_KEY_HERE') {
                    showMessage("YouTube API key not configured. Please edit the script and add your API key at the top.", "danger");
                    fetchBtn.innerHTML = originalText;
                    fetchBtn.disabled = false;
                    return;
                }
                
                const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
                const response = await fetch(apiUrl);
                const data = await response.json();
                
                if (data.error) {
                    showMessage(`API Error: ${data.error.message}. Check your API key and quota.`, "danger");
                    fetchBtn.innerHTML = originalText;
                    fetchBtn.disabled = false;
                    return;
                }
                
                if (!data.items || data.items.length === 0) {
                    showMessage("Video not found. It may be private or deleted.", "danger");
                    fetchBtn.innerHTML = originalText;
                    fetchBtn.disabled = false;
                    return;
                }
                
                const snippet = data.items[0].snippet;
                const videoTitle = snippet.title;
                const description = snippet.description || "";
                
                // Update UI with video info
                document.getElementById('video-thumb-img').src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                document.getElementById('video-title-display').innerText = videoTitle;
                document.getElementById('video-watch-link').href = `https://www.youtube.com/watch?v=${videoId}`;
                document.getElementById('video-info-panel').style.display = 'block';
                
                // 2. Extract chapters from the description
                if (description) {
                    const extracted = extractChaptersFromText(description, "video description");
                    if (extracted) {
                        showMessage(`✅ Successfully extracted chapters from "${videoTitle}"!`, "success");
                    } else {
                        showMessage(`Video description found, but no chapters (timestamps) detected. You can add them manually.`, "info");
                    }
                } else {
                    showMessage("Video has no description. Add chapters manually.", "info");
                }
                
                // Also populate the manual textarea with the description for reference
                document.getElementById("description-textarea").value = description;
                
            } catch (err) {
                console.error(err);
                showMessage("Network error while fetching video data.", "danger");
            } finally {
                fetchBtn.innerHTML = originalText;
                fetchBtn.disabled = false;
            }
        }

        // Bind events
        document.getElementById('chapter-maker-fetch-btn').addEventListener('click', fetchVideoWithAPI);
        document.getElementById('add-chapter-action').addEventListener('click', addChapter);
        document.getElementById('clear-all-chapters').addEventListener('click', clearAll);
        document.getElementById('copy-output-button').addEventListener('click', copyOutput);
        document.getElementById('extract-chapters-btn').addEventListener('click', manualExtract);
        
        // Enter key shortcuts
        ['chapter-time-input', 'chapter-title-input'].forEach(id => {
            let el = document.getElementById(id);
            if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') addChapter(); });
        });

        renderChapterList();
        updateOutput();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
