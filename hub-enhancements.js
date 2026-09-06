/* Sus Games Main Hub - admin game details enhancement. */
(() => {
  'use strict';
  if (window.__susGamesAdminGameDetails) return;
  window.__susGamesAdminGameDetails = true;

  const sb = window.supabaseClient;
  if (!sb) return;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const adminBadge = () => '<span class="sg-admin-badge">ADMIN</span>';

  const waitForAdminView = () => {
    if (typeof window.sgAdminViewUser !== 'function') {
      setTimeout(waitForAdminView, 100);
      return;
    }
    const original = window.sgAdminViewUser;
    if (original.__susWrapped) return;

    async function wrapped(id) {
      await original(id);
      const modal = document.getElementById('sgAdminUserModal');
      const body = modal?.querySelector('.sg-body');
      if (!body) return;

      const [quiz, games] = await Promise.all([
        sb.from('quiz_attempts').select('score,completed_at,quiz_id,quiz_code').eq('user_id', id).order('completed_at', { ascending: false }).limit(100),
        sb.from('game_scores').select('game_type,game_id,score,created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(200)
      ]);

      const q = quiz.data || [];
      const g = games.data || [];
      const puzzle = g.filter(x => x.game_type === 'puzzle');
      const drawzy = g.filter(x => x.game_type === 'drawzy');
      const quizScore = q.reduce((a, x) => a + Number(x.score || 0), 0);
      const puzzleScore = puzzle.reduce((a, x) => a + Number(x.score || 0), 0);
      const drawzyScore = drawzy.reduce((a, x) => a + Number(x.score || 0), 0);

      body.querySelector('.sg-admin-game-details')?.remove();
      const section = document.createElement('div');
      section.className = 'sg-admin-section sg-admin-game-details';
      section.innerHTML = `
        <h3>Game Activity</h3>
        <div class="sg-admin-stats">
          <div class="sg-admin-stat"><strong>${q.length}</strong><span>Quiz Played</span></div>
          <div class="sg-admin-stat"><strong>${puzzle.length}</strong><span>Puzzle Played</span></div>
          <div class="sg-admin-stat"><strong>${drawzy.length}</strong><span>Drawzy Played</span></div>
          <div class="sg-admin-stat"><strong>${g.length + q.length}</strong><span>Total Games</span></div>
        </div>
        <div class="sg-admin-grid" style="margin-top:8px">
          <div><small>Quiz Score</small>${quizScore}</div>
          <div><small>Puzzle Score</small>${puzzleScore}</div>
          <div><small>Drawzy Score</small>${drawzyScore}</div>
          <div><small>Total Score</small>${quizScore + puzzleScore + drawzyScore}</div>
        </div>
        <h3 style="margin-top:16px">Recent Game Activity</h3>
        <div class="sg-list">
          ${[
            ...q.map(x => ({type:'quiz', id:x.quiz_code || x.quiz_id || '—', score:x.score, at:x.completed_at})),
            ...g.map(x => ({type:x.game_type || 'game', id:x.game_id || '—', score:x.score, at:x.created_at}))
          ].sort((a,b) => new Date(b.at || 0) - new Date(a.at || 0)).slice(0,30).map(x => `
            <div class="sg-history-row">
              <div class="sg-main">
                <strong>${esc(x.type === 'quiz' ? '📝 Quiz' : x.type === 'puzzle' ? '🧩 Puzzle' : x.type === 'drawzy' ? '🎨 Drawzy' : x.type)}</strong>
                <small>ID: ${esc(x.id)} · ${x.at ? new Date(x.at).toLocaleString() : '—'}</small>
              </div>
              <span class="score">${Number(x.score || 0)}</span>
            </div>
          `).join('') || '<div class="sg-empty">No game activity yet.</div>'}
        </div>`;
      body.appendChild(section);
    }
    wrapped.__susWrapped = true;
    window.sgAdminViewUser = wrapped;
  };

  // Keep Quiz/Create/About out of the Main Hub header. Those controls belong to Quiz.
  function cleanMainHubHeader() {
    document.querySelectorAll('.header a,.header button').forEach(el => {
      if (el.classList.contains('logo') || el.classList.contains('nav-btn') || el.classList.contains('admin-btn') || el.classList.contains('profile-trigger') || el.classList.contains('login') || el.classList.contains('more')) return;
      const label = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^(Quiz|Create|About)$/.test(label)) el.remove();
    });
  }

  function installHeaderCleanup() {
    cleanMainHubHeader();
    const header = document.querySelector('.header');
    if (!header || header.__susHeaderCleanup) return;
    header.__susHeaderCleanup = true;
    const observer = new MutationObserver(cleanMainHubHeader);
    observer.observe(header, { childList: true, subtree: true });
  }

  async function enhanceChatMessages(chatId) {
    const out = document.getElementById('sgMessages');
    if (!out || !chatId || !window.currentUser) return;
    const { data: rows, error } = await sb.from('direct_messages')
      .select('sender_id,recipient_id,message,created_at')
      .or(`and(sender_id.eq.${window.currentUser.id},recipient_id.eq.${chatId}),and(sender_id.eq.${chatId},recipient_id.eq.${window.currentUser.id})`)
      .order('created_at', { ascending: true }).limit(300);
    if (error) return;
    const ids = [...new Set((rows || []).map(r => r.sender_id))];
    if (!ids.length) return;
    const { data: profiles } = await sb.from('profiles').select('id,display_name,avatar_url').in('id', ids);
    const pm = new Map((profiles || []).map(p => [p.id, p]));
    const adminIds = new Set();
    await Promise.all(ids.map(async id => {
      if (String(id) === String(window.currentUser.id)) {
        try { const { data } = await sb.rpc('is_admin'); if (data === true) adminIds.add(id); } catch {}
      } else {
        try { const { data } = await sb.from('admin_users').select('user_id').eq('user_id', id).maybeSingle(); if (data) adminIds.add(id); } catch {}
      }
    }));

    out.innerHTML = (rows || []).map(r => {
      const p = pm.get(r.sender_id) || {};
      const name = p.display_name || 'User';
      const mine = String(r.sender_id) === String(window.currentUser.id);
      const avatar = p.avatar_url || '';
      const avatarHtml = avatar
        ? `<img class="sg-chat-avatar" src="${esc(avatar)}" alt="" onerror="this.style.display='none'">`
        : `<span class="sg-chat-avatar sg-chat-fallback">${esc(name.trim().slice(0,1).toUpperCase() || 'P')}</span>`;
      return `<div class="sg-msg ${mine ? 'me' : ''}"><div class="sg-msg-author">${avatarHtml}<strong>${esc(name)}</strong>${adminIds.has(r.sender_id) ? adminBadge() : ''}</div><div>${esc(r.message || '')}</div><small>${new Date(r.created_at).toLocaleString()}</small></div>`;
    }).join('') || '<div class="sg-empty">No messages yet.</div>';
    out.scrollTop = out.scrollHeight;
  }

  function installChatEnhancement() {
    const wait = () => {
      if (typeof window.sgOpenChat !== 'function') { setTimeout(wait, 100); return; }
      const original = window.sgOpenChat;
      if (original.__susChatWrapped) return;
      async function wrapped(id) {
        await original(id);
        await enhanceChatMessages(id);
      }
      wrapped.__susChatWrapped = true;
      window.sgOpenChat = wrapped;
    };
    wait();
  }

  function installMobileGameLayout() {
    if (document.getElementById('sg-mobile-game-layout')) return;

    const games = document.querySelector('.games');
    if (!games) {
      setTimeout(installMobileGameLayout, 100);
      return;
    }

    const cards = [...games.querySelectorAll('.card')];
    if (cards.length < 3) return;

    const mobileActions = document.createElement('div');
    mobileActions.id = 'sg-mobile-game-layout';
    mobileActions.className = 'sg-mobile-game-actions';

    cards.forEach(card => {
      const play = card.querySelector('.play');
      if (!play) return;
      const mobilePlay = play.cloneNode(true);
      mobilePlay.classList.add('sg-mobile-play');
      mobileActions.appendChild(mobilePlay);
    });

    games.parentNode.insertBefore(mobileActions, games);

    const style = document.createElement('style');
    style.id = 'sg-mobile-game-layout-style';
    style.textContent = `
      .sg-mobile-game-actions{display:none}
      @media(max-width:800px){
        .sg-mobile-game-actions{
          width:90%;
          margin:32px auto 18px;
          display:grid;
          grid-template-columns:1fr;
          gap:10px;
        }
        .sg-mobile-game-actions .sg-mobile-play{
          width:100%;
          margin:0;
          padding:11px 12px;
          font-size:15px;
        }
        .games{
          width:90%;
          margin-top:0;
          display:grid;
          grid-template-columns:1fr;
          gap:12px;
        }
        .games .card{
          min-height:0;
          padding:17px 18px;
          border-radius:16px;
        }
        .games .card .play{display:none}
        .games .card .icon{
          width:42px;
          height:42px;
          font-size:21px;
          margin-bottom:10px;
        }
        .games .card h2{
          font-size:20px;
          margin-bottom:5px;
        }
        .games .card p{
          flex:none;
          font-size:14px;
          line-height:1.45;
        }
      }
    `;
    document.head.appendChild(style);
  }

  installHeaderCleanup();
  installChatEnhancement();
  waitForAdminView();
  installMobileGameLayout();
})();
