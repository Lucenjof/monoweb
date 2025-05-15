document.addEventListener('DOMContentLoaded', function() {

    // --- SPLASH SCREEN LOGIC ---
    const splashScreen = document.getElementById('splash-screen');
    const mainContentWrapper = document.getElementById('main-content-wrapper');

    if (splashScreen && mainContentWrapper) {
        const enterSite = () => {
            if (splashScreen.classList.contains('hidden')) return; // Evitar múltiples ejecuciones
            splashScreen.classList.add('hidden');

            splashScreen.addEventListener('transitionend', function onTransitionEnd(event) {
                // Asegurarse que la transición es por opacidad para evitar múltiples llamadas por transform, etc.
                if (event.propertyName === 'opacity') {
                    splashScreen.style.display = 'none'; // Ocultar completamente del DOM después de la transición
                    mainContentWrapper.classList.add('visible');
                    splashScreen.removeEventListener('transitionend', onTransitionEnd); // Limpiar listener
                    
                    if (tracksData.length > 0 && currentTrackIndex === -1) {
                        loadTrack(0, true, true); // Inicia el álbum
                    }
                }
            }, { once: true }); // { once: true } podría no ser suficiente si hay múltiples transiciones en splashScreen.
                               // Si sigue habiendo problemas con el splash, considera quitar el listener DENTRO de la función
                               // y manejar el display:none con un setTimeout que coincida con la duración de la transición de opacidad en CSS.
                               // Ejemplo: setTimeout(() => { splashScreen.style.display = 'none'; }, 600); // Si la transición es de 0.6s
        };

        splashScreen.addEventListener('click', enterSite);
        splashScreen.setAttribute('tabindex', '0');
        if (typeof splashScreen.focus === 'function') {
            splashScreen.focus();
        }
        splashScreen.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                enterSite();
            }
        });
    } else {
        if(mainContentWrapper) {
            mainContentWrapper.classList.add('visible');
        }
        console.warn("Splash screen o main content wrapper no encontrado.");
    }

    // --- ELEMENTOS DEL DOM (REPRODUCTOR ÚNICO FIJO) ---
    const audioPlayer = document.getElementById('audio-player');
    const trackItems = document.querySelectorAll('.track-item');

    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressContainer = document.getElementById('progress-container');
    const progress = document.getElementById('progress');
    const playerCurrentTrackTitle = document.getElementById('player-current-track-title');
    const volumeSlider = document.getElementById('volume-slider');
    const muteBtn = document.getElementById('mute-btn');

    // Modal de Imagen
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const coverImageClickableArea = document.getElementById('album-cover-clickable-area'); // Contenedor de portada en panel izq
    const closeModalBtn = document.querySelector('.modal-close');
    const galleryThumbnails = document.querySelectorAll('.gallery-thumbnail');

    // Botón para cambiar fondo del booklet y el panel del booklet
    const toggleBookletBgBtn = document.getElementById('toggle-booklet-bg-btn');
    const tracklistPanelMain = document.getElementById('tracklist-panel-main');

    // --- ESTADO DEL REPRODUCTOR ---
    let isPlaying = false;
    let currentTrackIndex = -1;
    let tracksData = [];
    let currentVolume = 0.8;
    let previousVolumeBeforeMute = currentVolume;
    let bookletBgToggled = true; // <<<--- Inicia con el fondo alternativo (celeste) activado

    // --- ARREGLO DE VIDEOS (Debe estar definido globalmente o accesible aquí) ---
    const backgroundVideos = [
        "videos/video1.mp4",
        "videos/video2.mp4",
        "videos/video3.mp4",
        "videos/video4.mp4",
        "videos/video5.mp4"
    ];


    // --- INICIALIZACIÓN ---
    function gatherTrackData() {
        tracksData = [];
        trackItems.forEach((item, index) => {
            const trackNameElement = item.querySelector('.track-info .track-name');
            const trackTitle = trackNameElement ? trackNameElement.textContent.trim() : `Pista ${index + 1}`;
            tracksData.push({
                src: item.getAttribute('data-src'),
                title: trackTitle,
                element: item,
                playBtn: item.querySelector('.play-track-btn'),
                videoSrc: backgroundVideos[index] || null // Asigna video de fondo
            });
        });

        audioPlayer.volume = currentVolume;
        if(volumeSlider) volumeSlider.value = currentVolume * 100;
        
        updateMuteButtonUI();
        updatePlayerUI(); // Actualiza UI del reproductor
        checkAudioButtonsAvailability();
        updateBookletThemeButton(); // Aplica el estado inicial del tema del booklet
    }

    function loadTrack(index, playImmediately = false, autoPlayNext = false) {
        if (index >= 0 && index < tracksData.length) {
            const trackData = tracksData[index];
            const previousTrackIndex = currentTrackIndex;
            const backgroundVideo = document.getElementById('background-video');

            if (backgroundVideo && trackData.videoSrc) {
                const videoUrl = new URL(trackData.videoSrc, window.location.href).href;
                if (backgroundVideo.currentSrc !== videoUrl) {
                    backgroundVideo.classList.remove('visible');
                    setTimeout(() => {
                        backgroundVideo.src = trackData.videoSrc; backgroundVideo.load();
                        backgroundVideo.play().catch(e => console.warn("Autoplay video bg bloqueado:", e));
                        setTimeout(() => { backgroundVideo.classList.add('visible'); }, 50);
                    }, 300);
                } else if (!backgroundVideo.classList.contains('visible')) {
                    backgroundVideo.play().catch(e => console.warn("Autoplay video bg bloqueado:", e));
                    backgroundVideo.classList.add('visible');
                }
            } else if (backgroundVideo) {
                backgroundVideo.classList.remove('visible');
                setTimeout(() => { backgroundVideo.src = ""; }, 300);
            }

            if (index !== currentTrackIndex || audioPlayer.src !== new URL(trackData.src, window.location.href).href) {
                if (previousTrackIndex !== -1 && tracksData[previousTrackIndex]?.playBtn) {
                    tracksData[previousTrackIndex].playBtn.innerHTML = '&#x25B6;';
                    tracksData[previousTrackIndex].element.classList.remove('playing');
                }
                audioPlayer.src = trackData.src; currentTrackIndex = index;
                audioPlayer.onloadedmetadata = () => {
                    updatePlayerUI(); checkAudioButtonsAvailability();
                    if (playImmediately) playTrack();
                    if (autoPlayNext) {
                        closeAllAccordions();
                        // Opcional: abrir acordeón de la pista actual
                        // const currentTrackElement = tracksData[currentTrackIndex]?.element;
                        // if (currentTrackElement) { toggleAccordion(currentTrackElement, true); }
                    }
                };
                audioPlayer.onerror = (e) => {
                    console.error(`Error al cargar audio: ${trackData?.src || 'desconocida'}`, e);
                    if(playerCurrentTrackTitle) playerCurrentTrackTitle.textContent = "Error";
                    if (trackData?.playBtn) { trackData.playBtn.innerHTML = '&#x25B6;'; trackData.element.classList.remove('playing');}
                    currentTrackIndex = -1; isPlaying = false;
                    updatePlayerUI(); checkAudioButtonsAvailability();
                };
                audioPlayer.load();
            } else if (playImmediately && !isPlaying) {
                playTrack();
                if (autoPlayNext) closeAllAccordions();
            } else if (!playImmediately) { updatePlayerUI(); }
            updateActiveTrackVisuals();
        } else {
            if (autoPlayNext) {
                pauseTrack(); currentTrackIndex = -1; isPlaying = false;
                updatePlayerUI(); checkAudioButtonsAvailability(); updateActiveTrackVisuals(); closeAllAccordions();
                if (document.getElementById('background-video')) document.getElementById('background-video').classList.remove('visible');
            }
        }
    }

    function playTrack() {
        if (currentTrackIndex === -1 && tracksData.length > 0) { loadTrack(0, true, true); return; }
        if (currentTrackIndex !== -1 && tracksData[currentTrackIndex]) {
            if (audioPlayer.readyState >= 2) { // HAVE_CURRENT_DATA o superior
                const playPromise = audioPlayer.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Error al intentar reproducir:", error);
                        // La reproducción automática puede ser bloqueada por el navegador.
                        isPlaying = false; updatePlayerUI(); updateActiveTrackVisuals();
                    });
                }
            } else {
                const tryPlayWhenReady = () => {
                    if (!isPlaying && currentTrackIndex !== -1 && tracksData[currentTrackIndex]) playTrack();
                    audioPlayer.removeEventListener('canplaythrough', tryPlayWhenReady);
                };
                audioPlayer.addEventListener('canplaythrough', tryPlayWhenReady, { once: true });
            }
        }
    }

    function pauseTrack() { if (currentTrackIndex !== -1) audioPlayer.pause(); }
    function playPauseToggle() { if (isPlaying) pauseTrack(); else { if (currentTrackIndex === -1 && tracksData.length > 0) loadTrack(0, true, true); else playTrack(); } }
    function nextTrack(eventFromEnded = false) { const wasPlaying = isPlaying || eventFromEnded; let newIndex = (currentTrackIndex === -1 ? 0 : currentTrackIndex + 1) % tracksData.length; loadTrack(newIndex, wasPlaying, eventFromEnded); }
    function prevTrack() { const wasPlaying = isPlaying; let newIndex = currentTrackIndex - 1; if (newIndex < 0) newIndex = tracksData.length - 1; if (currentTrackIndex === -1) newIndex = tracksData.length - 1; loadTrack(newIndex, wasPlaying, false); }
    function formatTime(seconds) { if (isNaN(seconds) || seconds < 0) return '0:00'; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }
    function updateProgressUI() { const { duration, currentTime } = audioPlayer; let progressPercent = 0; if (duration && !isNaN(duration) && duration > 0) progressPercent = (currentTime / duration) * 100; if(progress) progress.style.width = `${progressPercent}%`; }
    function displayDurationUI() { /* No se usa activamente si los elementos de tiempo están ocultos */ }
    function setProgressFromClick(e) { if (!progressContainer) return; const width = progressContainer.clientWidth; const clickX = e.offsetX; const duration = audioPlayer.duration; if (duration && !isNaN(duration)) { audioPlayer.currentTime = (clickX / width) * duration; if (!isPlaying) updateProgressUI(); } }
    function updateActiveTrackVisuals() { trackItems.forEach((item, index) => { const playBtn = tracksData[index]?.playBtn; if (index === currentTrackIndex) { item.classList.add('active'); if (playBtn) playBtn.innerHTML = isPlaying ? '&#x23F8;' : '&#x25B6;'; if(isPlaying) item.classList.add('playing'); else item.classList.remove('playing'); } else { item.classList.remove('active', 'playing'); if (playBtn) playBtn.innerHTML = '&#x25B6;'; } }); }
    
    function updatePlayerUI() {
        let titleText = "";
        if (currentTrackIndex !== -1 && tracksData[currentTrackIndex]) {
            titleText = tracksData[currentTrackIndex].title;
        } else if (tracksData.length > 0 && !splashScreen.classList.contains('hidden') ) { // Antes de que el splash se vaya y no haya cancion
             titleText = "--"; // Placeholder si no hay nada o antes del primer play
        } else if (tracksData.length > 0 ) {
            titleText = tracksData[0].title; // Si el splash ya se fue y no hay nada, muestra el primero (o "--")
        } else {
            titleText = "--";
        }

        if(playerCurrentTrackTitle) playerCurrentTrackTitle.textContent = titleText;
        updateProgressUI();
        const playIcon = isPlaying ? '&#x23F8;' : '&#x25B6;';
        if(playPauseBtn) playPauseBtn.innerHTML = playIcon;
        updateActiveTrackVisuals();
        updateMuteButtonUI();
    }

    function checkAudioButtonsAvailability() { const canPlaySomething = tracksData.length > 0; const hasValidTrackSelectedAndLoaded = currentTrackIndex !== -1 && !isNaN(audioPlayer.duration) && audioPlayer.duration > 0; const disablePlayPause = !canPlaySomething; const disableNav = !canPlaySomething; const disableProgressInteraction = !hasValidTrackSelectedAndLoaded; if(playPauseBtn) playPauseBtn.disabled = disablePlayPause; if(prevBtn) prevBtn.disabled = disableNav; if(nextBtn) nextBtn.disabled = disableNav; if(progressContainer) { progressContainer.style.pointerEvents = disableProgressInteraction ? 'none' : 'auto'; progressContainer.style.opacity = disableProgressInteraction ? '0.5' : '1'; } if(volumeSlider) volumeSlider.disabled = !canPlaySomething; if(muteBtn) muteBtn.disabled = !canPlaySomething; }
    
    function toggleAccordion(itemToToggle, forceOpen = false) {
        const detailsDiv = itemToToggle.querySelector('.track-details'); if (!detailsDiv) return;
        const icon = itemToToggle.querySelector('.expand-icon'); const currentlyOpen = itemToToggle.classList.contains('open');
        
        // Si no se está forzando la apertura, primero cierra todos los demás
        if (!forceOpen) {
            closeAllAccordions(itemToToggle);
        }

        if (forceOpen || !currentlyOpen) {
            itemToToggle.classList.add('open');
            // Forzar reflow para asegurar que scrollHeight se mida con el elemento visible
            detailsDiv.style.display = 'block'; 
            const scrollHeight = detailsDiv.scrollHeight;
            // detailsDiv.style.display = ''; // Quitar si .open maneja el display, sino el max-height no animará
            
            requestAnimationFrame(() => { 
                detailsDiv.style.maxHeight = scrollHeight + "px"; 
            });
            if (icon) icon.textContent = '−';
        } else if (!forceOpen && currentlyOpen) { // Solo cierra si NO se fuerza apertura y YA estaba abierto
            itemToToggle.classList.remove('open'); 
            detailsDiv.style.maxHeight = null; 
            if (icon) icon.textContent = '+';
        }
    }
    function closeAllAccordions(exceptItem = null) { trackItems.forEach(item => { if (item !== exceptItem && item.classList.contains('open')) { item.classList.remove('open'); const details = item.querySelector('.track-details'); if (details) details.style.maxHeight = null; const icon = item.querySelector('.expand-icon'); if (icon) icon.textContent = '+'; } }); }
    function openModal(imageSrc, captionText) { if (modal && modalImage && modalCaption) { modalImage.src = imageSrc; modalCaption.textContent = captionText; modal.classList.add('active'); document.body.style.overflow = 'hidden'; } }
    function closeModal() { if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; } }
    function setVolume(volumeValue) { currentVolume = parseFloat(volumeValue) / 100; audioPlayer.volume = currentVolume; audioPlayer.muted = (currentVolume < 0.01); }
    function toggleMute() { if (audioPlayer.muted || audioPlayer.volume === 0) { audioPlayer.muted = false; currentVolume = previousVolumeBeforeMute > 0.01 ? previousVolumeBeforeMute : 0.5; audioPlayer.volume = currentVolume; if(volumeSlider) volumeSlider.value = currentVolume * 100; } else { previousVolumeBeforeMute = audioPlayer.volume; audioPlayer.muted = true; } updateMuteButtonUI(); }
    function updateMuteButtonUI() { const isEffectivelyMuted = audioPlayer.muted || audioPlayer.volume < 0.01; const muteIcon = isEffectivelyMuted ? '&#x1F507;' : (audioPlayer.volume > 0.6 ? '&#x1F50A;' : (audioPlayer.volume > 0.1 ? '&#x1F509;' : '&#x1F508;')); if (muteBtn) muteBtn.innerHTML = muteIcon; }

    // Función para actualizar la UI del botón de tema del booklet
    function updateBookletThemeButton() {
        if (toggleBookletBgBtn && tracklistPanelMain) {
            tracklistPanelMain.classList.toggle('alt-bg', bookletBgToggled);
            toggleBookletBgBtn.innerHTML = bookletBgToggled ? '📜' : '🎨';
            toggleBookletBgBtn.title = bookletBgToggled ? "Fondo Original" : "Cambiar Fondo del Booklet";
        }
    }

    // --- EVENT LISTENERS ---
    if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseToggle);
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    if (nextBtn) nextBtn.addEventListener('click', () => nextTrack(false));
    if (progressContainer) progressContainer.addEventListener('click', setProgressFromClick);
    if (volumeSlider) volumeSlider.addEventListener('input', (e) => setVolume(e.target.value));
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (audioPlayer) { audioPlayer.addEventListener('timeupdate', updateProgressUI); audioPlayer.addEventListener('ended', () => nextTrack(true)); audioPlayer.addEventListener('play', () => { isPlaying = true; updatePlayerUI(); updateActiveTrackVisuals(); }); audioPlayer.addEventListener('pause', () => { isPlaying = false; updatePlayerUI(); updateActiveTrackVisuals(); }); audioPlayer.addEventListener('loadedmetadata', () => { updatePlayerUI(); checkAudioButtonsAvailability(); }); audioPlayer.addEventListener('volumechange', () => { currentVolume = audioPlayer.muted ? 0 : audioPlayer.volume; const currentVolumePercent = Math.round(currentVolume * 100); if(volumeSlider && parseInt(volumeSlider.value) !== currentVolumePercent) volumeSlider.value = currentVolumePercent; updateMuteButtonUI(); }); }

    trackItems.forEach(item => {
        const expandButton = item.querySelector('.expand-details-btn');
        const trackInfoArea = item.querySelector('.track-info');
        const playButton = item.querySelector('.play-track-btn');
        if (expandButton) expandButton.addEventListener('click', (e) => { e.stopPropagation(); toggleAccordion(item);});
        if (trackInfoArea) trackInfoArea.addEventListener('click', () => toggleAccordion(item));
        if (playButton) { playButton.addEventListener('click', (event) => { event.stopPropagation(); const trackIndex = parseInt(item.getAttribute('data-track-index'), 10); if (trackIndex === currentTrackIndex && isPlaying) pauseTrack(); else loadTrack(trackIndex, true, false); }); }
    });

    if (coverImageClickableArea) {
        coverImageClickableArea.addEventListener('click', () => {
            const imgElement = document.getElementById('album-cover-img-panel'); // Usar el ID directo
            if (imgElement) {
                openModal(imgElement.src, imgElement.alt || "Portada del Álbum");
            }
        });
    }
    if (galleryThumbnails) { galleryThumbnails.forEach(thumbnail => { thumbnail.addEventListener('click', () => { const largeImageSrc = thumbnail.dataset.largeSrc || thumbnail.src; let caption = thumbnail.alt || "Imagen de la galería"; const captionElement = thumbnail.closest('.gallery-item')?.querySelector('.thumbnail-caption'); if (captionElement) caption = captionElement.textContent.trim(); openModal(largeImageSrc, caption); }); }); }
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('active')) closeModal(); });

    // Event Listener para el botón de cambiar fondo del booklet
    if (toggleBookletBgBtn && tracklistPanelMain) {
        toggleBookletBgBtn.addEventListener('click', () => {
            bookletBgToggled = !bookletBgToggled;
            updateBookletThemeButton();
        });
    }

    // --- INICIALIZAR ---
    gatherTrackData(); // Esto ahora también llamará a updateBookletThemeButton indirectamente o directamente
    updateBookletThemeButton(); // Llamada explícita para el estado inicial del botón y fondo del booklet

    const currentYearSpanMain = document.getElementById('current-year-main');
    if (currentYearSpanMain) currentYearSpanMain.textContent = new Date().getFullYear();

});