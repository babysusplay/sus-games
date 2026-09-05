/* Main Hub feature bridge - stable public handlers for Search / Social / Admin. */
(() => {
  'use strict';

  const init = () => {
    const sb = window.supabaseClient || window.supabase;
    if (!sb) return;

    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const avatar = (p) => p?.avatar_url || `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="#242833"/><text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="27" fill="#aaa">${String(p?.display_name || 'U').trim().slice(0,1).toUpperCase()}</text></svg>`)}`;

    if (!document.getElementById('hubStableStyle')) {
      const st = document.createElement('style'); st.id = 'hubStableStyle'; st.textContent = `
        #hubStableModal{position:fixed;inset:0;background:rgba(0,0,0,.76);display:none;align-items:flex-start;justify-content:center;padding:6vh 14px 24px;z-index:12000;overflow:auto;backdrop-filter:blur(4px)}
        #hubStableModal.open{display:flex}.hub-stable-box{width:min(820px,100%);max-height:88vh;overflow:auto;background:#171a22;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
        .hub-stable-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}.hub-stable-head h2{margin:0;font-size:25px}.hub-stable-close{border:0;background:transparent;color:#aaa;font-size:28px;cursor:pointer}.hub-stable-input{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:#10131a;color:#fff;outline:none}.hub-stable-input:focus{border-color:rgba(255,255,255,.3)}
        .hub-stable-list{display:grid;gap:9px;margin-top:12px}.hub-stable-user{display:flex;align-items:center;gap:11px;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025);cursor:pointer}.hub-stable-user:hover{background:rgba(255,255,255,.07)}.hub-stable-user img{width:46px;height:46px;border-radius:50%;object-fit:cover}.hub-stable-main{min-width:0;flex:1}.hub-stable-main strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hub-stable-main small{display:block;color:#858b98;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hub-stable-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.hub-stable-tab,.hub-stable-btn{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.055);color:#fff;border-radius:10px;padding:9px 13px;cursor:pointer}.hub-stable-tab.active{background:rgba(255,255,255,.13)}.hub-stable-empty{text-align:center;padding:30px;color:#858b98}.hub-stable-note{font-size:12px;color:#858b98;margin-top:8px}.hub-admin-badge{display:inline-block;margin-left:6px;padding:2px 7px;border-radius:999px;color:#ff6470;border:1px solid rgba(255,80,90,.55);background:rgba(255,80,90,.1);font-size:10px;font-weight:800;vertical-align:middle}.hub-admin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.hub-admin-stat{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:#10131a}.hub-admin-stat b{display:block;font-size:20px}.hub-admin-stat span{display:block;color:#858b98;font-size:10px;margin-top:3px}.hub-admin-details{display:grid;gap:8px}.hub-admin-details>div{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#10131a}.hub-admin-details small{display:block;color:#777d8a;margin-bottom:3px}@media(max-width:650px){.hub-admin-grid{grid-template-columns:1fr 1fr}}
      `; document.head.appendChild(st);
    }

    const modal = () => {
      let m = document.getElementById('hubStableModal');
      if (!m) { m=document.createElement('div'); m.id='hubStableModal'; m.innerHTML='<div class="hub-stable-box"><div class="hub-stable-head"><h2 id="hubStableTitle"></h2><button class="hub-stable-close" type="button">×</button></div><div id="hubStableBody"></div></div>'; document.body.appendChild(m); m.querySelector('.hub-stable-close').onclick=()=>m.classList.remove('open'); m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}); }
      return m;
    };
    const show = (title, html) => { const m=modal(); m.querySelector('#hubStableTitle').textContent=title; m.querySelector('#hubStableBody').innerHTML=html; m.classList.add('open'); return m; };

    const currentUser = async () => { const {data:{user}} = await sb.auth.getUser(); return user; };

    async function openSearch() {
      const m=show('Search Players','<input id="hubStableSearch" class="hub-stable-input" autocomplete="off" placeholder="Search player name…"><div id="hubStableResults" class="hub-stable-list"><div class="hub-stable-empty">Start typing to search players.</div></div>');
      const input=m.querySelector('#hubStableSearch'), results=m.querySelector('#hubStableResults');
      let timer;
      const run=async()=>{const q=input.value.trim(); if(!q){results.innerHTML='<div class="hub-stable-empty">Start typing to search players.</div>';return;} results.innerHTML='<div class="hub-stable-empty">Searching…</div>'; const {data,error}=await sb.from('profiles').select('id,user_id,display_name,avatar_url').ilike('display_name',`%${q}%`).order('display_name').limit(20); if(error){results.innerHTML='<div class="hub-stable-empty">Unable to load players.</div>';return;} if(!data?.length){results.innerHTML='<div class="hub-stable-empty">No players found.</div>';return;} results.innerHTML=data.map(p=>`<div class="hub-stable-user" data-player="${esc(p.id)}"><img src="${esc(avatar(p))}"><div class="hub-stable-main"><strong>${esc(p.display_name||'User')}</strong><small>${esc(p.user_id||'')}</small></div></div>`).join(''); results.querySelectorAll('[data-player]').forEach(x=>x.onclick=()=>{if(typeof window.sgViewProfile==='function')window.sgViewProfile(x.dataset.player);else if(typeof window.viewProfile==='function')window.viewProfile(x.dataset.player);});};
      input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,120)}); input.focus();
    }

    async function openSocial() {
      const user=await currentUser(); if(!user){ if(typeof window.openAuth==='function')return window.openAuth(); return show('Social','Please log in first.'); }
      const m=show('Social','<div class="hub-stable-tabs"><button class="hub-stable-tab active" data-tab="friends">Friends</button><button class="hub-stable-tab" data-tab="followers">Followers</button><button class="hub-stable-tab" data-tab="following">Following</button><button class="hub-stable-tab" data-tab="messages">Messages</button></div><div id="hubSocialList" class="hub-stable-list"></div>');
      const list=m.querySelector('#hubSocialList');
      async function load(tab){list.innerHTML='<div class="hub-stable-empty">Loading…</div>'; let ids=[];
        if(tab==='following'||tab==='friends'){const {data}=await sb.from('profile_follows').select('following_id,follower_id').eq('follower_id',user.id); const mine=data||[]; if(tab==='following')ids=mine.map(r=>r.following_id); else {const {data:back}=await sb.from('profile_follows').select('following_id,follower_id').eq('following_id',user.id); const set=new Set((back||[]).map(r=>r.follower_id));ids=mine.map(r=>r.following_id).filter(id=>set.has(id));}}
        else if(tab==='followers'){const {data}=await sb.from('profile_follows').select('follower_id').eq('following_id',user.id);ids=(data||[]).map(r=>r.follower_id);}
        else {list.innerHTML='<div class="hub-stable-empty">Messages are available from mutual friends in their player profile.</div>';return;}
        if(!ids.length){list.innerHTML='<div class="hub-stable-empty">No players here yet.</div>';return;} const {data}=await sb.from('profiles').select('id,user_id,display_name,avatar_url').in('id',ids.slice(0,100)); if(!data?.length){list.innerHTML='<div class="hub-stable-empty">No players found.</div>';return;} list.innerHTML=data.map(p=>`<div class="hub-stable-user" data-player="${esc(p.id)}"><img src="${esc(avatar(p))}"><div class="hub-stable-main"><strong>${esc(p.display_name||'User')}</strong><small>${esc(p.user_id||'')}</small></div></div>`).join(''); list.querySelectorAll('[data-player]').forEach(x=>x.onclick=()=>{if(typeof window.sgViewProfile==='function')window.sgViewProfile(x.dataset.player);});
      }
      m.querySelectorAll('[data-tab]').forEach(t=>t.onclick=()=>{m.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));t.classList.add('active');load(t.dataset.tab)}); load('friends');
    }

    async function openAdmin() {
      const user=await currentUser(); if(!user)return show('Admin Panel','Please log in first.'); const {data:admin}=await sb.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle(); if(!admin)return show('Admin Panel','Access denied.');
      const m=show('Admin Panel','<input id="hubAdminSearch" class="hub-stable-input" placeholder="Search users…" autocomplete="off"><div id="hubAdminList" class="hub-stable-list"></div>'); const input=m.querySelector('#hubAdminSearch'),list=m.querySelector('#hubAdminList'); let timer;
      const run=async()=>{const q=input.value.trim();if(!q){list.innerHTML='<div class="hub-stable-empty">Search for a user to inspect their details.</div>';return;} const {data}=await sb.from('profiles').select('id,user_id,display_name,avatar_url,discord_user_id,provider,created_at').or(`display_name.ilike.%${q}%,user_id.ilike.%${q}%`).limit(30); list.innerHTML=(data||[]).map(p=>`<div class="hub-stable-user" data-admin-user="${esc(p.id)}"><img src="${esc(avatar(p))}"><div class="hub-stable-main"><strong>${esc(p.display_name||'User')}</strong><small>${esc(p.user_id||'')}</small></div></div>`).join('')||'<div class="hub-stable-empty">No users found.</div>'; list.querySelectorAll('[data-admin-user]').forEach(x=>x.onclick=()=>adminUser(x.dataset.adminUser));}; input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,180)}); input.focus();
      async function adminUser(id){const {data:p}=await sb.from('profiles').select('id,user_id,display_name,avatar_url,discord_user_id,provider,created_at').eq('id',id).maybeSingle();if(!p)return;const [{count:games},{count:quiz},{data:scoreRows}]=await Promise.all([sb.from('game_scores').select('id',{count:'exact',head:true}).eq('user_id',id),sb.from('quiz_attempts').select('id',{count:'exact',head:true}).eq('user_id',id),sb.from('game_scores').select('game_type,score').eq('user_id',id).limit(500)]);const puzzle=(scoreRows||[]).filter(x=>x.game_type==='puzzle').length,drawzy=(scoreRows||[]).filter(x=>x.game_type==='drawzy').length;show('User Details',`<div style="text-align:center"><img src="${esc(avatar(p))}" style="width:86px;height:86px;border-radius:50%;object-fit:cover"><h3>${esc(p.display_name||'User')}</h3></div><div class="hub-admin-grid"><div class="hub-admin-stat"><b>${Number(quiz||0)}</b><span>Quiz</span></div><div class="hub-admin-stat"><b>${puzzle}</b><span>Puzzle</span></div><div class="hub-admin-stat"><b>${drawzy}</b><span>Drawzy</span></div></div><div class="hub-admin-details"><div><small>User ID</small>${esc(p.user_id||'')}</div><div><small>Email</small>${esc((await sb.auth.admin?.getUserById?.(id))?.data?.user?.email||'Admin-only data unavailable')}</div><div><small>Discord ID</small>${esc(p.discord_user_id||'Not linked')}</div><div><small>Provider</small>${esc(p.provider||'')}</div><div><small>Created</small>${esc(p.created_at||'')}</div></div>`);}
    }

    // Capture clicks before legacy inline onclick handlers. Nothing is deleted; only the public entry points are redirected.
    document.addEventListener('click', (e) => {
      const el=e.target.closest('button,a,[role="button"]'); if(!el)return;
      const text=(el.textContent||'').trim().toLowerCase(); const id=(el.id||'').toLowerCase();
      if(id.includes('search') || text==='search' || text.includes('search player')) { e.preventDefault(); e.stopImmediatePropagation(); openSearch(); return; }
      if(id.includes('social') || text==='social') { e.preventDefault(); e.stopImmediatePropagation(); openSocial(); return; }
      if(id.includes('admin') || text==='admin panel') { e.preventDefault(); e.stopImmediatePropagation(); openAdmin(); return; }
    }, true);

    // Keep Admin button visually consistent with Social and other main hub buttons.
    const sizeAdmin=()=>document.querySelectorAll('button,a').forEach(el=>{const t=(el.textContent||'').trim().toLowerCase();if(t==='admin'||t==='admin panel'){el.style.padding='';el.style.minWidth='';el.style.height='';el.style.borderRadius='';}});
    sizeAdmin(); setTimeout(sizeAdmin,500); setTimeout(sizeAdmin,1500);

    // Public compatibility hooks for any code that calls these names.
    window.openPlayerSearch=openSearch;
    window.openSocial=openSocial;
    window.openAdminPanel=openAdmin;
    window.showSection=(type)=>{if(type==='search')return openSearch();if(type==='social')return openSocial();if(type==='admin')return openAdmin();if(type==='leaderboard'&&typeof window.openLeaderboard==='function')return window.openLeaderboard();if(type==='about'){document.getElementById('sgAboutModal')?.classList.add('open');}};
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
