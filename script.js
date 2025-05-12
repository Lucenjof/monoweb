document.addEventListener('DOMContentLoaded', function() {

    // --- ELEMENTOS DEL DOM ---
    const audioPlayer = document.getElementById('audio-player');
    const trackItems = document.querySelectorAll('.track-item');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const playAllBtn = document.getElementById('play-all-btn');
    const progressContainer = document.getElementById('progress-container');
    const progress = document.getElementById('progress');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const playerCurrentTrackTitle = document.getElementById('player-current-track-title');
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const coverImageContainer = document.querySelector('.album-cover-container');
    const closeModalBtn = document.querySelector('.modal-close');

    // --- ESTADO DEL REPRODUCTOR ---
    let isPlaying = false;
    let currentTrackIndex = -1;
    let tracksData = [];

    // --- INICIALIZACIÓN ---
    function gatherTrackData() {
        tracksData = [];
        trackItems.forEach((item, index) => {
            tracksData.push({
                src: item.getAttribute('data-src'),
                title: item.querySelector('.track-title-button .track-name')?.textContent.trim() || `Pista ${index + 1}`,
                element: item,
                playBtn: item.querySelector('.play-track-btn')
            });
        });
        updatePlayerUI();
        checkAudioButtonsAvailability();
    }

    function loadTrack(index, playImmediately = false, autoPlayNext = false) {
        if (index >= 0 && index < tracksData.length) {
            const previousTrackIndex = currentTrackIndex;

            if (index !== currentTrackIndex || !audioPlayer.src || audioPlayer.currentSrc !== tracksData[index].src) {
                if (previousTrackIndex !== -1 && tracksData[previousTrackIndex]?.playBtn) {
                    tracksData[previousTrackIndex].playBtn.textContent = '▶';
                    tracksData[previousTrackIndex].element.classList.remove('playing');
                }

                audioPlayer.src = tracksData[index].src;
                currentTrackIndex = index;

                audioPlayer.onloadedmetadata = () => {
                    updatePlayerUI();
                    checkAudioButtonsAvailability();
                    if (playImmediately) {
                        playTrack();
                    }
                    // Manejo del acordeón cuando es autoPlayNext
                    if (autoPlayNext) {
                        closeAllAccordions(); // Cierra todos
                        // Opcional: abrir el de la nueva canción
                        // if (tracksData[currentTrackIndex]) {
                        //     toggleAccordion(tracksData[currentTrackIndex].element, true); // true para forzar apertura
                        // }
                    }
                };
                audioPlayer.onerror = () => {
                    console.error(`Error al cargar la pista: ${tracksData[index]?.src || 'desconocida'}`);
                    playerCurrentTrackTitle.textContent = "Error al cargar pista";
                    if (tracksData[index]?.playBtn) {
                        tracksData[index].playBtn.textContent = '▶';
                        tracksData[index].element.classList.remove('playing');
                    }
                    currentTrackIndex = -1;
                    updatePlayerUI();
                    checkAudioButtonsAvailability();
                }
                audioPlayer.load();
            } else if (playImmediately && !isPlaying) {
                playTrack();
                 if (autoPlayNext) { // Si es la misma pista (improbable en autoPlayNext, pero por si acaso)
                    closeAllAccordions();
                 }
            } else if (!playImmediately) {
                updatePlayerUI();
            }
            updateActiveTrackVisuals();
        } else {
            console.warn(`Índice de pista inválido para cargar: ${index}`);
            // Si se llega al final de la lista por nextTrack y no hay loop, detener.
            if (autoPlayNext) { // Solo si venía de un 'ended'
                pauseTrack(); // Detener la reproducción
                currentTrackIndex = -1; // Resetear
                updatePlayerUI();
                checkAudioButtonsAvailability();
                updateActiveTrackVisuals();
                closeAllAccordions();
            }
        }
    }

    // --- FUNCIONES DE REPRODUCCIÓN ---
    function playTrack() {
        if (currentTrackIndex === -1 && tracksData.length > 0) {
            loadTrack(0, true, true); // Carga la primera, reproduce y marca como autoPlayNext para acordeón
            return;
        }
        if (currentTrackIndex !== -1 && tracksData[currentTrackIndex]) {
            if (audioPlayer.readyState >= 2) { // HAVE_CURRENT_DATA o superior
                audioPlayer.play().then(() => {
                    isPlaying = true;
                    // La actualización de UI y visuales se hará con los eventos 'play'/'pause' del audioPlayer
                }).catch(error => {
                    console.error("Error al reproducir:", error);
                    isPlaying = false; // Asegurar estado correcto
                    updatePlayerUI(); // Actualiza botones si falla el play
                    updateActiveTrackVisuals();
                });
            } else {
                console.warn("Audio no listo para reproducir, esperando 'canplaythrough' o 'canplay'");
                // Escuchar 'canplay' para intentar reproducir tan pronto sea posible
                const tryPlayWhenReady = () => {
                    if (!isPlaying && currentTrackIndex !== -1 && tracksData[currentTrackIndex]) {
                        playTrack(); // Intenta de nuevo
                    }
                    audioPlayer.removeEventListener('canplay', tryPlayWhenReady);
                };
                audioPlayer.addEventListener('canplay', tryPlayWhenReady);
            }
        }
    }

    function pauseTrack() {
        if (currentTrackIndex !== -1) {
            audioPlayer.pause();
            // isPlaying y UI se actualizan con el evento 'pause' del audioPlayer
        }
    }

    function playPauseToggle() {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    }

    function nextTrack(eventFromEnded = false) { // Nuevo parámetro
        const wasPlaying = isPlaying || eventFromEnded; // Si terminó, se considera que "estaba sonando" para la siguiente
        let newIndex = currentTrackIndex === -1 ? 0 : (currentTrackIndex + 1);

        if (newIndex >= tracksData.length) {
            // Opción 1: Detener al final de la lista
             // newIndex = -1; // Para indicar que no hay más pistas y detener
             // loadTrack(newIndex, false, eventFromEnded); // Carga "nada", no reproduce, maneja acordeón
            // Opción 2: Volver al inicio (Loop)
            newIndex = 0;
            loadTrack(newIndex, wasPlaying, eventFromEnded);
        } else {
            loadTrack(newIndex, wasPlaying, eventFromEnded);
        }
    }

    function prevTrack() {
        const wasPlaying = isPlaying;
        let newIndex = currentTrackIndex - 1;
        if (newIndex < 0) newIndex = tracksData.length - 1;
        if (currentTrackIndex === -1) newIndex = tracksData.length - 1;
        loadTrack(newIndex, wasPlaying, false); // El false es para autoPlayNext, no aplica aquí
    }

    function playAllTracks() {
        loadTrack(0, true, true); // El segundo true es para autoPlayNext para manejo de acordeón
        // closeAllAccordions(); // Ya se maneja en loadTrack si es autoPlayNext
    }

    // --- ACTUALIZACIONES VISUALES Y UI ---
    function formatTime(seconds) { if (isNaN(seconds) || seconds < 0) return '0:00'; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }
    function updateProgress() { const { duration, currentTime } = audioPlayer; if (duration && !isNaN(duration)) { const progressPercent = (currentTime / duration) * 100; progress.style.width = `${progressPercent}%`; currentTimeEl.textContent = formatTime(currentTime); } else { progress.style.width = '0%'; currentTimeEl.textContent = formatTime(currentTime); } }
    function displayDuration() { const { duration } = audioPlayer; if (duration && !isNaN(duration)) { durationEl.textContent = formatTime(duration); } else { durationEl.textContent = '0:00'; } }
    function setProgress(e) { const width = progressContainer.clientWidth; const clickX = e.offsetX; const duration = audioPlayer.duration; if (duration && !isNaN(duration)) { audioPlayer.currentTime = (clickX / width) * duration; if (!isPlaying) updateProgress(); } }

    function updateActiveTrackVisuals() {
        trackItems.forEach((item, index) => {
            const playBtn = tracksData[index]?.playBtn;
            if (index === currentTrackIndex) {
                item.classList.add('active');
                if (playBtn) playBtn.textContent = isPlaying ? '⏸' : '▶';
                if(isPlaying) item.classList.add('playing');
                else item.classList.remove('playing');
            } else {
                item.classList.remove('active');
                item.classList.remove('playing');
                if (playBtn) playBtn.textContent = '▶';
            }
        });
    }

    function updatePlayerUI() {
        if (currentTrackIndex !== -1 && tracksData[currentTrackIndex]) {
            playerCurrentTrackTitle.textContent = `${currentTrackIndex + 1}. ${tracksData[currentTrackIndex].title}`;
            displayDuration();
        } else {
            playerCurrentTrackTitle.textContent = "-- Selecciona una Pista --";
            durationEl.textContent = '0:00';
            currentTimeEl.textContent = '0:00';
            progress.style.width = '0%';
        }
        playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
        // No es necesario actualizar botones individuales aquí, se hace en updateActiveTrackVisuals
    }

    function checkAudioButtonsAvailability() {
        const hasValidTrackSelected = currentTrackIndex !== -1 && tracksData.length > 0;
        const canPlaySomething = tracksData.length > 0;

        playPauseBtn.disabled = !canPlaySomething;
        prevBtn.disabled = !canPlaySomething; // Se podría deshabilitar si es la primera y no hay loop
        nextBtn.disabled = !canPlaySomething; // Se podría deshabilitar si es la última y no hay loop
        playAllBtn.disabled = !canPlaySomething;

        progressContainer.style.pointerEvents = hasValidTrackSelected ? 'auto' : 'none';
        progressContainer.style.opacity = hasValidTrackSelected ? '1' : '0.5';
    }


    // --- LÓGICA DEL ACORDEÓN ---
    function toggleAccordion(itemToToggle, forceOpen = false) { // Nuevo parámetro forceOpen
        const detailsDiv = itemToToggle.querySelector('.track-details');
        const icon = itemToToggle.querySelector('.expand-icon');
        const currentlyOpen = itemToToggle.classList.contains('open');

        closeAllAccordions(itemToToggle);

        if (forceOpen || !currentlyOpen) { // Si se fuerza la apertura o no está abierto
            itemToToggle.classList.add('open');
            requestAnimationFrame(() => { // Asegura que el DOM se actualice antes de medir scrollHeight
                detailsDiv.style.maxHeight = detailsDiv.scrollHeight + "px";
            });
            icon.textContent = '−';
        } else if (!forceOpen && currentlyOpen) { // Si no se fuerza y ya está abierto, lo cierra
            itemToToggle.classList.remove('open');
            detailsDiv.style.maxHeight = null;
            icon.textContent = '+';
        }
    }

    function closeAllAccordions(exceptItem = null) {
        trackItems.forEach(item => {
            if (item !== exceptItem && item.classList.contains('open')) {
                item.classList.remove('open');
                item.querySelector('.track-details').style.maxHeight = null;
                item.querySelector('.expand-icon').textContent = '+';
            }
        });
    }

    // --- LÓGICA DEL MODAL IMAGEN ---
    function openModal() { if (modal && modalImage && coverImageContainer) { const imgSrc = coverImageContainer.querySelector('img')?.src; if(imgSrc) { modalImage.src = imgSrc; modal.classList.add('active'); document.body.style.overflow = 'hidden'; } } }
    function closeModal() { if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; } }

    // --- EVENT LISTENERS ---
    if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseToggle);
    if (nextBtn) nextBtn.addEventListener('click', () => nextTrack(false)); // false: no es desde 'ended'
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    if (playAllBtn) playAllBtn.addEventListener('click', playAllTracks);

    if (audioPlayer) {
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', () => nextTrack(true)); // true: sí es desde 'ended'
        audioPlayer.addEventListener('play', () => { isPlaying = true; updatePlayerUI(); updateActiveTrackVisuals(); });
        audioPlayer.addEventListener('pause', () => { isPlaying = false; updatePlayerUI(); updateActiveTrackVisuals(); });
        audioPlayer.addEventListener('loadedmetadata', updatePlayerUI);
    }
    if (progressContainer) progressContainer.addEventListener('click', setProgress);

    trackItems.forEach(item => {
        const titleButton = item.querySelector('.track-title-button');
        const playButton = item.querySelector('.play-track-btn');

        if (titleButton) titleButton.addEventListener('click', () => toggleAccordion(item));
        if (playButton) {
            playButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const trackIndex = parseInt(item.getAttribute('data-track-index'), 10);
                if (trackIndex === currentTrackIndex && isPlaying) {
                    pauseTrack();
                } else {
                    loadTrack(trackIndex, true, false); // El false es para autoPlayNext, no aplica aquí
                    // No es necesario abrir el acordeón aquí, el usuario lo controla
                }
            });
        }
    });

    if (coverImageContainer) coverImageContainer.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });

    // --- INICIALIZAR ---
    gatherTrackData();
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
});
