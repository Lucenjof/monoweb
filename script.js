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
    // Elementos del Modal
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const coverImageContainer = document.querySelector('.album-cover-container'); // Contenedor de la portada
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

    function loadTrack(index, playImmediately = false) {
        if (index >= 0 && index < tracksData.length) {
             const previousTrackIndex = currentTrackIndex; // Guardar índice anterior

             if (index !== currentTrackIndex || !audioPlayer.src || audioPlayer.src !== tracksData[index].src) {
                 // Quitar estado visual de 'playing' del botón anterior si existe y el índice era válido
                if (previousTrackIndex !== -1 && tracksData[previousTrackIndex] && tracksData[previousTrackIndex].playBtn) {
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
                };
                audioPlayer.onerror = () => {
                     console.error(`Error al cargar la pista: ${tracksData[index]?.src || 'desconocida'}`);
                     playerCurrentTrackTitle.textContent = "Error al cargar pista";
                     // Resetear estado visual del botón que falló
                     if (tracksData[index] && tracksData[index].playBtn) {
                         tracksData[index].playBtn.textContent = '▶';
                         tracksData[index].element.classList.remove('playing');
                     }
                     currentTrackIndex = -1; // O intentar la siguiente? Por ahora reseteamos
                     updatePlayerUI(); // Actualiza título a error
                     checkAudioButtonsAvailability();
                 }
                 audioPlayer.load();

             } else if (playImmediately && !isPlaying) {
                 playTrack();
             } else if (!playImmediately) {
                 updatePlayerUI(); // Solo actualiza UI (reset visual progreso)
             }
             updateActiveTrackVisuals(); // Siempre actualiza el resaltado de la lista
        } else {
            console.error(`Índice de pista inválido: ${index}`);
        }
    }

    // --- FUNCIONES DE REPRODUCCIÓN ---
    function playTrack() {
        if (currentTrackIndex === -1 && tracksData.length > 0) {
             loadTrack(0, true);
             return;
        }
        if (currentTrackIndex !== -1) {
            // Verificar si el audio está listo (readyState > 0)
            if (audioPlayer.readyState > 0) {
                audioPlayer.play().then(() => {
                    isPlaying = true;
                    playPauseBtn.textContent = '⏸';
                    if (tracksData[currentTrackIndex]?.playBtn) {
                        tracksData[currentTrackIndex].playBtn.textContent = '⏸'; // Icono pausa individual
                    }
                    tracksData[currentTrackIndex]?.element.classList.add('playing');
                }).catch(error => console.error("Error al reproducir:", error));
            } else {
                // Si no está listo, esperar a 'canplay' o reintentar (más complejo)
                 console.warn("Audio no listo para reproducir, esperando...");
                 // Una vez que pueda reproducir, intentar de nuevo (simple)
                 audioPlayer.oncanplay = () => {
                     if (!isPlaying && currentTrackIndex !== -1) { // Solo si no empezó a sonar ya
                         playTrack();
                     }
                     audioPlayer.oncanplay = null; // Remover listener para evitar múltiples llamadas
                 };
            }
        }
    }


    function pauseTrack() {
        if (currentTrackIndex !== -1) {
            audioPlayer.pause();
            isPlaying = false;
            playPauseBtn.textContent = '▶';
            if (tracksData[currentTrackIndex]?.playBtn) {
                tracksData[currentTrackIndex].playBtn.textContent = '▶';
            }
            tracksData[currentTrackIndex]?.element.classList.remove('playing');
        }
    }

    function playPauseToggle() {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    }

    function nextTrack() {
        const wasPlaying = isPlaying;
        let newIndex = currentTrackIndex === -1 ? 0 : (currentTrackIndex + 1) % tracksData.length;
        loadTrack(newIndex, wasPlaying);
    }

    function prevTrack() {
        const wasPlaying = isPlaying;
        let newIndex = currentTrackIndex - 1;
        if (newIndex < 0) newIndex = tracksData.length - 1;
        if (currentTrackIndex === -1) newIndex = tracksData.length - 1; // Si no había nada, ir a la última
        loadTrack(newIndex, wasPlaying);
    }

    function playAllTracks() {
        loadTrack(0, true);
        closeAllAccordions(); // Cerrar todos al darle play all
    }


    // --- ACTUALIZACIONES VISUALES Y UI ---
    function formatTime(seconds) { /* ... (sin cambios) ... */ if (isNaN(seconds) || seconds < 0) return '0:00'; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }
    function updateProgress() { /* ... (sin cambios) ... */ const { duration, currentTime } = audioPlayer; if (duration && !isNaN(duration)) { const progressPercent = (currentTime / duration) * 100; progress.style.width = `${progressPercent}%`; currentTimeEl.textContent = formatTime(currentTime); } else { progress.style.width = '0%'; currentTimeEl.textContent = formatTime(currentTime); } }
    function displayDuration() { /* ... (sin cambios) ... */ const { duration } = audioPlayer; if (duration && !isNaN(duration)) { durationEl.textContent = formatTime(duration); } else { durationEl.textContent = '0:00'; } }
    function setProgress(e) { /* ... (sin cambios) ... */ const width = progressContainer.clientWidth; const clickX = e.offsetX; const duration = audioPlayer.duration; if (duration && !isNaN(duration)) { audioPlayer.currentTime = (clickX / width) * duration; if (!isPlaying) updateProgress(); } }

    function updateActiveTrackVisuals() {
        trackItems.forEach((item, index) => {
            const playBtn = tracksData[index]?.playBtn;
            if (index === currentTrackIndex) {
                item.classList.add('active');
                // Actualizar icono play/pause individual
                if (playBtn) {
                    playBtn.textContent = isPlaying ? '⏸' : '▶';
                }
                 if(isPlaying) {
                     item.classList.add('playing');
                 } else {
                     item.classList.remove('playing');
                 }
            } else {
                item.classList.remove('active');
                item.classList.remove('playing');
                if (playBtn) {
                    playBtn.textContent = '▶'; // Asegurar icono play en las no activas
                }
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
        // Actualizar estado visual de botones play/pause también
        playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
        if (currentTrackIndex !== -1 && tracksData[currentTrackIndex]?.playBtn) {
            tracksData[currentTrackIndex].playBtn.textContent = isPlaying ? '⏸' : '▶';
        }
    }

     function checkAudioButtonsAvailability() { /* ... (sin cambios) ... */ const hasTrackLoaded = currentTrackIndex !== -1 && !isNaN(audioPlayer.duration); playPauseBtn.disabled = !hasTrackLoaded && tracksData.length === 0; prevBtn.disabled = tracksData.length <= 1; nextBtn.disabled = tracksData.length <= 1; playAllBtn.disabled = tracksData.length === 0; progressContainer.style.pointerEvents = hasTrackLoaded ? 'auto' : 'none'; progressContainer.style.opacity = hasTrackLoaded ? '1' : '0.5'; }

    // --- LÓGICA DEL ACORDEÓN ---
    function toggleAccordion(itemToToggle) { /* ... (lógica sin cambios significativos) ... */ const detailsDiv = itemToToggle.querySelector('.track-details'); const icon = itemToToggle.querySelector('.expand-icon'); const currentlyOpen = itemToToggle.classList.contains('open'); closeAllAccordions(itemToToggle); if (!currentlyOpen) { itemToToggle.classList.add('open'); requestAnimationFrame(() => { detailsDiv.style.maxHeight = detailsDiv.scrollHeight + "px"; }); icon.textContent = '−'; } else { itemToToggle.classList.remove('open'); detailsDiv.style.maxHeight = null; icon.textContent = '+'; } }
    function closeAllAccordions(exceptItem = null) { /* ... (sin cambios) ... */ trackItems.forEach(item => { if (item !== exceptItem && item.classList.contains('open')) { item.classList.remove('open'); item.querySelector('.track-details').style.maxHeight = null; item.querySelector('.expand-icon').textContent = '+'; } }); }

    // --- LÓGICA DEL MODAL IMAGEN ---
    function openModal() {
        if (modal && modalImage && coverImageContainer) {
            const imgSrc = coverImageContainer.querySelector('img')?.src;
            if(imgSrc) {
                modalImage.src = imgSrc;
                modal.classList.add('active'); // Usar clase para mostrar/ocultar con transición
                // Opcional: Deshabilitar scroll del body mientras el modal está abierto
                document.body.style.overflow = 'hidden';
            }
        }
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
             // Opcional: Rehabilitar scroll del body
             document.body.style.overflow = '';
        }
    }


    // --- EVENT LISTENERS ---
    if (playPauseBtn) playPauseBtn.addEventListener('click', playPauseToggle);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    if (playAllBtn) playAllBtn.addEventListener('click', playAllTracks);
    if (audioPlayer) {
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', nextTrack);
         // Usar los eventos 'play' y 'pause' para actualizar el estado de forma más fiable
         audioPlayer.addEventListener('play', () => { isPlaying = true; updatePlayerUI(); updateActiveTrackVisuals(); });
         audioPlayer.addEventListener('pause', () => { isPlaying = false; updatePlayerUI(); updateActiveTrackVisuals(); });
         audioPlayer.addEventListener('loadedmetadata', updatePlayerUI); // Asegura UI actualizada al cargar meta
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
                    loadTrack(trackIndex, true);
                     // Opcional: Abrir acordeón al darle play individual si no está abierto
                     // if (!item.classList.contains('open')) {
                     //    toggleAccordion(item);
                     // }
                }
            });
        }
    });

    // Event Listeners para el Modal
    if (coverImageContainer) coverImageContainer.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    // Cerrar modal al hacer clic fuera de la imagen (en el fondo oscuro)
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) { // Si el clic fue directamente en el fondo del modal
                closeModal();
            }
        });
    }

    // --- INICIALIZAR ---
    gatherTrackData();

    // Footer year
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

}); // Fin de 'DOMContentLoaded'