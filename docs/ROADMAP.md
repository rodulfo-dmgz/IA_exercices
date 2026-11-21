# ROADMAP — Cours SCORM 1.2 « Intelligentsia » et futur éditeur

Dernière mise à jour : 12 novembre 2026. Auteur : Rodulfo DOMINGUEZ JIMENEZ, R.D FORMATION.

Légende : ✅ fait et vérifié · 🟡 fait, non vérifié en vrai LMS · ⬜ à faire · 💤 reporté.

## 1. Où en est le projet

| Domaine | État | Preuve / remarque |
|---|---|---|
| Contenu : 3 modules, 9 séances, 9 évaluations (44 points) | ✅ | Textes originaux, exemples et nombres propres au cours |
| Évaluations : note, meilleure tentative, PDF, bilan, attestation | ✅ | `quiz.js`, `notes.js`, `bilan.js` |
| Import et lancement SCORM Cloud | ✅ | Rapport reçu : score, statut, interactions, objectifs |
| Statut `completed` (pages vues) et `passed` (≥ 70 % et 9 évaluations) | ✅ | Rapport SCORM Cloud du 12/11/2026 |
| Note de module (`cmi.objectives`), bonnes réponses (`correct_responses`) | ✅ | Visibles dans le rapport SCORM Cloud |
| Reprise (`suspend_data`, `lesson_location`, `exit = suspend`) | ✅ | `entry: Resume` constaté |
| Mode révision / sans crédit : rien n'est enregistré, le stagiaire est prévenu | 🟡 | Testé avec un faux LMS ; pas encore vu dans SCORM Cloud |
| Quitter sans fermer brutalement (commit puis `LMSFinish` différé) | ✅ | Constaté dans SCORM Cloud |
| Visite guidée complète + guide dans le menu | 🟡 | Parcours complet non vérifié d'un trait |
| Mentions légales, licence CC BY 4.0, crédits, `LICENCE.txt`, `CREDITS.txt` | 🟡 | Adaptation LMS non testée ; à faire relire par un juriste |
| Thème sombre / clair / contraste élevé, impression en clair | ✅ | |
| Moodle, 360Learning, MOOC : import réel | ⬜ | Seul SCORM Cloud est validé |

## 2. Court terme (avant diffusion à de vrais stagiaires)

1. ⬜ **Valider le mode révision dans SCORM Cloud** : terminer le cours, quitter, relancer, vérifier l'encadré et que `cmi.score_raw` ne bouge pas.
2. ⬜ **Compléter les marqueurs « À COMPLÉTER »** de `modules/mentions.html` et `public/CREDITS.txt` : auteur et licence de l'illustration de la séance 1.1, confirmation de l'hébergeur. Retirer ensuite les marqueurs orange.
3. ⬜ **Importer le zip dans Moodle, puis 360Learning** (voir la grille de compatibilité, § 6). Contrôler le carnet de notes, la reprise et la fermeture de fenêtre.
4. ⬜ **Confirmer les étiquettes de la barre latérale sur SCORM Cloud** : correction faite (jeton `--rd-text`, `darkreader-lock`), jamais confirmée par un retour.
5. ⬜ **Parcourir la visite guidée en une fois**, dans les deux sens (Précédent / Suivant), en mode Diaporama puis Lecture.
6. ⬜ **Test d'accessibilité** : clavier seul, lecteur d'écran, zoom 200 %, largeur 320 px.
7. ⬜ **Relecture juridique** des textes de droit d'auteur et de données personnelles.

## 3. Moyen terme (qualité)

- ⬜ Test automatisé de l'API SCORM : un faux LMS en Node (comme celui du test local), lancé par `npm test`, qui contrôle les écritures `cmi.*`, les limites 255 / 4096 et le mode `review`.
- ⬜ Contrôle du package avant export : manifeste valide, tous les fichiers listés, aucune référence absolue (`/assets/…`), taille du zip.
- ⬜ Mesure de la taille réelle de `suspend_data` après un parcours complet (≈ 930 caractères en simulation, limite 4096).
- ⬜ Journal d'erreurs SCORM visible en mode debug (`SCORM_API.errors()` existe déjà).
- ⬜ Version SCORM 2004 (4e éd.) : `cmi.completion_status` / `cmi.success_status` séparés, `scaled_passing_score`. À faire seulement si un client l'exige.
- ⬜ Mise en ligne propre (Vercel ou OVH) du site de démonstration, avec le lien de téléchargement du package.

## 4. Long terme : éditeur de cours SCORM

La feuille de route détaillée (technologies, architecture, phases) est dans [ROADMAP-EDITEUR.md](ROADMAP-EDITEUR.md) ; le cahier des charges fonctionnel dans [SPEC-editeur-scorm.md](SPEC-editeur-scorm.md). Étapes proposées (résumé) :

| Étape | Contenu | Réutilise |
|---|---|---|
| A. Modèle de données | Un cours = un fichier JSON (modules, séances, cartes, évaluations) | `parcours.js`, `evaluations.js` |
| B. Générateur | JSON → pages HTML + manifeste + zip, sans écrire de code | `scorm-pack.mjs`, `scorm.js` |
| C. Éditeur visuel | Saisie des séances, alignement du texte, images, questions | `src/editor/`, `tools/editor-plugin.js` |
| D. Banque d'évaluations | Types `single`, `multi`, `num`, `text`, barème, seuil, correction | `quiz.js` |
| E. Contrôles qualité | Accessibilité, contraste, liens, taille du `suspend_data` | |
| F. Export multi-cibles | SCORM 1.2, SCORM 2004, site web (Vercel) | |
| G. Licence et mentions | Champs auteur / licence / crédits remplis dans l'éditeur | `mentions.html`, `legal.js` |

💤 Reportés, non demandés de nouveau : option de position du menu (gauche / droite / haut / bas / masqué).

## 5. Technologies

| Rôle | Outil | Licence / remarque |
|---|---|---|
| Build multi-pages | Vite 8 (`base: './'`) | MIT |
| Animations (MEXA) | GSAP | Licence GSAP « Standard », gratuite |
| Icônes | Phosphor Icons, variante Duotone uniquement | MIT |
| Visite guidée | Driver.js 1.x | MIT |
| Zip du package | fflate (dépendance de développement) | MIT |
| Polices | Cabinet Grotesk, Switzer (Fontshare), Space Mono | ITF Free Font License, OFL |
| Langages | HTML, CSS (couches `@layer`, variables, `color-mix`), JavaScript ES modules | |
| Suivi LMS | SCORM 1.2 par `window.API`, enveloppe maison dans `src/js/scorm.js` | |
| Hébergement de démonstration | Vercel (relais), OVH (hébergeur déclaré) | |
| Banc d'essai du package | SCORM Cloud (compte gratuit) | |

## 6. Compatibilité visée

| Plateforme | Statut | À vérifier |
|---|---|---|
| SCORM Cloud | ✅ validé | |
| Moodle | ⬜ | Note dans le carnet, reprise, fenêtre ou cadre intégré |
| 360Learning | ⬜ | Seuil de réussite, rapport d'interactions |
| MOOC (Open edX, etc.) | ⬜ | Selon la plateforme : SCORM 1.2 parfois via un module externe |

## 7. Fichiers qui comptent

| Fichier | Rôle |
|---|---|
| `src/js/scorm.js` | API SCORM 1.2 : init, get/set, commit, quit, sections de `suspend_data`, interactions, objectifs, erreurs, mode |
| `src/js/notes.js` | Notes, résumés global et par module, envoi au LMS |
| `src/js/quiz.js` | Moteur d'évaluation, correction, PDF, mode révision |
| `src/js/evaluations.js` | Questions et barème (`MAITRISE = 70`) |
| `src/js/shell.js` | Coquille : menu, suivi de progression, sortie, reprise |
| `src/js/exit.js` | Demande de sortie depuis les pages |
| `src/js/tour.js`, `tour-seance.js` | Visite guidée et guide |
| `tools/scorm-pack.mjs` | Manifeste + zip : `npm run scorm` |
| `modules/*.html` | Pages du cours |
| `public/LICENCE.txt`, `CREDITS.txt`, `LICENSE.txt` | Licence et crédits |
| `scorm/intelligentsia-scorm12.zip` | Package à importer (généré, non versionné) |
| `scorm_1.2.md` | Aide-mémoire de l'API et du modèle de données |

## 8. Sources

- ADL, *SCORM 1.2* : Run-Time Environment et Content Aggregation Model (adlnet.gov).
- Rustici / SCORM.com, *SCORM Explained* : https://scorm.com/scorm-explained/
- IMS Content Packaging 1.1.2 (structure de `imsmanifest.xml`).
- W3C, *WCAG 2.2* : https://www.w3.org/WAI/WCAG22/quickref/
- Creative Commons, CC BY 4.0 : https://creativecommons.org/licenses/by/4.0/deed.fr
- Documentation de Vite (vite.dev), GSAP (gsap.com), Driver.js (driverjs.com), Phosphor (phosphoricons.com).
- SCORM Cloud : https://cloud.scorm.com
