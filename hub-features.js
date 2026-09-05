/* Sus Games Main Hub - shared Social / Profiles / Chat / Admin */
(() => {
  'use strict';

  const getSB = () => {
    try { return (typeof supabaseClient !== 'undefined') ? supabaseClient : window.supabaseClient; }
    catch (_) { return window.supabaseClient; }
  };
  let sb = null;
  const state = { socialTab: 'friends', publicUser: null, chatUser: null, chatChannel: null, profileGallery: [] };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initials = value => esc(String(value || 'P').trim().slice(0, 1).toUpperCase());
  const avatarHtml = (url, name, big=false) => url
    ? `<img class="sg-avatar${big ? ' big' : ''}" src="${esc(url)}" alt="" onerror="this.onerror=null;this.src='${fallbackAvatar(name)}'">`
    : `<div class="sg-avatar${big ? ' big' : ''}">${initials(name)}</div>`;
  const fallbackAvatar = name => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="50" fill="#242833"/><text x="50" y="59" text-anchor="middle" font-family="Arial" font-size="42" font-weight="700" fill="#9da3b0">${String(name || 'P').trim().slice(0,1).toUpperCase()}</text></svg>`);

  const css = `
  .sg-modal{position:fixed;inset:0;background:rgba(0,0,0,.76);display:none;align-items:flex-start;justify-content:center;padding:70px 18px 24px;z-index:3000;overflow:auto;backdrop-filter:blur(3px)}
  .sg-modal.open{display:flex}.sg-box{width:min(760px,100%);max-height:88vh;overflow:auto;background:#171a22;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.55)}
  .sg-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.sg-head h2{font-size:25px}.sg-close{border:0;background:transparent;color:#aaa;font-size:25px}.sg-close:hover{color:#fff}
  .sg-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.sg-tab,.sg-btn{border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.055);color:#fff;border-radius:10px;padding:9px 13px;cursor:pointer}.sg-tab.active,.sg-tab:hover,.sg-btn:hover{background:rgba(255,255,255,.12)}
  .sg-list{display:grid;gap:9px}.sg-user{display:flex;align-items:center;gap:11px;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025);cursor:pointer}.sg-user:hover{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14)}
  .sg-avatar{width:44px;height:44px;flex:0 0 44px;border-radius:50%;object-fit:cover;background:#242833;display:grid;place-items:center;font-weight:800;color:#cfd3dc}.sg-avatar.big{width:92px;height:92px;margin:0 auto 12px}.sg-main{min-width:0;flex:1}.sg-main strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sg-main small{display:block;color:#858b98;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sg-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.sg-status{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 11px;border-radius:9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);font-size:12px;font-weight:700;color:#d8dbe2}
  .sg-empty{padding:34px 14px;text-align:center;color:#858b98}.sg-note{color:#858b98;font-size:12px;line-height:1.5}.sg-search{display:flex;gap:8px;margin-bottom:14px}.sg-search input{flex:1}.sg-search button{flex:0 0 auto}
  .sg-profile{text-align:center}.sg-profile h3{font-size:24px}.sg-profile-id{color:#9da3b0;margin-top:5px}.sg-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:18px 0}.sg-stat{padding:12px 8px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)}.sg-stat strong{display:block;font-size:19px}.sg-stat span{display:block;color:#858b98;font-size:11px;margin-top:4px}
  .sg-profile-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.sg-gallery-title{display:flex;justify-content:space-between;align-items:center;margin:16px 0 9px;font-size:13px}.sg-gallery-title span{color:#858b98;font-size:11px}.sg-gallery{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.sg-gallery button{padding:0;border:1px solid rgba(255,255,255,.09);border-radius:11px;overflow:hidden;background:rgba(255,255,255,.03);aspect-ratio:1;cursor:pointer}.sg-gallery img{width:100%;height:100%;object-fit:cover;display:block}
  .sg-chat{height:470px;display:flex;flex-direction:column}.sg-messages{flex:1;min-height:0;overflow:auto;padding:8px 2px;display:flex;flex-direction:column;gap:7px}.sg-msg{max-width:78%;padding:9px 11px;border-radius:11px;background:rgba(255,255,255,.06)}.sg-msg.me{align-self:flex-end;background:rgba(255,255,255,.12)}.sg-msg-name{font-size:11px;font-weight:700}.sg-msg-time{display:block;color:#777d8a;font-size:10px;margin-top:4px}.sg-compose{display:flex;gap:8px;margin-top:9px}.sg-compose input{flex:1}.sg-compose button{flex:0 0 auto}
  .sg-edit-avatar{width:82px;height:82px;border-radius:50%;object-fit:cover;background:#242833;display:block;margin-bottom:10px}.sg-edit-gallery{display:flex;gap:8px;overflow-x:auto;padding:2px 1px 6px}.sg-edit-gallery img,.sg-edit-add{width:64px;height:64px;flex:0 0 64px;border-radius:50%;object-fit:cover}.sg-edit-add{border:1px dashed rgba(255,255,255,.25);background:rgba(255,255,255,.04);color:#fff;font-size:25px;display:grid;place-items:center;cursor:pointer}.sg-hidden{display:none!important}
  .sg-admin-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:16px}.sg-admin-stat{padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)}.sg-admin-stat strong{display:block;font-size:22px}.sg-admin-stat span{display:block;color:#858b98;font-size:11px;margin-top:4px}.sg-admin-search{margin-bottom:10px}.sg-admin-user{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)}.sg-admin-user .sg-main{flex:1}.sg-admin-detail{display:grid;gap:14px}.sg-admin-info{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sg-admin-info div{padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#10131a}.sg-admin-info small{display:block;color:#777d8a;margin-bottom:4px}.sg-admin-mini{padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:#10131a;margin-top:7px}.sg-admin-mini strong{display:block}.sg-admin-mini small{display:block;color:#858b98;margin-top:4px}
  .sg-lightbox{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.86);display:none;align-items:center;justify-content:center;padding:20px}.sg-lightbox.open{display:flex}.sg-lightbox img{max-width:94vw;max-height:88vh;object-fit:contain;border-radius:14px}.sg-lightbox button{position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:10px;background:#171a22;color:#fff;border:1px solid rgba(255,255,255,.12);font-size:23px}
  @media(max-width:650px){.sg-modal{padding:64px 10px 16px}.sg-box{padding:18px;border-radius:17px}.sg-stats{grid-template-columns:repeat(2,1fr)}.sg-admin-stats{grid-template-columns:1fr 1fr}.sg-admin-info{grid-template-columns:1fr}.sg-user{align-items:flex-start}.sg-actions{margin-left:auto}.sg-chat{height:62vh}.sg-compose{gap:6px}.sg-gallery{gap:6px}}
  `;
  function addStyle(){if(document.getElementById('susGamesSocialStyle'))return;const s=document.createElement('style');s.id='susGamesSocialStyle';s.textContent=css;document.head.appendChild(s)}

  function modal(id,title){
    let el=document.getElementById(id);
    if(!el){el=document.createElement('div');el.id=id;el.className='sg-modal';el.innerHTML=`<div class="sg-box"><div class="sg-head"><h2>${title}</h2><button class="sg-close" type="button">×</button></div><div class="sg-body"></div></div>`;el.querySelector('.sg-close').onclick=()=>close(id);el.addEventListener('click',e=>{if(e.target===el)close(id)});document.body.appendChild(el)}
    return el;
  }
  const open=(id,title)=>{const m=modal(id,title);m.classList.add('open');return m};
  const close=id=>{const m=document.getElementById(id);if(m)m.classList.remove('open')};
  const closeAll=()=>['sgSocialModal','sgProfileModal','sgChatModal','sgEditModal','sgAdminModal'].forEach(close);
  const current=async()=>{const {data,error}=await sb.auth.getUser();if(error)throw error;return data?.user||null};
  const getProfile=async id=>{const {data,error}=await sb.from('profiles').select('id,user_id,display_name,email,avatar_url,discord_user_id,provider,created_at').eq('id',id).maybeSingle();if(error)throw error;return data};
  const profilesByIds=async ids=>{if(!ids.length)return[];const {data,error}=await sb.from('profiles').select('id,user_id,display_name,email,avatar_url,discord_user_id').in('id',ids);if(error)throw error;return data||[]};
  const followingOf=async id=>{const {data,error}=await sb.from('profile_follows').select('following_id').eq('follower_id',id);if(error)throw error;return(data||[]).map(x=>String(x.following_id))};
  const followersOf=async id=>{const {data,error}=await sb.from('profile_follows').select('follower_id').eq('following_id',id);if(error)throw error;return(data||[]).map(x=>String(x.follower_id))};

  async function profileStats(id){
    try{const {data}=await sb.rpc('get_profile_stats',{target_user:id});return data?.[0]||{}}catch(_){return{}}
  }
  async function gallery(id,currentAvatar=''){
    const urls=[];if(currentAvatar)urls.push(currentAvatar);if(!id)return urls.slice(0,5);
    try{const {data}=await sb.from('avatar_history').select('avatar_url,changed_at').eq('user_id',id).eq('provider','profile_gallery').order('changed_at',{ascending:false}).limit(20);(data||[]).forEach(x=>{const u=String(x.avatar_url||'').trim();if(u&&!urls.includes(u)&&urls.length<5)urls.push(u)})}catch(e){console.warn('Gallery load:',e)}
    return urls.slice(0,5);
  }
  function galleryHtml(urls,title='Profile Pictures'){
    const clean=[...new Set((urls||[]).filter(Boolean))].slice(0,5);if(!clean.length)return'';
    return `<div class="sg-gallery-title"><strong>${esc(title)}</strong><span>${clean.length}/5</span></div><div class="sg-gallery">${clean.map((u,i)=>`<button type="button" onclick="sgOpenImage('${esc(u)}')"><img src="${esc(u)}" alt="Profile picture ${i+1}" onerror="this.style.opacity='.3'"></button>`).join('')}</div>`;
  }

  async function followAction(id,following){
    const u=await current();if(!u||String(u.id)===String(id))return;
    if(following){const {error}=await sb.from('profile_follows').delete().eq('follower_id',u.id).eq('following_id',id);if(error)throw error}
    else{const {error}=await sb.from('profile_follows').insert({follower_id:u.id,following_id:id});if(error)throw error;try{await sb.rpc('process_follow_social_event',{follower_user:u.id,following_user:id})}catch(e){console.warn('follow event:',e)}}
  }

  async function likeAction(id){
    const u=await current();if(!u||String(u.id)===String(id))return;
    const day=new Date().toISOString().slice(0,10);
    const {error}=await sb.from('profile_likes').insert({user_id:id,liked_by:u.id,like_day:day});
    if(error){const msg=String(error.message||'').toLowerCase();if(msg.includes('duplicate')||msg.includes('unique'))throw new Error('You can give like only one like in one day.');throw error}
  }

  async function renderPublicProfile(id){
    const u=await current();if(!u)throw new Error('Please log in first.');
    const p=await getProfile(id);if(!p)throw new Error('Profile not found.');
    state.publicUser=p;
    const [stats,followingRows,reverseRows,likesCount,followersCount,followingCount,liked,urls]=await Promise.all([
      profileStats(id),
      sb.from('profile_follows').select('id').eq('follower_id',u.id).eq('following_id',id).maybeSingle(),
      sb.from('profile_follows').select('id').eq('follower_id',id).eq('following_id',u.id).maybeSingle(),
      sb.from('profile_likes').select('id',{count:'exact',head:true}).eq('user_id',id),
      sb.from('profile_follows').select('id',{count:'exact',head:true}).eq('following_id',id),
      sb.from('profile_follows').select('id',{count:'exact',head:true}).eq('follower_id',id),
      sb.from('profile_likes').select('id').eq('user_id',id).eq('liked_by',u.id).eq('like_day',new Date().toISOString().slice(0,10)).maybeSingle(),
      gallery(id,p.avatar_url)
    ]);
    const isFollowing=!!followingRows.data,isFollowedBack=!!reverseRows.data,mutual=isFollowing&&isFollowedBack;
    const m=open('sgProfileModal','Player Profile');const body=m.querySelector('.sg-body');
    const totalLikes=likesCount.error?Number(stats.likes||0):Number(likesCount.count||0);
    const totalFollowers=followersCount.error?Number(stats.followers||0):Number(followersCount.count||0);
    const totalFollowing=followingCount.error?Number(stats.following||0):Number(followingCount.count||0);
    const own=String(id)===String(u.id);
    body.innerHTML=`<div class="sg-profile">${avatarHtml(p.avatar_url,p.display_name,true)}<h3>${esc(p.display_name||'Player')}</h3><div class="sg-profile-id">User ID: ${esc(p.user_id||'')}</div>
      <div class="sg-stats"><div class="sg-stat"><strong>${Number(stats.quizzes_played||0)}</strong><span>Quizzes Played</span></div><div class="sg-stat"><strong>${Number(stats.total_score||0)}</strong><span>Total Score</span></div><div class="sg-stat"><strong>${Number(stats.all_time_rank||0)||'—'}</strong><span>All-Time Rank</span></div><div class="sg-stat"><strong>${totalLikes}</strong><span>Likes</span></div><div class="sg-stat"><strong>${totalFollowers}</strong><span>Followers</span></div><div class="sg-stat"><strong>${totalFollowing}</strong><span>Following</span></div></div>
      <div class="sg-profile-actions">${own?'':`<button class="sg-btn" onclick="sgLike('${esc(id)}',${!!liked.data})">${liked.data?'❤️ Liked Today':'♡ Like'}</button><button class="sg-btn" onclick="sgFollow('${esc(id)}',${isFollowing})">${mutual?'👥 Friends':isFollowing?'Following':'Follow'}</button>${mutual?`<button class="sg-btn" onclick="sgChat('${esc(id)}')">💬 Message</button>`:''}`}</div>
      ${galleryHtml(urls)}
      ${own?'<button class="sg-btn" type="button" onclick="sgEditProfile()">Edit Profile</button>':''}
      </div>`;
    return m;
  }

  window.sgOpenImage=url=>{const box=document.getElementById('sgLightbox');const img=document.getElementById('sgLightboxImg');if(box&&img){img.src=url;box.classList.add('open')}};
  window.sgCloseImage=()=>{const box=document.getElementById('sgLightbox');if(box)box.classList.remove('open')};

  window.sgFollow=async(id,following)=>{try{await followAction(id,following);await renderPublicProfile(id);if(document.getElementById('sgSocialModal')?.classList.contains('open'))await renderSocial(state.socialTab)}catch(e){alert(e.message||'Unable to update follow.')}};
  window.sgLike=async(id,liked)=>{try{if(liked){alert('You can give like only one like in one day.');return}await likeAction(id);await renderPublicProfile(id)}catch(e){alert(e.message||'Unable to save like.')}};
  window.sgViewProfile=async id=>{try{close('sgSocialModal');close('sgChatModal');await renderPublicProfile(id)}catch(e){alert(e.message||'Unable to load profile.')}};

  async function renderSocial(tab='friends'){
    state.socialTab=tab;const u=await current();if(!u){alert('Please log in first.');return}
    const m=open('sgSocialModal','👥 Social');const body=m.querySelector('.sg-body');
    const [fwd,frr]=await Promise.all([followingOf(u.id),followersOf(u.id)]);const mutual=fwd.filter(x=>frr.includes(x));
    const tabs=[['friends','👥 Friends'],['following','Following'],['followers','Followers'],['messages','💬 Messages'],['notifications','🔔 Notifications']];
    body.innerHTML=`<div class="sg-tabs">${tabs.map(([k,t])=>`<button class="sg-tab ${tab===k?'active':''}" onclick="sgSocial('${k}')">${t}</button>`).join('')}</div><div id="sgSocialContent"></div>`;
    const out=body.querySelector('#sgSocialContent');
    if(tab==='messages'){await renderConversations(out,u.id);return}
    if(tab==='notifications'){await renderNotifications(out,u.id);return}
    const ids=tab==='friends'?mutual:tab==='following'?fwd:frr;const ps=await profilesByIds(ids);
    if(!ps.length){out.innerHTML='<div class="sg-empty">Nothing here yet.</div>';return}
    out.innerHTML=`<div class="sg-list">${ps.map(p=>{const isMutual=mutual.includes(String(p.id));const isFollowing=fwd.includes(String(p.id));const action=tab==='friends'?'<span class="sg-status">Friends</span><button class="sg-btn" onclick="event.stopPropagation();sgChat(\''+esc(p.id)+'\')">💬 Message</button>':tab==='followers'?'<button class="sg-btn" onclick="event.stopPropagation();sgFollow(\''+esc(p.id)+'\',false)">Follow back</button>':'<span class="sg-status">Following</span>';return `<div class="sg-user" onclick="sgViewProfile('${esc(p.id)}')">${avatarHtml(p.avatar_url,p.display_name)}<div class="sg-main"><strong>${esc(p.display_name||'Player')}</strong><small>${esc(p.user_id||p.email||'')}</small></div><div class="sg-actions">${action}</div></div>`}).join('')}</div>`;
  }
  window.sgSocial=tab=>renderSocial(tab).catch(e=>{console.error(e);alert(e.message||'Social could not be loaded.')});
  window.openSocial=()=>renderSocial('friends');

  async function renderConversations(out,myId){
    const {data,error}=await sb.from('direct_messages').select('sender_id,recipient_id,message,message_type,created_at').or(`sender_id.eq.${myId},recipient_id.eq.${myId}`).order('created_at',{ascending:false}).limit(500);
    if(error){out.innerHTML='<div class="sg-empty">Messages are unavailable right now.</div>';return}
    const ids=[...new Set((data||[]).map(x=>String(x.sender_id)===String(myId)?x.recipient_id:x.sender_id))].filter(Boolean);const ps=await profilesByIds(ids);
    out.innerHTML=ps.length?`<div class="sg-list">${ps.map(p=>`<div class="sg-user" onclick="sgChat('${esc(p.id)}')">${avatarHtml(p.avatar_url,p.display_name)}<div class="sg-main"><strong>${esc(p.display_name||'Player')}</strong><small>${esc(p.user_id||'')}</small></div><div class="sg-actions"><button class="sg-btn" onclick="event.stopPropagation();sgChat('${esc(p.id)}')">Message</button></div></div>`).join('')}</div>`:'<div class="sg-empty">No conversations yet.</div>';
  }
  async function renderNotifications(out,myId){
    const {data,error}=await sb.from('social_notifications').select('*').eq('recipient_id',myId).order('created_at',{ascending:false}).limit(50);
    if(error){out.innerHTML='<div class="sg-empty">Notifications are unavailable right now.</div>';return}
    out.innerHTML=(data||[]).length?`<div class="sg-list">${data.map(n=>`<div class="sg-user"><div class="sg-main"><strong>${esc(n.type||'Notification')}</strong><small>${esc(n.message||n.text||'New social activity')} · ${n.created_at?new Date(n.created_at).toLocaleString():''}</small></div></div>`).join('')}</div>`:'<div class="sg-empty">No notifications yet.</div>';
    try{await sb.from('social_notifications').update({is_read:true}).eq('recipient_id',myId).eq('is_read',false)}catch(_){ }
  }

  window.sgChat=async id=>{
    try{
      const u=await current();const p=await getProfile(id);if(!u||!p)return;
      const [a,b]=await Promise.all([sb.from('profile_follows').select('id').eq('follower_id',u.id).eq('following_id',id).maybeSingle(),sb.from('profile_follows').select('id').eq('follower_id',id).eq('following_id',u.id).maybeSingle()]);
      if(!a.data||!b.data){alert('Direct chat is available only between mutual followers.');return}
      if(state.chatChannel){try{await sb.removeChannel(state.chatChannel)}catch(_){}state.chatChannel=null}
      state.chatUser=p;const m=open('sgChatModal',`💬 ${esc(p.display_name||'Player')}`);const body=m.querySelector('.sg-body');
      body.innerHTML=`<div class="sg-chat"><div id="sgMessages" class="sg-messages"><div class="sg-empty">Loading…</div></div><div class="sg-compose"><input id="sgChatInput" maxlength="1000" placeholder="Write a message…" autocomplete="off"><button class="sg-btn" onclick="sgSend('${esc(id)}')">Send</button></div></div>`;
      await loadChat();
      state.chatChannel=sb.channel(`sus-direct-${u.id}-${id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},payload=>{const x=payload.new;if(!x)return;if((String(x.sender_id)===String(u.id)&&String(x.recipient_id)===String(id))||(String(x.sender_id)===String(id)&&String(x.recipient_id)===String(u.id)))loadChat()}).subscribe();
      document.getElementById('sgChatInput')?.focus();
    }catch(e){console.error(e);alert(e.message||'Could not open chat.')}
  };
  async function loadChat(){
    const u=await current(),id=state.chatUser?.id,box=document.getElementById('sgMessages');if(!u||!id||!box)return;
    const {data,error}=await sb.from('direct_messages').select('id,sender_id,recipient_id,message,message_type,created_at').or(`and(sender_id.eq.${u.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${u.id})`).order('created_at',{ascending:true});
    if(error){box.innerHTML='<div class="sg-empty">Unable to load chat.</div>';return}
    box.innerHTML=(data||[]).map(x=>{const mine=String(x.sender_id)===String(u.id);const name=mine?(u.user_metadata?.full_name||u.email?.split('@')[0]||'You'):(state.chatUser.display_name||'Player');const body=x.message_type==='image'?`<img src="${esc(x.message)}" style="max-width:240px;border-radius:10px" alt="Shared image">`:`${esc(x.message)}`;return `<div class="sg-msg ${mine?'me':''}"><span class="sg-msg-name">${esc(name)}</span><div>${body}</div><span class="sg-msg-time">${x.created_at?new Date(x.created_at).toLocaleString():''}</span></div>`}).join('')||'<div class="sg-empty">Start the conversation.</div>';box.scrollTop=box.scrollHeight;
  }
  window.sgSend=async id=>{try{const u=await current(),input=document.getElementById('sgChatInput'),text=input?.value.trim();if(!u||!text)return;const {error}=await sb.from('direct_messages').insert({sender_id:u.id,recipient_id:id,message:text.slice(0,1000),message_type:'text'});if(error)throw error;if(input)input.value='';await loadChat()}catch(e){alert(e.message||'Message could not be sent.')}};

  async function editProfile(){
    const u=await current();if(!u){alert('Please log in first.');return}const p=await getProfile(u.id);if(!p)return;const urls=await gallery(u.id,p.avatar_url);state.profileGallery=urls;
    const m=open('sgEditModal','Edit Profile');const body=m.querySelector('.sg-body');body.innerHTML=`<div class="form-group"><label>Username</label><input id="sgEditName" maxlength="40" value="${esc(p.display_name||'')}"></div><div class="form-group"><label>Profile Picture</label><img id="sgEditAvatar" class="sg-edit-avatar" src="${esc(p.avatar_url||fallbackAvatar(p.display_name))}" alt="Avatar"><input id="sgEditAvatarFile" class="sg-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><button class="sg-btn" type="button" onclick="document.getElementById('sgEditAvatarFile').click()">Change Main Picture</button></div><div class="form-group" style="margin-top:16px"><label>Profile Card Pictures</label><div id="sgEditGallery" class="sg-edit-gallery">${urls.map(x=>`<img src="${esc(x)}" alt="">`).join('')}<button class="sg-edit-add" type="button" id="sgGalleryAdd">+</button></div><p class="sg-note">Main picture + up to 4 extra pictures. These are shown on your player card.</p><input id="sgGalleryFiles" class="sg-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></div><button class="sg-btn" type="button" style="width:100%;margin-top:10px" onclick="sgSaveProfile()">Save Changes</button>`;
    document.getElementById('sgEditAvatarFile').onchange=e=>{const f=e.target.files?.[0];if(f)document.getElementById('sgEditAvatar').src=URL.createObjectURL(f)};
    document.getElementById('sgGalleryAdd').onclick=()=>document.getElementById('sgGalleryFiles').click();
    document.getElementById('sgGalleryFiles').onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>10*1024*1024){alert('Image must be 10 MB or less.');return}state.pendingGalleryFile=f;const wrap=document.getElementById('sgEditGallery');const img=document.createElement('img');img.src=URL.createObjectURL(f);wrap.insertBefore(img,document.getElementById('sgGalleryAdd'))};
  }
  window.sgEditProfile=()=>editProfile().catch(e=>alert(e.message||'Unable to open Edit Profile.'));
  window.sgSaveProfile=async()=>{
    try{const u=await current();if(!u)return;const p=await getProfile(u.id);const name=document.getElementById('sgEditName')?.value.trim()||p.display_name||'User';let avatar=p.avatar_url||'';const file=document.getElementById('sgEditAvatarFile')?.files?.[0];
      if(file){if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){alert('Please select JPG, PNG, WebP or GIF.');return}if(file.size>10*1024*1024){alert('Image must be 10 MB or less.');return}const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${u.id}/${Date.now()}.${ext}`;const up=await sb.storage.from('avatars').upload(path,file,{upsert:false,contentType:file.type});if(up.error)throw up.error;avatar=sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;if(p.avatar_url){const h=await sb.from('avatar_history').insert({user_id:u.id,avatar_url:p.avatar_url,provider:p.provider||null});if(h.error)throw h.error}}
      if(name!==p.display_name||avatar!==p.avatar_url){const {error}=await sb.from('profiles').update({display_name:name,avatar_url:avatar||null}).eq('id',u.id);if(error)throw error}
      const extra=state.pendingGalleryFile;if(extra){const existing=await gallery(u.id,avatar);if(existing.length>=5){alert('You already have the maximum of 5 profile pictures.');return}const ext=(extra.name.split('.').pop()||'jpg').toLowerCase();const path=`${u.id}/gallery-${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`;const up=await sb.storage.from('avatars').upload(path,extra,{upsert:false,contentType:extra.type});if(up.error)throw up.error;const url=sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;const h=await sb.from('avatar_history').insert({user_id:u.id,avatar_url:url,provider:'profile_gallery'});if(h.error)throw h.error}
      state.pendingGalleryFile=null;close('sgEditModal');await renderPublicProfile(u.id);if(typeof window.handleUserProfile==='function')await window.handleUserProfile();
    }catch(e){console.error(e);alert(e.message||'Unable to save profile.')}
  };

  async function adminPanel(){
    const u=await current();if(!u){alert('Please log in first.');return}const {data,error}=await sb.rpc('is_admin');if(error||data!==true){alert('Admin access is restricted.');return}
    const m=open('sgAdminModal','🔐 Admin Panel');const body=m.querySelector('.sg-body');body.innerHTML='<div class="sg-admin-stats"><div class="sg-admin-stat"><strong id="sgACUsers">—</strong><span>Profiles</span></div><div class="sg-admin-stat"><strong id="sgACScores">—</strong><span>Game Scores</span></div><div class="sg-admin-stat"><strong id="sgACMessages">—</strong><span>Messages</span></div></div><input id="sgAdminSearch" class="sg-admin-search" placeholder="Search users by name, email or User ID" oninput="sgFilterAdmin(this.value)"><div id="sgAdminUsers" class="sg-list"><div class="sg-empty">Loading users…</div></div><div id="sgAdminDetail"></div>';
    const [a,b,c]=await Promise.all([sb.from('profiles').select('id',{count:'exact',head:true}),sb.from('game_scores').select('id',{count:'exact',head:true}),sb.from('direct_messages').select('id',{count:'exact',head:true})]);document.getElementById('sgACUsers').textContent=a.count??0;document.getElementById('sgACScores').textContent=b.count??0;document.getElementById('sgACMessages').textContent=c.count??0;
    const {data:users}=await sb.from('profiles').select('*').order('created_at',{ascending:false});window.sgAdminUsers=users||[];sgRenderAdminUsers(window.sgAdminUsers);
  }
  function sgRenderAdminUsers(users){const out=document.getElementById('sgAdminUsers');if(!out)return;out.innerHTML=users.length?users.map(p=>`<div class="sg-admin-user"><img class="sg-avatar" src="${esc(p.avatar_url||fallbackAvatar(p.display_name))}" alt=""><div class="sg-main"><strong>${esc(p.display_name||'User')}</strong><small>${esc(p.user_id||'')} · ${esc(p.email||'')}</small></div><button class="sg-btn" onclick="sgAdminUser('${esc(p.id)}')">View</button></div>`).join(''):'<div class="sg-empty">No users found.</div>'}
  window.sgFilterAdmin=q=>{const x=String(q||'').toLowerCase();sgRenderAdminUsers((window.sgAdminUsers||[]).filter(p=>[p.display_name,p.user_id,p.email,p.discord_user_id,p.id].filter(Boolean).join(' ').toLowerCase().includes(x)))};
  window.sgAdminUser=async id=>{try{const p=await getProfile(id);const detail=document.getElementById('sgAdminDetail');if(!p||!detail)return;const [quizzes,attempts,history]=await Promise.all([sb.from('quizzes').select('*').eq('creator_id',id).order('created_at',{ascending:false}),sb.from('quiz_attempts').select('*').eq('user_id',id).order('completed_at',{ascending:false}),sb.from('avatar_history').select('*').eq('user_id',id).order('changed_at',{ascending:false})]);detail.innerHTML=`<div class="sg-admin-detail"><button class="sg-btn" onclick="document.getElementById('sgAdminDetail').innerHTML='';document.getElementById('sgAdminUsers').style.display='grid'">← Back</button><div style="text-align:center">${avatarHtml(p.avatar_url,p.display_name,true)}<h3>${esc(p.display_name||'User')}</h3><p class="sg-note">${esc(p.user_id||'')}</p></div><div class="sg-admin-info"><div><small>Email</small>${esc(p.email||'—')}</div><div><small>Provider</small>${esc(p.provider||'—')}</div><div><small>Created</small>${p.created_at?new Date(p.created_at).toLocaleString():'—'}</div><div><small>Discord ID</small>${esc(p.discord_user_id||'—')}</div></div><h3>User Quizzes (${(quizzes.data||[]).length})</h3>${(quizzes.data||[]).map(q=>`<div class="sg-admin-mini"><strong>${esc(q.title||'Untitled Quiz')}</strong><small>${esc(q.quiz_id||q.id)}</small></div>`).join('')||'<div class="sg-note">No quizzes.</div>'}<h3>Quiz Attempts (${(attempts.data||[]).length})</h3>${(attempts.data||[]).slice(0,50).map(a=>`<div class="sg-admin-mini"><strong>${esc(a.quiz_code||'Quiz')} · ${Number(a.score||0)} pts</strong><small>${a.completed_at?new Date(a.completed_at).toLocaleString():''}</small></div>`).join('')||'<div class="sg-note">No attempts.</div>'}<h3>Profile Pictures (${(history.data||[]).length})</h3>${galleryHtml((history.data||[]).map(x=>x.avatar_url))}</div>`;document.getElementById('sgAdminUsers').style.display='none'}catch(e){alert(e.message||'Unable to load user.')}};
  window.openAdmin=()=>adminPanel().catch(e=>alert(e.message||'Admin panel could not be opened.'));
  window.openAdminPanel=window.openAdmin;

  window.showSection=type=>{if(type==='social')return window.openSocial();if(type==='search'&&window.SusHubSearch?.open)return window.SusHubSearch.open();if(type==='leaderboard'&&window.openGlobalLeaderboard)return window.openGlobalLeaderboard()};

  function boot(){
    addStyle();sb=getSB();if(!sb){console.error('[Sus Games] Supabase client missing');return}
    const admin=document.getElementById('adminBtn');
    if(admin){admin.style.display='none';admin.style.padding='10px 14px';admin.style.fontSize='inherit';sb.rpc('is_admin').then(({data,error})=>{admin.style.display=(!error&&data===true)?'inline-flex':'none'}).catch(()=>admin.style.display='none')}
    if(!document.getElementById('sgLightbox')){const l=document.createElement('div');l.id='sgLightbox';l.className='sg-lightbox';l.onclick=e=>{if(e.target===l)sgCloseImage()};l.innerHTML='<button type="button" onclick="sgCloseImage()">×</button><img id="sgLightboxImg" alt="Profile picture">';document.body.appendChild(l)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
