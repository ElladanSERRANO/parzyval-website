document.addEventListener('DOMContentLoaded', () => {
    // 1. On cible tous nos éléments interactifs
    const playButtons = document.querySelectorAll('.play-btn');
    const audios = document.querySelectorAll('audio');

    // Fonction utilitaire pour formater les secondes en M:SS
    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // 2. Logique du bouton Play/Pause
    playButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const audio = document.getElementById(targetId);
            const isPlaying = !audio.paused;

            // SÉCURITÉ : Mettre en pause TOUTES les autres pistes avant de jouer
            audios.forEach(a => {
                if (a !== audio) {
                    a.pause();
                    // On remet le bouton des autres pistes sur "Play"
                    const otherBtn = document.querySelector(`[data-target="${a.id}"]`);
                    if (otherBtn) otherBtn.textContent = '▶';
                }
            });

            // Toggle de la piste ciblée
            if (isPlaying) {
                audio.pause();
                btn.textContent = '▶';
            } else {
                audio.play();
                btn.textContent = '⏸'; // Change le symbole en Pause
            }
        });
    });

    // 3. Logique de la barre de progression
    audios.forEach(audio => {
        // Quand le temps de la musique avance
        audio.addEventListener('timeupdate', () => {
            const index = audio.id.split('-')[1]; // Extrait le numéro (ex: "1" depuis "audio-1")
            const progress = document.getElementById(`progress-${index}`);
            const timeDisplay = document.getElementById(`time-${index}`);

            // Calcul du pourcentage et mise à jour de la largeur de la barre (le néon CSS)
            const percent = (audio.currentTime / audio.duration) * 100;
            if (progress) progress.style.width = `${percent}%`;

            // Mise à jour du texte du timer
            if (timeDisplay) {
                timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
            }
        });

        // 4. Logique du clic sur la barre pour avancer/reculer
        const index = audio.id.split('-')[1];
        const container = document.getElementById(`container-${index}`);
        if (container) {
            container.addEventListener('click', (e) => {
                const clickX = e.offsetX; // Position du clic
                const width = container.clientWidth; // Largeur totale de la barre
                const duration = audio.duration;
                // Saute au bon moment dans l'audio
                audio.currentTime = (clickX / width) * duration;
            });
        }
        
        // 5. Réinitialisation quand la chanson est terminée
        audio.addEventListener('ended', () => {
            const btn = document.querySelector(`[data-target="${audio.id}"]`);
            if (btn) btn.textContent = '▶';
            audio.currentTime = 0;
        });
    });
});