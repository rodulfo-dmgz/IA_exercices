# ROADMAP — Éditeur auteur de cours SCORM et d'activités en ligne

Auteur : Rodulfo DOMINGUEZ JIMENEZ, R.D FORMATION. Rédigé le 12 novembre 2026, à partir de l'expérience du cours « Intelligentsia ».
Complète [SPEC-editeur-scorm.md](SPEC-editeur-scorm.md) (cahier des charges fonctionnel) et [ROADMAP.md](ROADMAP.md) (cours actuel).

> Statut : **proposition à valider**. Les choix techniques sont des recommandations argumentées, pas des faits vérifiés. Les durées sont des ordres de grandeur à recalibrer après la phase 1.
>
> **Mise à jour du 12 novembre 2026** : l'éditeur servira **à l'auteur et à ses clients** (décision 1 tranchée) et doit être un **outil de composition performant** : blocs déplaçables et redimensionnables, images, texte, audio, vidéo. Cela ajoute les § 3.5 (mise en page), § 3.6 (médias), § 3.7 (performance), § 3.8 (clients) et modifie les phases.
>
> **Deuxième mise à jour, même jour** : navigation positionnable (droite, gauche, bas, haut) et stylable (flottante, collée…) § 3.9 · design system à **4 couleurs de marque** et thèmes clair / sombre / système § 3.10 · **structure choisie** (module, séquence, séance, activité) § 3.11 · **notation et suivi multi-standards** (SCORM 1.2, SCORM 2004, xAPI, cmi5) § 3.12. Les phases 1, 2 et 3 sont modifiées ; SCORM 2004 passe de la phase 7 à une phase 2b.

## 1. Objectif

Un outil **pour moi** (auteur) qui permet de :
1. **créer un cours SCORM** (modules, séances, cartes, auto-évaluations, glossaire, bilan, visite guidée) sans écrire de code ;
2. **créer des activités en ligne** (quiz, tri, appariement, texte à trous…) utilisables seules, intégrables dans une page ou dans un cours ;
3. **tout exporter** : package SCORM 1.2 (puis 2004), site web statique, version imprimable ;
4. fonctionner **en local** (hors ligne, sans compte) **comme en ligne** (sauvegarde, partage, publication) ;
5. être **un outil de composition performant** : blocs déplaçables et redimensionnables, images, texte, audio, vidéo ;
6. servir **l'auteur et ses clients** (espaces séparés, marque du client, support), tout en gardant des cours sans donnée ni cookie côté apprenant.

Critère de réussite global : **recréer le cours Intelligentsia depuis l'éditeur**, l'exporter, l'importer dans SCORM Cloud et obtenir **le même rapport** que le cours actuel (statut, note, interactions, objectifs, reprise, mode révision).

## 2. Ce que ce projet nous a appris (et ce que ça impose)

| Leçon du projet | Conséquence pour l'éditeur |
|---|---|
| Le prototype actuel **modifie le HTML source** par décalages de caractères (`data-src-offset`), uniquement en mode dev. | Fragile et impossible en ligne. → **L'éditeur édite un modèle de données (JSON), jamais du HTML.** Le HTML est **généré**. |
| Le cours est un mélange de pages écrites à la main, de `parcours.js`, `evaluations.js`, `glossaire-data.js`. | → **Une seule source de vérité** : `course.json` (versionné, validé par schéma). |
| Le lecteur (menu, modes Lecture/Diaporama, quiz, bilan, visite guidée, API SCORM) est réutilisable tel quel. | → **Extraire un « runtime » indépendant** de l'éditeur, qui lit `course.json`. L'éditeur et le cours exporté partagent ce runtime. |
| Les bogues LMS viennent de détails (4096 caractères, décimaux, `LMSFinish`, mode `review`). | → Le runtime porte **toutes** ces règles une fois pour toutes ; l'éditeur ne peut pas les casser. |
| La visite guidée dépend de la structure (9 étapes de séance, menu). | → Elle est **générée depuis le modèle**, pas écrite à la main. |
| Le contenu doit être original et la licence claire. | → Champs **auteur, licence, crédits** obligatoires ; rappel d'originalité à l'export. |
| Tout test final se fait dans un vrai LMS. | → Un **simulateur de LMS** intégré (faux API, mode révision, erreurs) avant l'import réel. |
| Les extensions de thème, le PDF sombre, les contrastes ont posé problème. | → Le runtime impose les **jetons de couleur, `darkreader-lock`, palette d'impression claire**. |

## 3. Décisions techniques recommandées

### 3.1 Architecture : web « local-first » (PWA), serveur optionnel

| | A. **Application web locale-first (PWA)** | B. Application de bureau (Tauri / Electron) | C. Application serveur (Next.js + base) |
|---|---|---|---|
| Local, hors ligne | Oui (service worker, IndexedDB) | Oui | Non |
| En ligne | Oui, même code | À héberger en plus | Oui |
| Un seul code pour local et en ligne | **Oui** | Non (deux livrables) | Non |
| Accès aux fichiers | Chrome/Edge : File System Access API ; sinon import/export de fichier | Complet | Téléversements |
| Coût de maintenance (auteur seul) | **Faible** | Moyen à élevé | Élevé |
| Données auteur sur un serveur | Seulement si on le choisit | Non | Oui, obligatoire |
| Cohérence avec ce projet (Vite, sans serveur) | **Totale** | Bonne | Faible |

**Recommandation : A.** Un seul code, utilisable hors ligne et en ligne, sans compte pour l'usage de base. Un **emballage Tauri** reste possible plus tard (phase 7) si l'accès aux fichiers dans tous les navigateurs devient nécessaire. Les modes d'usage sont décrits au § 6.

### 3.2 Pile technique

| Couche | Choix proposé | Pourquoi / alternative |
|---|---|---|
| Langage | **TypeScript** | Le modèle de données doit être typé ; les erreurs LMS viennent de détails que le compilateur attrape |
| Build | **Vite** | Déjà maîtrisé ici (multi-pages, `base: './'`) |
| Interface de l'éditeur | **React + TypeScript** (alternative : Svelte) | Écosystème riche pour l'édition (texte riche, glisser-déposer) |
| Composants et accessibilité | **shadcn/ui** (Radix) + CSS à jetons existants | Déjà la ligne du projet ; Radix gère focus et clavier |
| Texte riche | **Tiptap** (ProseMirror) | Sortie JSON structurée, sans HTML libre : pas de script injecté |
| Glisser-déposer | **dnd-kit** | Accessible au clavier |
| Mise en page | **CSS Grid (12 colonnes) + container queries** ; poignées de redimensionnement maison aimantées aux colonnes | Même rendu dans l'éditeur et dans le runtime ; voir § 3.5 |
| Traitement des médias | Images : **Canvas / OffscreenCanvas dans un Web Worker** (recadrage, WebP) ; audio : **MediaRecorder / Web Audio** ; vidéo : lecteur HTML5 + **WebVTT** ; **ffmpeg.wasm** optionnel | Pas de serveur pour le traitement ; voir § 3.6 |
| Stockage des médias | **OPFS** (système de fichiers privé du navigateur) + IndexedDB pour les métadonnées | Gros fichiers sans bloquer l'interface |
| État | **Zustand** + historique annuler/rétablir (patchs) | Léger |
| Modèle et validation | **Zod** (schéma → types + validation + migrations) | Un schéma versionné (`schemaVersion`) |
| Stockage local | **IndexedDB (Dexie)** + **File System Access API** (dossier de projet) + repli « fichier `.rdcourse` » (zip) | Hors ligne, sans compte |
| Zip | **fflate** | Déjà utilisé, fonctionne dans le navigateur |
| Runtime du cours | **TypeScript sans framework**, compilé en un fichier JS + CSS | Léger, hors ligne, reprend le code actuel |
| Icônes, animations, visite | Phosphor Duotone, GSAP, Driver.js (déjà utilisés) | Voir § 8 pour la licence GSAP |
| Tests | **Vitest** (unitaires, faux LMS) + **Playwright** (parcours navigateur) | Remplace les essais manuels répétés |
| Sauvegarde en ligne (optionnelle) | **Supabase** (Postgres, Auth, Storage), région UE | Déjà dans la pile de R.D FORMATION |
| Hébergement | Statique (OVH, comme déclaré dans les mentions, ou Vercel) | L'éditeur et le lecteur sont des fichiers statiques |

### 3.3 Le modèle de données (`course.json`)

Une structure unique, versionnée, validée à chaque chargement et à chaque export.

```jsonc
{
  "schemaVersion": 1,
  "meta": { "id": "intelligentsia", "titre": "…", "langue": "fr",
            "auteur": "…", "licence": "CC-BY-4.0", "credits": [ … ] },
  "reglages": {
    "modeParDefaut": "diaporama", "visiteGuidee": true,
    "navigation": { "position": "gauche", "style": "collee", "repliable": true },   // § 3.9
    "apprenant": { "modeAffichage": true, "theme": false, "menu": false,                 // modifiable par l'apprenant ? (§ 3.9)
                   "verrouille": { "modeAffichage": false, "theme": false, "menu": false } },   // l'accessibilité n'est jamais verrouillable
    "marque": { "couleurs": { "principale": "#…", "secondaire": "#…", "accent": "#…", "encre": "#…" }, "logo": "asset-logo",
                 "polices": { "titres": "police-1", "sousTitres": "police-2", "texte": "police-3" }, "jeuPolices": "lisibilite-maximale" },   // § 3.10 (4 couleurs ; 1 police par rôle, 3 au plus)
    "theme": { "defaut": "systeme", "autorises": ["clair", "sombre", "systeme"], "contrasteEleve": true },
    "structure": { "niveaux": ["module", "seance", "activite"] },                                            // § 3.11
    "notation": { "echelle": [0, 100], "seuil": 70, "agregation": "meilleure", "achevement": "tout-vu",
                  "reussite": "seuil-et-tout-fait", "standards": ["scorm12"], "sco": "un" /* un | module (V2) */, "niveauObjectif": "module" }                  // § 3.12
  },
  "parcours": [
    { "type": "accueil", "id": "accueil", "titre": "…" },
    { "type": "module", "id": "module-ia", "titre": "…", "seances": [
        { "id": "m1-definir", "titre": "…", "suivi": true,
          "lecon":    [ { "type": "carte", "titre": "…", "rangees": [ /* rangées → colonnes → blocs : voir § 3.5 */ ] } ],
          "activite": { "type": "tri", "items": [ … ] },
          "evaluation": { "id": "m1-s1", "questions": [ { "t": "single", "q": "…", "options": [ … ], "a": 1, "why": "…" } ] }
        } ] },
    { "type": "bilan" }, { "type": "glossaire" }, { "type": "liens", "items": [ … ] }, { "type": "mentions" }
  ],
  "glossaire": [ { "t": "…", "d": "…", "ref": "m1-definir" } ],
  "assets": [ { "id": "img-1", "fichier": "…", "alt": "…", "licence": "…" } ]
}
```

Règles : **pas de HTML libre** (blocs typés) ; texte alternatif d'image obligatoire ; identifiants stables ; migration automatique d'une version à la suivante.

### 3.4 Export : le HTML est généré

Un cours exporté = `index.html` + **runtime** (JS/CSS) + `course.js` (le modèle, sous forme `window.COURSE = {…}` pour fonctionner aussi hors serveur) + assets + `imsmanifest.xml`. Plus de page par séance écrite à la main : le runtime **rend** les séances depuis le modèle, dans les deux modes. Le manifeste est produit à partir du modèle (titre, seuil, liste de fichiers), comme `tools/scorm-pack.mjs` aujourd'hui.

### 3.5 Moteur de blocs et mise en page (le cœur de l'outil)

**Besoin** : éditer les blocs, les déplacer, les élargir, en ajouter (texte, image, audio, vidéo, tableau, activité…), sans écrire de code.

**Décision du 12 novembre 2026 : grille à 12 colonnes ET calques dès le MVP.** Quatre choix tranchés : grille + calques dès la première version · **un calque peut contenir tous les types de blocs** (texte, image, audio, vidéo, activité…) · **repli dans le flux sur petit écran et au zoom** · **aimantation sur 12 colonnes**.

*Analyse initiale (conservée pour mémoire) : la grille est plus sûre que la toile libre ; la décision ci-dessus garde la grille comme socle et ajoute les calques avec les garde-fous du § « Garde-fous des calques ».*

| | Grille structurée (recommandée) | Toile libre (positions en pixels) |
|---|---|---|
| Rendu mobile / zoom 200 % | Fiable (la grille se replie) | Casse facilement |
| Accessibilité (ordre de lecture, clavier) | Naturelle | À reconstruire |
| Cours en Lecture et en Diaporama | Identique | Difficile |
| Liberté visuelle | Forte avec colonnes, largeurs, alignements | Totale |

**Deux niveaux de liberté, dans une même carte :**

1. **La grille (le flux)** : une carte contient des **rangées** ; une rangée contient des **blocs** avec une largeur de **1 à 12 colonnes, aimantée** (1/3 · 1/2 · 2/3 · pleine largeur et toutes les largeurs intermédiaires). C'est le contenu « porteur » par défaut.
2. **Les calques (hors flux)**, de deux sortes :
   - **Zone libre** : un bloc de la grille (largeur en colonnes, ratio ou hauteur fixés) qui contient des blocs **positionnés librement en pourcentage** (position, largeur, hauteur, empilement). Reprend le « zone libre » du prototype.
   - **Calque d'arrière-plan** d'une rangée ou d'une carte : un élément **derrière ou devant** le flux (par exemple l'image « derrière le texte » du prototype), le contenu de la grille restant par-dessus.

**Positionnement** : en **pourcentage du cadre** (jamais en pixels), avec aimantation horizontale sur les 12 colonnes et verticale sur un pas fixe, guides magnétiques, alignement et distribution, empilement (avant / arrière).

**Garde-fous des calques** (rendus obligatoires parce que **tous les blocs** peuvent s'y trouver) :

| Sujet | Règle |
|---|---|
| **Ordre de lecture et de tabulation** | Défini par l'auteur (champ `ordre`), **distinct de l'empilement visuel** ; le DOM suit l'ordre de lecture ; le validateur signale toute divergence avec la position à l'écran |
| **Éléments interactifs** (activités, boutons, liens, lecteurs) | **Jamais recouverts** par un autre élément (chevauchement bloquant) ; zone cliquable d'au moins **24 × 24 px** ; indicateur de focus toujours visible |
| **Texte sur image** | Contraste calculé **sur le fond réel** ; voile automatique proposé ; jamais de texte uniquement sous forme d'image |
| **Médias** | Mêmes exigences qu'ailleurs : texte alternatif, transcription, sous-titres |
| **Petit écran, zoom 200 %, reflow** | La zone libre **se replie dans le flux** : les blocs porteurs de contenu passent en **une colonne, dans l'ordre de lecture** ; les calques **décoratifs** sont masqués ou simplifiés ; **rien n'est coupé ni caché** ; aucun défilement horizontal |
| **Clavier** | Sélection d'un calque, **déplacement par les flèches** (pas fixe), **redimensionnement par Maj + flèches**, saisie numérique dans l'inspecteur, « avant / arrière » par raccourci |
| **Impression et PDF** | Les calques sont **repliés dans le flux** (aucune superposition) |
| **Débordement** | Un calque reste **dans son cadre** ; pas de contenu hors carte |
| **Aperçu** | L'éditeur montre le rendu **repli** pour chaque taille d'écran, avant l'export |
| **Validation à l'export** | Ordre de lecture, chevauchements d'éléments interactifs, contraste sur fond, alternatives de médias : **bloquants** |

**Modèle d'une zone libre** (positions en % du cadre ; `ordre` = ordre de lecture ; `z` = empilement visuel) :

```jsonc
{ "bloc": { "type": "zone-libre", "ratio": "16:9", "repli": "flux", "enfants": [
    { "bloc": { "type": "image", "asset": "img-2", "alt": "" },
      "calque": { "x": 0,  "y": 0,  "l": 100, "h": 100, "z": 0, "decoratif": true } },
    { "bloc": { "type": "texte", "contenu": { /* Tiptap JSON */ } },
      "calque": { "x": 8,  "y": 12, "l": 50,  "z": 2, "ordre": 1 } },
    { "bloc": { "type": "activite", "ref": "m1-s1-a1" },
      "calque": { "x": 62, "y": 20, "l": 30,  "z": 3, "ordre": 2 } } ] },
  "largeur": { "base": 12 } }
```

**Plan de repli décidé à l'avance** (à ne déclencher qu'avec ton accord) : si la phase 3a dérape, livrer d'abord les **calques décoratifs et le texte** (sans activités dedans), puis étendre aux médias, puis aux activités.

Le modèle de mise en page, dans `course.json` :

```jsonc
{ "type": "carte", "titre": "…", "rangees": [
    { "colonnes": [
        { "bloc": { "type": "texte", "contenu": { /* Tiptap JSON */ } },
          "largeur": { "base": 12, "moyen": 7 } },          // 12 colonnes sur mobile, 7 sur écran moyen
        { "bloc": { "type": "image", "asset": "img-1", "alt": "…", "format": "16:9", "ajustement": "couvrir" },
          "largeur": { "base": 12, "moyen": 5 } } ],
      "alignement": "haut", "espacement": "moyen" } ] }
```

**Actions d'édition à offrir** (toutes au **clavier** et à la souris) :
- ajouter un bloc depuis une palette ou par « / » (menu rapide) ;
- **déplacer** (glisser-déposer, ou flèches + touche d'action) ;
- **redimensionner** : poignées qui **s'aimantent aux colonnes**, valeur numérique dans l'inspecteur, boutons « 1/3 · 1/2 · 2/3 · pleine largeur » ;
- dupliquer, supprimer (avec annulation), verrouiller, masquer, copier-coller entre cartes et entre cours ;
- **inspecteur** à droite : largeur par taille d'écran, alignement du texte (gauche, centre, droite, justifié), largeur de lecture, espacement, fond, bordure, arrondi, ombre ;
- sélection multiple, alignement et distribution, grille visible ;
- **blocs réutilisables** (un bloc défini une fois, utilisé dans plusieurs cartes) et **modèles de carte** (scénario + objectifs, comparaison, méthode en étapes…) ;
- aperçu **par taille d'écran** (mobile, tablette, ordinateur) et en **Lecture / Diaporama** ;
- annuler / rétablir illimité par patchs.

**Catalogue de blocs (V1)** : titre · texte riche · liste · tableau · citation · encadré (note, astuce, attention) · objectifs · comparaison (cartes) · étapes · image · galerie · **audio** · **vidéo** · carte interactive (tri, appariement…) · question isolée · séparateur · espace · intégration externe (liste blanche) · **zone libre (calques)** · **calque d'arrière-plan**.

### 3.6 Médias : images, audio, vidéo

| Média | Fonctions | Accessibilité (obligatoire) | Contraintes SCORM |
|---|---|---|---|
| **Image** | import, glisser-déposer, **recadrage** (formats 21:9, 16:9, 1:1, 4:5, naturel), point focal, **conversion WebP/AVIF et redimensionnement dans le navigateur**, plusieurs tailles (`srcset`) | **texte alternatif obligatoire** (ou « décorative ») | poids contrôlé |
| **Audio** | import ou **enregistrement au micro**, découpe simple, voix de synthèse (comme MEXA), lecteur à contrôles clavier | **transcription obligatoire** ; pas de lecture automatique | fichiers légers (MP3/AAC/Opus) |
| **Vidéo** | import ; **trois modes** : (1) fichier dans le package, (2) **hébergement externe** (Bunny Stream, déjà dans ta pile ; YouTube/Vimeo en lien), (3) enregistrement d'écran/caméra (V2) ; image de couverture ; lecteur à contrôles clavier | **sous-titres (WebVTT) et transcription** ; audio-description pour les contenus visuels ; pas de lecture automatique | **Taille du package** : les LMS limitent le poids d'un zip (souvent réglable par l'administrateur). Prévoir : compression, alerte de poids à l'export, et le mode « média externe » (qui exige une connexion) |
| **Bibliothèque** | gestionnaire d'assets : recherche, étiquettes, utilisation (où est-il utilisé ?), remplacement partout, **licence et crédit par asset** (alimentent la page Crédits) | alt/transcription stockés avec l'asset | suppression des assets inutilisés à l'export |

Règles : aucun média ne démarre seul ; contrôles au clavier ; `prefers-reduced-motion` respecté ; chaque média porte **auteur et licence** (droit d'auteur, comme pour les icônes et polices) ; les médias externes sont signalés à l'auteur (données personnelles côté fournisseur, hors ligne impossible) et dans les mentions.

#### Vidéo et poids — décision du 12 novembre 2026

Quatre choix tranchés : **vidéos externes par défaut, fichier dans le package pour les petites** · **alerte de poids à 50 Mo, blocage au choix de l'auteur** · **compression vidéo optionnelle dès la V1, dans le navigateur** · **sous-titres et transcription bloquants à l'export, avec exception justifiée**.

**Hébergement des vidéos**

| Mode | Quand | Conséquences |
|---|---|---|
| **Externe** (Bunny Stream, déjà dans ta pile ; autres hébergeurs en lien) | **Par défaut**, pour les vidéos longues ou lourdes | package léger ; **connexion obligatoire** ; service tiers ; l'adresse IP de l'apprenant est vue par l'hébergeur (à **déclarer dans les mentions**, générées automatiquement) ; certaines plateformes peuvent **bloquer les contenus externes** dans le cours (à **vérifier** par plateforme) ; lien de secours « ouvrir dans un nouvel onglet » |
| **Fichier dans le package** | **Petites vidéos** : l'éditeur propose d'externaliser une vidéo au-delà d'un seuil par vidéo (**10 Mo par défaut**, seuil de conception à ajuster) | cours **autonome**, fonctionne hors ligne ; package plus lourd |
| **Lien de plateforme publique** (YouTube, Vimeo) | Cas particulier, signalé | dépend de tiers, publicité et suivi possibles, mentions à adapter ; **non recommandé** pour des clients soucieux de confidentialité |

À l'export, l'éditeur **liste les médias externes** et affiche : « Ce cours nécessite une connexion pour : … ». Les vidéos privées utilisent un **accès signé** quand l'hébergeur le permet (à vérifier chez Bunny Stream).

**Poids du package**
- **Alerte à 50 Mo** (seuil de conception, **pas une limite vérifiée d'une plateforme**) : l'éditeur affiche le poids, **liste les fichiers les plus lourds**, propose des solutions (compresser, externaliser, retirer les médias inutilisés).
- **Blocage au choix de l'auteur** : un plafond optionnel (par projet, puis par espace client) au-delà duquel l'export est refusé ; **désactivé par défaut**.
- Le vrai plafond se **vérifie avec chaque client** (réglage de son LMS) et se consigne dans la matrice de compatibilité.
- Le poids est recalculé **en direct** (estimation, puis valeur exacte à l'export).

**Compression vidéo dans le navigateur (optionnelle, V1)**
- Pour les vidéos destinées au package : conversion vers un format web courant (MP4, H.264 / AAC) et réduction de résolution ou de débit, avec **estimation du poids avant/après** et aperçu.
- **Dans un Web Worker**, avec **barre de progression, annulation** et mémoire limitée ; refus des fichiers trop longs ou trop lourds avec conseil de passer par l'hébergeur.
- **Contraintes à connaître** (d'après ma connaissance ; à vérifier avant de construire) : le moteur de conversion (par exemple ffmpeg.wasm) pèse **plusieurs dizaines de Mo**, à charger **à la demande** ; le mode multi-threads demande une **isolation inter-origines** (en-têtes HTTP COOP/COEP) à configurer sur l'hébergement, sinon c'est plus lent ; la mémoire du navigateur limite la taille des vidéos ; une alternative plus rapide sur navigateur moderne est l'encodage matériel par **WebCodecs** (à évaluer).
- **Licences à vérifier avant de livrer à des clients** : FFmpeg est sous LGPL ou GPL selon les composants ; l'encodage H.264 peut soulever des **questions de brevets** ; plan B : format WebM (VP9 / AV1) avec contrôle de compatibilité dans les LMS, ou compression par l'hébergeur externe uniquement.
- Les clients sans compression locale gardent le **mode externe** : le MVP n'en dépend pas.

**Sous-titres et transcriptions : bloquants à l'export**
- Toute vidéo et tout audio **non décoratif** exige des **sous-titres (WebVTT)** et une **transcription** ; l'export est **refusé** sinon.
- **Exception justifiée** : l'auteur déclare le média **décoratif** (sans information) ou saisit une **justification** ; l'exception est **enregistrée dans le cours** et listée dans le **rapport qualité** (pour que le client la voie).
- L'éditeur facilite la tâche : import WebVTT, éditeur de sous-titres minimal, transcription collée ou importée ; **génération automatique** (reconnaissance vocale) à étudier plus tard, toujours **relue par l'auteur**.

### 3.7 Performance (« hyper performant » : des objectifs mesurables)

Objectifs **à valider par mesure** (hypothèses de départ, pas des acquis) : ouvrir un cours de 500 cartes en moins de 2 s ; frappe et déplacement de bloc fluides (pas de latence perceptible) ; aperçu mis à jour en moins de 300 ms ; export d'un cours de 50 Mo en quelques secondes.

Moyens :
- **Rendu incrémental** : seule la carte modifiée se re-rend ; l'aperçu est le runtime dans une iframe, mis à jour par `postMessage` (pas de rechargement).
- **Arbre et listes virtualisés** ; chargement paresseux des vignettes et médias.
- **Travaux lourds dans des Web Workers** : redimensionnement d'images, hachage, zip, estimation de `suspend_data`.
- **Stockage** : IndexedDB pour le modèle, **OPFS** (système de fichiers privé du navigateur) pour les gros médias ; sauvegarde automatique avec temporisation ; historique par **patchs** et non par copies.
- **Budget de poids** du runtime exporté (cible : le plus léger possible, mesuré à chaque build) ; images en WebP, médias différés.
- **Tests de charge** automatisés (un cours « monstre » dans les fixtures).
- Transcodage vidéo dans le navigateur : **optionnel, dans un Worker, chargé à la demande** (voir § 3.6, « Vidéo et poids ») ; le moteur de conversion n'est **jamais** dans le chargement initial de l'éditeur.

### 3.8 Utilisation par des clients

Cette décision change l'ordre des priorités : un outil vendu à des tiers doit être **fiable, propre juridiquement et supportable**.

| Sujet | Décision proposée |
|---|---|
| **Comptes et espaces de travail** | Un espace par client ; rôles : propriétaire, éditeur, relecteur (lecture et commentaires) ; données isolées par espace |
| **Image de marque** | Jetons configurables par client : logo, couleurs, polices ; vérification automatique du contraste |
| **Modèles** | Bibliothèque de cours et de cartes modèles, par espace |
| **Licence du contenu** | Le client choisit la licence de **ses** cours ; l'éditeur ne force pas CC BY ; les crédits de tiers restent obligatoires |
| **Licences de l'outil et des composants** | **Vérifier avant la première livraison à un client** : GSAP (restrictions d'usage dans les outils de création), polices (ITF FFL / OFL), Driver.js et Phosphor (MIT). Plan B : remplacer GSAP par des animations CSS/WAAPI |
| **Données personnelles (RGPD)** | Hébergement UE, registre des traitements, contrat de sous-traitance, export et suppression des données, journal d'accès ; les **cours produits** restent sans donnée ni cookie par défaut ; **relecture juridique indispensable** |
| **Conditions d'utilisation et offre** | CGU, politique de confidentialité, offre (gratuit/payant) : à rédiger avec un juriste |
| **Facturation** | Stripe (déjà dans ta pile) : abonnement par espace, si l'offre est payante |
| **Support** | Journal d'erreurs, version affichée, export de diagnostic, guide d'aide intégré (visite guidée de l'éditeur lui-même) |
| **Sauvegardes** | Versions de chaque cours, restauration, sauvegarde quotidienne de la base |
| **Compatibilité LMS** | Matrice testée par version (SCORM Cloud, Moodle, 360Learning) publiée aux clients |

#### Offre aux clients — décision du 12 novembre 2026

Quatre choix tranchés : **modèle mixte progressif** · **mention « Créé avec » discrète, retirable avec l'offre payante** · **facturation : abonnement par espace client, licence par utilisateur et forfait par projet** · **contenu au client, moteur sous licence d'usage**.

**Deux temps, alignés sur les phases :**

| Temps | Phase | Ce que le client reçoit | Facturation | Prérequis |
|---|---|---|---|---|
| **A · Prestation accompagnée** | 5b | Des cours livrés par R.D FORMATION ; pour quelques clients, l'éditeur utilisé **en local, sans compte**, avec accompagnement | **Forfait par projet** (et, si l'accès à l'éditeur est cédé, une licence d'utilisation) ; facturation manuelle | Licence d'usage du moteur, contrat client simple, mention « Créé avec », licences des composants vérifiées (GSAP, polices) |
| **B · Abonnement en ligne** | 6 | L'éditeur hébergé, avec **espace client**, rôles, modèles, marque du client, sauvegardes | **Abonnement par espace client** ; **licence par utilisateur** (sièges) ; forfait par projet pour les prestations | Comptes, Stripe, CGU / CGV, politique de confidentialité, contrat de sous-traitance (RGPD), support |

**Tarifs : non fixés.** Ils se décident **après les deux ou trois premiers clients**, avec un expert-comptable ; aucun prix n'est proposé ici.

**Marque de l'outil dans les cours exportés**
- Par défaut : une **mention discrète** (« Créé avec [nom de l'outil] »), **accessible** (texte lisible, sans bloquer la navigation), placée dans le pied de page ou dans la page Crédits.
- **Marque blanche** (sans mention) : **incluse dans l'offre payante**.
- **Limite technique à connaître** : en mode **local sans compte** (temps A), le code du cours est modifiable côté client ; le retrait de la mention ne peut donc pas être **imposé par la technique**, seulement par le **contrat**. Avec les comptes (temps B), le retrait peut être **lié à l'abonnement** (l'export vérifie l'offre de l'espace).

**Propriété et licences**
- Le **client garde tous ses droits sur ses contenus** (textes, images, médias, questions) ; il choisit leur licence.
- Le **moteur de lecture** copié dans chaque package est fourni **sous licence d'usage** pour ce cours ; les **composants tiers** gardent leur licence (notice MIT conservée, crédits générés dans la page Crédits et dans `CREDITS.txt`).
- **Recommandation à valider par un juriste** : un package **déjà exporté doit continuer à fonctionner** après la fin d'un abonnement (licence d'usage du moteur **durable** pour les exports faits pendant l'abonnement). Un cours livré qui s'arrêterait de marcher détruirait la confiance du client.

**Documents à préparer (avec un juriste)** : conditions d'utilisation et de vente · licence d'usage du moteur · politique de confidentialité · **contrat de sous-traitance des données (RGPD)** pour le cloud et pour un éventuel LRS hébergé · conditions de résiliation et de remboursement · niveau de service minimal et support · mentions légales de l'outil.

**Questions à faire vérifier par un professionnel (non vérifiées ici)** : une activité de **logiciel ou d'abonnement** peut relever d'un autre code d'activité que la formation (85.59B aujourd'hui) ; plafonds de chiffre d'affaires de la micro-entreprise et **TVA** ; **assurance de responsabilité civile professionnelle** ; **forme juridique** adaptée à un service en ligne ; facturation électronique (Stripe et obligations françaises).

### 3.9 Navigation du cours : position et style

Le menu actuel est fixe (à gauche, collé à la page). L'éditeur doit permettre de le **placer** et de le **styler**, sans toucher au contenu.

**Position** : `gauche` · `droite` · `haut` · `bas` · `masquée` (la navigation reste atteignable par un bouton et par les boutons Précédent / Suivant).

**Style** :

| Style | Rendu |
|---|---|
| **Flottante** | Détachée du bord, avec marge, arrondi et ombre ; le contenu passe dessous ou à côté |
| **Collée à la page** | Contre le bord, pleine hauteur ou pleine largeur, séparée par un filet (comportement actuel) |
| **Rail** | Icônes seules (déplié au survol ou au clic), gain de place |
| **Tiroir** | Cachée, ouverte par un bouton (idéal pour le contenu plein écran et le mobile) |

Réglages associés : largeur ou hauteur, repliable, ouverture des modules par défaut, étiquettes visibles ou non, bouton d'accès au guide, au thème et à la sortie.

**Qui choisit** : l'auteur fixe le défaut ; l'apprenant ne peut changer **la position et le style du menu** que si l'auteur **active** ce réglage (désactivé par défaut) — voir « Préférences de l'apprenant » ci-dessous.

**Ce que ça impose au runtime** (leçons du projet) :
- Une **disposition par `data-nav="gauche|droite|haut|bas"`** (CSS Grid, zones nommées) : le contenu n'est jamais écrit pour une position précise.
- **Haut et bas** : un arbre profond ne tient pas en barre ; on affiche les modules en onglets et les séances dans un panneau (menu déroulant ou barre secondaire), avec un maximum de niveaux visibles.
- **Petit écran** : toute position devient un **tiroir** ou une barre basse ; jamais de menu qui masque le contenu sans accès.
- **Accessibilité** : une seule landmark `nav` nommée ; lien d'évitement ; **l'ordre de tabulation suit l'ordre visuel** (droite et bas inclus) ; focus visible ; le mode `inert` du guide s'applique aux deux zones.
- **Écriture de droite à gauche** (arabe, hébreu) : « gauche » et « droite » deviennent « début » et « fin » (propriétés logiques CSS).
- **Visite guidée** : les bulles sont aujourd'hui fixées à droite du menu (`side: 'right'`). Elles doivent être **calculées d'après la position** (côté opposé au bord du menu).
- **Impression** : le menu disparaît toujours.
- **Une seule page ou une iframe** : le runtime piloté par le modèle peut rendre le menu et le contenu dans **le même document** (plus de `postMessage` entre coquille et page). À trancher en phase 1 ; l'iframe garde l'avantage d'isoler les pages.

#### Préférences de l'apprenant — décision du 12 novembre 2026

Réponses de l'auteur : l'apprenant peut changer **le mode Lecture / Diaporama** et, pour **l'accessibilité, la police très lisible et la taille du texte** · l'auteur peut **tout verrouiller sauf l'accessibilité** · les préférences sont mémorisées **dans le navigateur seulement** · elles se règlent dans **un panneau « Préférences » unique**.

*Confirmé le 12 novembre 2026 : le thème et la position du menu sont **désactivés par défaut, activables par l'auteur**. Le thème « système » suit toujours la préférence de l'appareil, sans réglage.*

| Réglage | Proposé à l'apprenant | L'auteur peut le verrouiller ? |
|---|---|---|
| **Mode d'affichage** Lecture / Diaporama | **Oui, par défaut** | Oui (mise en page) |
| **Police très lisible** (bascule vers le jeu « Lisibilité maximale ») | **Oui, toujours** | **Non** (accessibilité) |
| **Taille du texte** et **espacements** | **Oui, toujours** | **Non** |
| **Contraste élevé** | **Oui, toujours** | **Non** |
| **Mouvement réduit** (animations atténuées) | **Oui, toujours**, et le réglage de l'appareil est respecté | **Non** |
| **Thème** clair / sombre / système | Non par défaut ; **activable** par l'auteur | Oui |
| **Position et style du menu** | Non par défaut ; **activable** par l'auteur | Oui |

**Conséquences à connaître**
- **Compromis assumé** : un apprenant peut **remplacer les polices de la marque** par une police très lisible ; l'éditeur le dit clairement à l'auteur (aperçu « avec police lisible »). Il n'est pas verrouillable.
- **Le cours actuel** expose déjà le thème, le contraste et le menu réduit à l'apprenant : le preset « Cours actuel » active le thème pour rester identique.
- **Taille et espacements** : paliers de taille (par exemple 100 %, 125 %, 150 %, 200 %) et un palier « espacement renforcé » fondé sur les valeurs de **WCAG 1.4.12** (interligne 1,5, espacement des paragraphes, des lettres et des mots) ; test automatisé : **aucun contenu ne doit se perdre**.
- **Réglages de l'appareil respectés d'office** : `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast` et les modes de **couleurs forcées** (Windows) ; la préférence de l'apprenant s'ajoute, ne les contredit pas.

**Panneau « Préférences » unique**
- **Un seul bouton**, atteignable **quelle que soit la position du menu**, y compris menu masqué ou en tiroir (barre d'en-tête ou de pied) ; il remplace les boutons séparés thème / contraste du pied du menu actuel ; le bouton « Réduire le menu » reste dans le menu.
- **Boîte de dialogue accessible** : focus géré, arrière-plan inerte, Échap ferme, commandes natives, **aperçu en direct**, bouton « Réinitialiser », textes en français simple.
- Regroupe : mode d'affichage, police et taille, espacements, contraste, mouvement, et (si activés par l'auteur) thème et menu.
- La **visite guidée** et le **guide** présentent le panneau (une étape dédiée, générée).

**Mémorisation : dans le navigateur seulement**
- Une seule clé versionnée (`rd_prefs`) en stockage local ; **aucune donnée n'est envoyée** (promesse « aucune donnée » conservée) ; **rien n'est écrit dans les données de reprise du LMS** (les 4096 caractères de SCORM 1.2 restent pour le suivi).
- **Limites assumées** : les préférences **ne suivent pas** l'apprenant sur un autre appareil ; si le navigateur **bloque le stockage** (navigation privée, restrictions d'un LMS intégré), les préférences ne sont conservées que **pendant la session** et un message discret le dit.
- Rappel : en cas de réglage d'accessibilité essentiel, **l'appareil** (réglages du système) reste la source la plus durable.

### 3.10 Design system : quatre couleurs de marque, le reste par défaut

**Règle** : l'auteur choisit **au maximum 4 couleurs** ; tout le reste (neutres, états, bordures, focus, ombres, typographie) vient du système par défaut.

| Rôle | Exemple d'usage | Défaut |
|---|---|---|
| **Principale** | boutons, liens, progression, focus | couleur du système |
| **Secondaire** | éléments de soutien, icônes, puces | couleur du système |
| **Accent** | appel à l'action, surlignage, point d'attention | couleur du système |
| **Encre** (texte et surfaces teintées) | titres, fonds teintés | gris-bleu neutre |

**Générées automatiquement** à partir de ces 4 couleurs (en espace perceptuel, par exemple OKLCH) : une échelle de tons, les variantes **claire et sombre**, la couleur du texte **sur** chaque couleur, les états survol / actif / désactivé.

**Jamais dérivées de la marque** : les couleurs **sémantiques** (réussite, avertissement, erreur, information) — une marque rouge ne doit pas rendre « réussi » rouge — et la couleur de focus si le contraste de la marque est insuffisant.

**Garde-fous** :
- **Contraste vérifié en direct** (WCAG 2.2 AA : 4,5:1 pour le texte, 3:1 pour les éléments d'interface) dans les **trois thèmes** et en contraste élevé ; si une paire échoue, l'éditeur **propose la teinte accessible la plus proche** et refuse l'export tant qu'elle échoue.
- Aperçu de la palette sur de vraies cartes (texte, bouton, tableau, évaluation, bilan).
- Palette **d'impression** toujours claire (leçon du PDF sombre).
- Sortie : variables CSS (`--marque-principale`…), dans une couche `@layer tokens` ; `color-scheme` déclaré ; `<meta name="darkreader-lock">` conservé.
- Typographie : **une police par rôle (titres, sous-titres, texte), 3 au plus, choisies dans un catalogue open source** avec des **jeux de polices recommandés** (lisibilité d'abord) ; fichiers embarqués, hors ligne ; ajout de polices avec contrôle de licence (voir la décision ci-dessous).

**Thèmes** : `clair` · `sombre` · `système` (suit `prefers-color-scheme`). L'auteur choisit le **défaut** (recommandé : système) et les thèmes **autorisés** ; l'apprenant bascule si l'auteur l'autorise. Le **contraste élevé** reste un réglage d'accessibilité indépendant. Le thème est appliqué **avant l'affichage** (script minimal en tête de page) pour éviter le flash clair/sombre.

#### Couleurs et polices — décision du 12 novembre 2026

Réponses de l'auteur : **4 rôles de couleur : principale, secondaire, accent, encre** · **variante accessible automatique, export bloqué si l'échec reste** · **thèmes clair et sombre générés automatiquement, réglage manuel optionnel** · **polices : une par rôle (titres, sous-titres, texte), choisies dans un catalogue open source, avec des recommandations visuelles ; lisibilité prioritaire**.

**Couleurs de marque**

| Rôle | Usage | Remarque |
|---|---|---|
| **Principale** | boutons, liens, progression, focus de marque | doit porter du texte clair ou foncé lisible |
| **Secondaire** | soutien, icônes, puces, fonds légers | |
| **Accent** | appel à l'action, surlignage, point d'attention | |
| **Encre** | titres, texte, fonds teintés (la teinte des gris) | le texte courant reste **toujours** lisible : contrôle prioritaire |

Tout le reste reste **par défaut** : neutres, états (réussite, erreur, avertissement, information), focus d'accessibilité, ombres.

**Contraste : la couleur de marque et la « teinte d'usage »**
- La **couleur de marque** choisie est conservée pour les **aplats et la décoration** (bandeaux, fonds, grandes formes).
- Pour le **texte, les boutons, les icônes porteuses de sens et les bordures de contrôle**, l'éditeur calcule une **teinte d'usage** : même teinte, **luminosité ajustée** (espace perceptuel, par exemple OKLCH) jusqu'à atteindre **4,5:1** (texte) ou **3:1** (éléments d'interface) dans chaque thème.
- L'aperçu montre **côte à côte** la couleur de marque et la teinte d'usage, avec le rapport de contraste.
- **Si une paire reste sous le seuil AA après ajustement** (par exemple une encre incompatible avec son fond), **l'export est refusé** avec l'explication et une correction proposée.

**Thèmes clair et sombre**
- **Génération automatique** de la variante claire et de la variante sombre de chaque couleur et de la couleur du texte posé dessus.
- **Réglage manuel optionnel** : l'auteur peut corriger une couleur **dans un thème précis** ; le contrôle de contraste est **recalculé** et **le blocage à l'export s'applique toujours** (le réglage manuel ne le contourne pas).
- Le contraste élevé et la palette d'impression claire restent des réglages à part, non modifiables par la marque.

**Polices : un catalogue open source, trois rôles, des recommandations visuelles** *(corrigé le 12 novembre 2026 d'après les précisions de l'auteur)*

Réponses de l'auteur : **une source de polices variées et open source** · **une police par rôle : entêtes, sous-entêtes, texte** · **à chaque fois, des choix visuels par défaut (des recommandations)** · **priorité à la lisibilité et à l'accessibilité** · **polices non libres autorisées sur déclaration du client**.

| Rôle | Où il s'applique | Remarque |
|---|---|---|
| **Titres (entêtes)** | titre de séance, titre de carte | peut être la même famille que les sous-titres |
| **Sous-titres (sous-entêtes)** | titres de blocs, intertitres, étiquettes, légendes | peut reprendre la famille des titres ou du texte |
| **Texte** | corps, tableaux, formulaires, activités, bilan | **lisibilité prioritaire** |

Un cours utilise donc **au plus 3 familles** (une par rôle) ; deux rôles peuvent partager la même famille. Il n'y a **pas de police de code** par défaut.

**La source de polices**
- Un **catalogue de polices libres** (licence ouverte, par exemple SIL OFL), **variées** : sans empattement, à empattement, arrondies, pour la lecture facile…
- Chaque fiche indique : licence, auteur, langues prises en charge (**français : accents, œ, guillemets**), poids estimé, graisses, **police variable ou non**, étiquettes de lisibilité.
- **Source des fichiers** : les polices sont **téléchargées et embarquées** (auto-hébergées), **jamais** appelées depuis un service en ligne (confidentialité, hors ligne). Un registre de paquets de polices libres auto-hébergeables est une piste à **évaluer** (par exemple Fontsource ; non vérifié ici).
- Aucune police du catalogue n'est retenue tant que sa **licence n'est pas confirmée fichier par fichier**.

**Recommandations visuelles par défaut : des « jeux de polices »**
- Pour **chaque rôle**, l'éditeur propose des **choix visuels recommandés** : on voit la police **appliquée à de vraies cartes** (titre, sous-titre, paragraphe, tableau, question) avant de choisir.
- Des **jeux de polices** prêts à l'emploi (un trio titres / sous-titres / texte), **le premier étant la recommandation par défaut** :

| Jeu | Intention | Exemples de candidats à évaluer (licences à confirmer) |
|---|---|---|
| **Lisibilité maximale** (**défaut**) | caractères bien distincts, grande hauteur d'x, pensé pour la basse vision ou la dyslexie | Atkinson Hyperlegible, Lexend |
| **Neutre et moderne** | sobre, polyvalent | Inter, Source Sans 3 |
| **Éditorial** | titres à empattement, texte sans empattement | à choisir dans le catalogue |
| **Chaleureux** | formes arrondies, ton convivial | à choisir dans le catalogue |

- L'auteur peut **changer un seul rôle** (par exemple le texte) sans quitter le jeu ; une étiquette « **Recommandé pour la lisibilité** » signale les choix prioritaires.
- **Option à décider avec la décision 14** : proposer à l'**apprenant** un réglage « police très lisible » (bascule vers le jeu *Lisibilité maximale*).

**Garde-fous de lisibilité**
- Tailles en **rem** (le zoom du navigateur est respecté) ; **taille de base d'au moins 16 px** ; interligne du corps d'environ **1,5** ; longueur de ligne raisonnable (environ 45 à 80 caractères, repère courant, à ajuster) ; pas de long texte en capitales ni en italique.
- Le texte doit rester **lisible quand l'utilisateur augmente les espacements** (WCAG 1.4.12) : test automatisé.
- **Pile de secours** : police du système derrière chaque famille ; `font-display: swap` ; aucun saut de mise en page.
- L'aperçu vérifie le **français** (accents, « œ », guillemets, espaces insécables).

**Ajouter une police en dehors du catalogue (processus, inchangé dans son principe)**
1. **Téléverser** un fichier (TTF, OTF, WOFF, WOFF2).
2. **Licence obligatoire** : nom (liste : SIL OFL, Apache 2.0, MIT, Ubuntu Font License, ITF FFL, « licence commerciale que je détiens »), auteur ou fonderie, lien, **fichier ou texte de la licence joint**. Sans licence renseignée, **pas d'export**.
3. **Contrôle automatique** : lecture des **droits d'intégration** du fichier (champ `fsType`) ; une police **interdisant l'embarquement** est refusée ; ce contrôle **n'est pas une preuve juridique**.
4. **Polices non libres : autorisées sur déclaration du client** (décision confirmée) : le client **atteste détenir le droit de l'intégrer à un cours distribué** ; clause à prévoir dans les CGU ; la police est marquée « non libre » dans l'inventaire et dans le rapport qualité.
5. **Optimisation** : conversion en **WOFF2**, **sous-ensemble de caractères** (français et latin étendu), polices variables prises en charge, poids intégré à l'alerte de poids. **À vérifier** : la clause du « nom réservé » de certaines licences libres (OFL) peut faire considérer un **sous-ensemble ou une conversion comme version modifiée**.
6. **Crédits automatiques** : nom, auteur, licence et lien dans la page Crédits et `CREDITS.txt` ; **texte de la licence inclus dans le package** quand la licence l'exige (l'OFL l'exige, d'après ma connaissance).
7. **Inventaire par espace client** : bibliothèque de polices avec leurs licences ; **responsabilité du client** pour ses polices propres.

**Restent à valider** : (a) la **source** exacte du catalogue (liste courte curée, ou registre de paquets auto-hébergeables) ; (b) les **jeux de polices par défaut**, à choisir **sur maquette** (phase 1b) avec leurs licences confirmées ; (c) la **police « très lisible » pour l'apprenant** (décision 14). Rappel : Cabinet Grotesk et Switzer (ITF Free Font License) ne sont **pas** une licence libre : ne pas les redistribuer comme polices par défaut de l'outil sans relire leur licence.

### 3.11 Structure du cours : module, séquence, séance, activité

**Besoin** : l'auteur **choisit la structure**, au lieu de subir un plan fixe.

**Définitions — décision du 12 novembre 2026** (quatre choix tranchés : séquence = conteneur léger ; évaluation = type d'activité ; activité libre de placement ; niveau de la note LMS au choix de l'auteur) :

| Niveau | Définition | Contient | Porte |
|---|---|---|---|
| **Parcours** | le cours entier, **toujours présent** | modules, séquences, séances ou activités | note globale, achèvement, bilan, attestation |
| **Module** | un grand thème | séquences, séances ou activités | bilan de module ; **par défaut** l'objectif LMS |
| **Séquence** | **conteneur léger** : suite de séances qui visent **un même objectif** | une **carte d'introduction** (objectif, durée estimée, prérequis), des séances, des activités | un **bilan de séquence calculé** automatiquement depuis ses séances (pas d'évaluation intégrée d'office) |
| **Séance** | **unité de cours** : une page de cartes, quelques minutes | cartes de contenu et activités | état « vue » (suivi), durée indicative |
| **Activité** | tâche d'apprentissage **autonome**, **placée à n'importe quel niveau** ; peut être **publiée seule** | questions, éléments, consignes | points, poids, tentatives, correction |

**Types d'activité** : `evaluation` (**notée** : compte dans la note, tentatives, meilleure conservée, « Voir les réponses » sans note — c'est l'auto-évaluation actuelle), `quiz` (entraînement : corrigé immédiat, non noté), `tri`, `appariement`, `texte-a-trous`, `vrai-faux`, `sequence`, `atelier` (greffon), etc. **L'évaluation n'est donc pas un niveau** : une évaluation finale de séquence ou de module s'obtient en **plaçant une activité `evaluation` à ce niveau**.

**Qui peut contenir qui** :

| Contenant | Peut contenir |
|---|---|
| Parcours | module, séquence, séance, activité |
| Module | séquence, séance, activité |
| Séquence | séance, activité |
| Séance | activité (et cartes de contenu) |
| Activité | rien |

Un niveau intermédiaire est **optionnel** (on peut sauter la séquence ou le module), la **séance** étant le niveau de contenu. Les activités peuvent donc se trouver au même rang que des séances.

**Dans Intelligentsia** : preset « Module » : 3 modules × 3 séances ; la « séquence » n'existe pas (ou se confond avec la liste des séances d'un module) ; l'atelier est une activité `atelier` ou `tri`, l'auto-évaluation une activité `evaluation` de la séance.

**Niveau de la note et de l'objectif LMS** : **au choix de l'auteur** (`notation.niveauObjectif`). Par défaut, le plus haut niveau sous le parcours (le module dans Intelligentsia). L'auteur peut choisir la séquence ou la séance. Si le niveau choisi n'existe pas dans la structure, on remonte au niveau le plus proche au-dessus. **Point à vérifier** : le nombre d'objectifs acceptés par un LMS (beaucoup d'objectifs avec « une par séance ») ; non vérifié.

**Achèvement** : un niveau est « terminé » quand tous ses enfants suivis le sont ; le bilan de séquence et de module est calculé depuis les activités notées qu'ils contiennent.

**Presets** (l'auteur peut en changer à tout moment, avec conversion guidée) :

| Preset | Niveaux utilisés | Pour |
|---|---|---|
| **Activité seule** | activité | un quiz ou un exercice en ligne |
| **Séance simple** | séance → activités | une leçon courte |
| **Cours** | séances (+ activités) | cours sans module |
| **Module** | module → séances → activités | le cas d'Intelligentsia |
| **Complet** | module → séquence → séance → activité | formation longue |

**Personnalisation** : libellés renommables (« chapitre », « leçon », « atelier »…), numérotation automatique, niveaux optionnels, couleur ou icône par niveau.

**Modèle** : un arbre générique, validé par règles (quel niveau peut contenir lequel).

```jsonc
"structure": { "niveaux": ["module", "sequence", "seance", "activite"],
               "libelles": { "module": "Module", "sequence": "Séquence", "seance": "Séance", "activite": "Activité" } },
"arbre": [ { "niveau": "module", "id": "m1", "titre": "…", "enfants": [
    { "niveau": "sequence", "id": "m1-q1", "titre": "…",
      "introduction": { "objectif": "…", "dureeMinutes": 30, "prerequis": [ … ] },     // la carte d'introduction
      "enfants": [
        { "niveau": "seance", "id": "m1-s1", "suivi": true, "cartes": [ /* § 3.5 */ ],
          "activites": [ { "type": "tri",        "id": "m1-s1-a1", "notee": false, "…": "…" },
                         { "type": "evaluation", "id": "m1-s1-a2", "notee": true, "points": 4, "questions": [ … ] } ] },
        { "type": "evaluation", "id": "m1-q1-final", "notee": true, "points": 10, "questions": [ … ] }   // activité placée au niveau de la séquence
      ] } ] } ]
```

Règles : un nœud a un identifiant **stable** (il devient l'identifiant SCORM et xAPI ; format `m1`, `m1-q1`, `m1-s1`, `m1-s1-a2`, et `<activité>-q<n>` pour les questions) ; **supprimer un niveau déplace les enfants, ne les perd pas** ; le menu, le bilan, le glossaire, la visite guidée et le suivi sont **générés** depuis l'arbre ; un **validateur de structure** vérifie qui contient qui, l'unicité des identifiants et l'existence du niveau de la note LMS.

**Compatibilité avec le cours actuel** : les identifiants `m1-s1`… des évaluations d'Intelligentsia sont conservés (ils deviennent les identifiants des activités `evaluation`) pour que les rapports LMS restent comparables.

**Lien avec les SCO** : voir § 3.12 (granularité). Le choix de structure ne change pas à lui seul le nombre de SCO.

### 3.12 Notation et standards de suivi : SCORM 1.2, SCORM 2004, xAPI…

**Principe** : le cours ne parle **jamais** directement au LMS. Il appelle un **port de suivi** abstrait ; un **adaptateur par standard** traduit vers les éléments `cmi.*` (ou les énoncés xAPI). Le code actuel (`scorm.js`, 1.2 seulement) devient l'adaptateur SCORM 1.2.

```
 Cours (notes, statuts, interactions, objectifs, reprise)
        │  Port de suivi : initialiser, noter, achever, réussir, interagir, enregistrer l'état, quitter
        ├── Adaptateur SCORM 1.2   → cmi.core.*, cmi.interactions, cmi.objectives
        ├── Adaptateur SCORM 2004  → cmi.score.*, cmi.completion_status, cmi.success_status…
        ├── Adaptateur xAPI / cmi5 → énoncés vers un LRS
        └── Adaptateur local       → navigateur (démo web, aperçu)
```

#### Moteur de notation (indépendant du standard)

| Réglage | Options |
|---|---|
| Échelle | par défaut 0–100 ; points bruts conservés |
| Points et poids | par question, par activité, par séance, par module |
| Agrégation | somme pondérée · moyenne · **meilleure tentative** (actuel) · dernière |
| Tentatives | nombre maximal, nouvelle tentative, conservation de la meilleure |
| **Seuil de réussite** | global, et par module ou séance si besoin (70 % par défaut) |
| **Règle d'achèvement** | tout vu (actuel) · pourcentage vu · activités précises faites · durée minimale |
| **Règle de réussite** | seuil atteint · seuil **et** achèvement · toutes les activités notées faites (actuel) |
| Correction | immédiate · en fin de séance · jamais ; « Voir les réponses » sans note (actuel) |
| Mode révision | rien n'est enregistré (déjà géré) |

#### Correspondance des concepts (à valider dans chaque LMS)

| Concept interne | SCORM 1.2 | SCORM 2004 (3e / 4e éd.) | xAPI |
|---|---|---|---|
| Lancement | `LMSInitialize` | `Initialize` (objet `API_1484_11`) | lancement avec point d'accès LRS (ou cmi5) |
| Achèvement | `cmi.core.lesson_status` (`completed`) | `cmi.completion_status` | verbe `completed`, `result.completion` |
| Réussite | `lesson_status` (`passed` / `failed`) | `cmi.success_status` | verbes `passed` / `failed`, `result.success` |
| Note | `cmi.core.score.raw/min/max` | `cmi.score.scaled` (−1 à 1), `raw`, `min`, `max` | `result.score` (`scaled`, `raw`, `min`, `max`) |
| Seuil | `adlcp:masteryscore` (manifeste), `cmi.student_data.mastery_score` | `cmi.scaled_passing_score` (manifeste : `imsss`) | dans l'énoncé ou la définition de l'activité |
| Progression | — | `cmi.progress_measure`, `cmi.completion_threshold` | `result.extensions` ou profil cmi5 |
| Reprise | `cmi.suspend_data` (4096), `cmi.core.lesson_location`, `cmi.core.exit` | `cmi.suspend_data` (limite plus large ; à confirmer dans la spécification), `cmi.location`, `cmi.exit` | état de l'activité (`State API`) |
| Interaction | `cmi.interactions.n.*` (écriture seule) | `cmi.interactions.n.*` (`learner_response`, `timestamp`, `description`, types supplémentaires) | énoncé `answered` avec `result.response` |
| Objectif | `cmi.objectives.n.*` | `cmi.objectives.n.*` (`score`, `success_status`, `completion_status`) | énoncé par objectif ou groupe |
| Durée | `cmi.core.session_time` (`HH:MM:SS`) | `cmi.session_time` (format ISO 8601 durée) | `result.duration` (ISO 8601) |
| Sortie | `LMSFinish` | `Terminate` | énoncé `terminated` |
| Séquencement | prérequis simples (`adlcp:prerequisites`) | **séquencement et navigation** (`imsss`, `adlnav`) | via cmi5 (règles de lancement) |
| Identité de l'apprenant | `cmi.core.student_name` | `cmi.learner_name` | `actor` (nom, identifiant) |

**Normalisation interne** : note en **ratio 0–1** + points bruts ; l'adaptateur 1.2 écrit `raw` en pourcentage ; l'adaptateur 2004 écrit `scaled` ; l'adaptateur xAPI écrit `scaled` et `raw`. **Statuts internes séparés** (achèvement : non commencé / en cours / terminé ; réussite : inconnue / réussi / échoué) ; en 1.2, ils sont **fusionnés** dans `lesson_status` selon une règle configurable, avec un défaut sûr (celui du cours actuel, validé dans SCORM Cloud).

#### Granularité : combien de SCO ?

| Option | Avantage | Limite |
|---|---|---|
| **Un SCO pour tout le cours** (actuel, défaut) | bilan global, reprise, glossaire, notes cohérents ; fonctionne partout | une seule note remontée (plus des objectifs par module) |
| **Un SCO par module** | notes par module dans le carnet du LMS | le bilan global et le glossaire doivent être gérés à part |
| **Un SCO par séance** | notes et statuts par séance natifs | les SCO ne partagent pas leurs données en 1.2 : bilan global, reprise globale et visite guidée à repenser ; comportement variable selon la plateforme |

**Décision du 12 novembre 2026** (trois choix tranchés) :
1. **Défaut : un seul SCO par cours**, avec un **objectif par module** (acquis, validé dans SCORM Cloud).
2. **Option V2 : un SCO par module** seulement. **Pas de SCO par séance** (réservé, non planifié) : trop de cas particuliers et de perte de fonctions.
3. **Si un client exige des notes natives par module : cas par cas, après test dans sa plateforme.**

**Pourquoi la contrainte est forte** (d'après ma connaissance des spécifications ; non vérifié dans Moodle ni 360Learning) :
- en **SCORM 1.2**, un SCO ne peut ni lancer un autre SCO ni lire ses données : la navigation entre SCO appartient **au LMS** ;
- le **menu latéral, le bilan global, le glossaire commun et la visite guidée** n'existent donc **qu'à l'intérieur d'un SCO** ;
- en **SCORM 2004**, des mécanismes de partage de données et de demandes de navigation existent, mais leur prise en charge varie selon les plateformes : **rien n'est présumé** avant des tests.

**Ce que fait le mode « un SCO par module »** (V2) :

| Sujet | Comportement prévu |
|---|---|
| Manifeste | un `item` et une ressource-SCO **par module**, `adlcp:masteryscore` par item ; les fichiers communs (runtime, styles, médias) dans une **ressource partagée** référencée par `dependency` (pas de duplication) |
| Menu | limité aux séances **du module** ; pas de lien vers les autres modules ; le « module suivant » est rappelé au stagiaire mais **ouvert par le LMS** |
| Bilan et attestation | **bilan de module** ; attestation de module ; la **note globale** du cours est calculée par le LMS selon ses propres règles |
| Glossaire, liens, mentions | **copiés dans chaque SCO** (choix par défaut ; un SCO « ressources » séparé reste possible, à décider au moment de la V2) |
| Visite guidée | adaptée à un module ; aucune étape qui suppose les autres modules |
| Reprise et `suspend_data` | **par SCO** (nativement géré par le LMS) ; une seule limite de 4096 par module |
| Identifiants d'interaction | préfixés par le module (déjà le cas : `m1-s1-q1`) |
| Objectifs | un objectif par séance ou par séquence **dans** le SCO (pas d'objectif « module » redondant) |

**Procédure « cas par cas » quand un client demande des notes par module :**
1. Exporter un cours en **un SCO + objectifs par module** et l'importer dans **la plateforme du client** (ou une instance de test équivalente).
2. Regarder **ce que le carnet de notes et les rapports affichent** : la note globale, les objectifs, les interactions.
3. Si cela suffit : on livre ainsi. Sinon, on propose l'export **un SCO par module** en **expliquant ce qui change** (menu et bilan limités à chaque module, attestation par module).
4. On consigne le résultat dans la **matrice de compatibilité** (plateforme × fonction × découpage).
5. Rien n'est promis au client avant l'étape 2.

#### Exports par standard

| Export | Manifeste | Remarques |
|---|---|---|
| **SCORM 1.2** | `imsmanifest.xml` (IMS CP 1.1.2 + ADL 1.2) | validé dans SCORM Cloud |
| **SCORM 2004** | `imsmanifest.xml` (4e édition : `adlcp`, `adlseq`, `adlnav`, `imsss` si séquencement) | nouvel adaptateur et manifeste ; à tester dans SCORM Cloud |
| **xAPI** | `tincan.xml` (paquet xAPI) | exige un **LRS** ; énoncés avec acteur identifié |
| **cmi5** | `cmi5.xml` | profil xAPI pour lancement par un LMS ; plus strict, mieux défini |
| **Web statique** | aucun | suivi local seulement ; xAPI en option |
| **Plus tard** | LTI 1.3 + retour de notes (Moodle, Canvas…) · AICC (hérité) · H5P | à étudier selon les demandes clients |

#### Standards visés — décision du 12 novembre 2026

Réponses de l'auteur : **SCORM 2004 en premier** ; à terme **xAPI, cmi5, LTI 1.3 et AICC** ; **LRS fourni par le client ou par R.D FORMATION** ; plateformes : **Moodle, 360Learning, Open edX / MOOC et autres**.

| Rang | Standard | Besoin d'un serveur ? | Phase | Remarques |
|---|---|---|---|---|
| 0 | **SCORM 1.2** | Non (package statique) | fait, repris en phase 1 | validé dans SCORM Cloud |
| 1 | **SCORM 2004** (3e / 4e éd.) | Non | **2b** | adaptateur + manifeste + faux LMS 2004 |
| 2 | **xAPI** | **Un LRS** (celui du client, ou le nôtre) ; le cours l'appelle en HTTP (autorisations CORS à prévoir) | **2c** | option désactivée par défaut ; énoncés avec acteur |
| 3 | **cmi5** | Non pour le cours (le LMS fournit l'adresse du LRS et un jeton au lancement) ; LRS côté LMS | **2c** | `cmi5.xml`, une activité de lancement ; plus strict que xAPI seul |
| 4 | **LTI 1.3** (+ retour de notes) | **Oui** : service de lancement (OIDC, JWT, clés) | **V2 (phase 6)** | pour publier une **activité en ligne** dans Moodle, Canvas…, avec note dans le carnet ; ne se fait pas avec un package statique |
| 5 | **AICC** (hérité) | **Oui** : point d'accès HTTP (HACP) pour les échanges avec le LMS | **phase 7, à la demande** | ancien standard ; fichiers de description spécifiques ; à n'implémenter que sur demande ferme d'un client |

**Ordre retenu et pourquoi** : on avance du **statique** (1.2, 2004) vers le **dynamique** (xAPI, cmi5) puis vers ce qui **exige un serveur** (LTI, AICC). Les deux derniers ne peuvent pas exister avant la phase 6 (comptes et serveur) ; AICC n'est pas planifié tant qu'aucun client ne l'exige.

**LRS : deux options, en deux temps.**

| Option | Quand | Ce que ça implique |
|---|---|---|
| **LRS du client** | dès la phase 2c | l'éditeur demande l'adresse du LRS et le mode d'authentification (ou les récupère au lancement avec cmi5) ; aucune donnée d'apprenant ne passe par R.D FORMATION ; **responsabilité du client** |
| **LRS hébergé par R.D FORMATION** | phase 6 ou 7, **après** les comptes | un service à exploiter : hébergement UE, **contrat de sous-traitance (RGPD)**, durée de conservation, accès, export et suppression, sauvegardes, support, supervision. Candidats à évaluer : LRS libres du marché (non comparés ici) |

L'auteur choisit **par cours** : pas de suivi xAPI (défaut) · LRS du client · LRS R.D FORMATION. Les **mentions** du cours sont générées selon ce choix.

**Plateformes visées et plan de vérification** (aucun support n'est présumé acquis) :

| Plateforme | À vérifier | Moyen |
|---|---|---|
| **Moodle** | SCORM 1.2 et 2004 : import, carnet de notes, reprise, mode révision, un ou plusieurs SCO ; xAPI/cmi5 : disponibilité éventuelle par extension ; LTI 1.3 | instance de test Moodle |
| **360Learning** | formats acceptés (SCORM 1.2, 2004, xAPI), score, statut, limites de taille | compte de test ou compte client |
| **Open edX / MOOC** | le support SCORM dépend de la plateforme (souvent un composant ajouté) ; xAPI | environnement de test du client |
| **Autres** (Docebo, TalentLMS, Cornerstone…) | on s'appuie sur la **conformité aux standards** et sur SCORM Cloud comme référence | SCORM Cloud + test chez le client |

Livrable : une **matrice de compatibilité** (standard × plateforme × fonction : import, statut, note, reprise, interactions, objectifs, mode révision) publiée aux clients et tenue à jour à chaque version.

#### Précautions

- **xAPI = données personnelles** : un énoncé identifie l'apprenant. L'option est **désactivée par défaut**, demande un **LRS** et une **information claire** de l'apprenant ; le texte des mentions se **génère** selon les standards activés. Cela contredit la promesse actuelle « aucune donnée » : elle ne vaut que sans xAPI (en SCORM, les données vont à la plateforme du client).
- **Limites par standard** (255, 4096 en 1.2 ; autres limites en 2004) : le simulateur de LMS les applique **par standard**.
- **Tests** : un faux LMS **par standard** (API 1.2, API 2004, LRS factice) en test automatique ; SCORM Cloud pour les validations réelles (il accepte aussi SCORM 2004 et xAPI/cmi5 — à confirmer dans votre compte) ; plateformes des clients ensuite.
- **Vérité d'abord** : chaque correspondance du tableau est **à valider** par un rapport de LMS avant d'être annoncée comme prise en charge.

### 3.13 Projet « Logiciel SCORM » : dépôt, outillage et conventions

**Nom de travail : « Logiciel SCORM »** (dossier `Desktop\Logiciel_scorm`). La **marque définitive** reste à choisir **avant la première livraison à un client** (vérifier la disponibilité du nom et du nom de domaine ; les démarches de marque sont à confier à un professionnel).

**À l'ouverture du dossier** (le projet existe déjà : **ne rien écraser**) :
1. **Inventorier** ce qu'il contient (fichiers, dépendances, éventuel dépôt git) et le **résumer** avant toute modification.
2. **Décider avec l'auteur** de ce qui est conservé, déplacé ou remplacé ; rien n'est supprimé sans accord explicite.
3. Copier dans le dossier **la documentation de départ** : `docs/ROADMAP-EDITEUR.md`, `docs/SPEC-editeur-scorm.md`, le kit `SCORM-skill/` (skills et agents), le catalogue d'erreurs.
4. Mettre le **code du cours actuel** (« Intelligentsia ») à disposition **en lecture seule** comme **référence** (par exemple un dossier `reference/intelligentsia/`, ou un dépôt séparé) : le runtime en est **extrait**, pas recopié en vrac. Le cours actuel ne sert **pas** de dépendance.

**Outillage (recommandations, à confirmer)**

| Sujet | Recommandation | Remarque |
|---|---|---|
| Gestion de versions | **git dès le premier jour** ; branche principale protégée ; petits commits | le cours actuel **n'est pas** sous git : aucun historique à reprendre |
| Dépôt distant | **GitHub, dépôt privé** (décision du 12/11/2026) | sauvegarde et historique ; ne jamais y déposer de secrets ; vérifier l'authentification à deux facteurs et les droits d'accès |
| Monorepo | **npm workspaces** (déjà familier) ; pnpm possible plus tard | `packages/` et `apps/` (§ 4) |
| Langage et qualité | TypeScript **strict**, ESLint, Prettier, Vitest, Playwright | un « pré-commit » qui lance types et tests rapides |
| Intégration continue | à chaque envoi : types, tests unitaires, build, **faux LMS**, captures de référence | pas de déploiement sans tests verts |
| Journal des changements | notes de version par version (éditeur, runtime, schéma) | lues par les clients |
| Secrets | jamais dans le dépôt ; variables d'environnement | clés Supabase, Stripe, Bunny |
| Licence du dépôt | **à décider** (propriétaire pour l'éditeur ; **moteur sous licence d'usage** ; cours exemple en CC BY) | alignée avec § 3.8 ; à valider par un juriste |
| Sauvegarde | dépôt distant + copie datée du dossier de projet | |

**Définition de « prêt à démarrer »** (à cocher avant la phase 0) :
- [x] décisions 2, 3 et 5 tranchées (§ 10) ;
- [ ] dossier `Logiciel_scorm` inventorié, dépôt git initialisé, dépôt distant GitHub **privé** créé ;
- [ ] documentation de départ copiée, référence Intelligentsia accessible ;
- [ ] version de Node et gestionnaire de paquets fixés (fichier `.nvmrc` et champ `engines`) ;
- [ ] premier test automatisé qui passe (le faux LMS de `SCORM-skill/templates`).

### 3.14 Versions du runtime et compatibilité des cours exportés

Un cours exporté **embarque une copie du runtime** : il doit continuer à fonctionner **sans l'éditeur**, des années après.

| Sujet | Règle |
|---|---|
| **Numéros de version** | **runtime**, **schéma du cours** (`schemaVersion`) et **éditeur** ont chacun un numéro (SemVer) ; l'export inscrit les trois dans `course.js` et dans les métadonnées du manifeste |
| **Un export est un instantané** | jamais mis à jour automatiquement ; le client garde le comportement validé dans sa plateforme |
| **Ré-export** | bouton « Mettre à jour avec le dernier moteur » avec **liste des changements** et comparaison ; le client décide |
| **Anciens cours** | l'éditeur **ouvre** les projets de schéma ancien par **migration automatique** (sauvegarde avant migration) ; au moins **la version précédente** est supportée |
| **Correctifs de sécurité ou de conformité** | **avertir** les espaces concernés qu'un ré-export est recommandé |
| **Épinglage** | un projet peut **épingler** une version du runtime (utile quand un client a validé une version dans son LMS) |
| **Tests** | un **jeu de cours de référence par version** (fichiers « or ») comparé à chaque changement : rendu, notes, statuts, interactions, objectifs |
| **PWA** | mise à jour de l'éditeur avec **invite de rechargement** ; migration des données locales avec **copie de secours** |

### 3.15 Importer, convertir, démarrer d'un contenu existant

| Besoin | Décision proposée |
|---|---|
| **Convertir Intelligentsia** en modèle | **Phase 0** : conversion **manuelle puis par script** (HTML et fichiers de données → `course.json`) ; sert de test de référence |
| **Rouvrir un projet** de l'éditeur | fichier `.rdcourse` (zip du modèle et des médias) : MVP |
| **Importer un package SCORM d'un autre outil** | **non prévu** : le HTML libre d'un autre outil ne se convertit pas de façon fiable ; à n'étudier que sur demande ferme |
| **Importer du texte** (Word, Markdown, PDF) pour pré-remplir un cours | idée à **étudier** (V2) ; toujours **relu et réécrit** par l'auteur (droit d'auteur) |
| **Cours exemple** | Intelligentsia fourni comme **modèle** (licence CC BY) |

### 3.16 Infrastructure, documentation et exploitation

- **Services à prévoir** : hébergement statique (OVH ou Vercel), Supabase (comptes, base, stockage), Bunny Stream (vidéos), Stripe (facturation), nom de domaine, courriels transactionnels, supervision des erreurs **de l'éditeur** (jamais de donnée d'apprenant), sauvegardes. **Les coûts ne sont pas estimés ici** : à chiffrer en phases 5b et 6, avant de fixer les tarifs (§ 3.8).
- **Documentation** : aide intégrée à l'éditeur (visite guidée de l'éditeur), documentation auteur, notes de version, guide client, cours exemple.
- **Support** : canal et délais de réponse définis avant le premier client payant ; export de diagnostic (version, erreurs, structure du cours sans contenu personnel).
- **Observabilité** : journal des erreurs de l'éditeur **avec consentement** ; aucune télémétrie dans les cours exportés.

## 4. Architecture cible

```
┌──────────────────────── Éditeur (PWA) ─────────────────────────┐
│  Arbre du cours │ Éditeur de carte │ Éditeur d'évaluation │ …    │
│        └──────────── modèle (course.json, Zod) ───────────┘     │
│   Stockage local : IndexedDB + dossier/fichier   ⇄  Cloud (opt.) │
└───────────────┬──────────────────────────────┬──────────────────┘
        Aperçu direct                     Exporteurs
   (runtime + simulateur LMS)   SCORM 1.2 │ SCORM 2004 │ Web │ PDF
                │                              │
                └────────────  RUNTIME  ───────┘   ← issu du cours actuel
          shell · modes Lecture/Diaporama · quiz · bilan · glossaire
          visite guidée (Driver.js) · scorm.js · notes · sortie/reprise
```

### Dépôt cible (monorepo)

```
editeur/
  packages/
    model/        schéma Zod, types, migrations, validateurs
    runtime/      lecteur : shell, steps, quiz, bilan, glossaire, tour, scorm
    exporters/    scorm12, scorm2004, web, print (zip dans le navigateur)
    simulateur/   faux LMS (API, review/no-credit, erreurs), analyse de rapport
    media/        bibliothèque d'assets, Workers (images, audio, WebVTT), OPFS
    blocs/        catalogue de blocs, grille, poignées, inspecteur (partagé éditeur / runtime)
  apps/
    editeur/      interface (React) : arbre, blocs, évaluations, réglages, aperçu
  fixtures/       course.json de référence (Intelligentsia) + rapports SCORM Cloud attendus
  docs/
```

### Ce qui se réutilise du projet actuel

| Actuel | Devient | Travail |
|---|---|---|
| `src/js/scorm.js`, `notes.js`, `exit.js` | `runtime` (suivi) | Reprise presque telle quelle (déjà testée par faux LMS) |
| `src/js/shell.js`, `parcours.js` | `runtime` (menu, reprise) | `PARCOURS` généré depuis l'arbre ; **menu à 5 positions et 4 styles** (§ 3.9) |
| `src/js/scorm.js`, `notes.js` | `runtime` : **port de suivi + adaptateurs** | Devient l'adaptateur SCORM 1.2 ; ajouter SCORM 2004, xAPI, cmi5, local (§ 3.12) |
| `src/js/steps.js` (Lecture/Diaporama) | `runtime` | Peu de changement |
| `src/js/quiz.js`, `evaluations.js` | `runtime` + `model` | Les questions viennent du modèle |
| `src/js/bilan.js`, `glossaire*.js` | `runtime` | Données du modèle |
| `src/js/tour*.js` | `runtime` | Étapes **générées** depuis la structure ; côté des bulles **calculé d'après la position du menu** |
| `src/js/activites/*.js` | **greffons d'activité** | Interface de greffon à définir (phase 4) |
| `tools/scorm-pack.mjs` | `exporters/scorm12` | Passe dans le navigateur, manifeste depuis le modèle |
| `src/css/**` | `runtime` (jetons, composants) | Reprise ; **4 couleurs de marque → jetons générés**, thèmes clair / sombre / système, disposition par `data-nav` (§ 3.9, 3.10) |
| `src/editor/*`, `tools/editor-plugin.js` | **abandonnés** | Prototype par décalages HTML, remplacé |
| `SCORM-skill/` | guide de développement et de test | Agents et listes de contrôle réutilisés |

## 5. Fonctionnalités par priorité

**MVP** (recréer Intelligentsia, avec une vraie composition de blocs) :
- arbre du parcours (ajouter, renommer, déplacer) ;
- **éditeur de cartes en grille 12 colonnes** : ajouter, déplacer, **redimensionner** (poignées aimantées, 1/3 · 1/2 · 2/3 · pleine largeur), dupliquer, supprimer, inspecteur (largeur, alignement du texte, espacement) ;
- **zone libre et calques** (blocs de tout type positionnés librement dans un cadre, calque d'arrière-plan, repli automatique sur petit écran, garde-fous d'accessibilité) ;
- blocs : texte riche, titre, liste, tableau, encadré, objectifs, comparaison, étapes, **image** (recadrage, WebP, alt obligatoire), **audio** (import + transcription), **vidéo** (fichier ou lien externe + sous-titres) ;
- éditeur d'évaluation (choix unique, multiple, nombre, texte ; `why` ; seuil) ; activité de tri ;
- glossaire ; réglages (seuil, licence, crédits) ; bibliothèque de médias ;
- **navigation** : 5 positions (gauche, droite, haut, bas, masquée) et 4 styles (flottante, collée, rail, tiroir) ;
- **préférences de l'apprenant** : panneau unique, mode Lecture / Diaporama, police très lisible, taille et espacements du texte, contraste élevé, mouvement réduit ; thème et menu activables par l'auteur ; mémorisation dans le navigateur ;
- **design system** : 4 couleurs de marque maximum, jetons générés, contraste vérifié ; thèmes clair / sombre / système ;
- **structure au choix** : presets (activité seule, séance, cours, module, complet), niveaux module · séquence · séance · activité, libellés renommables ;
- **notation** : seuil, agrégation, tentatives, règles d'achèvement et de réussite ; **port de suivi** avec adaptateur SCORM 1.2 ;
- aperçu Lecture / Diaporama et par taille d'écran ; export SCORM 1.2 ; sauvegarde locale ; annuler/rétablir.

**V1** : **SCORM 2004** (adaptateur, manifeste, simulateur) · **xAPI et cmi5** (LRS du client, option désactivée par défaut) · notation par module / séance · activités supplémentaires (appariement, texte à trous, vrai/faux, séquence, cartes mémoire) · galerie, blocs réutilisables, modèles de carte · enregistrement audio au micro · découpe audio · **compression vidéo optionnelle dans le navigateur** (Worker, chargée à la demande, après vérification des licences) · simulateur de LMS · validateurs (accessibilité, alt, transcriptions, contraste, poids du package, taille de `suspend_data`) · visite guidée générée · export web statique et PDF · import/export d'un projet · banque de questions et tirage aléatoire · thèmes aux couleurs du client (jetons).

**V2** : comptes, espaces clients, rôles et sauvegarde en ligne · versions · publication hébergée et partage · **activité seule publiée (lien, iframe) avec suivi xAPI optionnel** · **export « un SCO par module »** (option, après tests chez le client ; pas de SCO par séance) · **LTI 1.3** et **LRS hébergé par R.D FORMATION** (exigent un serveur) · matrice de compatibilité Moodle / 360Learning / Open edX · SCORM Cloud (import guidé) · enregistrement d'écran/caméra · emballage Tauri · multilingue · facturation.

**Plus tard (à confirmer)** : xAPI pour les activités en ligne hors LMS · import/export H5P · collaboration à plusieurs · greffons tiers.

## 6. Local et en ligne : trois modes, un même code

| Mode | Comment | Données | Compte |
|---|---|---|---|
| **Local** | `npm run dev` ou fichiers statiques servis localement ; **PWA installable** ; projet dans un dossier (File System Access) ou fichier `.rdcourse` | Sur l'appareil | Non |
| **En ligne simple** | L'éditeur hébergé en statique (OVH / Vercel) ; mêmes données locales | Sur l'appareil | Non |
| **En ligne avec sauvegarde** | Même éditeur + Supabase : synchronisation, versions, partage, publication | Base UE, chiffrée en transit | Oui (auteur) |
| **Espace client** | Un espace par client : rôles, marque, modèles, relecture, facturation (voir § 3.8) | Base UE, isolée par espace | Oui (équipe du client) |

Points d'attention :
- `file://` **bloque** les modules ES et `fetch` : on ne double-clique pas l'éditeur ; on utilise un serveur local ou la PWA installée. Le **cours exporté** fonctionne, lui, hors serveur (`course.js` au lieu d'un `fetch`).
- File System Access API : Chrome et Edge seulement. Repli : import/export de fichier `.rdcourse`.
- Les cours **apprenants** restent sans donnée ni cookie (promesse actuelle) ; seul l'espace **auteur** peut avoir un compte.

## 7. Feuille de route par phases

Tailles : **S** ≈ 1 semaine · **M** ≈ 2–4 semaines · **L** ≈ 1–2 mois · **XL** > 2 mois (travail d'un seul développeur, avec assistance ; à recalibrer).

| Phase | Objectif | Livrables | Critère d'acceptation | Taille |
|---|---|---|---|---|
| **0 · Fondations** | Figer les décisions | ADR (§ 3), **dépôt monorepo dans `Logiciel_scorm`** (git, outillage, conventions : § 3.13), schéma `course.json` v1, **`fixtures/intelligentsia.json` écrit à la main** | Le schéma valide la fixture ; les 9 évaluations et le glossaire y sont | S |
| **1 · Runtime piloté par le modèle** | Le lecteur rend un cours depuis `course.json` | `runtime` extrait du code actuel ; **arbre générique** (module / séquence / séance / activité) ; rendu des cartes, modes, quiz, bilan, glossaire, visite ; **port de suivi + adaptateur SCORM 1.2** | Rendu **identique** au cours actuel (captures comparées) ; faux LMS vert ; **rapport SCORM Cloud équivalent** | L |
| **1b · Navigation et design system** | Menu positionnable et stylable ; marque ; thèmes | Disposition `data-nav` (gauche, droite, haut, bas, masquée) ; styles flottante, collée, rail, tiroir ; **4 couleurs → jetons générés** ; thèmes clair / sombre / système ; vérificateur de contraste et **teinte d'usage accessible** ; **catalogue de polices open source (une par rôle : titres, sous-titres, texte) et jeux de polices recommandés, choisis sur maquette** ; **panneau « Préférences » unique** (mode d'affichage, police très lisible, taille et espacements, contraste, mouvement ; thème et menu si activés) ; visite guidée adaptée à la position | Les 5 positions × 4 styles × 3 thèmes sont lisibles et utilisables **au clavier** ; mobile ; RTL ; impression claire ; aucun contraste sous AA | M |
| **2 · Exporteurs** | Produire les livrables sans l'éditeur | Export SCORM 1.2 (zip dans le navigateur et en ligne de commande), site web statique, PDF | Le zip s'importe dans SCORM Cloud ; manifeste conforme ; aucun chemin absolu | M |
| **2b · SCORM 2004** | Second standard de suivi | Adaptateur SCORM 2004 ; manifeste 2004 (`imsmanifest.xml`, `adlcp`, `adlseq`, `adlnav`) ; faux LMS 2004 ; moteur de notation configurable ; statuts séparés | Un même cours exporté en 1.2 et en 2004 donne **les mêmes notes et statuts** dans SCORM Cloud ; limites 2004 respectées ; tests Moodle | L |
| **2c · xAPI et cmi5** | Suivi par énoncés | Adaptateur xAPI (LRS du client, authentification, CORS) ; paquet `tincan.xml` ; export cmi5 (`cmi5.xml`) ; énoncés `initialized` / `completed` / `passed` / `failed` / `answered` / `terminated` ; mentions générées ; LRS factice de test | Énoncés valides reçus par un LRS de test **et** un cours cmi5 lancé par un LMS compatible ; option **désactivée par défaut** ; aucune donnée sans activation | L |
| **3a · Moteur de blocs et calques** | Composer en grille **et** en calques | Grille 12 colonnes dans le runtime et l'éditeur ; ajouter, déplacer, **redimensionner**, dupliquer, supprimer ; **zone libre et calque d'arrière-plan** ; ordre de lecture ; repli dans le flux ; inspecteur ; annuler/rétablir par patchs ; clavier complet ; aperçu par taille d'écran | On refait une carte d'Intelligentsia (texte + image + tableau + comparaison) **à la souris et au clavier** ; on refait une carte avec **image derrière le texte et une activité dans une zone libre** ; **zoom 200 % et 320 px sans perte** ; ordre de tabulation conforme ; aucune latence perceptible | **XL** |
| **3b · Éditeur MVP** | Créer et modifier un cours | Arbre du parcours, éditeur d'évaluation, réglages, glossaire, aperçu Lecture/Diaporama, sauvegarde locale | **Refaire un module (3 séances) depuis l'éditeur**, l'exporter, obtenir le même rapport dans SCORM Cloud | L |
| **4a · Médias** | Images, audio, vidéo | Bibliothèque d'assets (OPFS), recadrage et WebP en Worker, audio (import, micro), vidéo (**externe par défaut**, fichier pour les petites ; connecteur Bunny Stream), sous-titres WebVTT, transcriptions **bloquantes avec exception justifiée**, licence et crédit par asset, **alerte de poids à 50 Mo** avec liste des plus gros fichiers, liste des médias externes à l'export | Un cours avec image, audio et vidéo s'exporte, **s'importe dans SCORM Cloud et se lit au clavier** ; sous-titres/transcriptions exigés ; poids affiché et alerte ; vidéo externe testée dans SCORM Cloud (et dans une plateforme cliente si elle bloque les contenus externes) | L |
| **4b · Activités** | Créer des activités variées | Greffons : tri, appariement, texte à trous, vrai/faux, séquence, cartes ; interface de greffon ; activité seule exportable | Chaque activité : clavier, lecteur d'écran, solution accessible, interactions LMS valides | L |
| **5 · Qualité intégrée** | Empêcher les erreurs connues | Simulateur de LMS, validateurs, estimation de `suspend_data`, visite générée, rappels de licence, **tests de charge** | Les 42 erreurs du catalogue ont un contrôle automatique ou une règle du runtime ; objectifs de performance du § 3.7 mesurés | M |
| **5b · Première livraison client** | Prêt à confier à un client | Licences vérifiées (GSAP, polices), **licence d'usage du moteur et contrat client**, mention « Créé avec », CGU et politique de confidentialité relues par un juriste, matrice de compatibilité LMS, guide d'aide intégré | Un client réel crée et exporte un cours sans aide ; import validé dans **sa** plateforme | M |
| **6 · En ligne et espaces clients** | Comptes, partage, équipes | Auth, espaces par client, rôles, synchronisation, versions, publication hébergée, partage en lecture, marque du client, modèles, **facturation (abonnement par espace, licence par utilisateur) et retrait de la mention lié à l'offre**, sauvegardes | Un cours créé sur un appareil se retrouve sur un autre ; deux espaces clients isolés ; export et suppression des données | XL |
| **7 · Extensions** | Élargir | **Export « un SCO par module »** (runtime filtré par module, ressource partagée, bilan et attestation par module, tests chez le client), AICC sur demande, Tauri, multilingue, H5P (étude) | Selon chaque extension ; pour le multi-SCO : import validé dans SCORM Cloud et dans la plateforme du client, limites documentées | XL |

Dépendances : 0 → 1 → (1b ‖ 2) → (2b ‖ 3a) → (2c ‖ 3b) → (4a ‖ 4b) → 5 → 5b → 6 → 7. La phase 3b suppose 1b (l'éditeur règle navigation, marque et structure) ; 2b et 2c avancent en parallèle de 3a et 3b. **Phase 6 : LTI 1.3 et LRS hébergé** ; **phase 7 : AICC, seulement sur demande ferme d'un client**. **Les premiers clients arrivent à la phase 5b, en mode local ou statique, sans compte** ; les comptes et espaces (phase 6) viennent ensuite. La phase 1 est **la plus risquée et la plus utile** : elle valide qu'un lecteur piloté par le modèle reproduit le cours actuel.

## 8. Qualité, sécurité, accessibilité, droits

- **Sécurité du contenu** : pas de HTML libre ; texte riche en JSON ; liste blanche de blocs ; échappement à l'export ; pas d'attributs `on*` ni de scripts ; images contrôlées (poids, type, WebP).
- **Accessibilité de l'éditeur lui-même** : clavier complet, focus, annonces ; glisser-déposer avec alternative au clavier ; cible WCAG 2.2 AA.
- **Accessibilité des cours produits** : validateurs bloquants (alt, contraste, titres de carte, ordre) avant export.
- **Droits** : métadonnées auteur et licence obligatoires ; crédits des tiers générés ; rappel d'originalité ; mentions adaptées web / LMS (déjà résolu dans le runtime).
- **Licences des composants** : Driver.js et Phosphor (MIT) sans souci ; **vérifier les conditions de GSAP avant la première livraison à un client** (la licence gratuite a des restrictions d'usage ; je n'ai pas relu ses termes actuels : à confirmer sur le site de GSAP) ; polices : par défaut **uniquement des licences libres** (OFL ou équivalent), inventaire des licences par police, crédits générés (voir § 3.10) ; ITF FFL **à relire** avant toute redistribution.
- **Données** : sans compte, rien ne quitte l'appareil. Avec compte : hébergement UE, minimisation, export et suppression des données, mentions et politique à rédiger (**à faire relire par un juriste**).
- **Tests** : unitaires (modèle, exporteurs, faux LMS), de bout en bout (Playwright), **test dans SCORM Cloud à chaque version** ; Moodle et 360Learning avant la V1.

## 9. Risques

| Risque | Gravité | Réponse |
|---|---|---|
| Le runtime piloté par le modèle ne reproduit pas fidèlement le cours | Élevée | Phase 1 avec comparaison d'images et de rapports LMS avant toute interface |
| Édition riche et accessibilité du glisser-déposer très coûteuses | Élevée | Tiptap et dnd-kit ; alternative clavier à chaque geste ; la phase 3a est isolée et testée seule |
| **Calques avec tous les types de blocs dès le MVP** : ordre de lecture, éléments interactifs recouverts, texte sur image, reflow ; la phase 3a devient **XL** | **Élevée** | Calques **bornés dans une zone libre** (pas sur toute la carte), positions en %, **repli automatique** dans le flux, validateurs **bloquants**, tests de captures au zoom 200 % et en 320 px ; **plan de repli** (décoratif + texte d'abord, activités ensuite) soumis à ton accord |
| Médias lourds : packages trop volumineux pour le LMS, performances de l'éditeur | Élevée | Compression et WebP dans des Workers, OPFS, alerte de poids, vidéo externe (Bunny Stream) ; limites des LMS vérifiées avec chaque client |
| **Compression vidéo dans le navigateur** : poids du moteur, mémoire, lenteur, en-têtes COOP/COEP à configurer, **licences (FFmpeg) et brevets (H.264)** | Moyenne à élevée | Optionnelle, en Worker, chargée à la demande ; vérification des licences **avant** la V1 ; plan B WebM ou compression par l'hébergeur externe ; MVP indépendant de cette fonction |
| **Vidéo externe** : connexion obligatoire, service tiers, blocage possible par une plateforme, confidentialité (IP de l'apprenant) | Moyenne | Liste des médias externes à l'export, mentions générées, lien de secours, test par plateforme, accès signé quand l'hébergeur le permet |
| Médias sans sous-titres ni transcription (accessibilité, obligations des clients) | Élevée | Champs obligatoires et validateur bloquant à l'export |
| **Statut juridique et fiscal d'une activité de logiciel** (code d'activité, plafonds micro-entreprise, TVA, assurance, forme juridique) | Élevée | Consulter un **expert-comptable et un juriste avant le premier client payant** ; rien n'est vérifié ici |
| Package livré qui cesse de fonctionner à la fin d'un abonnement | Moyenne | Licence d'usage du moteur **durable** pour les exports déjà faits (à valider par un juriste) |
| Retrait de la mention « Créé avec » impossible à imposer en mode local sans compte | Faible | Clause contractuelle ; contrôle technique avec les comptes (phase 6) |
| Responsabilité envers des clients (données, disponibilité, support) | Élevée | CGU relues par un juriste, sauvegardes, version affichée, périmètre d'offre clair ; premiers clients en mode local avant le cloud |
| Support inégal du File System Access API | Moyenne | Repli en fichier `.rdcourse` ; Tauri plus tard |
| Plateformes LMS différentes (Moodle, 360Learning) | Moyenne | Simulateur + tests réels avant la V1 ; mode `review` déjà géré |
| Dérive de périmètre (éditeur « qui fait tout ») | Élevée | MVP strict ; critère : recréer Intelligentsia ; le reste en V1/V2 |
| **Multi-standards** (1.2, 2004, xAPI, cmi5) : comportements différents selon les LMS et les LRS | Élevée | Port de suivi + adaptateurs ; **un faux LMS par standard** ; chaque correspondance validée par un rapport réel avant d'être annoncée ; SCORM 1.2 d'abord |
| xAPI : données personnelles et LRS à fournir ; contredit « aucune donnée » | Élevée | Option **désactivée par défaut**, mentions générées, contrat avec le client, relecture juridique |
| **LRS hébergé par R.D FORMATION** : un service à exploiter (RGPD, sous-traitance, sauvegardes, support, disponibilité) | Élevée | Reporté après les comptes (phase 6) ; d'abord LRS du client ; offre et contrat définis avant le lancement |
| **LTI 1.3 et AICC exigent un serveur** (impossibles en package statique) ; coût et sécurité (clés, JWT) | Moyenne | Pas avant la phase 6 ; AICC seulement sur demande ferme ; le cœur de l'outil reste statique |
| Support SCORM / xAPI **inconnu ou variable** selon Moodle, 360Learning, Open edX | Moyenne | Matrice de compatibilité alimentée par des **tests réels** ; rien n'est annoncé comme pris en charge sans rapport |
| **Préférences de l'apprenant perdues** (stockage bloqué, autre appareil) ; **police lisible qui remplace la marque** | Faible à moyenne | Réglages de l'appareil respectés d'office ; message discret si le stockage est bloqué ; compromis expliqué à l'auteur avec aperçu |
| Navigation en haut / en bas avec un arbre profond ; 5 positions × 4 styles × 3 thèmes à tester | Moyenne | Onglets + panneau pour les arbres profonds ; matrice de tests automatisée (captures) ; tiroir sur mobile |
| Structure très libre (niveaux optionnels) qui casse le bilan, le glossaire ou la visite | Moyenne | Tout est **généré depuis l'arbre** ; conversion guidée entre presets ; validateur de structure |
| Couleurs de marque inaccessibles (contraste) | Moyenne | **Teinte d'usage** calculée automatiquement, couleur de marque gardée pour les aplats, export bloqué sous AA, réglage manuel sans contournement |
| **Licences des polices** (catalogue, ajout par les clients, embarquement, sous-ensemble, nom réservé) | Moyenne | Catalogue **libre** uniquement et **licence confirmée fichier par fichier**, licence obligatoire à l'ajout, lecture de `fsType`, déclaration du client dans les CGU pour les polices non libres, crédits et textes de licence générés ; relecture juridique |
| Granularité SCO : en multi-SCO, menu, bilan global, glossaire et visite ne traversent plus les SCO (SCORM 1.2) | Moyenne | **Défaut : un SCO** ; seul « un SCO par module » est prévu (V2), après test chez le client ; pas de SCO par séance ; limites expliquées au client |
| Maintenance d'un auteur seul | Moyenne | Pile réduite, tests automatiques, documentation (`SCORM-skill`) |
| Licence GSAP si diffusion à des tiers | Faible à moyenne | Vérifier avant toute diffusion ; alternative : animations CSS |
| Données d'auteurs en ligne (RGPD) | Moyenne | Mode sans compte par défaut ; hébergement UE ; relecture juridique |

## 10. Décisions à prendre (par vous)

1. ~~**Usage visé**~~ : **tranché le 12/11/2026 : l'éditeur servira à l'auteur et à ses clients.** (Conséquences : § 3.8, phase 5b, licence GSAP à vérifier, RGPD, CGU.)
2. ~~**Framework de l'interface**~~ : **tranchée le 12/11/2026** : **React + TypeScript** (l'interface de l'éditeur ; le cours exporté reste **sans framework**).
3. ~~**Compte et cloud**~~ : **confirmée le 12/11/2026** : premiers clients en **mode local ou statique sans compte** (phase 5b), puis **comptes, espaces et abonnement en phase 6**.
7. ~~**Offre aux clients**~~ : **tranchée le 12/11/2026** (§ 3.8) : modèle **mixte progressif** (prestation accompagnée en phase 5b, puis abonnement par espace en phase 6) ; facturation par **espace**, par **utilisateur** et par **projet** ; mention « Créé avec » retirable avec l'offre payante ; contenu au client, moteur sous licence d'usage ; **tarifs non fixés**.
8. ~~**Vidéo et poids**~~ : **tranchée le 12/11/2026** (§ 3.6) : **vidéos externes par défaut** (Bunny Stream), fichier pour les petites ; **alerte à 50 Mo**, blocage au choix ; **compression dans le navigateur optionnelle dès la V1** (licences à vérifier) ; **sous-titres et transcription bloquants**, exception justifiée.
9. ~~**Mise en page**~~ : **tranchée le 12/11/2026** (§ 3.5) : **grille 12 colonnes ET calques dès le MVP** ; un calque peut contenir **tous les types de blocs** ; **repli dans le flux** sur petit écran et au zoom ; aimantation sur 12 colonnes. Conséquence : phase 3a en **XL**, risque d'accessibilité relevé, plan de repli prévu.
10. ~~**Définition des niveaux**~~ : **tranchée le 12/11/2026** (§ 3.11) : séquence = conteneur léger (introduction + bilan calculé) ; évaluation = type d'activité ; activité placée à n'importe quel niveau et publiable seule ; niveau de la note LMS au choix de l'auteur (défaut : module).
11. ~~**Les 4 couleurs et les polices**~~ : **tranchée le 12/11/2026, précisée le même jour** (§ 3.10) : **principale, secondaire, accent, encre** ; **teinte d'usage accessible automatique, export bloqué si l'échec reste** ; **thèmes générés automatiquement, réglage manuel optionnel** ; **polices : une par rôle (titres, sous-titres, texte), catalogue open source, jeux de polices recommandés (lisibilité d'abord), polices non libres sur déclaration du client**. Reste à choisir sur maquette : la source du catalogue et les jeux par défaut.
12. ~~**Standards**~~ : **tranchée le 12/11/2026** (§ 3.12) : **SCORM 2004 en premier** (phase 2b), puis **xAPI et cmi5** (2c), puis **LTI 1.3 et LRS hébergé** (phase 6), **AICC** sur demande (phase 7) ; **LRS du client d'abord, LRS R.D FORMATION ensuite** ; plateformes : Moodle, 360Learning, Open edX / MOOC et autres.
13. ~~**Granularité des SCO**~~ : **tranchée le 12/11/2026** (§ 3.12) : **un SCO par défaut** (+ objectif par module) ; **option « un SCO par module » en V2** ; **pas de SCO par séance** ; notes natives par module demandées par un client : **cas par cas, après test dans sa plateforme**.
14. ~~**Navigation de l'apprenant**~~ : **tranchée le 12/11/2026** (§ 3.9) : l'apprenant peut changer le **mode Lecture / Diaporama**, la **police très lisible**, la **taille du texte et les espacements** ; contraste élevé et mouvement réduit **toujours** proposés ; **thème et menu désactivés par défaut, activables par l'auteur** (confirmé) ; l'auteur **verrouille tout sauf l'accessibilité** ; **mémorisation dans le navigateur seulement** ; **panneau « Préférences » unique**.
4. ~~**SCORM 2004**~~ : **réglée par la décision 12** (SCORM 2004 en phase 2b, après SCORM 1.2).
5. ~~**Activités en ligne**~~ : **tranchée le 12/11/2026** : une activité peut être **publiée seule** (lien, intégration dans un site) **avec suivi xAPI optionnel** : activé par l'auteur, **LRS du client ou LRS R.D FORMATION**, **information claire de l'apprenant** et **mentions générées** ; sans xAPI, **aucune donnée** n'est collectée (§ 3.12). Phase 6 (avec le serveur et le LRS).
6. **Nom et identité** : **nom de travail « Logiciel SCORM »** (dossier `Logiciel_scorm`) ; **marque définitive à choisir avant la première livraison client** (§ 3.13).

## 11. Prochaines actions concrètes

1. **Les 14 décisions numérotées du § 10 sont maintenant réglées** (2, 3, 5 le 12/11/2026 ; 4 par la décision 12 ; 6 : nom de travail « Logiciel SCORM »). Restent deux **choix sur maquette** (phase 1b) : la source du catalogue de polices et les jeux de polices par défaut (§ 3.10), et plusieurs **vérifications** (licences GSAP, polices, FFmpeg ; comportement de Moodle, 360Learning, Open edX ; juridique et fiscal).
2. **Phase 0** : écrire `fixtures/intelligentsia.json` et le schéma de validation (voir § 7), avec le modèle de structure (§ 3.11), de mise en page (§ 3.5), de notation (§ 3.12) et de réglages (§ 3.3).
3. Lancer la **phase 1** : extraire le runtime et le faire rendre la fixture.
4. **En parallèle, dès maintenant** : vérifier la licence GSAP et lister les exigences d'un client type (taille maximale des packages, LMS utilisé, sous-titres obligatoires).
5. Faire une **maquette de la phase 3a** (grille, poignées, inspecteur) avant d'écrire le code, pour valider l'ergonomie avec toi.

## 12. Sources

- ADL, SCORM 1.2 et IMS Content Packaging 1.1.2 ; Rustici, « SCORM Explained » : https://scorm.com/scorm-explained/
- WCAG 2.2 : https://www.w3.org/WAI/WCAG22/quickref/
- SCORM 2004 (3e et 4e éditions, ADL) ; xAPI (spécification de l'IEEE 9274.1.1 / ADL) ; cmi5 (profil xAPI, ADL/AICC) ; LTI 1.3 (1EdTech) — **à relire dans les spécifications** avant d'implémenter les correspondances du § 3.12.
- SCORM Cloud (prise en charge de SCORM 1.2, 2004, xAPI, cmi5) : https://cloud.scorm.com — à confirmer dans votre compte.
- Documentation : Vite (vite.dev), Zod (zod.dev), Tiptap (tiptap.dev), dnd-kit (dndkit.com), Dexie (dexie.org), Supabase (supabase.com/docs), Tauri (tauri.app), Playwright (playwright.dev), Vitest (vitest.dev), shadcn/ui (ui.shadcn.com).
- File System Access API : MDN Web Docs.
- Expérience du projet : [ROADMAP.md](ROADMAP.md), [SCORM-skill](../SCORM-skill/SKILL.md), catalogue des erreurs `SCORM-skill/10-erreurs/reference.md`.
