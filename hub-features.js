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
  };
  bind();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else setTimeout(bind, 0);
})();
