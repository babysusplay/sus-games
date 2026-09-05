/* Sus Games Main Hub - admin game details enhancement. */
(() => {
  'use strict';
  if (window.__susGamesAdminGameDetails) return;
  window.__susGamesAdminGameDetails = true;

  const sb = window.supabaseClient;
  if (!sb) return;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
  waitForAdminView();
})();
