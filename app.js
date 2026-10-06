(() => {
  'use strict';
  const root = document.documentElement;
  const languageButton = document.querySelector('#language-toggle');
  const themeButton = document.querySelector('#theme-toggle');
  const menuButton = document.querySelector('#menu-toggle');
  const navigation = document.querySelector('#nav-links');
  const papers = [...document.querySelectorAll('.paper')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const count = document.querySelector('#result-count');
  const motionButton = document.querySelector('#motion-toggle');
  const media = [...document.querySelectorAll('.paper-motion, .paper-motion-image')];
  const visibleMedia = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let language = 'en';
  let currentFilter = 'all';
  const readPreference = (key, fallback) => {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  };
  const savePreference = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* Storage may be unavailable in private browsing. */ }
  };
  let motionPreference = readPreference('yj-motion', null);
  let motionEnabled = motionPreference ? motionPreference === 'on' : !reducedMotion.matches;
  function updateMotionLabel() {
    motionButton.textContent = language === 'zh'
      ? (motionEnabled ? '暂停演示' : '播放演示')
      : (motionEnabled ? 'Pause demos' : 'Play demos');
    motionButton.setAttribute('aria-pressed', String(motionEnabled));
  }
  function syncMedia(element) {
    const active = motionEnabled && visibleMedia.has(element) && !document.hidden && !element.closest('.paper').hidden;
    if (element.tagName === 'VIDEO') {
      const poster = element.parentElement.querySelector('.paper-poster');
      if (active && !element.dataset.failed) {
        if (!element.src) element.src = element.dataset.src;
        element.muted = true;
        element.hidden = false;
        poster.hidden = true;
        element.play().catch(error => {
          if (error.name !== 'AbortError') { element.hidden = true; poster.hidden = false; }
        });
      } else {
        element.pause();
        if (!motionEnabled) { element.hidden = true; poster.hidden = false; }
      }
    } else {
      const next = active ? element.dataset.motion : element.dataset.poster;
      if (element.getAttribute('src') !== next) element.src = next;
    }
  }
  function syncAllMedia() { media.forEach(syncMedia); }
  function updateCount() {
    const visible = papers.filter(paper => !paper.hidden);
    const covers = visible.filter(paper => paper.dataset.type === 'cover').length;
    const publications = visible.length - covers;
    count.textContent = language === 'zh'
      ? `${publications} 篇论文${covers ? ` · ${covers} 项期刊封面` : ''}`
      : `${publications} publications${covers ? ` · ${covers} journal cover` : ''}`;
  }
  function setLanguage(next) {
    language = next === 'zh' ? 'zh' : 'en';
    root.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-en][data-zh]').forEach(element => {
      element.innerHTML = element.dataset[language];
    });
    languageButton.textContent = language === 'en' ? '中文' : 'EN';
    languageButton.setAttribute('aria-label', language === 'en' ? '切换到中文' : 'Switch to English');
    menuButton.setAttribute('aria-label', language === 'en' ? 'Toggle navigation' : '展开或收起导航');
    updateThemeLabel();
    updateCount();
    updateMotionLabel();
    savePreference('yj-language', language);
  }
  function updateThemeLabel() {
    const isDark = root.dataset.theme === 'dark';
    const label = language === 'en' ? `Switch to ${isDark ? 'light' : 'dark'} theme` : `切换到${isDark ? '浅色' : '深色'}模式`;
    themeButton.setAttribute('aria-label', label);
    themeButton.title = label;
    themeButton.firstElementChild.textContent = isDark ? '☼' : '◐';
  }
  function setTheme(theme) {
    root.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    updateThemeLabel();
    savePreference('yj-theme', root.dataset.theme);
  }
  function closeMenu() {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
  languageButton.hidden = false;
  themeButton.hidden = false;
  menuButton.hidden = false;
  document.querySelector('#filters').hidden = false;
  count.hidden = false;
  motionButton.hidden = media.length === 0;
  root.classList.add('js');
  setTheme(readPreference('yj-theme', 'light'));
  setLanguage(readPreference('yj-language', 'en'));
  languageButton.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
  themeButton.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
  motionButton.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    motionPreference = motionEnabled ? 'on' : 'off';
    savePreference('yj-motion', motionPreference);
    updateMotionLabel();
    syncAllMedia();
  });
  reducedMotion.addEventListener('change', () => {
    if (!motionPreference) { motionEnabled = !reducedMotion.matches; updateMotionLabel(); syncAllMedia(); }
  });
  document.addEventListener('visibilitychange', syncAllMedia);
  window.addEventListener('beforeprint', () => media.forEach(element => {
    if (element.tagName === 'VIDEO') element.pause();
    else element.src = element.dataset.poster;
  }));
  window.addEventListener('afterprint', syncAllMedia);
  media.forEach(element => element.addEventListener('error', () => {
    if (element.tagName === 'VIDEO') {
      element.dataset.failed = 'true';
      element.hidden = true;
      element.parentElement.querySelector('.paper-poster').hidden = false;
    } else if (element.getAttribute('src') !== element.dataset.poster) element.src = element.dataset.poster;
  }));
  if ('IntersectionObserver' in window) {
    const mediaObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const element = entry.target.querySelector('.paper-motion, .paper-motion-image');
        if (entry.isIntersecting) visibleMedia.add(element);
        else visibleMedia.delete(element);
        syncMedia(element);
      });
    }, { threshold: 0.05 });
    // Observe the fixed preview box: an initially hidden video has no intersection area.
    media.forEach(element => mediaObserver.observe(element.closest('.paper-visual')));
  } else { media.forEach(element => visibleMedia.add(element)); syncAllMedia(); }
  menuButton.addEventListener('click', () => {
    const open = navigation.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
      closeMenu();
      menuButton.focus();
    }
  });
  navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-nav')) closeMenu(); });
  filters.forEach(button => button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    papers.forEach(paper => { paper.hidden = currentFilter !== 'all' && !paper.dataset.category.split(' ').includes(currentFilter); });
    updateCount();
    syncAllMedia();
  }));
  if ('IntersectionObserver' in window) {
    const links = [...navigation.querySelectorAll('a')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(a => {
            if (a.hash === '#' + entry.target.id) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
  }
})();
