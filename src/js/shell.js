(function () {
    'use strict';

    const PHOSPHOR_ICONS = {
        'house': 'ph-house',
        'lightbulb': 'ph-lightbulb',
        'stack': 'ph-stack',
        'scales': 'ph-scales',
        'brain': 'ph-brain',
        'share-network': 'ph-share-network',
        'tree-structure': 'ph-tree-structure',
        'chat-circle-dots': 'ph-chat-circle-dots',
        'book-open': 'ph-book-open',
        'game-controller': 'ph-game-controller',
        'exam': 'ph-exam',
        'chart-bar': 'ph-chart-bar',
        'books': 'ph-books',
        'link': 'ph-link-simple',
        'scroll': 'ph-scroll',
        'path': 'ph-path',
        'dice': 'ph-dice-five',
        'percent': 'ph-percent',
        'flow-arrow': 'ph-flow-arrow',
        'clock-counter-clockwise': 'ph-clock-counter-clockwise',
        'git-fork': 'ph-git-fork',
        'envelope': 'ph-envelope-simple-open',
        'default': 'ph-circle'
    };

    function getIcon(name) {
        const iconClass = PHOSPHOR_ICONS[name] || PHOSPHOR_ICONS['default'];
        return `<i class="ph-duotone ${iconClass}" aria-hidden="true"></i>`;
    }

    var items = window.PARCOURS || [];
    var nav = document.getElementById('nav');
    var stage = document.getElementById('stage');
    var sidebar = document.getElementById('sidebar');
    var vues = {};
    window.RDVues = vues;
    var closing = false;

    if (!nav || !stage) return;

    function parId(id) {
        for (let item of items) {
            if (item.id === id) return item;
            if (item.children) {
                let child = item.children.find(c => c.id === id);
                if (child) return child;
            }
        }
        return null;
    }

    // Toutes les pages du parcours, à plat. On cherche d'abord la correspondance
    // exacte (avec #ancre), puis la page seule.
    function parPage(url) {
        var flat = [];
        items.forEach(function (item) {
            flat.push(item);
            if (item.children) item.children.forEach(function (c) { flat.push(c); });
        });
        var withPage = flat.filter(function (x) { return x.page; });
        return withPage.find(function (x) { return x.page.includes('#') && url.endsWith(x.page); })
            || withPage.find(function (x) { return url.split('#')[0].endsWith(x.page.split('#')[0]) && !x.page.includes('#'); })
            || withPage.find(function (x) { return url.includes(x.page.split('#')[0]); })
            || null;
    }

    /* Ouvre ou ferme un sous-menu et garde aria-expanded synchronisé */
    function setOpen(row, open) {
        var submenu = row.nextElementSibling;
        var btn = row.querySelector('.nav-toggle-btn');
        row.classList.toggle('open', open);
        if (submenu) submenu.classList.toggle('open', open);
        if (btn) btn.setAttribute('aria-expanded', String(open));
    }

    /* 1. Génération de la barre latérale */
    items.forEach(function (it, index) {
        var li = document.createElement('li');

        if (it.children) {
            // --- CAS 1 : MENU AVEC ENFANTS ---
            li.className = 'nav-parent';
            var submenuId = 'submenu-' + index;

            var row = document.createElement('div');
            row.className = 'nav-item nav-item--parent-row';

            // Le lien (à gauche) : charge la page d'introduction si elle existe
            var a = document.createElement('a');
            a.className = 'nav-parent-link';
            a.dataset.id = it.id;
            a.href = it.page ? it.page : '#' + submenuId;
            if (it.page) a.target = 'stage';
            a.innerHTML = `
                <div class="nav-item-content">
                    ${getIcon(it.icone)}
                    <span class="label">${it.titre}</span>
                </div>
            `;

            // Le bouton flèche (à droite) : ouvre / ferme le sous-menu
            var toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.className = 'nav-toggle-btn';
            toggleBtn.innerHTML = '<i class="ph-duotone ph-caret-circle-down nav-chevron" aria-hidden="true"></i>';
            toggleBtn.setAttribute('aria-label', 'Sous-menu : ' + it.titre);
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.setAttribute('aria-controls', submenuId);

            row.appendChild(a);
            row.appendChild(toggleBtn);

            var submenu = document.createElement('ul');
            submenu.className = 'nav-children';
            submenu.id = submenuId;

            it.children.forEach(function (child) {
                var childLi = document.createElement('li');
                var childA = document.createElement('a');
                childA.className = 'nav-item nav-item--child';
                childA.href = child.page;
                childA.target = 'stage';
                childA.dataset.id = child.id;
                childA.innerHTML = `
                    ${getIcon(child.icone)}
                    <span class="label">${child.titre}</span>
                `;
                childLi.appendChild(childA);
                submenu.appendChild(childLi);
            });

            li.appendChild(row);
            li.appendChild(submenu);

            // Parent : sans page, le lien ne navigue pas, il ouvre le sous-menu.
            // Barre repliée, un clic la déplie pour rendre les enfants atteignables.
            a.addEventListener('click', function (e) {
                var collapsed = sidebar && sidebar.classList.contains('collapsed');
                if (collapsed && window.RDUI) window.RDUI.setSidebarCollapsed(false);
                if (!it.page) {
                    e.preventDefault();
                    setOpen(row, collapsed ? true : !row.classList.contains('open'));
                } else if (collapsed) {
                    setOpen(row, true);
                }
            });
        } else {
            // --- CAS 2 : LIEN DIRECT (sans enfant) ---
            li.className = 'nav-single';
            var single = document.createElement('a');
            single.className = 'nav-item nav-item--single';
            single.href = it.page;
            if (it.page) single.target = 'stage';
            single.dataset.id = it.id;
            single.innerHTML = `
                <div class="nav-item-content">
                    ${getIcon(it.icone)}
                    <span class="label">${it.titre}</span>
                </div>
            `;
            li.appendChild(single);
        }

        nav.appendChild(li);
    });

    /* 2. Ouverture / fermeture des menus (uniquement sur la flèche) */
    nav.querySelectorAll('.nav-toggle-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var row = this.closest('.nav-item--parent-row');
            setOpen(row, !row.classList.contains('open'));
        });
    });

    /* 3. Suivi SCORM */
    function enregistrer(it) {
        if (it.suivi) vues[it.id] = 1;
        try { localStorage.setItem('rd_cours', JSON.stringify({ v: vues })); } catch (e) { /* ignoré */ }
        if (!window.SCORM_API || !SCORM_API.isConnected()) return;
        SCORM_API.setSection('cours', { v: vues });
        SCORM_API.flush();
        SCORM_API.set('cmi.core.lesson_location', it.id);

        var tout = items.every(function (parent) {
            if (!parent.children) return !parent.suivi || vues[parent.id];
            return parent.children.every(function (child) { return !child.suivi || vues[child.id]; });
        });

        if (tout) SCORM_API.setStatus('completed'); else SCORM_API.markIncomplete();
        SCORM_API.commit();
    }

    /* 4. Mise à jour de la page active */
    var derniere = '';
    function majPage() {
        var it, url = '';
        try { url = stage.contentWindow.location.href; } catch (e) { return; }
        if (url === derniere) return;
        derniere = url;
        it = parPage(url);

        nav.querySelectorAll('.active').forEach(function (el) { el.classList.remove('active'); });
        nav.querySelectorAll('[aria-current]').forEach(function (el) { el.removeAttribute('aria-current'); });

        if (it) {
            var link = nav.querySelector('a[data-id="' + it.id + '"]');
            if (link) {
                link.setAttribute('aria-current', 'page');
                var row = link.closest('.nav-item--parent-row');
                (row || link).classList.add('active');
                var parent = link.closest('.nav-parent');
                if (parent) setOpen(parent.querySelector('.nav-item--parent-row'), true);
            }
            document.title = it.titre + ' — Intelligentsia';
            enregistrer(it);
        }
    }

    /* Skeleton : affiché seulement si le chargement dure plus de 150 ms (pas de clignotement) */
    var skeleton = document.getElementById('stage-skeleton');
    var skeletonTimer = null, skeletonGuard = null;
    function showSkeleton() {
        clearTimeout(skeletonTimer);
        skeletonTimer = setTimeout(function () {
            skeleton.hidden = false;
            stage.setAttribute('aria-busy', 'true');
        }, 150);
        clearTimeout(skeletonGuard);
        skeletonGuard = setTimeout(hideSkeleton, 8000);   // garde-fou
    }
    function hideSkeleton() {
        clearTimeout(skeletonTimer);
        clearTimeout(skeletonGuard);
        skeleton.hidden = true;
        stage.removeAttribute('aria-busy');
    }
    stage.addEventListener('load', function () {
        hideSkeleton();
        // toute navigation interne à la page (lien, bouton) relance le skeleton
        try { stage.contentWindow.addEventListener('beforeunload', showSkeleton); } catch (e) { /* ignoré */ }
    });

    stage.addEventListener('load', majPage);
    // Un lien vers une autre #ancre de la même page ne déclenche pas « load »
    nav.addEventListener('click', function () { setTimeout(majPage, 60); });
    window.addEventListener('message', function (e) {
        if (e.source !== stage.contentWindow || !e.data) return;
        if (e.data.anatol === 'page-prete') majPage();
        // La page d'accueil demande/retire le mode « inscription » (sans barre latérale)
        if (typeof e.data.gate === 'boolean') document.body.classList.toggle('is-gate', e.data.gate);
        if (e.data.quit === true) quitter();
    });

    function fermer() {
        if (closing) return;
        closing = true;
        if (window.SCORM_API) SCORM_API.quit();
    }

    /* « Quitter le cours » : on enregistre d'abord (commit), on laisse le choix, et on ne clôt la session SCORM
       (LMSFinish) qu'au clic sur « Fermer la fenêtre » : certains LMS (SCORM Cloud) ferment la fenêtre dès la clôture. */
    var exitScreen = document.getElementById('exit-screen');
    var exitBtn = document.getElementById('exit-btn');
    var exitInert = [sidebar, document.querySelector('.content-stage')];
    function quitter() {
        if (!exitScreen || !exitScreen.hidden) return;
        var enLms = !!(window.SCORM_API && SCORM_API.isConnected());
        if (enLms) { SCORM_API.commit(); }
        exitScreen.hidden = false;
        exitInert.forEach(function (el) { if (el) el.inert = true; });
        document.getElementById('exit-text').textContent = enLms
            ? 'Votre progression et vos notes sont enregistrées. Vous pouvez fermer le cours, ou le reprendre là où vous en étiez.'
            : 'Votre progression et vos notes sont enregistrées sur cet appareil. Vous pouvez fermer cet onglet, ou reprendre le cours.';
        document.getElementById('exit-note').hidden = true;
        document.getElementById('exit-resume').focus();
    }
    function reprendre() {
        exitScreen.hidden = true;
        exitInert.forEach(function (el) { if (el) el.inert = false; });
        if (exitBtn) exitBtn.focus();
    }
    if (exitBtn) exitBtn.addEventListener('click', quitter);
    if (exitScreen) {
        document.getElementById('exit-resume').addEventListener('click', reprendre);
        document.getElementById('exit-close').addEventListener('click', function () {
            fermer();   // clôt la session SCORM : le LMS peut fermer la fenêtre de lui-même
            try { window.top.close(); } catch (e) { /* ignoré */ }
            // Si la fenêtre est toujours là, le navigateur refuse de la fermer : on l'explique
            setTimeout(function () { document.getElementById('exit-note').hidden = false; }, 400);
        });
        exitScreen.addEventListener('keydown', function (e) { if (e.key === 'Escape') reprendre(); });
    }
    window.RDExit = { quit: quitter };

    // Lien d'évitement : place le focus dans le contenu du cours
    var skip = document.querySelector('.skip-link');
    if (skip) skip.addEventListener('click', function (e) {
        e.preventDefault();
        stage.focus();
    });

    if (window.SCORM_API) SCORM_API.init();

    /* Reprise : on relit les séances déjà vues (sinon la première sauvegarde écraserait la progression précédente) */
    (function restaurerVues() {
        var saved = null;
        if (window.SCORM_API && SCORM_API.isConnected()) saved = SCORM_API.getSection('cours');
        if (!saved || !saved.v) { try { saved = JSON.parse(localStorage.getItem('rd_cours') || 'null'); } catch (e) { saved = null; } }
        if (saved && saved.v) Object.keys(saved.v).forEach(function (k) { vues[k] = 1; });
    })();

    /* Démo web (hors LMS) : tant qu'aucun prénom n'est saisi, seul le formulaire est visible.
       Dans un LMS (Moodle, 360Learning, MOOC…), le SCORM identifie l'apprenant : pas de formulaire. */
    var enLms = !!(window.SCORM_API && SCORM_API.isConnected());
    // Dans un LMS, l'hébergement est celui de la plateforme : l'entrée du menu devient « Auteur et licence »
    if (enLms) { var mn = nav.querySelector('a[data-id="mentions"] .label'); if (mn) mn.textContent = 'Auteur et licence'; }
    var sansProfil = !enLms && !(window.RDProfile && window.RDProfile.get());
    document.body.classList.toggle('is-gate', sansProfil);
    document.documentElement.classList.remove('gate-pending');

    var depart = null;
    if (window.SCORM_API && !sansProfil) {
        var loc = SCORM_API.get('cmi.core.lesson_location');
        if (loc) depart = parId(loc);
    }

    if (!depart && items.length > 0) {
        depart = items[0];
    }

    if (sansProfil) {
        showSkeleton();
        stage.src = 'modules/inscription.html';
    } else if (depart && depart.page) {
        showSkeleton();
        stage.src = depart.page;
    }

    if (enLms && window.RDToast) {
        window.RDToast({ type: 'success', title: 'Connecté à votre plateforme', description: 'Votre progression sera enregistrée automatiquement.' });
    }

    window.addEventListener('pagehide', fermer);
    window.addEventListener('beforeunload', fermer);
})();
