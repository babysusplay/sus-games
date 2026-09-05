/* Main Hub feature bundle consolidated into hub-override.js. */
/* Restore production handlers after index.html legacy inline handlers are parsed. */
(() => {
  'use strict';
  const rebind = () => {
    if (typeof window.openPlayerSearch === 'function') {
      window.showSection = type => {
        if (type === 'search') return window.openPlayerSearch();
        if (type === 'social') return window.openSocial?.();
        if (type === 'leaderboard') return window.openLeaderboard?.();
        if (type === 'about') {
          const m = document.getElementById('sgAboutModal');
          if (m) m.classList.add('open');
        }
      };
    }
    if (typeof window.sgViewProfile === 'function') {
      window.viewProfile = () => {
        if (window.currentUser?.id) window.sgViewProfile(window.currentUser.id);
      };
    }
    if (typeof window.sgEditProfile === 'function') window.editProfile = window.sgEditProfile;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rebind, {once:true});
  else rebind();
})();
