/* Sus Games Main Hub - Social + Admin bridge */
(() => {
  'use strict';

  const getSB = () => {
    try { return (typeof supabaseClient !== 'undefined') ? supabaseClient : window.supabaseClient; }
    catch (_) { return window.supabaseClient; }
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = s => esc((s || 'P').trim().slice(0,1).toUpperCase());
  const avatar = (url, name, big=false) => url ? `<img class="hub-avatar${big?' big':''}" src="${esc(url)}" alt="">` : `<div class="hub-avatar${big?' big':''}">${initials(name)}</div>`;
  let sb, state = { tab:'friends' };

  const css = `
  .hub-modal{position:fixed;inset:0;background:rgba(0,0,0,.74);display:none;align-items:flex-start;justify-content:center;padding:92px 18px 24px;z-index:1000;overflow:auto}.hub-modal.open{display:flex}
  .hub-box{width:min(820px,100%);max-height:82vh;overflow:auto;background:#171a22;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.5)}
  .hub-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.hub-head h2{font-size:25px}.hub-close{border:0;background:transparent;color:#aaa;font-size:25px}.hub-close:hover{color:#fff}
  .hub-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:15px}.hub-tab{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#ddd;border-radius:10px;padding:9px 12px}.hub-tab.active,.hub-tab:hover{background:rgba(255,255,255,.12);color:#fff}
  .hub-search{display:flex;gap:8px;margin-bottom:14px}.hub-search input{flex:1}.hub-search button,.hub-action{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);color:#fff;border-radius:9px;padding:10px 13px}.hub-search button:hover,.hub-action:hover{background:rgba(255,255,255,.13)}
  .hub-list{display:grid;gap:8px}.hub-user{display:flex;align-items:center;gap:11px;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}.hub-avatar{width:42px;height:42px;flex:0 0 42px;border-radius:11px;object-fit:cover;background:#242833;display:grid;place-items:center;font-weight:700}.hub-avatar.big{width:90px;height:90px;margin:0 auto 12px;border-radius:50%}.hub-user-main{min-width:0;flex:1}.hub-user-main strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hub-user-main small{display:block;color:#858b98;margin-top:3px}.hub-actions{display:flex;gap:6px;flex-wrap:wrap}.hub-empty{padding:30px;text-align:center;color:#858b98}
  .hub-chat{height:430px;display:flex;flex-direction:column}.hub-messages{flex:1;overflow:auto;padding:12px 2px;display:flex;flex-direction:column;gap:7px}.hub-msg{max-width:78%;padding:9px 11px;border-radius:11px;background:rgba(255,255,255,.06)}.hub-msg.me{align-self:flex-end;background:rgba(255,255,255,.12)}.hub-msg small{display:block;color:#777;margin-top:3px;font-size:10px}.hub-compose{display:flex;gap:8px}.hub-compose input{flex:1}.hub-note{color:#858b98;font-size:13px;margin-bottom:14px}.hub-admin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.hub-stat{padding:15px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)}.hub-stat b{font-size:24px;display:block}.hub-stat span{color:#858b98;font-size:12px}
  @media(max-width:600px){.hub-modal{padding:76px 10px 18px}.hub-box{padding:18px}.hub-search{flex-direction:column}.hub-admin-grid{grid-template-columns:1fr}.hub-user{align-items:flex-start}}
  `;
  const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

  function modal(id,title){
    let el=document.getElementById(id);
    if(!el){
      el=document.createElement('div'); el.id=id; el.className='hub-modal';
      el.innerHTML=`<div class="hub-box"><div class="hub-head"><h2>${title}</h2><button class="hub-close" aria-label="Close">×</button></div><div class="hub-body"></div></div>`;
      el.querySelector('.hub-close').onclick=()=>el.classList.remove('open');
      el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open')});
      document.body.appendChild(el);
    }
    return el;
  }
  const open = (id,title) => { const m=modal(id,title); m.classList.add('open'); return m; };
  const current = async()=>{ const {data,error}=await sb.auth.getUser(); if(error) throw error; return data?.user||null; };
  const profile = async id => { const {data,error}=await sb.from('profiles').select('id,user_id,display_name,email,avatar_url,discord_user_id,created_at').eq('id',id).maybeSingle(); if(error) throw error; return data; };
  const profilesByIds = async ids => { if(!ids.length)return []; const {data,error}=await sb.from('profiles').select('id,user_id,display_name,email,avatar_url,discord_user_id').in('id',ids); if(error)throw error; return data||[]; };
  async function followingOf(id){const {data,error}=await sb.from('profile_follows').select('following_id').eq('follower_id',id);if(error)throw error;return(data||[]).map(x=>x.following_id)}
  async function followersOf(id){const {data,error}=await sb.from('profile_follows').select('follower_id').eq('following_id',id);if(error)throw error;return(data||[]).map(x=>x.follower_id)}

  function userRow(p, meId, opts={}){
    const same=p.id===meId, follow=opts.followingIds?.includes(p.id), mutual=opts.mutualIds?.includes(p.id);
    return `<div class="hub-user">${avatar(p.avatar_url,p.display_name)}<div class="hub-user-main"><strong>${esc(p.display_name||'Player')}</strong><small>${esc(p.email||p.discord_user_id||p.id)}</small></div><div class="hub-actions">${!same?`<button class="hub-action" onclick="hubViewProfile('${p.id}')">Profile</button>${follow?`<button class="hub-action" onclick="hubFollow('${p.id}',true)">Unfollow</button>`:`<button class="hub-action" onclick="hubFollow('${p.id}',false)">Follow</button>`}${(mutual||opts.allowMessage)?`<button class="hub-action" onclick="hubMessage('${p.id}')">Message</button>`:''}`:''}</div></div>`;
  }

  async function renderSocial(tab='friends'){
    state.tab=tab; const m=open('socialHubModal','👥 Social'); const body=m.querySelector('.hub-body');
    const u=await current(); if(!u){body.innerHTML='<div class="hub-empty">Please log in first to use Social.</div>';return;}
    const fwd=await followingOf(u.id), frr=await followersOf(u.id), mutual=fwd.filter(x=>frr.includes(x));
    const tabs=[['friends','👥 Friends'],['following','Following'],['followers','Followers'],['messages','💬 Messages'],['notifications','🔔 Notifications']];
    body.innerHTML=`<div class="hub-tabs">${tabs.map(([k,t])=>`<button class="hub-tab ${tab===k?'active':''}" onclick="hubSocial('${k}')">${t}</button>`).join('')}</div><div id="hubSocialContent"></div>`;
    const out=body.querySelector('#hubSocialContent');
    if(tab==='messages'){await renderConversations(out,u.id);return}
    if(tab==='notifications'){await renderNotifications(out,u.id);return}
    const ids=tab==='friends'?mutual:(tab==='following'?fwd:frr), ps=await profilesByIds(ids);
    out.innerHTML=ps.length?`<div class="hub-list">${ps.map(p=>userRow(p,u.id,{followingIds:fwd,mutualIds:mutual,allowMessage:mutual.includes(p.id)})).join('')}</div>`:'<div class="hub-empty">Nothing here yet.</div>';
  }
  async function renderConversations(out,myId){
    const {data,error}=await sb.from('direct_messages').select('sender_id,receiver_id,message,created_at').or(`sender_id.eq.${myId},receiver_id.eq.${myId}`).order('created_at',{ascending:false}).limit(100);
    if(error){out.innerHTML='<div class="hub-empty">Messages are unavailable right now.</div>';return}
    const ids=[...new Set((data||[]).map(x=>x.sender_id===myId?x.receiver_id:x.sender_id))].filter(Boolean), ps=await profilesByIds(ids);
    out.innerHTML=ps.length?`<div class="hub-list">${ps.map(p=>userRow(p,myId,{allowMessage:true})).join('')}</div>`:'<div class="hub-empty">No conversations yet.</div>';
  }
  async function renderNotifications(out,myId){
    const {data,error}=await sb.from('social_notifications').select('*').eq('user_id',myId).order('created_at',{ascending:false}).limit(50);
    if(error){out.innerHTML='<div class="hub-empty">Notifications are unavailable right now.</div>';return}
    out.innerHTML=(data||[]).length?`<div class="hub-list">${data.map(n=>`<div class="hub-user"><div class="hub-user-main"><strong>${esc(n.type||'Notification')}</strong><small>${esc(n.message||n.text||'You have a new social notification.')}</small></div></div>`).join('')}</div>`:'<div class="hub-empty">No notifications yet.</div>';
  }

  window.hubSocial=k=>renderSocial(k).catch(e=>console.error('[Sus Games Social]',e));
  window.openSocial=()=>renderSocial('friends');
  window.hubViewProfile=async id=>{try{const p=await profile(id),m=open('hubProfileModal','Profile'),u=await current(),fwd=u?await followingOf(u.id):[];m.querySelector('.hub-body').innerHTML=`<div style="text-align:center">${avatar(p?.avatar_url,p?.display_name,true)}<h3>${esc(p?.display_name||'Player')}</h3><p class="hub-note">${esc(p?.email||'')}</p><div class="hub-actions" style="justify-content:center"><button class="hub-action" onclick="hubFollow('${id}',${fwd.includes(id)})">${fwd.includes(id)?'Unfollow':'Follow'}</button><button class="hub-action" onclick="hubMessage('${id}')">Message</button></div></div>`}catch(e){console.error('[Sus Games Profile]',e)}};
  window.hubFollow=async(id,wasFollowing)=>{try{const u=await current();if(!u||u.id===id)return;if(wasFollowing){const {error}=await sb.from('profile_follows').delete().eq('follower_id',u.id).eq('following_id',id);if(error)throw error}else{const {error}=await sb.from('profile_follows').insert({follower_id:u.id,following_id:id});if(error)throw error}await renderSocial(state.tab)}catch(e){console.error('[Sus Games Follow]',e);alert('Could not update follow right now.')}};
  window.hubMessage=async id=>{try{const p=await profile(id),u=await current();if(!u)return;const m=open('hubChatModal',`Message ${esc(p?.display_name||'Player')}`);m.querySelector('.hub-body').innerHTML=`<div class="hub-chat"><div class="hub-messages" id="hubChatMessages">Loading…</div><div class="hub-compose"><input id="hubChatInput" placeholder="Write a message…"><button class="hub-action" onclick="hubSendMessage('${id}')">Send</button></div></div>`;const q=await sb.from('direct_messages').select('sender_id,receiver_id,message,created_at').or(`and(sender_id.eq.${u.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${u.id})`).order('created_at',{ascending:true});if(q.error)throw q.error;const box=document.getElementById('hubChatMessages');box.innerHTML=(q.data||[]).map(x=>`<div class="hub-msg ${x.sender_id===u.id?'me':''}">${esc(x.message)}<small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<div class="hub-empty">Start the conversation.</div>';box.scrollTop=box.scrollHeight}catch(e){console.error('[Sus Games Chat]',e);alert('Could not load messages right now.')}};
  window.hubSendMessage=async id=>{try{const u=await current(),input=document.getElementById('hubChatInput'),text=input?.value?.trim();if(!u||!text)return;const {error}=await sb.from('direct_messages').insert({sender_id:u.id,receiver_id:id,message:text});if(error)throw error;input.value='';await hubMessage(id)}catch(e){console.error('[Sus Games Send]',e);alert('Message could not be sent right now.')}};

  window.openAdmin=async()=>{try{const u=await current();if(!u){alert('Please log in first.');return}const check=await sb.rpc('is_admin');if(check.error||check.data!==true){alert('Admin access is restricted.');return}const m=open('adminHubModal','🔐 Admin Panel');m.querySelector('.hub-body').innerHTML='<div class="hub-note">Main Hub administration</div><div class="hub-admin-grid"><div class="hub-stat"><b id="adminUsers">—</b><span>Profiles</span></div><div class="hub-stat"><b id="adminScores">—</b><span>Game Scores</span></div><div class="hub-stat"><b id="adminMessages">—</b><span>Messages</span></div></div>';const [a,b,c]=await Promise.all([sb.from('profiles').select('*',{count:'exact',head:true}),sb.from('game_scores').select('*',{count:'exact',head:true}),sb.from('direct_messages').select('*',{count:'exact',head:true})]);document.getElementById('adminUsers').textContent=a.count??0;document.getElementById('adminScores').textContent=b.count??0;document.getElementById('adminMessages').textContent=c.count??0}catch(e){console.error('[Sus Games Admin]',e);alert('Admin panel could not be opened.')}};

  window.showSection=section=>{if(section==='social')return window.openSocial();if(section==='search')return window.openSearch();if(section==='leaderboard')return window.openLeaderboard()};

  function boot(){
    sb=getSB();if(!sb){console.error('[Sus Games] Supabase client missing');return}
    const admin=document.getElementById('adminBtn');
    if(admin){admin.style.padding='10px 14px';admin.style.fontSize='inherit';admin.style.display='none';sb.rpc('is_admin').then(({data,error})=>{admin.style.display=(!error&&data===true)?'inline-block':'none'}).catch(()=>{admin.style.display='none'})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
