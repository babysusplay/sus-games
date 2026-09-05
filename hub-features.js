/* Main Hub feature bridge - stable public handlers */
(() => {
  'use strict';
  const call = (name, ...args) => {
    const fn = window[name];
    if (typeof fn === 'function' && fn !== call) return fn(...args);
    return false;
  };

  window.showSection = function(type) {
    if (type === 'search') return call('sgOpenPlayerSearch') || call('openPlayerSearch');
    if (type === 'social') return call('sgOpenSocial') || call('openSocial');
    if (type === 'leaderboard') return call('sgOpenLeaderboard') || call('openLeaderboard');
    if (type === 'about') {
      const m = document.getElementById('sgAboutModal');
      if (m) { m.classList.add('open'); return true; }
    }
    return false;
  };

  const expose = () => {
    if (typeof window.sgOpenPlayerSearch === 'function') window.openPlayerSearch = window.sgOpenPlayerSearch;
    if (typeof window.sgOpenSocial === 'function') window.openSocial = window.sgOpenSocial;
    if (typeof window.sgOpenLeaderboard === 'function') window.openLeaderboard = window.sgOpenLeaderboard;
    if (typeof window.sgOpenAdminPanel === 'function') window.openAdmin = window.sgOpenAdminPanel;
  };
  expose();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', expose, {once:true});
})();
