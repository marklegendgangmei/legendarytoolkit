// ============================================================
// YouTube Chapter Maker - Professional Tool for Blogger
// Fully self-contained: injects required CSS and builds the app
// Dependencies: Bootstrap 5 + Icons (already on your blog)
// ============================================================

(function() {
    // ----- INJECT EXTRA CUSTOM CSS (matching your request) -----
    const extraStyles = `
        /* additional tiny styling for chapter list */
        #chapters-list-area::-webkit-scrollbar {
            width: 6px;
        }
        #chapters-list-area::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
        }
        #chapters-list-area::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 10px;
        }
        pre {
            background: #0a0a0a;
            color: #eef;
            border-radius: 1rem;
            font-size: 0.9rem;
        }
        .form-control:focus {
            border-color: #0a0a0a;
            box-shadow: 0 0 0 3px rgba(10,10,10,0.1);
        }
        .chapter-list-item {
            transition: all 0.2s;
        }
        .chapter-list-item:hover {
            background: rgba(0,0,0,0.02);
        }
    `;
    if (!document.getElementById('yt-chapter-maker-styles')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'yt-chapter-maker-styles';
        styleTag.textContent = extraStyles;
        document.head.appendChild(styleTag);
    }

    // ----- TOOL INITIALIZATION -----
    function initYouTubeChapterMaker() {
        const container = document.getElementById('tool-name-app');
        if (!container) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    const retryContainer = document.getElementById('tool-name-app');
                    if (retryContainer) buildApp(retryContainer);
                });
            }
            return;
        }
        buildApp(container);
    }

    function buildApp(container) {
        container.innerHTML = '';

        // Main glass-card wrapper (uses your existing .glass-card class)
        const glassCard = document.createElement('div');
        glassCard.className = 'glass-card p-4 p-md-5';
        glassCard.style.borderRadius = '2rem';

        // Tool HTML structure
        glassCard.innerHTML = `
            <div class="d-flex flex-column gap-3">
                <div class="text-center text-md-start">
                    <h1 class="display-5 fw-bold" style="font-family: 'Space Grotesk', monospace; letter-spacing: -0.02em;">
                        <i class="bi bi-youtube text-danger"></i> YouTube Chapter Maker
                    </h1>
                    <p class="text-secondary mt-2">Generate perfect timestamps for your video descriptions — just add chapters and copy.</p>
                </div>

                <!-- URL Input + Fetch -->
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label fw-semibold"><i class="bi bi-link-45deg"></i> YouTube URL or Video ID</label>
                        <div class="input-group">
                            <input type="text" class="form-control" id="chapter-maker-url" placeholder="https://youtu.be/... or video ID">
                            <button class="btn btn-dark-custom btn-modern" id="chapter-maker-fetch-btn" type="button"><i class="bi bi-search"></i> Fetch Video</button>
                        </div>
                        <div class="form-text">Supports youtu.be, youtube.com/watch?v=, or plain 11-character ID.</div>
                    </div>
                </div>

                <!-- Video info preview (hidden initially) -->
                <div id="video-info-panel" style="display: none;" class="mt-2">
                    <div class="d-flex flex-column flex-sm-row gap-3 align-items-center align-items-sm-start p-3 bg-light rounded-4">
                        <img id="video-thumb-img" src="" alt="thumbnail" width="120" class="rounded-3 shadow-sm" style="object-fit: cover;">
                        <div>
                            <h5 id="video-title-display" class="fw-semibold mb-1"></h5>
                            <a id="video-watch-link" href="#" target="_blank" class="text-decoration-none small">Watch on YouTube <i class="bi bi-box-arrow-up-right"></i></a>
                        </div>
                    </div>
                </div>

                <hr class="my-2">

                <!-- Two columns: Add chapter + Chapter list -->
                <div class="row g-4">
                    <div class="col-md-5">
                        <div class="bg-white bg-opacity-50 p-3 rounded-4 border">
                            <h5 class="fw-semibold mb-3"><i class="bi bi-plus-circle"></i> Add New Chapter</h5>
                            <div class="mb-3">
                                <label class="form-label small fw-semibold">Timestamp <span class="text-muted">(MM:SS or seconds)</span></label>
                                <input type="text" class="form-control" id="chapter-time-input" placeholder="Example: 1:30 or 90">
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-semibold">Chapter Title</label>
                                <input type="text" class="form-control" id="chapter-title-input" placeholder="e.g., Introduction, The Main Idea">
                            </div>
                            <button class="btn btn-dark-custom btn-modern w-100" id="add-chapter-action"><i class="bi bi-plus-lg"></i> Add Chapter</button>
                            <button class="btn btn-outline-custom btn-modern w-100 mt-2" id="clear-all-chapters"><i class="bi bi-trash3"></i> Clear All Chapters</button>
                        </div>
                    </div>
                    <div class="col-md-7">
                        <div class="bg-white bg-opacity-40 p-3 rounded-4 border h-100">
                            <h5 class="fw-semibold mb-2"><i class="bi bi-list-ul"></i> Your Chapters</h5>
                            <div id="chapters-list-area" class="bg-light rounded-3 p-2" style="max-height: 340px; overflow-y: auto;">
                                <div class="text-muted text-center py-4">No chapters yet. Add timestamps above ✨</div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr class="my-2">

                <!-- Generated output + Copy -->
                <div class="row">
                    <div class="col-12">
                        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                            <h5 class="fw-semibold mb-0"><i class="bi bi-file-text-fill"></i> YouTube-Ready Chapters</h5>
                            <button class="btn btn-sm btn-outline-custom" id="copy-output-button"><i class="bi bi-copy"></i> Copy to Clipboard</button>
                        </div>
                        <pre id="generated-chapters-output" class="p-3 rounded-4" style="background: #0f0f0f; color: #f5f5f5; font-family: monospace; white-space: pre-wrap; font-size: 14px; border: 1px solid rgba(0,0,0,0.1);">No chapters added yet.</pre>
                    </div>
                </div>

                <div id="global-message-area"></div>
            </div>
        `;

        container.appendChild(glassCard);

        // ---------- STATE ----------
        let chaptersArray = [];      // { seconds, title }
        let currentVideoInfo = null;

        // Helper: format seconds to MM:SS or HH:MM:SS
        function formatTimestamp(seconds) {
            if (isNaN(seconds) || seconds < 0) return "0:00";
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            if (hrs > 0) {
                return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else {
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }

        // Parse timestamp to seconds
        function parseTimestampToSeconds(timeStr) {
            let str = timeStr.trim();
            if (!str) return null;
            if (/^\d+$/.test(str)) {
                let secs = parseInt(str, 10);
                return isNaN(secs) ? null : secs;
            }
            let parts = str.split(':');
            if (parts.length === 2) {
                let mins = parseInt(parts[0], 10);
                let secs = parseInt(parts[1], 10);
                if (isNaN(mins) || isNaN(secs) || secs >= 60) return null;
                return mins * 60 + secs;
            } else if (parts.length === 3) {
                let hrs = parseInt(parts[0], 10);
                let mins = parseInt(parts[1], 10);
                let secs = parseInt(parts[2], 10);
                if (isNaN(hrs) || isNaN(mins) || isNaN(secs) || mins >= 60 || secs >= 60) return null;
                return hrs * 3600 + mins * 60 + secs;
            }
            return null;
        }

        function showToolMessage(message, type = "success") {
            const msgContainer = document.getElementById("global-message-area");
            if (!msgContainer) return;
            const alertDiv = document.createElement("div");
            alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2`;
            alertDiv.role = "alert";
            alertDiv.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
            msgContainer.appendChild(alertDiv);
            setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) alertDiv.remove();
            }, 4000);
        }

        function renderChapterList() {
            const listContainer = document.getElementById("chapters-list-area");
            if (!listContainer) return;
            if (chaptersArray.length === 0) {
                listContainer.innerHTML = `<div class="text-muted text-center py-4">📭 No chapters yet. Add timestamps above.</div>`;
                return;
            }
            const sorted = [...chaptersArray].sort((a,b) => a.seconds - b.seconds);
            let html = `<div class="list-group list-group-flush bg-transparent">`;
            sorted.forEach((ch, idx) => {
                const originalIndex = chaptersArray.findIndex(item => item.seconds === ch.seconds && item.title === ch.title);
                const realIdx = originalIndex !== -1 ? originalIndex : idx;
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 border-bottom chapter-list-item">
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-dark rounded-pill px-3 py-2">${formatTimestamp(ch.seconds)}</span>
                            <span class="fw-medium">${escapeHtml(ch.title)}</span>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-custom me-1 edit-chapter-btn" data-idx="${realIdx}"><i class="bi bi-pencil-square"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-chapter-btn" data-idx="${realIdx}"><i class="bi bi-x-lg"></i></button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            listContainer.innerHTML = html;

            document.querySelectorAll('.edit-chapter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-idx');
                    if (idx !== null && chaptersArray[parseInt(idx)]) {
                        const chapter = chaptersArray[parseInt(idx)];
                        document.getElementById('chapter-time-input').value = formatTimestamp(chapter.seconds);
                        document.getElementById('chapter-title-input').value = chapter.title;
                        chaptersArray.splice(parseInt(idx), 1);
                        renderChapterList();
                        updateGeneratedOutput();
                        showToolMessage("Edit mode: modify timestamp/title and click Add Chapter.", "info");
                    }
                });
            });

            document.querySelectorAll('.delete-chapter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = btn.getAttribute('data-idx');
                    if (idx !== null) {
                        chaptersArray.splice(parseInt(idx), 1);
                        renderChapterList();
                        updateGeneratedOutput();
                        showToolMessage("Chapter removed.", "warning");
                    }
                });
            });
        }

        function updateGeneratedOutput() {
            const outputPre = document.getElementById("generated-chapters-output");
            if (!outputPre) return;
            if (chaptersArray.length === 0) {
                outputPre.textContent = "# No chapters added yet.\n# Add timestamps and titles to generate YouTube-ready chapters.";
                return;
            }
            const sorted = [...chaptersArray].sort((a,b) => a.seconds - b.seconds);
            const chapterLines = sorted.map(ch => `${formatTimestamp(ch.seconds)} ${ch.title}`).join('\n');
            outputPre.textContent = chapterLines;
        }

        function addChapterFromInput() {
            const timeVal = document.getElementById('chapter-time-input').value.trim();
            const titleVal = document.getElementById('chapter-title-input').value.trim();
            if (!timeVal) { showToolMessage("Please enter a timestamp.", "danger"); return; }
            if (!titleVal) { showToolMessage("Please enter a chapter title.", "danger"); return; }
            const seconds = parseTimestampToSeconds(timeVal);
            if (seconds === null || seconds < 0) {
                showToolMessage("Invalid timestamp. Use MM:SS (e.g., 1:30) or seconds (90).", "danger");
                return;
            }
            chaptersArray.push({ seconds, title: titleVal });
            document.getElementById('chapter-time-input').value = '';
            document.getElementById('chapter-title-input').value = '';
            renderChapterList();
            updateGeneratedOutput();
            showToolMessage(`✅ Chapter "${titleVal}" at ${formatTimestamp(seconds)} added.`, "success");
        }

        function clearAllChapters() {
            if (chaptersArray.length === 0) { showToolMessage("No chapters to clear.", "info"); return; }
            chaptersArray = [];
            renderChapterList();
            updateGeneratedOutput();
            showToolMessage("All chapters cleared.", "info");
        }

        function copyChaptersToClipboard() {
            const outputElem = document.getElementById("generated-chapters-output");
            const textToCopy = outputElem.textContent;
            if (!textToCopy || textToCopy.includes("No chapters added yet")) {
                showToolMessage("Nothing to copy. Add at least one chapter.", "warning");
                return;
            }
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToolMessage("📋 Chapters copied to clipboard! Paste into YouTube description.", "success");
            }).catch(() => {
                showToolMessage("Failed to copy. Manual copy works.", "danger");
            });
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }

        async function fetchYouTubeVideoInfo(urlOrId) {
            let videoId = null;
            if (urlOrId.includes('youtube.com') || urlOrId.includes('youtu.be')) {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                const match = urlOrId.match(regExp);
                videoId = (match && match[2].length === 11) ? match[2] : null;
            } else if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
                videoId = urlOrId;
            }
            if (!videoId) {
                showToolMessage("Invalid YouTube URL or ID.", "danger");
                return null;
            }
            const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
            try {
                const response = await fetch(oembedUrl);
                if (!response.ok) throw new Error();
                const data = await response.json();
                return {
                    title: data.title,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                    watchLink: `https://www.youtube.com/watch?v=${videoId}`,
                    videoId
                };
            } catch (err) {
                showToolMessage("Could not fetch video details.", "danger");
                return null;
            }
        }

        async function onFetchVideo() {
            const urlInput = document.getElementById('chapter-maker-url').value.trim();
            if (!urlInput) { showToolMessage("Please enter a YouTube URL or ID.", "warning"); return; }
            const videoData = await fetchYouTubeVideoInfo(urlInput);
            if (videoData) {
                currentVideoInfo = videoData;
                document.getElementById('video-thumb-img').src = videoData.thumbnail;
                document.getElementById('video-title-display').textContent = videoData.title;
                document.getElementById('video-watch-link').href = videoData.watchLink;
                document.getElementById('video-info-panel').style.display = 'block';
                showToolMessage(`🎬 Loaded: "${videoData.title}"`, "success");
            } else {
                document.getElementById('video-info-panel').style.display = 'none';
            }
        }

        // Attach event listeners
        document.getElementById('chapter-maker-fetch-btn').addEventListener('click', onFetchVideo);
        document.getElementById('add-chapter-action').addEventListener('click', addChapterFromInput);
        document.getElementById('clear-all-chapters').addEventListener('click', clearAllChapters);
        document.getElementById('copy-output-button').addEventListener('click', copyChaptersToClipboard);

        const timeField = document.getElementById('chapter-time-input');
        const titleField = document.getElementById('chapter-title-input');
        if (timeField) timeField.addEventListener('keypress', (e) => { if (e.key === 'Enter') addChapterFromInput(); });
        if (titleField) titleField.addEventListener('keypress', (e) => { if (e.key === 'Enter') addChapterFromInput(); });

        renderChapterList();
        updateGeneratedOutput();
    }

    // Start tool when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initYouTubeChapterMaker);
    } else {
        initYouTubeChapterMaker();
    }
})();
