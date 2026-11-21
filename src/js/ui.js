/**
 * INTELLIGENTSIA — UI helpers (thème, contraste, toggle sidebar)
 */
(function () {
  'use strict';

  const html = document.documentElement;
  const sidebar = document.getElementById('sidebar');
  const stage = document.getElementById('stage');
  const toggleBtn = document.getElementById('toggle-btn');
  const themeBtn = document.getElementById('theme-btn');
  const contrastBtn = document.getElementById('contrast-btn');

  const STORAGE = {
    theme: 'rd_theme',
    contrast: 'rd_contrast',
    sidebar: 'rd_sidebar_collapsed',
  };

  // Les modules vivent dans une iframe de même origine : on leur recopie les classes de thème.
  function syncStage() {
    try {
      const root = stage.contentDocument.documentElement;
      root.classList.toggle('dark', html.classList.contains('dark'));
      root.classList.toggle('high-contrast', html.classList.contains('high-contrast'));
    } catch (_) { /* iframe non accessible : on ignore */ }
  }

  // Fondu : on pose .theme-fade sur la coquille et l'iframe, on bascule, puis on la retire.
  let fadeTimer;
  function withFade(change) {
    const docs = [document];
    try { if (stage.contentDocument) docs.push(stage.contentDocument); } catch (_) {}
    docs.forEach((d) => d.documentElement.classList.add('theme-fade'));
    change();
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      docs.forEach((d) => d.documentElement.classList.remove('theme-fade'));
    }, 500);
  }

  function setSidebarCollapsed(collapsed) {
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', String(!collapsed));
      toggleBtn.setAttribute('aria-label', collapsed ? 'Déplier le menu' : 'Réduire le menu');
    }
    try { localStorage.setItem(STORAGE.sidebar, collapsed ? '1' : '0'); } catch (_) {}
  }

  function toggleSidebar() {
    const isCollapsed = sidebar?.classList.contains('collapsed');
    setSidebarCollapsed(!isCollapsed);
  }

  function setTheme(dark) {
    html.classList.toggle('dark', dark);
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', dark ? 'Passer en thème clair' : 'Passer en thème sombre');
      themeBtn.title = dark ? 'Thème clair' : 'Thème sombre';
      const icon = themeBtn.querySelector('i');
      if (icon) icon.className = dark ? 'ph-duotone ph-moon' : 'ph-duotone ph-sun';
    }
    syncStage();
    try { localStorage.setItem(STORAGE.theme, dark ? 'dark' : 'light'); } catch (_) {}
  }

  function toggleTheme() {
    withFade(() => setTheme(!html.classList.contains('dark')));
  }

  // Nom fixe + aria-pressed : l'état est porté par aria-pressed, pas par le libellé
  function setHighContrast(on) {
    html.classList.toggle('high-contrast', on);
    if (contrastBtn) contrastBtn.setAttribute('aria-pressed', String(on));
    syncStage();
    try { localStorage.setItem(STORAGE.contrast, on ? '1' : '0'); } catch (_) {}
  }

  function toggleContrast() {
    withFade(() => setHighContrast(!html.classList.contains('high-contrast')));
  }

  function init() {
    try {
      const savedTheme = localStorage.getItem(STORAGE.theme);
      if (savedTheme === 'dark') setTheme(true);
      else if (savedTheme === 'light') setTheme(false);
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme(true);

      const savedContrast = localStorage.getItem(STORAGE.contrast);
      if (savedContrast === '1') setHighContrast(true);

      const savedSidebar = localStorage.getItem(STORAGE.sidebar);
      if (savedSidebar === '0') setSidebarCollapsed(false);
      else setSidebarCollapsed(true);
    } catch (_) {
      setSidebarCollapsed(true);
    }

    toggleBtn?.addEventListener('click', toggleSidebar);
    themeBtn?.addEventListener('click', toggleTheme);
    contrastBtn?.addEventListener('click', toggleContrast);
    stage?.addEventListener('load', syncStage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.RDUI = { setSidebarCollapsed, toggleSidebar, setTheme, toggleTheme, setHighContrast, toggleContrast };
})();
