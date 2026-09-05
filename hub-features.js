/* Main Hub feature bridge - stable public handlers */
(() => {
  'use strict';

  // These are the real production handlers exposed by hub-override.js.
  // Keep the legacy HTML button entry point, but route it to the live system.
  window.showSection = function(type) {
    if (type === 'search' && typeof window.openPlayerSearch === 'function') return window.openPlayerSearch();
    if (type === 'social' && typeof window.openSocial === 'function') return window.openSocial();
    if (type === 'leaderboard' && typeof window.openLeaderboard === 'function') return window.openLeaderboard();
    if (type === 'about') {
      const m = document.getElementById('sgAboutModal');
      if (m) { m.classList.add('open'); return; }
    }
  };

  // Keep the Admin button the same visual size/shape as the Social button.
  const style = document.createElement('style');
  style.id = 'susGamesHubButtonFix';
  style.textContent = `
    #adminBtn, .admin-menu-btn {
      display:inline-flex !important;
      align-items:center;
      justify-content:center;
      gap:8px;
      min-height:44px;
      padding:10px 18px;
      border-radius:12px;
      box-sizing:border-box;
      font:inherit;
    }
  `;
  document.head.appendChild(style);

  // Reposition the Main Hub header to match the established Quiz header layout.
  // This is layout-only: existing buttons and their handlers are preserved.
  const applyHubHeaderLayout = () => {
    const nav = document.querySelector('.header .nav');
    const header = document.querySelector('.header');
    if (!nav || !header || document.getElementById('sgHeaderLayout')) return;

    const style = document.createElement('style');
    style.id = 'sgHeaderLayout';
    style.textContent = `
      .header{position:sticky;top:0;z-index:50;}
      .header .nav{flex:1;justify-content:flex-end;min-width:0;}
      .sg-hub-links{display:flex;align-items:center;justify-content:center;gap:24px;margin-left:auto;margin-right:24px;}
      .sg-hub-link{border:0;background:transparent;color:#aaa;text-decoration:none;font-size:14px;font-weight:600;padding:6px 0;cursor:pointer;white-space:nowrap;}
      .sg-hub-link:hover{color:#fff;}
      .sg-hub-actions{display:flex;align-items:center;gap:8px;}
      .sg-hub-actions .profile{order:10;}
      .sg-hub-actions #loginBtn{order:11;}
      .sg-hub-actions .more{order:12;}
      @media(max-width:1000px){.sg-hub-links{gap:14px;margin-right:14px}.sg-hub-link{font-size:13px}.sg-hub-actions{gap:6px}}
      @media(max-width:800px){.sg-hub-links{display:none}.sg-hub-actions{margin-left:auto}.header .nav{flex:1}}
    `;
    document.head.appendChild(style);

    // Keep the original functional controls intact, only regroup their DOM nodes.
    const links = document.createElement('div');
    links.className = 'sg-hub-links';
    links.innerHTML = `
      <button type="button" class="sg-hub-link" onclick="window.location.href='https://babysusplay.github.io/quiz-website/'">Quiz</button>
      <button type="button" class="sg-hub-link" onclick="window.location.href='https://babysusplay.github.io/quiz-website/#create'">Create</button>
      <button type="button" class="sg-hub-link" onclick="showSection('about')">About</button>
    `;

    const actions = document.createElement('div');
    actions.className = 'sg-hub-actions';
    while (nav.firstChild) actions.appendChild(nav.firstChild);

    nav.appendChild(links);
    nav.appendChild(actions);
  };

  // The production override already exposes the handlers. Re-assert the
  // legacy aliases after parsing so an inline legacy declaration cannot win.
  const bind = () => {
    if (typeof window.openAdminPanel === 'function') window.openAdmin = window.openAdminPanel;
    if (typeof window.sgEditProfile === 'function') window.editProfile = window.sgEditProfile;
    if (typeof window.sgViewProfile === 'function') {
      window.viewProfile = () => {
        if (window.currentUser?.id && typeof window.sgViewProfile === 'function') window.sgViewProfile(window.currentUser.id);
        document.getElementById('profileMenu')?.style && (document.getElementById('profileMenu').style.display = 'none');
      };
    }
    applyHubHeaderLayout();
  };
  bind();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else setTimeout(bind, 0);
})();
