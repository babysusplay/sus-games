/* Sus Games Main Hub - mobile layout + secure admin visibility bridge */
(() => {
  'use strict';

  window.showSection = function(type) {
    if (type === 'search' && typeof window.openPlayerSearch === 'function') return window.openPlayerSearch();
    if (type === 'social' && typeof window.openSocial === 'function') return window.openSocial();
    if (type === 'leaderboard' && typeof window.openLeaderboard === 'function') return window.openLeaderboard();
    if (type === 'about') {
      const m = document.getElementById('sgAboutModal');
      if (m) { m.classList.add('open'); return; }
      if (typeof window.openAbout === 'function') return window.openAbout();
    }
  };

  const getSB = () => {
    try { if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient; } catch (_) {}
    return window.supabaseClient || null;
  };

  const adminStyle = document.createElement('style');
  adminStyle.id = 'susGamesSecureAdminStyle';
  adminStyle.textContent = `
    #adminBtn,.admin-menu-btn{display:none!important}
    #adminBtn.sg-admin-authorized{display:inline-flex!important;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:12px;box-sizing:border-box;font:inherit}
    @media(max-width:800px){
      .profile-trigger{width:52px!important;min-width:52px!important;max-width:52px!important;padding:0!important;justify-content:center!important;gap:0!important}
      .profile-trigger .profile-name,.profile-trigger .profile-caret{display:none!important}
      .profile-trigger .profile-avatar{width:36px!important;height:36px!important;margin:0!important;flex:0 0 36px!important}
    }
  `;
  document.head.appendChild(adminStyle);

  async function refreshAdminVisibility() {
    const btn = document.getElementById('adminBtn');
    if (!btn) return;
    btn.classList.remove('sg-admin-authorized');
    btn.style.setProperty('display','none','important');
    const sb = getSB();
    if (!sb) return;
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { data, error } = await sb.rpc('is_admin');
      if (!error && data === true) {
        btn.classList.add('sg-admin-authorized');
        btn.style.removeProperty('display');
      }
    } catch (_) {}
  }

  function bind() {
    if (typeof window.openAdminPanel === 'function') window.openAdmin = window.openAdminPanel;
    if (typeof window.sgEditProfile === 'function') window.editProfile = window.sgEditProfile;
    if (typeof window.sgViewProfile === 'function') {
      window.viewProfile = () => {
        if (window.currentUser?.id) window.sgViewProfile(window.currentUser.id);
        document.getElementById('profileMenu')?.classList.remove('open');
      };
    }
    refreshAdminVisibility();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
  else bind();

  const sb = getSB();
  if (sb?.auth) sb.auth.onAuthStateChange(() => setTimeout(refreshAdminVisibility, 0));

  function installMobileHub() {
    if (document.getElementById('sg-mobile-final-layout')) return;
    const games = document.querySelector('.games');
    if (!games) { setTimeout(installMobileHub, 100); return; }
    const cards = [...games.querySelectorAll('.card')];
    if (cards.length < 3) return;

    const wrap = document.createElement('div');
    wrap.id = 'sg-mobile-final-layout';
    wrap.innerHTML = `
      <button class="sg-mobile-final-play" data-game="quiz">🎯 Play Quiz</button>
      <button class="sg-mobile-final-play" data-game="puzzle">🧩 Play Puzzle</button>
      <button class="sg-mobile-final-play" data-game="drawzy">🎨 Play Drawzy</button>
    `;

    wrap.querySelectorAll('.sg-mobile-final-play').forEach((button, index) => {
      const original = cards[index]?.querySelector('.play');
      button.addEventListener('click', () => {
        if (original) original.click();
        else if (typeof window.openGame === 'function') window.openGame(button.dataset.game);
      });
    });

    const brief = document.createElement('section');
    brief.id = 'sg-mobile-final-brief';
    brief.innerHTML = `
      <h2>Game Brief</h2>
      <div><strong>🎯 Quiz</strong><p>Create and play quizzes, then compete for scores.</p></div>
      <div><strong>🧩 Puzzle</strong><p>Solve puzzles and climb the ranking.</p></div>
      <div><strong>🎨 Drawzy</strong><p>Draw, guess and compete in multiplayer rooms.</p></div>
    `;

    const about = document.createElement('section');
    about.id = 'sg-mobile-final-about';
    about.innerHTML = `<h2>About Info</h2><p>Sus Games is a community hub connecting Quiz, Puzzle and Drawzy.</p>`;

    games.parentNode.insertBefore(wrap, games);
    games.parentNode.insertBefore(brief, games.nextSibling);
    games.parentNode.insertBefore(about, brief.nextSibling);

    const style = document.createElement('style');
    style.id = 'sg-mobile-final-layout-style';
    style.textContent = `
      #sg-mobile-final-layout,#sg-mobile-final-brief,#sg-mobile-final-about{display:none}
      @media(max-width:800px){
        .hero .kicker,.hero p{display:none!important}
        .hero{width:92%;margin:38px auto 0;padding:12px 0 0}
        .hero h1{font-size:42px;line-height:1.02;letter-spacing:-2px;margin-bottom:0}
        #sg-mobile-final-layout{width:90%;margin:34px auto 0;display:grid;grid-template-columns:1fr;gap:12px}
        #sg-mobile-final-layout .sg-mobile-final-play{width:100%;height:60px;border:0;border-radius:12px;background:#fff;color:#111;font-size:18px;font-weight:800;box-shadow:0 2px 10px rgba(0,0,0,.16)}
        #sg-mobile-final-layout .sg-mobile-final-play:active{transform:scale(.99)}
        .games{display:none!important}
        #sg-mobile-final-brief{width:90%;margin:28px auto 0;display:block}
        #sg-mobile-final-brief h2,#sg-mobile-final-about h2{font-size:18px;margin-bottom:12px;color:#fff}
        #sg-mobile-final-brief>div{padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08)}
        #sg-mobile-final-brief strong{font-size:14px}
        #sg-mobile-final-brief p{color:#8f95a2;font-size:13px;line-height:1.45;margin-top:3px}
        #sg-mobile-final-about{width:90%;margin:26px auto 0;display:block;padding:22px 0 35px;border-top:1px solid rgba(255,255,255,.08)}
        #sg-mobile-final-about p{color:#8f95a2;font-size:13px;line-height:1.5}
        .footer{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installMobileHub, { once:true });
  else installMobileHub();
})();