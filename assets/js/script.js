document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SÉLECTION DES ÉLÉMENTS DU HUD GLOBAL ---
    const gpAudio = document.getElementById('gp-audio-engine');
    const gpPlayBtn = document.getElementById('gp-play');
    const gpPrevBtn = document.getElementById('gp-prev');
    const gpNextBtn = document.getElementById('gp-next');
    const gpTitle = document.getElementById('gp-title');
    const gpArtist = document.getElementById('gp-artist');
    const gpCover = document.getElementById('gp-cover');
    const gpTimeCurrent = document.getElementById('gp-time-current');
    const gpTimeTotal = document.getElementById('gp-time-total');
    const gpProgressBar = document.getElementById('gp-bar');
    const gpProgressContainer = document.getElementById('gp-progress');
    const gpLyricsBtn = document.getElementById('gp-lyrics-btn'); // Le bouton Paroles

    let virtualPlaylist = [];
    let currentTrackIndex = -1;

    // --- 2. LE MOTEUR DE CHARGEMENT & ANALYSE DE DONNÉES ---
    const loadTrackIntoHUD = (trackData) => {
        gpTitle.textContent = trackData.title;
        gpArtist.textContent = "The Fallen Guardians"; 
        gpAudio.src = trackData.src;
        
        if (trackData.cover) {
            gpCover.innerHTML = `<img src="${trackData.cover}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0;"> <span class="scan-line"></span>`;
        } else {
            gpCover.innerHTML = `<span class="scan-line"></span>`;
        }

        // LE SCANNER DE PAROLES : Vérifie si le titre existe dans database.js
        if (typeof lyricsDB !== 'undefined' && lyricsDB[trackData.title]) {
            gpLyricsBtn.classList.add('active');
            gpLyricsBtn.textContent = 'ACCESS DECIPHERED SONGSHARD DATA';
            gpLyricsBtn.disabled = false;
        } else {
            gpLyricsBtn.classList.remove('active');
            gpLyricsBtn.textContent = 'DATA ENCRYPTED'; // Style si aucune parole dispo
            gpLyricsBtn.disabled = true;
        }

        gpAudio.play();
        syncAllButtons();
    };

    const syncAllButtons = () => {
        gpPlayBtn.textContent = gpAudio.paused ? '▶' : '⏸';
        const localCards = document.querySelectorAll('.song-card');
        localCards.forEach(card => {
            const localBtn = card.querySelector('.play-btn');
            const localAudioSrc = card.querySelector('audio').src;
            localBtn.textContent = (localAudioSrc === gpAudio.src) ? (gpAudio.paused ? '▶' : '⏸') : '▶';
        });
    };

    // --- 3. LE SYSTÈME NERVEUX DES CARTES AUDIO ---
    const initAudioCards = () => {
        const playButtons = document.querySelectorAll('.play-btn');

        playButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.song-card');
                const audioSrc = card.querySelector('audio').src;

                if (gpAudio.src === audioSrc) {
                    if (gpAudio.paused) gpAudio.play();
                    else gpAudio.pause();
                    return;
                }

                virtualPlaylist = Array.from(document.querySelectorAll('.song-card')).map(c => ({
                    title: c.querySelector('h2').textContent,
                    src: c.querySelector('audio').src,
                    cover: c.getAttribute('data-cover') || ''
                }));
                currentTrackIndex = index;

                loadTrackIntoHUD(virtualPlaylist[currentTrackIndex]);
            });
        });

        const downloadBtns = document.querySelectorAll('.download-btn');
        downloadBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const fileUrl = btn.getAttribute('href');
                const fileName = btn.getAttribute('download') || 'Parzyval_Track.mp3'; 
                const originalText = btn.innerHTML;
                btn.innerHTML = '⏳ Décryptage...';
                btn.style.pointerEvents = 'none';
                try {
                    const response = await fetch(fileUrl);
                    if (!response.ok) throw new Error("Erreur réseau");
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const tempLink = document.createElement('a');
                    tempLink.style.display = 'none';
                    tempLink.href = blobUrl;
                    tempLink.download = fileName;
                    document.body.appendChild(tempLink);
                    tempLink.click();
                    document.body.removeChild(tempLink);
                    window.URL.revokeObjectURL(blobUrl);
                    btn.innerHTML = originalText;
                    btn.style.pointerEvents = 'auto';
                } catch (error) {
                    btn.innerHTML = '❌ Signal Perdu';
                    setTimeout(() => { btn.innerHTML = originalText; btn.style.pointerEvents = 'auto'; }, 3000);
                }
            });
        });
    };

    // --- 4. LE ROUTEUR FANTÔME (SPA) ---
    const initRouter = () => {
        document.body.addEventListener('click', async (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.endsWith('.txt') || href === '#' || link.getAttribute('target') === '_blank' || link.hasAttribute('download')) return;

            e.preventDefault();
            try {
                const response = await fetch(href);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const newHeader = doc.querySelector('.page-header');
                const newMain = doc.querySelector('main');
                const newTerminal = doc.querySelector('.welcome-terminal'); 

                document.querySelector('.page-header').replaceWith(newHeader);
                document.querySelector('main').replaceWith(newMain);

                const currentTerminal = document.querySelector('.welcome-terminal');
                if (currentTerminal) currentTerminal.remove(); 
                if (newTerminal) document.querySelector('.page-header').after(newTerminal); 

                window.history.pushState({}, '', href);
                window.scrollTo(0, 0);
                
                initAudioCards(); 
                syncAllButtons(); 
            } catch (err) {
                console.error('Erreur routage:', err);
            }
        });
        window.addEventListener('popstate', () => { window.location.reload(); });
    };

    // --- 5. CONTRÔLES DU LECTEUR ---
    if(gpPlayBtn) gpPlayBtn.addEventListener('click', () => { if(gpAudio.src) gpAudio.paused ? gpAudio.play() : gpAudio.pause(); syncAllButtons(); });
    if(gpNextBtn) gpNextBtn.addEventListener('click', () => { if(virtualPlaylist.length) { currentTrackIndex = (currentTrackIndex + 1) % virtualPlaylist.length; loadTrackIntoHUD(virtualPlaylist[currentTrackIndex]); }});
    if(gpPrevBtn) gpPrevBtn.addEventListener('click', () => { if(virtualPlaylist.length) { currentTrackIndex = (currentTrackIndex - 1 + virtualPlaylist.length) % virtualPlaylist.length; loadTrackIntoHUD(virtualPlaylist[currentTrackIndex]); }});
    
    if(gpAudio) {
        gpAudio.addEventListener('ended', () => { if(virtualPlaylist.length) { currentTrackIndex++; if(currentTrackIndex < virtualPlaylist.length) loadTrackIntoHUD(virtualPlaylist[currentTrackIndex]); else { currentTrackIndex = 0; syncAllButtons(); }}});
        gpAudio.addEventListener('timeupdate', () => {
            const percent = (gpAudio.currentTime / gpAudio.duration) * 100;
            if(gpProgressBar) gpProgressBar.style.width = `${percent}%`;
            const format = t => isNaN(t) ? "0:00" : `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`;
            if(gpTimeCurrent) gpTimeCurrent.textContent = format(gpAudio.currentTime);
            if(gpTimeTotal && gpAudio.duration) gpTimeTotal.textContent = format(gpAudio.duration);

            document.querySelectorAll('.song-card').forEach(card => {
                if(card.querySelector('audio').src === gpAudio.src) {
                    const localBar = card.querySelector('.progress-bar'), localTime = card.querySelector('.time-display');
                    if(localBar) localBar.style.width = `${percent}%`;
                    if(localTime) localTime.textContent = `${format(gpAudio.currentTime)} / ${format(gpAudio.duration)}`;
                }
            });
        });
        if(gpProgressContainer) gpProgressContainer.addEventListener('click', e => { if(gpAudio.src) gpAudio.currentTime = (e.offsetX / gpProgressContainer.clientWidth) * gpAudio.duration; });
    }

    // --- 6. LE TERMINAL DES PAROLES (NOUVEAU) ---
    const lyricsOverlay = document.getElementById('lyrics-overlay');
    const closeLyrics = document.getElementById('close-lyrics');
    const lyricsText = document.getElementById('lyrics-text');
    const lyricsTitleUI = document.getElementById('lyrics-title');

    if (gpLyricsBtn && lyricsOverlay) {
        // Ouvre le terminal
        gpLyricsBtn.addEventListener('click', () => {
            const currentTitle = gpTitle.textContent;
            
            // On vérifie à nouveau par sécurité
            if (typeof lyricsDB !== 'undefined' && lyricsDB[currentTitle]) {
                lyricsTitleUI.textContent = `// SONGSHARD DATA: ${currentTitle.toUpperCase()}`;
                lyricsText.textContent = lyricsDB[currentTitle]; // Injecte le texte pur
                lyricsOverlay.classList.add('active');
            }
        });

        // Ferme le terminal
        const closeModal = () => lyricsOverlay.classList.remove('active');
        
        closeLyrics.addEventListener('click', closeModal);
        
        // Ferme aussi si on clique sur le fond flouté en dehors de la boîte
        lyricsOverlay.addEventListener('click', (e) => {
            if (e.target === lyricsOverlay) closeModal(); 
        });
    }

    // --- 7. INITIALISATION ---
    initAudioCards();
    initRouter();
});