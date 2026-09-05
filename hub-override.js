(() => {
  const sb = window.supabaseClient;
  if (!sb) return;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const me = () => window.currentUser || null;
  const img = (url, name) => url && /^https?:\/\//i.test(url) ? `<img class="hub-user-avatar" src="${esc(url)}" alt="">` : `<div class="hub-user-avatar">${esc((name || 'P').slice(0,1).toUpperCase())}</div>`;
  let socialTab = 'search', chatWith = null;

  function ensureHubModal(id, title) {
    let m = document.getElementById(id);
    if (!m) {
      m = document.createElement('div');
      m.id = id; m.className = 'modal hub-modal';
      m.innerHTML = `<div class="modal-box"><div class="modal-head"><h2>${title}</h2><button class="close" onclick="document.getElementById('${id}').classList.remove('open')">×</button></div><div id="${id}Body"></div></div>`;
      document.body.appendChild(m);
    }
    return m;
  }

  function tabs() {
    return `<div class="hub-tabs">${[['search','🔎 Search'],['friends','👥 Friends'],['following','➤ Following'],['followers','↩ Followers'],['notifications','🔔 Notifications'],['messages','💬 Messages']].map(([k,t]) => `<button class="hub-tab ${socialTab===k?'active':''}" onclick="hubSocialTab('${k}')">${t}</button>`).join('')}</div>`;
  }
  window.hubSocialTab = k => { socialTab=k; chatWith=null; renderSocial(); };

  async function ids(kind) {
    const col = kind === 'followers' ? 'follower_id' : 'following_id';
    const filter = kind === 'followers' ? 'following_id' : 'follower_id';
    const {data} = await sb.from('profile_follows').select(col).eq(filter, me().id);
    return (data || []).map(x => x[col]);
  }
  async function following(id) {
    const {data} = await sb.from('profile_follows').select('id').eq('follower_id', me().id).eq('following_id', id).maybeSingle();
    return !!data;
  }
  async function renderUsers(rows, out) {
    if (!rows.length) { out.innerHTML='<div class="hub-empty">No players found.</div>'; return; }
    const html=[];
    for (const p of rows) {
      if (p.id===me().id) continue;
      const f=await following(p.id);
      html.push(`<div class="hub-user">${img(p.avatar_url,p.display_name)}<div class="hub-user-main"><strong>${esc(p.display_name||'Player')}</strong><small>${f?'Following':'Player'}</small></div><div class="hub-actions"><button class="hub-mini" onclick="hubProfile('${p.id}')">View</button><button class="hub-mini" onclick="hubFollow('${p.id}',${f})">${f?'Unfollow':'Follow'}</button>${f?`<button class="hub-mini" onclick="hubChat('${p.id}')">💬 Chat</button>`:''}</div></div>`);
    }
    out.innerHTML=html.join('')||'<div class="hub-empty">No players found.</div>';
  }
  function searchView() {
    const body=document.getElementById('socialHubModalBody');
    body.innerHTML=tabs()+`<div class="hub-search"><input id="hubSearchInput" placeholder="Search players"><button class="hub-mini" onclick="hubSearch()">Search</button></div><div id="hubSearchResults" class="hub-list"><div class="hub-empty">Search for a player.</div></div>`;
    document.getElementById('hubSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter')hubSearch()});
  }
  window.hubSearch=async()=>{const q=document.getElementById('hubSearchInput').value.trim(),out=document.getElementById('hubSearchResults');if(!q)return;out.innerHTML='<div class="hub-empty">Searching...</div>';const safe=q.replace(/[%,]/g,'');const {data,error}=await sb.from('profiles').select('id,display_name,avatar_url,email').or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%`).limit(30);if(error){out.innerHTML='<div class="hub-empty">Search failed.</div>';return}renderUsers(data||[],out)};

  async function relationView(kind) {
    let a=await ids(kind);
    if(kind==='friends'){const b=await ids('following'), c=await ids('followers');a=b.filter(x=>c.includes(x));}
    const body=document.getElementById('socialHubModalBody');body.innerHTML=tabs()+'<div id="hubRelation" class="hub-list"><div class="hub-empty">Loading...</div></div>';
    if(!a.length){document.getElementById('hubRelation').innerHTML='<div class="hub-empty">Nothing here yet.</div>';return}
    const {data}=await sb.from('profiles').select('id,display_name,avatar_url,email').in('id',a);renderUsers(data||[],document.getElementById('hubRelation'));
  }
  async function notificationsView(){const {data,error}=await sb.from('social_notifications').select('message,is_read,created_at').eq('recipient_id',me().id).order('created_at',{ascending:false}).limit(50);document.getElementById('socialHubModalBody').innerHTML=tabs()+`<div class="hub-list">${error?'<div class="hub-empty">Notifications unavailable.</div>':(data||[]).map(n=>`<div class="hub-user"><div class="hub-user-main"><strong>${esc(n.message)}</strong><small>${new Date(n.created_at).toLocaleString()}</small></div></div>`).join('')||'<div class="hub-empty">No notifications.</div>'}</div>`}
  async function messagesView(){const f=await ids('following'),r=await ids('followers'),all=[...new Set([...f,...r])];const {data:people}=all.length?await sb.from('profiles').select('id,display_name,avatar_url').in('id',all):{data:[]};const body=document.getElementById('socialHubModalBody');if(!chatWith){body.innerHTML=tabs()+(people?.length?`<div class="hub-list">${people.map(p=>`<button class="hub-user" onclick="hubChat('${p.id}')">${img(p.avatar_url,p.display_name)}<div class="hub-user-main"><strong>${esc(p.display_name||'Player')}</strong><small>Open conversation</small></div></button>`).join('')}</div>`:'<div class="hub-empty">Follow someone to start a chat.</div>');return}const p=(people||[]).find(x=>x.id===chatWith);body.innerHTML=tabs()+`<div class="hub-chat"><div class="hub-chat-head">💬 ${esc(p?.display_name||'Player')} <button class="hub-mini" style="float:right" onclick="chatWith=null;messagesView()">Back</button></div><div id="hubMessages" class="hub-messages"><div class="hub-empty">Loading...</div></div><div class="hub-compose"><input id="hubMsgInput" maxlength="1000" placeholder="Write a message..."><button class="hub-mini" onclick="hubSend()">Send</button></div></div>`;loadMessages();}
  window.hubChat=id=>{chatWith=id;socialTab='messages';renderSocial()};
  async function loadMessages(){const {data,error}=await sb.from('direct_messages').select('sender_id,message,created_at').or(`and(sender_id.eq.${me().id},recipient_id.eq.${chatWith}),and(sender_id.eq.${chatWith},recipient_id.eq.${me().id})`).order('created_at',{ascending:true});const box=document.getElementById('hubMessages');if(!box)return;if(error){box.innerHTML='<div class="hub-empty">Chat unavailable.</div>';return}box.innerHTML=(data||[]).map(x=>`<div class="hub-msg ${x.sender_id===me().id?'me':''}">${esc(x.message)}<small>${new Date(x.created_at).toLocaleString()}</small></div>`).join('')||'<div class="hub-empty">No messages yet.</div>';box.scrollTop=box.scrollHeight;}
  window.hubSend=async()=>{const i=document.getElementById('hubMsgInput'),v=i?.value.trim();if(!v)return;const {error}=await sb.from('direct_messages').insert({sender_id:me().id,recipient_id:chatWith,message:v});if(error){alert(error.message);return}i.value='';loadMessages()};
  window.hubFollow=async(id,isFollowing)=>{const r=isFollowing?await sb.from('profile_follows').delete().eq('follower_id',me().id).eq('following_id',id):await sb.from('profile_follows').insert({follower_id:me().id,following_id:id});if(r.error&&!/duplicate/i.test(r.error.message))alert(r.error.message);renderSocial()};
  window.hubProfile=async id=>{const {data:p}=await sb.from('profiles').select('id,display_name,avatar_url,email').eq('id',id).maybeSingle();if(!p)return;const [fo,fr,li]=await Promise.all([sb.from('profile_follows').select('*',{count:'exact',head:true}).eq('following_id',id),sb.from('profile_follows').select('*',{count:'exact',head:true}).eq('follower_id',id),sb.from('profile_likes').select('*',{count:'exact',head:true}).eq('user_id',id)]);const f=await following(id);document.getElementById('socialHubModalBody').innerHTML=`<div class="hub-profile">${img(p.avatar_url,p.display_name,'hub-big-avatar')}<h3>${esc(p.display_name||'Player')}</h3><p class="hint">❤️ ${li.count||0} likes · ${fo.count||0} followers · ${fr.count||0} following</p><div class="hub-actions" style="justify-content:center;margin-top:14px"><button class="hub-mini" onclick="hubFollow('${id}',${f})">${f?'Unfollow':'Follow'}</button><button class="hub-mini" onclick="hubLike('${id}')">❤️ Like</button></div><button class="profile-action" onclick="renderSocial()">Back</button></div>`};
  window.hubLike=async id=>{const {error}=await sb.from('profile_likes').insert({user_id:id,liked_by:me().id});if(error&&!/duplicate/i.test(error.message))alert(error.message);hubProfile(id)};

  async function renderSocial(){const m=ensureHubModal('socialHubModal','Social');m.classList.add('open');const body=document.getElementById('socialHubModalBody');if(!me()){body.innerHTML='<div class="hub-empty">Please login first.</div>';return}body.innerHTML=tabs()+'<div class="hub-empty">Loading...</div>';if(socialTab==='search')return searchView();if(socialTab==='friends')return relationView('friends');if(socialTab==='following')return relationView('following');if(socialTab==='followers')return relationView('followers');if(socialTab==='notifications')return notificationsView();return messagesView()}
  window.renderSocial=renderSocial;

  window.showSection = function(type){document.getElementById('menu')?.classList.remove('open');document.getElementById('profileMenu')?.classList.remove('open');if(type==='leaderboard'){document.getElementById('leaderboardModal')?.classList.add('open');if(window.loadLeaderboard)window.loadLeaderboard('all');return}if(type==='social'||type==='search'){socialTab=type;chatWith=null;return renderSocial()}if(type==='about'){document.getElementById('infoTitle').textContent='About Sus Games';document.getElementById('infoBody').innerHTML='<p class="hint">Sus Games is a community game hub connecting Quiz, Puzzle and Drawzy.</p><div class="contact-list"><a class="contact-btn" href="https://discord.gg/MaFbeFesH" target="_blank" rel="noopener">💬 Join Discord Server</a><a class="contact-btn" href="mailto:babysusplay@gmail.com">✉ babysusplay@gmail.com</a><a class="contact-btn" href="https://www.instagram.com/babysus.4/" target="_blank" rel="noopener">📸 @babysus.4 on Instagram</a></div>';document.getElementById('infoModal')?.classList.add('open')}};

  window.viewProfile=async()=>{document.getElementById('profileMenu')?.classList.remove('open');if(!me()){openAuth();return}const {data:p}=await sb.from('profiles').select('display_name,avatar_url,email').eq('id',me().id).maybeSingle();document.getElementById('profileTitle').textContent='View Profile';document.getElementById('profileBody').innerHTML=`<div class="profile-card">${img(p?.avatar_url,p?.display_name,'big-avatar')}<h3>${esc(p?.display_name||me().user_metadata?.name||'Player')}</h3><p>${esc(p?.email||me().email||'')}</p><button class="profile-action" onclick="editProfile()">Edit Profile</button></div>`;document.getElementById('profileModal')?.classList.add('open')};
  window.editProfile=async()=>{document.getElementById('profileMenu')?.classList.remove('open');if(!me()){openAuth();return}const {data:p}=await sb.from('profiles').select('display_name,avatar_url').eq('id',me().id).maybeSingle();document.getElementById('profileTitle').textContent='Edit Profile';document.getElementById('profileBody').innerHTML=`<label class="hint">Display name</label><input id="editName" class="hub-field" value="${esc(p?.display_name||'')}"><label class="hint">Avatar URL</label><input id="editAvatar" class="hub-field" value="${esc(p?.avatar_url||'')}" placeholder="https://..."><button class="profile-action" onclick="saveHubProfile()">Save Profile</button>`;document.getElementById('profileModal')?.classList.add('open')};
  window.saveHubProfile=async()=>{const {error}=await sb.from('profiles').update({display_name:document.getElementById('editName').value.trim()||'Player',avatar_url:document.getElementById('editAvatar').value.trim()||null}).eq('id',me().id);if(error){alert(error.message);return}document.getElementById('profileModal')?.classList.remove('open');if(window.loadSession)await window.loadSession()};

  window.openAdmin=async()=>{document.getElementById('menu')?.classList.remove('open');if(!me()){openAuth();return}const {data,error}=await sb.rpc('is_admin');if(error||data!==true){alert('Admin access denied.');return}const m=ensureHubModal('adminHubModal','🔐 Admin Panel');m.classList.add('open');const body=document.getElementById('adminHubModalBody');body.innerHTML='<div class="hub-empty">Loading...</div>';const [u,q,a]=await Promise.all([sb.rpc('admin_get_users'),sb.rpc('admin_get_quizzes'),sb.rpc('admin_get_attempts')]);body.innerHTML=`<div class="hub-admin-grid"><div class="hub-stat"><b>${u.data?.length??'—'}</b><span>Users</span></div><div class="hub-stat"><b>${q.data?.length??'—'}</b><span>Quizzes</span></div><div class="hub-stat"><b>${a.data?.length??'—'}</b><span>Attempts</span></div></div><div class="hub-list">${(q.data||[]).slice(0,20).map(x=>`<div class="hub-user"><div class="hub-user-main"><strong>${esc(x.title||x.quiz_id||'Quiz')}</strong><small>${esc(x.creator_id||'')}</small></div></div>`).join('')||'<div class="hub-empty">No quiz records.</div>'}</div>`};

  const oldAdd=document.head.appendChild;
  window.addEventListener('DOMContentLoaded',()=>{if(window.currentUser&&window.loadSession)window.loadSession()});
})();
