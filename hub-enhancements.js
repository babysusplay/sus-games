/* Sus Games Main Hub enhancements */
(() => {
  'use strict';
  const sb = () => (typeof supabaseClient !== 'undefined' ? supabaseClient : window.supabaseClient);
  const HUB = 'https://babysusplay.github.io/sus-games/';
  const ADMIN_EMAIL = 'babysusplay@gmail.com';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fallback = name => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="50" fill="#242833"/><text x="50" y="59" text-anchor="middle" font-family="Arial" font-size="42" font-weight="700" fill="#9da3b0">${String(name||'P').slice(0,1).toUpperCase()}</text></svg>`);
  const img = (url,name,size=44) => `<img src="${esc(url||fallback(name))}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;background:#242833" onerror="this.onerror=null;this.src='${esc(fallback(name))}'">`;

  function syncGameIdentity(profile) {
    if (!profile) return;
    const name = profile.display_name || profile.user_id || 'Player';
    const avatar = profile.avatar_url || '';
    try {
      localStorage.setItem('drawzy_name', name);
      if (avatar) localStorage.setItem('drawzy_avatar', avatar);
      localStorage.setItem('puzzle_sus_local_auth_v1', JSON.stringify({ username:name, password:'shared-account', shared:true }));
      localStorage.setItem('sus_return_hub', HUB);
    } catch (_) {}
  }

  async function getProfile(id) {
    const client = sb();
    const { data, error } = await client.from('profiles').select('id,user_id,display_name,email,provider,avatar_url,discord_user_id,created_at').eq('id',id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function syncCurrent() {
    const client = sb();
    try {
      const { data:{user} } = await client.auth.getUser();
      if (!user) return null;
      const { data:profile } = await client.from('profiles').select('id,user_id,display_name,email,provider,avatar_url,discord_user_id,created_at').eq('id',user.id).maybeSingle();
      if (profile) syncGameIdentity(profile);
      return { user, profile };
    } catch (_) { return null; }
  }

  function addStyles() {
    if ($('hubEnhancementStyle')) return;
    const s = document.createElement('style'); s.id='hubEnhancementStyle';
    s.textContent = `
      .hub-game-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.hub-game-stat{padding:11px 8px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:rgba(255,255,255,.035);text-align:center}.hub-game-stat strong{display:block;font-size:18px}.hub-game-stat span{display:block;color:#858b98;font-size:11px;margin-top:3px}
      .hub-admin-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.hub-admin-tab{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.05);color:#fff;border-radius:9px;padding:8px 11px;font-weight:700}.hub-admin-tab.active{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.22)}
      .hub-admin-panel{display:grid;gap:12px}.hub-admin-section{border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:13px;background:rgba(255,255,255,.025)}.hub-admin-section h3{margin:0 0 5px;font-size:16px}.hub-admin-section p{margin:0 0 10px;color:#858b98;font-size:12px}.hub-admin-row{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#10131a;margin-top:7px}.hub-admin-row .main{flex:1;min-width:0}.hub-admin-row small{display:block;color:#858b98;margin-top:3px}.hub-admin-pill{padding:4px 8px;border-radius:999px;background:rgba(255,70,70,.12);border:1px solid rgba(255,70,70,.35);color:#ff7180;font-size:10px;font-weight:800}.hub-admin-scroll{max-height:360px;overflow:auto}.hub-admin-detail{display:grid;gap:10px}.hub-admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.hub-admin-grid>div{padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#10131a}.hub-admin-grid small{display:block;color:#777d8a;margin-bottom:4px}.hub-admin-history{max-height:260px;overflow:auto}.hub-back{margin-bottom:8px}.hub-history-tools{display:flex;gap:8px}.hub-history-tools input{flex:1}.hub-chat-list{max-height:330px;overflow:auto}.hub-chat-item{padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#10131a;margin-top:7px}.hub-chat-messages{display:grid;gap:6px;margin-top:8px}.hub-chat-message{padding:7px 8px;border-radius:8px;background:rgba(255,255,255,.04);font-size:12px}.hub-chat-message small{display:block;color:#777d8a;margin-top:3px}
      @media(max-width:650px){.hub-game-stats{grid-template-columns:1fr 1fr}.hub-admin-grid{grid-template-columns:1fr}.hub-history-tools{flex-direction:column}}
    `; document.head.appendChild(s);
  }

  async function decorateProfileModal() {
    const modal = $('sgProfileModal'); const body = modal?.querySelector('.sg-body');
    if (!body || !modal.classList.contains('open')) return;
    const idText = body.querySelector('.sg-profile-id')?.textContent || '';
    const m = idText.match(/User ID:\s*([^\s]+)/i); if (!m) return;
    const userId = m[1];
    const client=sb();
    const counts = {};
    for (const type of ['quiz','puzzle','drawzy']) {
      try { const r=await client.from('game_scores').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('game_type',type); counts[type]=Number(r.count||0); } catch (_) { counts[type]=0; }
    }
    let box=body.querySelector('.hub-game-stats');
    if(!box){ box=document.createElement('div'); box.className='hub-game-stats'; const anchor=body.querySelector('.sg-profile-actions')||body.firstChild; body.insertBefore(box,anchor); }
    box.innerHTML=[['quiz','📝 Quiz'],['puzzle','🧩 Puzzle'],['drawzy','🎨 Drawzy']].map(([k,t])=>`<div class="hub-game-stat"><strong>${counts[k]}</strong><span>${t} Games</span></div>`).join('');
  }

  async function isAdmin() {
    try { const {data}=await sb().rpc('is_admin'); if(data===true) return true; } catch (_) {}
    try { const {data:{user}}=await sb().auth.getUser(); return String(user?.email||'').toLowerCase()===ADMIN_EMAIL; } catch (_) { return false; }
  }

  function renderAdminShell() {
    const modal=document.getElementById('sgAdminModal'); if(!modal) return null;
    const body=modal.querySelector('.sg-body');
    body.innerHTML=`<div class="hub-admin-tabs"><button class="hub-admin-tab active" data-tab="chat">💬 Chat Monitor</button><button class="hub-admin-tab" data-tab="history">📊 Game History</button><button class="hub-admin-tab" data-tab="users">👤 Users</button></div><div id="hubAdminContent" class="hub-admin-panel"></div>`;
    body.querySelectorAll('.hub-admin-tab').forEach(b=>b.onclick=()=>{body.querySelectorAll('.hub-admin-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');loadAdminTab(b.dataset.tab)});
    return modal;
  }

  async function adminChat() {
    const out=$('hubAdminContent'); if(!out)return;
    out.innerHTML=`<div class="hub-admin-section"><h3>🔴 Active Chat</h3><p>Conversations with activity in the last 30 minutes.</p><div id="hubActiveChats" class="hub-chat-list">Loading…</div></div><div class="hub-admin-section"><h3>🔔 Recent Chat</h3><p>Recent conversation activity.</p><div id="hubRecentChats" class="hub-chat-list">Loading…</div></div><div class="hub-admin-section"><h3>📚 All Conversations</h3><p>Complete direct-message conversation list.</p><div id="hubAllChats" class="hub-chat-list">Loading…</div></div>`;
    const {data,error}=await sb().from('direct_messages').select('id,sender_id,recipient_id,message,created_at').order('created_at',{ascending:false}).limit(500);
    if(error){out.querySelectorAll('.hub-chat-list').forEach(x=>x.innerHTML='<div class="sg-empty">Unable to load conversations.</div>');return;}
    const rows=data||[], ids=[...new Set(rows.flatMap(x=>[x.sender_id,x.recipient_id]).filter(Boolean))];
    let people=[]; if(ids.length){const r=await sb().from('profiles').select('id,display_name,user_id,avatar_url').in('id',ids);people=r.data||[]}
    const pm=new Map(people.map(p=>[String(p.id),p])); const groups=new Map();
    rows.forEach(m=>{const pair=[String(m.sender_id),String(m.recipient_id)].sort().join(':');if(!groups.has(pair))groups.set(pair,[]);groups.get(pair).push(m)});
    const list=[...groups.values()].map(ms=>ms.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))).sort((a,b)=>new Date(b[0].created_at)-new Date(a[0].created_at));
    const render=(arr,container)=>{const box=$(container);if(!box)return;box.innerHTML=arr.length?arr.map((ms,i)=>{const a=pm.get(String(ms[0].sender_id))||{},b=pm.get(String(ms[0].recipient_id))||{};const title=`${esc(a.display_name||a.user_id||'User')} ↔ ${esc(b.display_name||b.user_id||'User')}`;return `<div class="hub-chat-item"><strong>${title}</strong><small>${ms.length} message${ms.length===1?'':'s'} · ${new Date(ms[0].created_at).toLocaleString()}</small><div class="hub-chat-messages">${ms.slice(0,50).reverse().map(m=>{const p=pm.get(String(m.sender_id))||{};return `<div class="hub-chat-message"><strong>${esc(p.display_name||p.user_id||'User')}</strong>: ${esc(m.message)}<small>${new Date(m.created_at).toLocaleString()}</small></div>`}).join('')}</div></div>`}).join(''):'<div class="sg-empty">No conversations.</div>'};
    const now=Date.now(); render(list.filter(ms=>now-new Date(ms[0].created_at).getTime()<=30*60*1000),'hubActiveChats'); render(list.filter(ms=>now-new Date(ms[0].created_at).getTime()<=24*60*60*1000),'hubRecentChats'); render(list,'hubAllChats');
  }

  async function adminHistory() {
    const out=$('hubAdminContent');if(!out)return;
    out.innerHTML=`<div class="hub-admin-section"><h3>📊 Game History</h3><p>Look up score history by game. Quiz uses the existing quiz attempt records when available; Puzzle and Drawzy use the shared score records.</p><div class="hub-admin-tabs"><button class="hub-admin-tab active" data-game="quiz">📝 Quiz</button><button class="hub-admin-tab" data-game="puzzle">🧩 Puzzle</button><button class="hub-admin-tab" data-game="drawzy">🎨 Drawzy</button></div><div class="hub-history-tools"><input id="hubHistoryId" placeholder="Enter Quiz / Room / Game ID (optional)"><button class="sg-btn" id="hubHistorySearch">Search</button></div><div id="hubHistoryResult" class="hub-admin-history"><div class="sg-empty">Enter an ID or search the selected game.</div></div></div>`;
    let game='quiz'; out.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{out.querySelectorAll('[data-game]').forEach(x=>x.classList.remove('active'));b.classList.add('active');game=b.dataset.game;});
    $('hubHistorySearch').onclick=()=>loadHistoryResults(game,$('hubHistoryId').value.trim());
    await loadHistoryResults(game,'');
  }

  async function loadHistoryResults(game,query) {
    const out=$('hubHistoryResult');if(!out)return;out.innerHTML='<div class="sg-empty">Loading…</div>';
    if(game==='quiz'){
      try{
        let q=sb().from('quiz_attempts').select('*').order('completed_at',{ascending:false}).limit(200);
        const r=await q; if(r.error)throw r.error; let rows=r.data||[];
        if(query) rows=rows.filter(x=>Object.values(x||{}).some(v=>String(v??'').toLowerCase().includes(query.toLowerCase())));
        out.innerHTML=rows.length?rows.slice(0,100).map(x=>`<div class="hub-admin-row"><div class="main"><strong>${esc(x.quiz_code||x.quiz_id||x.quiz_number||'Quiz')}</strong><small>${esc(x.user_id||'')} · ${x.completed_at?new Date(x.completed_at).toLocaleString():''}</small></div><strong>${Number(x.score||0)} pts</strong></div>`).join(''):'<div class="sg-empty">No Quiz history found.</div>';
      }catch(e){out.innerHTML='<div class="sg-empty">Quiz history is unavailable with the current database policy.</div>';}
      return;
    }
    try{
      let q=sb().from('game_scores').select('user_id,game_type,player_name,avatar_url,score,created_at').eq('game_type',game).order('score',{ascending:false}).limit(200); const r=await q;if(r.error)throw r.error;let rows=r.data||[];
      if(query)rows=rows.filter(x=>Object.values(x||{}).some(v=>String(v??'').toLowerCase().includes(query.toLowerCase())));
      out.innerHTML=rows.length?rows.map(x=>`<div class="hub-admin-row">${img(x.avatar_url,x.player_name,40)}<div class="main"><strong>${esc(x.player_name||'Player')}</strong><small>${esc(x.user_id||'')} · ${x.created_at?new Date(x.created_at).toLocaleString():''}</small></div><strong>${Number(x.score||0)} pts</strong></div>`).join(''):'<div class="sg-empty">No score history found.</div>';
    }catch(e){out.innerHTML='<div class="sg-empty">Game history is unavailable.</div>';}
  }

  async function adminUsers() {
    const out=$('hubAdminContent');if(!out)return;
    out.innerHTML=`<div class="hub-admin-section"><h3>👤 Users</h3><p>Admin-only user lookup. Email and Discord ID are shown only inside this admin view.</p><input id="hubUserSearch" placeholder="Search name, email, User ID or Discord ID" style="margin-bottom:9px"><div id="hubUserList" class="hub-admin-scroll">Loading…</div><div id="hubUserDetail"></div></div>`;
    const r=await sb().from('profiles').select('*').order('created_at',{ascending:false}); if(r.error){$('hubUserList').innerHTML='<div class="sg-empty">Unable to load users.</div>';return}
    window.__hubAdminUsers=r.data||[]; renderUsers(window.__hubAdminUsers); $('hubUserSearch').oninput=e=>{const q=e.target.value.toLowerCase();renderUsers(window.__hubAdminUsers.filter(p=>[p.display_name,p.user_id,p.email,p.discord_user_id,p.id].filter(Boolean).join(' ').toLowerCase().includes(q)))};
  }
  function renderUsers(rows){const out=$('hubUserList');if(!out)return;out.innerHTML=rows.length?rows.map(p=>`<div class="hub-admin-row">${img(p.avatar_url,p.display_name,40)}<div class="main"><strong>${esc(p.display_name||'User')}</strong><small>${esc(p.user_id||'')} · ${esc(p.email||'—')}</small></div><button class="sg-btn" onclick="hubAdminUser('${esc(p.id)}')">View</button></div>`).join(''):'<div class="sg-empty">No users found.</div>'}
  window.hubAdminUser=async id=>{const box=$('hubUserDetail');if(!box)return;const p=await getProfile(id);if(!p)return;const [hist,quizzes,attempts,scores]=await Promise.all([sb().from('avatar_history').select('*').eq('user_id',id).order('changed_at',{ascending:false}),sb().from('quizzes').select('*').eq('creator_id',id).order('created_at',{ascending:false}),sb().from('quiz_attempts').select('*').eq('user_id',id).order('completed_at',{ascending:false}),sb().from('game_scores').select('*').eq('user_id',id).order('created_at',{ascending:false}).limit(200)]);$('hubUserList').style.display='none';box.innerHTML=`<div class="hub-admin-detail"><button class="sg-btn hub-back" onclick="$('hubUserDetail').innerHTML='';$('hubUserList').style.display='block'">← Back</button><div style="text-align:center">${img(p.avatar_url,p.display_name,92)}<h3>${esc(p.display_name||'User')}</h3><div class="sg-note">${esc(p.user_id||'')}</div></div><div class="hub-admin-grid"><div><small>Email</small>${esc(p.email||'—')}</div><div><small>Provider</small>${esc(p.provider||'—')}</div><div><small>Discord ID</small>${esc(p.discord_user_id||'—')}</div><div><small>Created</small>${p.created_at?new Date(p.created_at).toLocaleString():'—'}</div></div><h3>Profile Pictures (${(hist.data||[]).length})</h3>${(hist.data||[]).map(x=>img(x.avatar_url,'Profile',70)).join('')||'<div class="sg-note">No history.</div>'}<h3>Quizzes Created (${(quizzes.data||[]).length})</h3>${(quizzes.data||[]).map(x=>`<div class="hub-admin-row"><div class="main"><strong>${esc(x.title||'Untitled Quiz')}</strong><small>${esc(x.quiz_id||x.id)}</small></div></div>`).join('')||'<div class="sg-note">None.</div>'}<h3>Game Scores (${(scores.data||[]).length})</h3>${(scores.data||[]).slice(0,100).map(x=>`<div class="hub-admin-row"><div class="main"><strong>${esc(x.game_type||'game')}</strong><small>${x.created_at?new Date(x.created_at).toLocaleString():''}</small></div><strong>${Number(x.score||0)}</strong></div>`).join('')||'<div class="sg-note">None.</div>'}<h3>Quiz Attempts (${(attempts.data||[]).length})</h3>${(attempts.data||[]).slice(0,100).map(x=>`<div class="hub-admin-row"><div class="main"><strong>${esc(x.quiz_code||x.quiz_id||'Quiz')}</strong><small>${x.completed_at?new Date(x.completed_at).toLocaleString():''}</small></div><strong>${Number(x.score||0)}</strong></div>`).join('')||'<div class="sg-note">None.</div>'}</div>`};

  async function loadAdminTab(tab){ if(tab==='chat')return adminChat(); if(tab==='history')return adminHistory(); return adminUsers(); }

  async function openEnhancedAdmin(){
    if(!(await isAdmin())){alert('Admin access is restricted.');return;}
    let modal=$('sgAdminModal'); if(!modal){ if(typeof window.openAdmin==='function'){ try{ await window.openAdmin(); }catch(_){} } modal=$('sgAdminModal'); }
    if(!modal)return;
    renderAdminShell(); modal.classList.add('open'); await loadAdminTab('chat');
  }
  window.openAdmin=openEnhancedAdmin;
  window.openAdminPanel=openEnhancedAdmin;

  function installProfileBridge(){
    window.viewProfile=async()=>{const id=window.currentUser?.id||window.__hubCurrentUser?.id;if(!id)return;document.getElementById('profileMenu')?.classList.remove('open');if(window.sgViewProfile)await window.sgViewProfile(id);setTimeout(decorateProfileModal,120)};
    window.editProfile=async()=>{document.getElementById('profileMenu')?.classList.remove('open');if(window.sgEditProfile)await window.sgEditProfile();};
    if(window.sgViewProfile){const original=window.sgViewProfile;window.sgViewProfile=async id=>{await original(id);setTimeout(decorateProfileModal,150);};}
  }

  function installOpenGameBridge(){
    const original=window.openGame; if(typeof original!=='function'||original.__enhanced)return;
    const fn=function(game){ syncCurrent().finally(()=>{}); try{localStorage.setItem('sus_return_hub',HUB)}catch(_){} return original(game); }; fn.__enhanced=true; window.openGame=fn;
  }

  async function boot(){
    addStyles();
    const account=await syncCurrent();
    if(account?.profile) window.__hubCurrentUser=account.user;
    installProfileBridge(); installOpenGameBridge();
    const observer=new MutationObserver(()=>{installProfileBridge();installOpenGameBridge();if($('sgProfileModal')?.classList.contains('open'))decorateProfileModal();});
    observer.observe(document.body,{subtree:true,childList:true});
    sb().auth.onAuthStateChange(async()=>{const a=await syncCurrent();if(a?.profile)window.__hubCurrentUser=a.user;});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();