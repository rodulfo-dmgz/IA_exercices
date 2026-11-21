/**
 * Auto-évaluations du cours : une par séance, toutes comptées dans le carnet de notes.
 *
 * Types de question :
 *   single  choix unique            { q, options:[…], a:index }
 *   multi   choix multiple          { q, options:[…], a:[index…] }       (juste = exactement les bonnes cases)
 *   num     réponse numérique       { q, a:nombre, tol, unit?, hint? }   (« 5,7 », « 2/5 », « 60:998 » acceptés)
 *   text    mot ou expression       { q, accept:['…'], hint? }           (casse et accents ignorés)
 * Chaque question vaut 1 point. `why` s'affiche à la correction.
 */
export const MAITRISE = 70;   // % de réussite (aussi déclaré dans imsmanifest.xml)

export const MODULES = [
  { id: 1, titre: "Comprendre l'IA" },
  { id: 2, titre: 'Résoudre des problèmes' },
  { id: 3, titre: "Raisonner dans l'incertain" },
];

export const EVALS = [
  /* ═════════ Module 1 ═════════ */
  {
    id: 'm1-s1', module: 1, seance: '1.1', titre: "Qu'est-ce que l'IA ?", page: 'ia-definir.html',
    questions: [
      { t: 'single', q: "Qu'est-ce qui distingue le plus nettement un système d'IA d'un logiciel classique ?",
        options: ["Sa vitesse d'exécution", "Sa façon de produire la sortie : elle est apprise à partir d'exemples plutôt qu'entièrement écrite à la main", "La modernité de son interface"], a: 1,
        why: "Un logiciel classique applique des règles rédigées par une personne ; un système d'IA a déduit tout ou partie de ses règles à partir de données." },
      { t: 'single', q: 'Un feu tricolore suit un cycle fixe de 40 s de vert, 5 s d\'orange et 45 s de rouge. Est-ce un système d\'IA ?',
        options: ['Oui, il est automatique', "Non : c'est une règle écrite à l'avance, rien n'est appris", 'Oui, parce qu\'il gère un carrefour'], a: 1,
        why: "Automatique ne veut pas dire intelligent : la minuterie répète toujours la même règle." },
      { t: 'multi', q: "Parmi ces questions, lesquelles aident à repérer un système d'IA ?",
        options: ['Qui a écrit la règle de décision ?', "Le comportement change-t-il quand on le réentraîne sur d'autres exemples ?", "L'interface est-elle moderne ?", "Gère-t-il des cas que ses concepteurs n'avaient pas prévus ?"], a: [0, 1, 3],
        why: "Ces trois questions portent sur la manière dont le traitement a été construit. L'apparence de l'interface n'en dit rien." },
      { t: 'single', q: 'Dans un outil qui lit des bons de livraison manuscrits, quelle est l\'entrée ?',
        options: ["La photo du bon de livraison", 'Le texte extrait', "La règle de lecture"], a: 0,
        why: "L'entrée est ce que reçoit le système (l'image) ; la sortie est ce qu'il produit (le texte)." },
    ],
  },
  {
    id: 'm1-s2', module: 1, seance: '1.2', titre: "Les grandes familles de l'IA", page: 'ia-domaines.html',
    questions: [
      { t: 'single', q: 'Quelle affirmation est correcte ?',
        options: ["L'IA est une branche de l'apprentissage profond", "L'apprentissage automatique et l'IA sont deux mots pour la même chose", "L'apprentissage profond est une famille d'apprentissage automatique, lui-même un domaine de l'IA"], a: 2,
        why: "Image des poupées russes : l'apprentissage profond est tout au centre, dans l'apprentissage automatique, dans l'IA." },
      { t: 'single', q: 'Dans le projet de la presse hydraulique, qui pose les capteurs de vibration ?',
        options: ['La robotique', 'La science des données', "L'apprentissage profond"], a: 0,
        why: "Capteurs et actionneurs relèvent de la robotique : percevoir et agir dans le monde physique." },
      { t: 'single', q: 'Que désigne le mot « profond » dans « apprentissage profond » ?',
        options: ['Une réflexion très approfondie', 'Le nombre de couches de calcul du réseau de neurones', "La quantité d'informations stockées"], a: 1,
        why: "Il renvoie à l'empilement de nombreuses couches, pas à une profondeur de pensée." },
      { t: 'single', q: 'Un « robot conversationnel » est-il un robot au sens strict ?',
        options: ['Oui, il répond comme une personne', "Non : sans capteurs ni actionneurs, c'est un logiciel", "Oui, dès qu'il est connecté à Internet"], a: 1,
        why: "Un robot agit dans le monde physique grâce à un corps ; un agent de conversation n'en a pas." },
    ],
  },
  {
    id: 'm1-s3', module: 1, seance: '1.3', titre: 'Intelligent, vraiment ?', page: 'ia-philosophie.html',
    questions: [
      { t: 'single', q: 'Que montre l\'argument de la chambre chinoise ?',
        options: ['Que les machines comprennent le chinois', "Que suivre des règles à la lettre peut produire des réponses parfaites sans aucune compréhension", 'Que le test de Turing est impossible à passer'], a: 1,
        why: "Pour Searle, un système peut se comporter de façon intelligente sans comprendre ce qu'il manipule." },
      { t: 'single', q: "Que juge le test de Turing ?",
        options: ["Le comportement : un juge ne sait pas distinguer la machine d'une personne", "La vitesse de calcul de la machine", "Le nombre de langues parlées"], a: 0,
        why: "Le test se limite à l'observation d'une conversation écrite : il évalue la ressemblance, pas la compréhension." },
      { t: 'single', q: "Parmi ces affirmations, laquelle est vraie aujourd'hui ?",
        options: ['Les IA actuelles ont une conscience', 'Une IA générale est déjà utilisée en entreprise', "Les systèmes d'IA en service sont des IA étroites"], a: 2,
        why: "Chaque système excelle dans une tâche précise ; aucune IA générale n'existe." },
      { t: 'single', q: "Quelle reformulation de « cette machine est-elle intelligente ? » est la plus utile au travail ?",
        options: ["Cette machine pense-t-elle comme moi ?", "Pour quelle tâche précise est-elle fiable, et que se passe-t-il quand elle se trompe ?", "Cette machine est-elle plus rapide qu'un humain ?"], a: 1,
        why: "On cherche des systèmes utiles, fiables et sûrs : la question porte sur une tâche, des données et des conditions." },
    ],
  },

  /* ═════════ Module 2 : résoudre des problèmes ═════════ */
  {
    id: 'm2-s1', module: 2, seance: '2.1', titre: 'Mettre un problème en fiche', page: 'pb-formuler.html',
    questions: [
      { t: 'single', q: 'Dans un problème de recherche, qu\'appelle-t-on un « état » ?',
        options: ['Une photographie complète de la situation à un instant donné', 'Une action que l\'on peut effectuer', "Le prix d'un déplacement", "L'objectif à atteindre"], a: 0,
        why: "L'état décrit tout ce qui compte pour décider (où sont les objets, combien contient chaque jerrican…). Les actions mènent d'un état à l'autre." },
      { t: 'multi', q: 'Que faut-il définir avant de chercher une solution ?',
        options: ['Les états possibles', 'Les transitions autorisées entre états', "L'état objectif (quand le problème est-il résolu ?)", "La couleur de l'interface"], a: [0, 1, 2],
        why: "Sans états, transitions et objectif, la recherche n'a rien à explorer. Le reste est une affaire de présentation." },
      { t: 'num', q: 'Jerricans de 3 L et de 5 L : combien de transitions faut-il, au minimum, pour obtenir exactement 4 L dans l\'un des deux ?',
        a: 6, tol: 0, hint: 'Un nombre entier. Essayez l\'atelier ci-dessus.',
        why: "Chemin le plus court : remplir le 5 L, le verser dans le 3 L, vider le 3 L, reverser le reste, remplir le 5 L, compléter le 3 L : il reste 4 L." },
      { t: 'num', q: "Un cadenas porte 3 interrupteurs, chacun sur « marche » ou « arrêt ». Combien d'états différents le cadenas a-t-il ?",
        a: 8, tol: 0, hint: 'Deux positions pour chacun des trois.',
        why: '2 × 2 × 2 = 8. Chaque interrupteur supplémentaire double le nombre d\'états : c\'est ce qui rend la recherche coûteuse.' },
      { t: 'single', q: 'Vous voulez arriver le plus tôt possible. Quel est le coût naturel de chaque trajet entre deux stations ?',
        options: ['La distance parcourue', 'La durée du trajet', 'Le nombre de stations du réseau'], a: 1,
        why: "Le coût traduit ce qu'on cherche à minimiser : ici le temps, donc la durée." },
    ],
  },
  {
    id: 'm2-s2', module: 2, seance: '2.2', titre: 'Cinq repères historiques', page: 'pb-histoire.html',
    questions: [
      { t: 'single', q: "Quelle idée de Turing est à l'origine des ordinateurs programmables ?",
        options: ['Un même appareil peut faire des tâches différentes selon le programme qu\'on lui donne', 'Chaque tâche demande une machine dédiée', 'Une machine ne peut jamais imiter un raisonnement'], a: 0,
        why: "Au lieu de construire un appareil par tâche, on change le programme : c'est le principe même de la programmation." },
      { t: 'single', q: "En quelle année s'est tenue la conférence de Dartmouth, souvent citée comme l'acte de naissance de l'IA ?",
        options: ['1936', '1956', '1997', '2016'], a: 1,
        why: "L'été 1956, au Dartmouth College : le terme « intelligence artificielle » s'y est imposé." },
      { t: 'single', q: "L'hypothèse de départ de l'IA, formulée à Dartmouth, affirme que…",
        options: ['Les machines comprendront un jour le chinois', "Tout aspect de l'intelligence peut être décrit assez précisément pour qu'une machine le simule", "L'intelligence est réservée aux êtres vivants"], a: 1,
        why: "C'est une hypothèse : on ne sait pas la prouver, mais elle structure toute la discipline." },
      { t: 'multi', q: 'Pourquoi les jeux ont-ils servi de terrain d\'essai aux premières IA ?',
        options: ['Leurs règles sont précises et faciles à formaliser', 'Le domaine est restreint', 'Le résultat se mesure simplement : gagné, perdu ou nul', 'Gagner aux jeux prouve une intelligence générale'], a: [0, 1, 2],
        why: "Les jeux offrent un cadre net et mesurable. En revanche, battre un humain à un jeu ne dit rien d'une intelligence générale." },
      { t: 'text', q: 'Quel ordinateur a battu le champion du monde d\'échecs Garry Kasparov en 1997 ?',
        accept: ['deep blue', 'deepblue'], hint: 'Son nom, en deux mots.',
        why: 'Deep Blue, construit par IBM. Il explorait des millions de positions par seconde et s\'appuyait sur une fonction d\'évaluation heuristique.' },
    ],
  },
  {
    id: 'm2-s3', module: 2, seance: '2.3', titre: 'Jouer contre un adversaire', page: 'pb-jeux.html',
    questions: [
      { t: 'num', q: "À la racine, Max choisit entre deux nœuds Min. Le premier mène aux valeurs 4 et 7, le second aux valeurs 3 et 9. Quelle est la valeur de la racine ?",
        a: 4, tol: 0, hint: 'Un nombre entier.',
        why: 'Min prend le plus petit : 4 à gauche, 3 à droite. Max prend alors le plus grand des deux : 4.' },
      { t: 'single', q: 'Dans un nœud « Min », quelle valeur est retenue ?',
        options: ['La plus grande des valeurs des enfants', 'La plus petite des valeurs des enfants', 'La moyenne des valeurs des enfants'], a: 1,
        why: 'Min cherche à réduire la valeur du jeu : il choisit l\'enfant qui arrange le moins Max.' },
      { t: 'num', q: "Dans un jeu où chaque position offre 10 coups, combien de positions faut-il examiner au troisième coup d'avance ?",
        a: 1000, tol: 0, hint: 'Un nombre entier.',
        why: '10 × 10 × 10 = 1 000. Le nombre de positions croît de façon exponentielle avec la profondeur.' },
      { t: 'single', q: "À quoi sert une fonction d'évaluation heuristique ?",
        options: ["À estimer la valeur d'une position sans aller jusqu'à la fin de la partie", 'À choisir au hasard un coup', 'À vérifier que les règles du jeu sont respectées'], a: 0,
        why: "Quand l'arbre est trop grand, on s'arrête à une profondeur donnée et on estime la position (matériel, contrôle du centre…)." },
      { t: 'multi', q: 'Minimax garantit un jeu optimal pour les jeux…',
        options: ['à deux joueurs', 'à information parfaite', 'déterministes (sans hasard)', 'avec lancers de dés'], a: [0, 1, 2],
        why: "Les dés introduisent du hasard : il faut alors raisonner avec des probabilités, ce que nous abordons au module 3." },
      { t: 'single', q: "Il reste 6 allumettes. À chaque tour, on en retire 1 ou 2 ; celui qui prend la dernière gagne. C'est à vous de jouer, face à un adversaire parfait. Que pouvez-vous faire ?",
        options: ['Gagner en retirant 1 allumette', 'Gagner en retirant 2 allumettes', "Rien : quoi que vous jouiez, l'adversaire peut gagner"], a: 2,
        why: "Un nombre d'allumettes multiple de 3 est perdant pour celui qui joue : l'adversaire complète toujours à 3 (1 puis 2, ou 2 puis 1)." },
    ],
  },

  /* ═════════ Module 3 : raisonner dans l'incertain ═════════ */
  {
    id: 'm3-s1', module: 3, seance: '3.1', titre: 'Chiffrer le doute', page: 'inc-cotes.html',
    questions: [
      { t: 'num', q: "Un transporteur affiche une cote de 4:1 en faveur d'une livraison à l'heure. Quelle est la probabilité, en pourcentage ?",
        a: 80, tol: 0.1, unit: '%', hint: 'Un nombre, sans le signe %.',
        why: 'Probabilité = x / (x + y) = 4 / 5 = 80 %.' },
      { t: 'num', q: 'La cote est de 3:2. Quelle est la probabilité de l\'événement ? (décimal ou fraction)',
        a: 0.6, tol: 0.001, hint: 'Par exemple 0,25 ou 1/4.',
        why: '3 / (3 + 2) = 3/5 = 0,6.' },
      { t: 'num', q: 'Un événement a 25 % de chances de se produire. Quelle est sa cote, sous la forme 1:y ?',
        a: 0.3333, tol: 0.002, hint: 'Par exemple 1:3.',
        why: '25 % = 1 chance sur 4 : 1 cas favorable contre 3 défavorables, soit une cote de 1:3.' },
      { t: 'single', q: 'La cote 1:4 est-elle la même chose qu\'une probabilité de 25 % ?',
        options: ['Oui, 1/4 = 25 %', 'Non : une cote de 1:4 correspond à 1 chance sur 5, soit 20 %', 'Oui, mais seulement pour les jeux'], a: 1,
        why: "Une cote compare les cas favorables aux défavorables (1 contre 4), une probabilité les compare au total (1 sur 5)." },
      { t: 'single', q: "Un transporteur annonce « 80 % de chances de livraison demain ». Votre colis arrive en retard. Que peut-on conclure ?",
        options: ["Que l'annonce était fausse", "Rien : un seul colis ne permet pas de juger si la probabilité annoncée était juste", "Que l'annonce était juste"], a: 1,
        why: "Une probabilité se juge sur de nombreux cas : sur 50 colis annoncés à 80 %, on attend environ 40 livraisons à l'heure." },
    ],
  },
  {
    id: 'm3-s2', module: 3, seance: '3.2', titre: 'Réviser une conviction (Bayes)', page: 'inc-bayes.html',
    questions: [
      { t: 'num', q: "Sur 1 000 paiements, 2 sont frauduleux. Quelle est la cote antérieure en faveur de la fraude ? (x:y ou décimal)",
        a: 0.002004, tol: 0.00002, hint: 'Par exemple 2:998.',
        why: '2 paiements frauduleux contre 998 normaux : 2:998 (soit 1:499).' },
      { t: 'num', q: "Le détecteur signale 90 % des fraudes et, à tort, 3 % des paiements normaux. Quel est le rapport de vraisemblance d'une alerte ?",
        a: 30, tol: 0.01, hint: 'Un nombre.',
        why: '0,90 ÷ 0,03 = 30 : une alerte est 30 fois plus probable pour un paiement frauduleux que pour un paiement normal.' },
      { t: 'num', q: 'Quelle est la cote postérieure en faveur de la fraude après une alerte ? (x:y ou décimal)',
        a: 0.06012, tol: 0.0005, hint: 'Cote antérieure × rapport de vraisemblance.',
        why: '2:998 × 30 = 60:998, soit environ 0,06.' },
      { t: 'num', q: "Quelle est alors la probabilité que le paiement soit frauduleux, en pourcentage (une décimale) ?",
        a: 5.7, tol: 0.1, unit: '%', hint: 'Probabilité = x / (x + y).',
        why: '60 / (60 + 998) ≈ 0,057, soit 5,7 %.' },
      { t: 'single', q: "Pourquoi une alerte d'un détecteur pourtant fiable ne prouve-t-elle presque rien ici ?",
        options: ["Parce que le détecteur est mal réglé", "Parce que la fraude est rarissime au départ : la plupart des alertes concernent des paiements normaux", "Parce que 3 % est un chiffre trop élevé pour un détecteur"], a: 1,
        why: "C'est l'oubli de la fréquence de base : un événement très rare reste improbable même après un signal fort." },
    ],
  },
  {
    id: 'm3-s3', module: 3, seance: '3.3', titre: 'Trier des tickets avec Bayes', page: 'inc-naif.html',
    questions: [
      { t: 'num', q: "Dans l'atelier, quel est le rapport de vraisemblance du mot « panne » ?",
        a: 8, tol: 0.01, hint: 'Voir le tableau de comptage.',
        why: '160 / 40 000 = 0,004 côté urgents ; 80 / 160 000 = 0,0005 côté courants. Le rapport vaut 8.' },
      { t: 'num', q: "Cote antérieure 1:4 (soit 0,25). Quelle est la cote postérieure en faveur de « urgent » pour le message « panne bloqué » ? (rapports : panne 8, bloqué 12)",
        a: 24, tol: 0.01, hint: 'Multipliez la cote par chaque rapport.',
        why: '0,25 × 8 × 12 = 24 : le message est 24 fois plus probablement urgent que courant.' },
      { t: 'num', q: 'Même cote antérieure. Quelle est la cote postérieure pour « merci facture » ? (rapports : merci 0,25, facture 1)',
        a: 0.0625, tol: 0.0005, hint: 'Un nombre décimal.',
        why: '0,25 × 0,25 × 1 = 0,0625 : très nettement un message courant.' },
      { t: 'single', q: 'Que dit un mot dont le rapport de vraisemblance vaut exactement 1 ?',
        options: ['Il annonce un message urgent', "Il n'aide pas à distinguer les deux classes", 'Il doit être supprimé du texte'], a: 1,
        why: "Aussi fréquent d'un côté que de l'autre, il ne fait pas bouger la cote." },
      { t: 'single', q: 'Pourquoi cette méthode est-elle qualifiée de « naïve » ?',
        options: ["Parce qu'elle ne fonctionne jamais", "Parce qu'elle suppose que les mots sont indépendants entre eux (l'ordre est ignoré)", "Parce qu'elle n'utilise pas de données"], a: 1,
        why: "Hypothèse simplificatrice, fausse dans les détails, mais qui donne souvent d'excellents résultats." },
      { t: 'single', q: "Un mot n'apparaît jamais dans les messages courants. Pourquoi ne pas utiliser une probabilité de 0 ?",
        options: ["Un seul zéro annulerait tout le calcul : on impose une valeur plancher minuscule", 'Parce que zéro n\'est pas un nombre', 'Parce que le mot est forcément faux'], a: 0,
        why: "Une probabilité nulle écrase le produit (voire donne 0/0). Un plancher très petit garde le mot informatif sans tout bloquer." },
    ],
  },
];

export const parId = (id) => EVALS.find((e) => e.id === id);
export const totalPoints = () => EVALS.reduce((n, e) => n + e.questions.length, 0);
