/* Main Hub feature bridge.
 * Runs after index.html has parsed so legacy inline declarations cannot
 * overwrite the production handlers from hub-override.js.
 */
(() => {
  'use strict';
  const install = () => {
    if (typeof window.openPlayerSearch !== 'function') return;
    window.showSection = (type) => {
      if (type === 'search') return window.openPlayerSearch();
      if (type === 'social' && typeof window.openSocial === 'function') return window.openSocial();
      if (type === 'leaderboard' && typeof window.openLeaderboard === 'function') return window.openLeaderboard();
      if (type === 'about') {
        const m = document.getElementById('sgAboutModal');
        if (m) m.classList.add('open');
      }
    };
    if (typeof window.openAdminPanel === 'function') window.openAdmin = window.openAdminPanel;
    if (typeof window.sgEditProfile === 'function') window.editProfile = window.sgEditProfile;
    if (typeof window.sgViewProfile === 'function') {
      window.viewProfile = () => {
        if (window.currentUser?.id) window.sgViewProfile(window.currentUser.id);
        const menu = document.getElementById('profileMenu');
        if (menu) menu.style.display = 'none';
      };
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
