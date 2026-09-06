/* Main Hub final mobile layout + strict admin visibility fix */
(() => {
  'use strict';
  const sb = window.supabaseClient;
  const adminBtn = () => document.getElementById('adminBtn');

  const applyAdminVisibility = async () => {
    const btn = adminBtn();
    if (!btn) return;
    // Never let the base CSS/feature bridge make this visible before verification.
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
    const cards = document.querySelectorAll('.games .card');
    cards.forEach((card, i) => {
      card.querySelector('.icon')?.remove();
      card.querySelector('h2')?.remove();
      card.querySelector('p')?.remove();
      const play = card.querySelector('.play');
      if (!play) return;
      play.classList.add('mobile-game-play');
      play.textContent = i === 0 ? '🎯 Play Quiz' : i === 1 ? '🧩 Play Puzzle' : '🎨 Play Drawzy';
    });
  };

  const boot = () => {
    applyAdminVisibility();
    applyMobileLayout();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('resize', applyMobileLayout);
  // Re-check after auth state changes, and whenever another script touches the header.
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
