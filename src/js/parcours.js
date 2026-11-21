window.PARCOURS = [
    {
        id: 'accueil',
        titre: 'Accueil et consignes',
        icone: 'house',
        page: 'modules/accueil.html', // Page d'accueil : présentation + saisie du prénom
        suivi: true
    },
    {
        id: 'module-ia',
        titre: '1. Comprendre l\'IA',
        icone: 'lightbulb',
        suivi: true,
        children: [
            { id: 'm1-definir', titre: '1.1 Qu\'est-ce que l\'IA ?', icone: 'book-open', page: 'modules/ia-definir.html', suivi: true },
            { id: 'm1-domaines', titre: '1.2 Les grandes familles', icone: 'stack', page: 'modules/ia-domaines.html', suivi: true },
            { id: 'm1-philo', titre: '1.3 Intelligent, vraiment ?', icone: 'scales', page: 'modules/ia-philosophie.html', suivi: true }
        ]
    },
    {
        id: 'module-pb',
        titre: '2. Résoudre des problèmes',
        icone: 'path',
        suivi: true,
        children: [
            { id: 'm2-formuler', titre: '2.1 Mettre un problème en fiche', icone: 'flow-arrow', page: 'modules/pb-formuler.html', suivi: true },
            { id: 'm2-histoire', titre: '2.2 Cinq repères historiques', icone: 'clock-counter-clockwise', page: 'modules/pb-histoire.html', suivi: true },
            { id: 'm2-jeux', titre: '2.3 Jouer contre un adversaire', icone: 'git-fork', page: 'modules/pb-jeux.html', suivi: true }
        ]
    },
    {
        id: 'module-inc',
        titre: '3. Raisonner dans l\'incertain',
        icone: 'dice',
        suivi: true,
        children: [
            { id: 'm3-cotes', titre: '3.1 Chiffrer le doute', icone: 'percent', page: 'modules/inc-cotes.html', suivi: true },
            { id: 'm3-bayes', titre: '3.2 Réviser une conviction', icone: 'scales', page: 'modules/inc-bayes.html', suivi: true },
            { id: 'm3-naif', titre: '3.3 Trier des tickets', icone: 'envelope', page: 'modules/inc-naif.html', suivi: true }
        ]
    },
    {
        id: 'bilan',
        titre: 'Mon bilan',
        icone: 'chart-bar',
        page: 'modules/bilan.html'
    },
    {
        id: 'glossaire',
        titre: 'Glossaire',
        icone: 'books',
        page: 'modules/glossaire.html'
    },
    {
        id: 'ressources',
        titre: 'Liens utiles',
        icone: 'link',
        page: 'modules/ressources.html'
    },
    {
        id: 'mentions',
        titre: 'Mentions légales',
        icone: 'scroll',
        page: 'modules/mentions.html'
    }
];
