/* Main Hub final mobile layout + strict admin visibility fix */
(() => {
  'use strict';
  const sb = window.supabaseClient;
  const style = document.createElement('style');
  style.id = 'finalMobileHubStyle';
  style.textContent = `
    #adminBtn{display:none!important}
    .mobile-game-brief{display:none}
    @media(max-width:800px){
      .hero{display:none!important}
      .games{display:flex!important;flex-direction:column!important;width:90%!important;margin:28px auto 0!important;gap:12px!important}
      .games .card{background:transparent!important;border:0!important;border-radius:0!important;min-height:0!important;height:auto!important;padding:0!important;overflow:visible!important;transform:none!important}
      .games .card:before{display:none!important}
      .games .icon,.games .card h2,.games .card p{display:none!important}
      .games .card .play{display:flex!important;width:100%!important;margin:0!important;min-height:76px!important;padding:18px 16px!important;border-radius:14px!important;font-size:19px!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important}
      .games .card:nth-child(3) .play{min-height:50px!important;padding:12px 16px!important;font-size:16px!important}
      .mobile-game-brief{display:block!important;width:90%!important;margin:30px auto 0!important}
      .mobile-game-brief h2{font-size:22px!important;margin:0 0 14px!important}
      .brief-item,.brief-about{padding:13px 0!important;border-top:1px solid rgba(255,255,255,.08)!important}
      .brief-item strong,.brief-about strong{display:block!important;font-size:15px!important;margin-bottom:5px!important}
      .brief-item p,.brief-about p{color:#8f95a2!important;font-size:13px!important;line-height:1.5!important;margin:0!important}
      .brief-about{margin-top:5px!important;padding-bottom:0!important}
      .footer{width:90%!important;margin-top:28px!important;padding-top:22px!important}
    }
  `;
  document.head.appendChild(style);

  const adminBtn = () => document.getElementById('adminBtn');
  const applyAdminVisibility = async () => {
    const btn = adminBtn();
    if (!btn) return;
    btn.style.setProperty('display', 'none', 'important');
    let allowed = false;
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data, error } = await sb.rpc('is_admin');
        allowed = !error && data === true;
      }
    } catch (_) { allowed = false; }
    if (allowed) btn.style.setProperty('display', 'inline-flex', 'important');
    else btn.remove();
  };

  const addMobileBrief = () => {
    if (document.getElementById('mobileGameBrief')) return;
    const games = document.querySelector('.games');
    if (!games) return;
    const wrap = document.createElement('section');
    wrap.id = 'mobileGameBrief';
    wrap.className = 'mobile-game-brief';
    wrap.innerHTML = `
      <h2>Game Brief</h2>
      <div class="brief-item"><strong>🎯 Quiz</strong><p>Answer questions, create quizzes and compete for scores.</p></div>
      <div class="brief-item"><strong>🧩 Puzzle</strong><p>Solve puzzles, test your skills and climb the ranking.</p></div>
      <div class="brief-item"><strong>🎨 Drawzy</strong><p>Draw, guess and compete in multiplayer rooms.</p></div>
      <div class="brief-about"><strong>About Info</strong><p>Sus Games is a community hub for Quiz, Puzzle and Drawzy.</p></div>`;
    games.insertAdjacentElement('afterend', wrap);
  };

  const applyMobileLayout = () => {
    addMobileBrief();
    if (window.innerWidth > 800) return;
    document.querySelectorAll('.games .card').forEach((card, i) => {
      card.querySelector('.icon')?.remove();
      card.querySelector('h2')?.remove();
      card.querySelector('p')?.remove();
      const play = card.querySelector('.play');
      if (play) {
        play.classList.add('mobile-game-play');
        play.textContent = i === 0 ? '🎯 Play Quiz' : i === 1 ? '🧩 Play Puzzle' : '🎨 Play Drawzy';
      }
    });
  };

  const boot = () => { applyAdminVisibility(); applyMobileLayout(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('resize', applyMobileLayout);
  if (sb?.auth?.onAuthStateChange) sb.auth.onAuthStateChange(() => setTimeout(applyAdminVisibility, 50));
  const observer = new MutationObserver(() => {
    const btn = adminBtn();
    if (btn && btn.dataset.strictAdminChecked !== '1') {
      btn.dataset.strictAdminChecked = '1';
      applyAdminVisibility();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
