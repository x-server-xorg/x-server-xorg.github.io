(function () {
  'use strict';

  const GITHUB_USER = 'x-server-xorg';
  const CACHE_KEY = 'gh_repos_cache';
  const CACHE_DURATION = 60 * 60 * 1000;
  const EXCLUDED_REPOS = ['x-server-xorg.github.io'];

  const translations = {
    ru: {
      'page.title': 'x-server-xorg — Портфолио',
      'nav.about': 'О себе',
      'nav.projects': 'Проекты',
      'hero.subtitle': 'Linux энтузиаст, Python/C++ разработчик',
      'hero.description': 'Создаю open-source инструменты, экспериментирую с Linux, пишу на Python и C++',
      'hero.githubBtn': 'GitHub Профиль',
      'stats.repos': 'репозиториев',
      'stats.stars': 'звёзд',
      'stats.projects': 'проектов',
      'stats.starsTotal': 'звёзд на GitHub',
      'stats.followers': 'подписчиков',
      'stats.years': 'на Linux',
      'about.title': 'О себе',
      'about.p1': 'Привет! Я Nikita, Linux-энтузиаст и разработчик из России. Пишу на Python и C++, экспериментирую с NixOS, Gentoo и оконными менеджерами (i3, Sway, awesome).',
      'about.p2': 'Мои проекты — это в основном open-source инструменты: от TUI-мессенджера для ВК до утилит для записи ISO на USB. Я верю в минимализм, производительность и красивый код.',
      'projects.title': 'Проекты',
      'projects.subtitle': 'Мои open-source репозитории, загруженные с GitHub API',
      'footer.made': 'Сделано с 💜 и открытым исходным кодом',
      'toast.loading': 'Загружаю проекты с GitHub...',
      'toast.loaded': 'Загружено {count} проектов',
      'toast.error': 'Не удалось загрузить проекты. Попробуйте позже.',
      'toast.cached': 'Загружено из кэша: {count} проектов',
      'project.noDesc': 'Нет описания',
      'project.forked': '(форк)',
      'loading': 'Загрузка...',
    },
    en: {
      'page.title': 'x-server-xorg — Portfolio',
      'nav.about': 'About',
      'nav.projects': 'Projects',
      'hero.subtitle': 'Linux enthusiast, Python/C++ developer',
      'hero.description': 'Creating open-source tools, experimenting with Linux, coding in Python and C++',
      'hero.githubBtn': 'GitHub Profile',
      'stats.repos': 'repositories',
      'stats.stars': 'stars',
      'stats.projects': 'projects',
      'stats.starsTotal': 'GitHub stars',
      'stats.followers': 'followers',
      'stats.years': 'years on Linux',
      'about.title': 'About Me',
      'about.p1': 'Hi! I\'m Nikita, a Linux enthusiast and developer from Russia. I code in Python and C++, experiment with NixOS, Gentoo and window managers (i3, Sway, awesome).',
      'about.p2': 'My projects are mostly open-source tools: from a VK TUI messenger to USB ISO writing utilities. I believe in minimalism, performance, and clean code.',
      'projects.title': 'Projects',
      'projects.subtitle': 'My open-source repositories, loaded from the GitHub API',
      'footer.made': 'Made with 💜 and open source',
      'toast.loading': 'Loading projects from GitHub...',
      'toast.loaded': 'Loaded {count} projects',
      'toast.error': 'Failed to load projects. Try again later.',
      'toast.cached': 'Loaded from cache: {count} projects',
      'project.noDesc': 'No description',
      'project.forked': '(fork)',
      'loading': 'Loading...',
    },
  };

  let currentLang = 'ru';
  let reposData = [];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function getLangFromStorage() {
    try {
      return localStorage.getItem('lang') || 'ru';
    } catch {
      return 'ru';
    }
  }

  function setLangToStorage(lang) {
    try {
      localStorage.setItem('lang', lang);
    } catch {}
  }

  function updateLangToggleLabel() {
    const btn = $('#langToggle');
    if (btn) btn.textContent = currentLang === 'ru' ? 'EN' : 'RU';
  }

  function applyTranslations() {
    const t = translations[currentLang];
    if (!t) return;

    document.documentElement.lang = currentLang;

    $$('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (t[key]) {
        if (el.tagName === 'TITLE') {
          document.title = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });

    document.title = t['page.title'];
  }

  function toggleLang() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    setLangToStorage(currentLang);
    applyTranslations();
    updateLangToggleLabel();
    if (reposData.length > 0) {
      renderProjects(reposData);
    }
  }

  function showToast(message, duration = 4000) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function getLanguageColor(lang) {
    if (!lang) return 'var(--text-muted)';
    const colors = {
      Python: '#3572A5',
      'C++': '#F34B7D',
      JavaScript: '#F1E05A',
      CSS: '#563D7C',
      HTML: '#E34F26',
      Nix: '#7EBAE4',
      Shell: '#89E051',
      TypeScript: '#3178C6',
      Rust: '#DEA584',
      Go: '#00ADD8',
    };
    return colors[lang] || '#8B8B8B';
  }

  function renderProjects(repos) {
    const grid = $('#projectsGrid');
    if (!grid) return;

    const t = translations[currentLang];

    if (!repos || repos.length === 0) {
      grid.innerHTML = `
        <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 48px;">
          <p style="color: var(--text-muted); font-size: 1rem;">${t['loading'] || 'Loading...'}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';

    repos.forEach((repo, index) => {
      const card = document.createElement('div');
      card.className = 'project-card fade-in';
      card.style.transitionDelay = `${Math.min(index * 50, 300)}ms`;

      const langColor = getLanguageColor(repo.language);
      const desc = repo.description
        ? repo.description.length > 120
          ? repo.description.slice(0, 120) + '…'
          : repo.description
        : t['project.noDesc'];

      card.innerHTML = `
        <div class="project-card-top">
          <div class="project-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          ${repo.stargazers_count > 0 ? `
            <div class="project-stars">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span>${repo.stargazers_count}</span>
            </div>
          ` : ''}
        </div>
        <h3 class="project-name">
          <a href="${repo.html_url}" target="_blank" rel="noopener">
            ${repo.name}
          </a>
          ${repo.fork ? `<span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 400;"> ${t['project.forked']}</span>` : ''}
        </h3>
        <p class="project-description">${escapeHtml(desc)}</p>
        <div class="project-footer">
          <div class="project-lang">
            <span class="lang-dot" style="background: ${langColor};"></span>
            ${repo.language || '—'}
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            ${repo.forks_count > 0 ? `
              <div class="project-forks">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v12"/><path d="M18 9v12"/><path d="M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
                <span>${repo.forks_count}</span>
              </div>
            ` : ''}
            <span style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(repo.updated_at)}</span>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    requestAnimationFrame(() => {
      setupIntersectionObserver();
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function fetchRepos() {
    showToast(translations[currentLang]['toast.loading']);

    const cached = getCachedRepos();
    if (cached) {
      reposData = cached;
      renderProjects(cached);
      updateStats(cached);
      showToast(
        translations[currentLang]['toast.cached'].replace('{count}', cached.length)
      );
      return;
    }

    const url = `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100&type=owner`;

    fetch(url, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        const remaining = res.headers.get('X-RateLimit-Remaining');
        if (remaining === '0') {
          throw new Error('Rate limit exceeded');
        }
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Invalid API response');

        const repos = data
          .filter((r) => !EXCLUDED_REPOS.includes(r.name))
          .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at) - new Date(a.updated_at));

        reposData = repos;
        cacheRepos(repos);
        renderProjects(repos);
        updateStats(repos);
        showToast(
          translations[currentLang]['toast.loaded'].replace('{count}', repos.length)
        );
      })
      .catch((err) => {
        console.error('GitHub fetch error:', err);
        showToast(translations[currentLang]['toast.error']);
        const grid = $('#projectsGrid');
        if (grid) {
          grid.innerHTML = `
            <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 48px;">
              <p style="color: var(--text-muted); font-size: 0.9rem;">⚠️ ${translations[currentLang]['toast.error']}</p>
            </div>
          `;
        }
      });
  }

  function cacheRepos(repos) {
    try {
      const data = { timestamp: Date.now(), repos };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {}
  }

  function getCachedRepos() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data.repos || null;
    } catch {
      return null;
    }
  }

  function updateStats(repos) {
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    const repoCountEl = $('#repoCount');
    const starCountEl = $('#starCount');
    const totalReposEl = $('#totalRepos');
    const totalStarsEl = $('#totalStars');

    if (repoCountEl) repoCountEl.textContent = repos.length;
    if (starCountEl) starCountEl.textContent = totalStars;
    if (totalReposEl) totalReposEl.textContent = repos.length;
    if (totalStarsEl) totalStarsEl.textContent = totalStars;
  }

  function setupIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    $$('.fade-in').forEach((el) => observer.observe(el));
  }

  function setupNavAnimation() {
    const sections = $$('section');
    const navLinks = $$('.nav-links a');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((link) => {
              link.style.color = '';
            });
            const active = document.querySelector(`.nav-links a[href="#${id}"]`);
            if (active) active.style.color = 'var(--accent-light)';
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((s) => observer.observe(s));
  }

  function setupRevealEffect() {
    document.addEventListener('mousemove', (e) => {
      $$('.project-card:not(.skeleton)').forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mouse-x', x + '%');
        card.style.setProperty('--mouse-y', y + '%');
      });
    });
  }

  function setupHeaderScroll() {
    const header = $('#header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
      const current = window.scrollY;
      if (current > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      lastScroll = current;
    }, { passive: true });
  }

  function setupHamburger() {
    const btn = $('#hamburger');
    const nav = $('#navLinks');
    if (!btn || !nav) return;

    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      nav.classList.toggle('open');
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        btn.classList.remove('active');
        nav.classList.remove('open');
      });
    });
  }

  function setupYear() {
    const el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  }

  function init() {
    currentLang = getLangFromStorage();
    applyTranslations();
    updateLangToggleLabel();

    $('#langToggle').addEventListener('click', toggleLang);

    setupHamburger();
    setupHeaderScroll();
    setupYear();
    setupRevealEffect();

    fetchRepos();

    setTimeout(() => setupNavAnimation(), 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
