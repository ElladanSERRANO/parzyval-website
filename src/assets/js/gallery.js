// Galerie d'art : filtres par catégorie + visionneuse plein écran.
//
// - Cliquer sur une oeuvre l'ouvre dans la visionneuse (version d'affichage, 2400 px).
// - Flèches du clavier / boutons / glissement du doigt : oeuvre précédente ou suivante.
// - Z, double-clic ou bouton "Zoom" : affichage à taille réelle, avec défilement (ou glisser à la souris).
// - Échap : fermer. L'adresse devient art.html#<id> : elle peut être partagée pour ouvrir directement une oeuvre.
//
// Tout passe par des écouteurs sur "document", donc rien à réinitialiser quand le routeur
// (script.js) remplace le contenu de la page. Il prévient simplement avec l'événement "page:changed".

(() => {
    const lb = document.getElementById('lightbox');
    if (!lb) return;

    const $ = (id) => document.getElementById(id);
    const el = {
        counter: $('lb-counter'), zoom: $('lb-zoom'), open: $('lb-open'), download: $('lb-download'),
        close: $('lb-close'), prev: $('lb-prev'), next: $('lb-next'), stage: $('lb-stage'),
        viewport: $('lb-viewport'), img: $('lb-img'),
        title: $('lb-title'), meta: $('lb-meta'), desc: $('lb-desc'), links: $('lb-links'),
    };

    let items = [];       // oeuvres visibles (selon le filtre) au moment de l'ouverture
    let index = -1;
    let lastFocus = null;
    let token = 0;        // identifie le chargement en cours (évite d'afficher une image arrivée en retard)
    let fullLoaded = false;

    const isOpen = () => !lb.hidden;
    const visibleCards = () => Array.from(document.querySelectorAll('.art-card')).filter((c) => !c.hidden);

    const setHash = (id) => {
        const base = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', id ? `${base}#${id}` : base);
    };

    // --- Zoom -------------------------------------------------------------------------------
    const setZoom = (on, focusX = 0.5, focusY = 0.5) => {
        if (on && !fullLoaded) return; // on ne zoome pas sur la miniature floue
        el.viewport.classList.toggle('zoomed', on);
        el.zoom.setAttribute('aria-pressed', String(on));
        if (on) {
            // Centre la vue sur le point cliqué (en proportion de l'image)
            el.viewport.scrollLeft = focusX * el.img.offsetWidth - el.viewport.clientWidth / 2;
            el.viewport.scrollTop = focusY * el.img.offsetHeight - el.viewport.clientHeight / 2;
        } else {
            el.viewport.scrollLeft = 0;
            el.viewport.scrollTop = 0;
        }
    };
    const isZoomed = () => el.viewport.classList.contains('zoomed');

    // --- Affichage d'une oeuvre -------------------------------------------------------------
    const render = (i) => {
        index = (i + items.length) % items.length;
        const d = items[index].dataset;
        const myToken = ++token;

        setZoom(false);
        fullLoaded = false;

        el.counter.textContent = `${index + 1} / ${items.length}`;
        el.title.textContent = d.title;
        el.meta.textContent = [d.category, d.date, d.size].filter(Boolean).join(' · ');
        el.desc.textContent = d.description || '';

        // Boutons AO3 / liens associés à l'oeuvre
        el.links.textContent = '';
        let links = [];
        try { links = JSON.parse(d.links || '[]'); } catch { /* données invalides : on ignore */ }
        for (const l of links) {
            const a = document.createElement('a');
            a.href = l.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'ao3-btn';
            a.textContent = `📖 ${l.label}`;
            el.links.appendChild(a);
        }

        // Téléchargement de l'original (facultatif pour chaque oeuvre)
        const hasOriginal = Boolean(d.original);
        el.download.hidden = !hasOriginal;
        if (hasOriginal) {
            const label = `↓ Original${d.originalLabel ? ` · ${d.originalLabel}` : ''}`;
            el.download.href = d.original;
            el.download.setAttribute('download', d.originalName || '');
            el.download.dataset.label = label; // utilisé par script.js pour restaurer le texte après un téléchargement
            el.download.textContent = label;
        }
        el.open.href = d.original || d.display;

        // Chargement progressif : miniature tout de suite (floue), puis version d'affichage
        el.img.alt = d.alt || d.title;
        el.img.classList.add('lb-loading');
        el.img.src = d.thumb;
        const loader = new Image();
        loader.onload = () => {
            if (myToken !== token) return;
            el.img.src = d.display;
            el.img.classList.remove('lb-loading');
            fullLoaded = true;
        };
        loader.onerror = () => {
            if (myToken !== token) return;
            el.img.classList.remove('lb-loading'); // on garde la miniature plutôt qu'un cadre vide
        };
        loader.src = d.display;

        // Précharge les voisines pour que le défilement paraisse instantané
        [index - 1, index + 1].forEach((n) => {
            if (items.length > 1) new Image().src = items[(n + items.length) % items.length].dataset.display;
        });

        el.prev.hidden = el.next.hidden = items.length < 2;
        setHash(d.id);
    };

    const openAt = (card) => {
        items = visibleCards();
        const i = items.indexOf(card);
        if (i < 0) return;
        lastFocus = document.activeElement;
        lb.hidden = false;
        document.body.classList.add('lb-open');
        requestAnimationFrame(() => lb.classList.add('open'));
        render(i);
        el.close.focus();
    };

    const close = ({ silent = false } = {}) => {
        if (!isOpen()) return;
        token++; // annule les chargements en cours
        lb.classList.remove('open');
        lb.hidden = true;
        document.body.classList.remove('lb-open');
        el.img.removeAttribute('src');
        if (!silent) {
            setHash(null);
            // Le focus revient sur la dernière oeuvre regardée (la page défile jusqu'à elle)
            const last = items[index];
            if (last && document.contains(last) && !last.hidden) last.focus();
            else if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
        }
        lastFocus = null;
    };

    // --- Clics (délégation) -----------------------------------------------------------------
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.art-card');
        if (card) { openAt(card); return; }

        const chip = e.target.closest('.art-filter');
        if (chip) {
            const filter = chip.dataset.filter;
            document.querySelectorAll('.art-filter').forEach((c) => {
                const active = c === chip;
                c.classList.toggle('active', active);
                c.setAttribute('aria-pressed', String(active));
            });
            document.querySelectorAll('.art-card').forEach((c) => {
                c.hidden = filter !== 'all' && c.dataset.category !== filter;
            });
            return;
        }

        if (!isOpen()) return;
        if (e.target.closest('#lb-close')) close();
        else if (e.target.closest('#lb-prev')) render(index - 1);
        else if (e.target.closest('#lb-next')) render(index + 1);
        else if (e.target.closest('#lb-zoom')) setZoom(!isZoomed());
        else if (e.target === el.stage || (e.target === el.viewport && !isZoomed())) close(); // clic dans le noir
    });

    // Clic sur l'image : zoom / dézoom centré sur le point cliqué (sauf si on vient de faire glisser)
    let dragged = false;
    el.img.addEventListener('click', (e) => {
        if (dragged) { dragged = false; return; }
        if (isZoomed()) { setZoom(false); return; }
        const r = el.img.getBoundingClientRect();
        setZoom(true, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });

    // --- Glisser à la souris pour se déplacer dans l'image zoomée --------------------------
    let drag = null;
    el.viewport.addEventListener('pointerdown', (e) => {
        if (!isZoomed() || e.pointerType !== 'mouse' || e.button !== 0) return; // le tactile défile nativement
        drag = { x: e.clientX, y: e.clientY, left: el.viewport.scrollLeft, top: el.viewport.scrollTop };
        dragged = false;
        el.viewport.setPointerCapture(e.pointerId);
        el.viewport.classList.add('dragging');
    });
    el.viewport.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
        el.viewport.scrollLeft = drag.left - dx;
        el.viewport.scrollTop = drag.top - dy;
    });
    const endDrag = () => { drag = null; el.viewport.classList.remove('dragging'); };
    el.viewport.addEventListener('pointerup', endDrag);
    el.viewport.addEventListener('pointercancel', endDrag);

    // --- Glissement du doigt : oeuvre suivante / précédente (hors zoom) --------------------
    let touch = null;
    el.stage.addEventListener('touchstart', (e) => {
        touch = e.touches.length === 1 && !isZoomed() ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    el.stage.addEventListener('touchend', (e) => {
        if (!touch) return;
        const dx = e.changedTouches[0].clientX - touch.x;
        const dy = e.changedTouches[0].clientY - touch.y;
        touch = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) render(index + (dx < 0 ? 1 : -1));
    }, { passive: true });

    // --- Clavier ----------------------------------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (!isOpen()) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); render(index - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); render(index + 1); }
        else if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); setZoom(!isZoomed()); }
        else if (e.key === 'Tab') {
            // Garde le focus à l'intérieur de la visionneuse
            const focusable = Array.from(lb.querySelectorAll('button, a[href]')).filter((n) => !n.hidden && n.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    // --- Changement de page (routeur) et lien direct ---------------------------------------
    const openFromHash = () => {
        const id = decodeURIComponent(window.location.hash.slice(1));
        if (!id) return;
        const card = Array.from(document.querySelectorAll('.art-card')).find((c) => c.dataset.id === id);
        if (!card) return;
        // Si un filtre masque cette oeuvre, on revient sur "All"
        if (card.hidden) document.querySelector('.art-filter[data-filter="all"]')?.click();
        openAt(card);
    };

    document.addEventListener('page:changed', () => {
        close({ silent: true }); // le contenu vient d'être remplacé : l'ancienne liste n'est plus valable
        openFromHash();
    });
})();
