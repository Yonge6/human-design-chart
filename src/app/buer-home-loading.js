// Intentionally dependency-free: the four primary pages remain recognizable
// while the application module graph is still crossing a slow connection.
(() => {
  const body = document.body;
  if (!body.hasAttribute('data-app-pending')) return;

  const routes = [
    ['[data-home]', 'home'],
    ['[data-manual]', 'growth'],
    ['[data-people]', 'people'],
    ['[data-profile]', 'profile'],
  ];
  const labels = {
    home: '见己',
    growth: '成长档案',
    people: '身边的人',
    profile: '我的',
  };
  const preview = document.querySelector('#workspaceBootPreviews');
  const status = document.querySelector('#workspaceBootStatus');
  const retry = document.querySelector('#workspaceBootRetry');

  function show(view) {
    if (!body.hasAttribute('data-app-pending')) return;
    body.dataset.workspace = view;
    document.querySelectorAll('[data-boot-view]').forEach(section => {
      section.setAttribute('aria-hidden', String(section.dataset.bootView !== view));
    });
    document.querySelectorAll('.buer-rail .rail-item').forEach(item => {
      const active = item.matches(view === 'growth' ? '[data-manual]' : `[data-${view}]`);
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    if (status) status.textContent = `正在读取${labels[view] || '页面'}已保存的内容，页面结构已可浏览…`;
  }

  for (const [selector, view] of routes) {
    document.querySelectorAll(`.buer-rail ${selector}`).forEach(button => {
      button.addEventListener('click', () => show(view));
    });
  }
  retry?.addEventListener('click', () => location.reload());
  show(body.dataset.workspace || 'home');

  const timer = setTimeout(() => {
    if (!body.hasAttribute('data-app-pending')) return;
    if (status) status.textContent = '网络较慢，已保留当前页面结构。正在继续读取账号内容…';
    if (retry) retry.hidden = false;
  }, 10000);

  document.addEventListener('buer:home-ready', () => {
    clearTimeout(timer);
    preview?.setAttribute('aria-busy', 'false');
  }, { once: true });
})();
