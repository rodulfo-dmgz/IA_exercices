// src/main.js
// Point d'entrée principal de la coquille (index.html)

// 1. CSS global (inclut les icônes Phosphor Duotone, embarquées par Vite)
import './css/main.css';

// 2. Logique métier
// (L'ordre est important : scorm.js doit être chargé avant shell.js)
import './js/scorm.js';
import './js/profile.js';
import './components/toast/toast.js';
import './js/parcours.js';
import './js/shell.js';
import './js/ui.js';
import './js/tour.js';

// 3. Initialisation SCORM
document.addEventListener('DOMContentLoaded', () => {
    if (window.SCORM_API) {
        const connected = SCORM_API.init();
        if (connected) {
            console.log("[SCORM] Connecté au LMS ou en mode Standalone");
            SCORM_API.markIncomplete();
            SCORM_API.commit();
        }
    } else {
        console.warn("[SCORM] Wrapper SCORM_API non trouvé.");
    }
});
