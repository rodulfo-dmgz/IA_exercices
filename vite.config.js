import { resolve } from 'path';
import { defineConfig } from 'vite';
import editorPlugin from './tools/editor-plugin.js';

const page = (name) => resolve(import.meta.dirname, `modules/${name}.html`);

export default defineConfig({
  plugins: [editorPlugin()],   // éditeur d'images : mode dev uniquement (apply: 'serve')
  base: './',                  // chemins relatifs : le package SCORM s'ouvre depuis n'importe quel dossier du LMS
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        inscription: page('inscription'),
        accueil: page('accueil'),
        // Module 1 : comprendre l'IA
        ia_definir: page('ia-definir'),
        ia_domaines: page('ia-domaines'),
        ia_philosophie: page('ia-philosophie'),
        // Module 2 : résoudre des problèmes
        pb_formuler: page('pb-formuler'),
        pb_histoire: page('pb-histoire'),
        pb_jeux: page('pb-jeux'),
        // Module 3 : raisonner dans l'incertain
        inc_cotes: page('inc-cotes'),
        inc_bayes: page('inc-bayes'),
        inc_naif: page('inc-naif'),
        // Ressources
        bilan: page('bilan'),
        glossaire: page('glossaire'),
        ressources: page('ressources'),
        mentions: page('mentions'),
      },
    },
  },
});
