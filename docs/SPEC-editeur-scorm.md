# SPEC — Futur éditeur de cours SCORM

> Cahier des charges conservé pour plus tard. L'éditeur actuel (`src/editor/`, `tools/editor-plugin.js`)
> n'est qu'un **prototype d'images et de texte, en mode dev uniquement**. Cette page décrit la cible.

## 1. Objectif

Créer et modifier un cours (pages, images, textes, quiz) **sans écrire de code**, puis l'exporter en
**package SCORM 1.2** (zip) utilisable dans Moodle, 360Learning, un MOOC, etc. Le même cours reste
publiable en site web (Vercel).

## 2. Ce que le prototype fait déjà (à reprendre)

| Besoin exprimé | État |
|---|---|
| Ajouter une image à un endroit précis | fait (zones « Image / Texte / Zone libre » entre les blocs) |
| Image à côté du texte, avec contour, derrière le texte | fait (placement : bloc, gauche, droite, derrière) |
| Formats paysage / portrait / carré / pleine largeur, tailles en % | fait |
| Zone libre : images et textes placés n'importe où, glisser-déposer, redimensionner | fait |
| Texte : police, taille, graisse, italique, couleur, alignement | fait (zone libre) ; alignement + colonnes + largeur de ligne (blocs de texte) |
| Alignement justifié + dernière ligne centrée | fait |
| Annuler / Rétablir / Historique des versions | fait (`.editor-history/`, 60 versions par page) |

## 3. À construire

### 3.1 Mise en page du cours
- **Position du menu** : gauche, droite, haut, bas, masqué (réglage global, mémorisé par apprenant).
- Gabarits de page (séance, activité, auto-évaluation, glossaire).
- Alignement magnétique : guides, grille, centrage sur la page.
- Mise en forme riche dans les paragraphes (gras, liens, listes) sans casser le HTML.
- Éditeur de parcours : ajouter, renommer, déplacer des modules et des séances (aujourd'hui `src/js/parcours.js`).

### 3.2 Auto-évaluations
- Éditeur de questions (choix unique, choix multiple, nombre, texte) → écrit `src/js/evaluations.js`.
- Réglage de la note de réussite (aujourd'hui 70 %), du nombre de tentatives, des explications.
- Banque de questions et tirage aléatoire.

### 3.3 Export SCORM
- Commande `npm run scorm` : build + `imsmanifest.xml` généré (titre, items, note de réussite) + zip.
- Choix SCORM 1.2 (par défaut) ou 2004.
- Un seul SCO pour tout le cours ; option : un SCO par module (notes séparées).
- Test d'un package avec un LMS local (Moodle de test, SCORM Cloud).

### 3.4 Qualité et sécurité
- Éditeur actif uniquement en dev ; absent du build (vérifié à chaque build).
- Refus des scripts et des attributs `on*` dans le contenu inséré.
- Images : poids max, texte alternatif obligatoire, conversion WebP.
- Accessibilité : contrôles clavier, annonces aux lecteurs d'écran, contraste vérifié.

## 4. Principes à garder

- Pas de dépendance à un outil auteur : tout reste du HTML / CSS / JS lisible.
- Droit d'auteur : les contenus sont **réécrits** (exemples et formulations originaux), jamais recopiés d'un cours existant.
- Le suivi (notes, progression) passe toujours par le wrapper `src/js/scorm.js`.
