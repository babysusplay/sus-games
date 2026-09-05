/* Main Hub feature bridge - stable public handlers */
(() => {
  'use strict';

  window.showSection = function(type) {
    if (type === 'search' && typeof window.openPlayerSearch === 'function') return window.openPlayerSearch();
    if (type === 'social' && typeof window.openSocial === 'function') return window.openSocial();
    if (type === 'leaderboard' && typeof window.openLeaderboard === 'function') return window.openLeaderboard();
    if (type === 'about') {
      const m = document.getElementById('sgAboutModal');
      if (m) { m.classList.add('open'); return; }
    }
  };

  const style = document.createElement('style');
  style.id = 'susGamesHubButtonFix';
  style.textContent = `#adminBtn,.admin-menu-btn{display:inline-flex!important;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:12px;box-sizing:border-box;font:inherit}`;
  document.head.appendChild(style);

  const applyHubHeaderLayout=()=>{
    const nav=document.querySelector('.header .nav'),header=document.querySelector('.header');
    if(!nav||!header||document.getElementById('sgHeaderLayout'))return;
    const s=document.createElement('style');s.id='sgHeaderLayout';s.textContent=`
      .header{position:sticky;top:0;z-index:50}.header .nav{flex:1;justify-content:flex-end;min-width:0}
      .sg-hub-links{display:flex;align-items:center;justify-content:center;gap:24px;margin-left:auto;margin-right:24px}
      .sg-hub-link{border:0;background:transparent;color:#aaa;text-decoration:none;font-size:14px;font-weight:600;padding:6px 0;cursor:pointer;white-space:nowrap}.sg-hub-link:hover{color:#fff}
      .sg-hub-actions{display:flex;align-items:center;gap:8px}.sg-hub-actions .profile{order:10}.sg-hub-actions #loginBtn{order:11}.sg-hub-actions .more{order:12}
      @media(max-width:1000px){.sg-hub-links{gap:14px;margin-right:14px}.sg-hub-link{font-size:13px}.sg-hub-actions{gap:6px}}
      @media(max-width:800px){.sg-hub-links{display:none}.sg-hub-actions{margin-left:auto}.header .nav{flex:1}}
    `;document.head.appendChild(s);
    const links=document.createElement('div');links.className='sg-hub-links';links.innerHTML=`<button type="button" class="sg-hub-link" onclick="window.location.href='https://babysusplay.github.io/quiz-website/'">Quiz</button><button type="button" class="sg-hub-link" onclick="window.location.href='https://babysusplay.github.io/quiz-website/#create'">Create</button><button type="button" class="sg-hub-link" onclick="showSection('about')">About</button>`;
    const actions=document.createElement('div');actions.className='sg-hub-actions';while(nav.firstChild)actions.appendChild(nav.firstChild);nav.appendChild(links);nav.appendChild(actions);
  };

  const bind=()=>{
    if(typeof window.openAdminPanel==='function')window.openAdmin=window.openAdminPanel;
    if(typeof window.sgEditProfile==='function')window.editProfile=window.sgEditProfile;
    if(typeof window.sgViewProfile==='function')window.viewProfile=()=>{if(window.currentUser?.id)window.sgViewProfile(window.currentUser.id);document.getElementById('profileMenu')?.classList.remove('open')};
    applyHubHeaderLayout();
  };
  bind();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else setTimeout(bind,0);

  /* Quiz-style direct chat. Reuses the existing shared account, direct_messages table and quiz-chat-images bucket. */
  const chatCss=document.createElement('style');chatCss.id='sgQuizStyleChat';chatCss.textContent=`
    .sg-chat{height:62vh!important;min-height:430px;display:flex;flex-direction:column}
    .sg-messages{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;margin-bottom:10px;background:#171a22}
    .sg-chat-row{display:flex;align-items:flex-end;gap:8px;width:100%;padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.05)}.sg-chat-row.me{justify-content:flex-end}.sg-chat-row.them{justify-content:flex-start}.sg-chat-row:last-child{border-bottom:0}
    .sg-chat-avatar{width:34px;height:34px;flex:0 0 34px;border-radius:50%;object-fit:cover;background:#242833;border:1px solid rgba(255,255,255,.10);cursor:pointer}.sg-chat-avatar.spacer{visibility:hidden}
    .sg-chat-content{max-width:min(78%,620px);display:flex;flex-direction:column;gap:3px;min-width:0}.sg-chat-row.me .sg-chat-content{align-items:flex-end}
    .sg-chat-author{font-size:13px;font-weight:800;color:#fff;line-height:1.2;padding:0 4px;display:flex;align-items:center;gap:5px}.sg-chat-admin{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;background:rgba(255,70,70,.12);border:1px solid rgba(255,70,70,.55);color:#ff5f6d;font-size:10px;font-weight:800;letter-spacing:.3px;line-height:1.2}
    .sg-chat-bubble{padding:9px 12px;border-radius:12px;background:#242833;color:#fff;line-height:1.35;word-break:break-word}.sg-chat-row.me .sg-chat-bubble{background:#30343e}
    .sg-chat-time{display:block;color:#777d8a;font-size:10px;padding:0 4px}
    .sg-chat-image{display:block;max-width:240px;max-height:300px;border-radius:10px;object-fit:cover;cursor:pointer;border:1px solid rgba(255,255,255,.06)}
    .sg-chat-image-picker-row{display:flex;align-items:center;margin-top:0;margin-bottom:6px}.sg-chat-plus{width:58px;height:58px;flex:0 0 58px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(255,255,255,.055);color:#fff;font-size:28px;font-weight:700;display:grid;place-items:center;cursor:pointer}.sg-chat-plus:hover{background:rgba(255,255,255,.12)}
    .sg-chat-compose-row{display:flex;align-items:flex-end;gap:8px}.sg-chat-compose-row textarea{flex:1;min-height:116px;max-height:180px;resize:vertical;background:#0f1117!important;color:#fff!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:12px!important;padding:13px!important;line-height:1.45}.sg-chat-compose-row input[type=file]{display:none!important}
    .sg-chat-send{min-height:58px!important;border-radius:12px!important;padding:0 20px!important;background:#fff!important;color:#111!important}.sg-chat-send:hover{background:#e9e9e9!important}.sg-chat-note{color:#858b98;font-size:12px;margin-top:8px}
    @media(max-width:700px){.sg-chat-content{max-width:80%}.sg-chat-avatar{width:31px;height:31px;flex-basis:31px}.sg-chat-image{max-width:72vw}.sg-chat-plus{width:50px;height:50px;flex-basis:50px}.sg-chat-compose-row textarea{min-height:96px}.sg-chat-send{min-height:50px!important;padding:0 14px!important}}
  `;document.head.appendChild(chatCss);

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fallbackAvatar=name=>'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#242833"/><text x="40" y="48" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="#9da3b0">${String(name||'P').trim().slice(0,1).toUpperCase()}</text></svg>`);

  const getSharedSupabase=()=>{
    try { if(typeof supabaseClient!=='undefined' && supabaseClient) return supabaseClient; } catch {}
    return window.supabaseClient||null;
  };

  async function getMe(){const sb=getSharedSupabase();if(!sb)return null;try{const {data}=await sb.auth.getUser();return data?.user||null}catch{return null}}
  async function getProfile(id){const sb=getSharedSupabase();if(!sb||!id)return null;try{const {data}=await sb.from('profiles').select('id,display_name,avatar_url').eq('id',id).maybeSingle();return data||null}catch{return null}}
  async function getAdminFlag(id){const sb=getSharedSupabase();if(!sb||!id)return false;try{const {data,error}=await sb.from('admin_users').select('user_id').eq('user_id',id).maybeSingle();return !error&&!!data}catch{return false}}
  async function getRelation(a,b){const sb=getSharedSupabase();if(!sb||!a||!b)return{following:false,mutual:false};const [{data:f},{data:r}]=await Promise.all([sb.from('profile_follows').select('id').eq('follower_id',a).eq('following_id',b).maybeSingle(),sb.from('profile_follows').select('id').eq('follower_id',b).eq('following_id',a).maybeSingle()]);return{following:!!f,mutual:!!f&&!!r}}
  const fmtTime=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleString([], {month:'numeric',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})};
  const isImageMessage=m=>String(m?.message_type||'').toLowerCase()==='image';

  function renderMessages(rows,meId,meProfile,targetProfile,meAdmin,targetAdmin){
    const out=document.getElementById('sgMessages');if(!out)return;if(!rows.length){out.innerHTML='<div class="sg-empty">No messages yet.</div>';return}
    let lastShownTime=null;
    out.innerHTML=rows.map(m=>{
      const mine=String(m.sender_id)===String(meId),sender=mine?meProfile:targetProfile,name=sender?.display_name||(mine?'You':'Player'),avatar=sender?.avatar_url||fallbackAvatar(name),admin=mine?meAdmin:targetAdmin,dt=new Date(m.created_at);
      const showTime=!lastShownTime||(!Number.isNaN(dt.getTime())&&dt.getTime()-lastShownTime.getTime()>=30*60*1000);if(showTime&&!Number.isNaN(dt.getTime()))lastShownTime=dt;
      const avatarHtml=`<img class="sg-chat-avatar" src="${esc(avatar)}" alt="" title="View profile" onerror="this.src='${esc(fallbackAvatar(name))}'">`;
      const author=`<div class="sg-chat-author">${esc(name)}${admin?'<span class="sg-chat-admin">ADMIN</span>':''}</div>`;
      const body=isImageMessage(m)?`<img class="sg-chat-image" src="${esc(m.message||'')}" alt="Shared image" onclick="window.open('${esc(m.message||'')}','_blank')">`:`<div class="sg-chat-bubble">${esc(m.message||'')}</div>`;
      return `<div class="sg-chat-row ${mine?'me':'them'}">${mine?'':avatarHtml}<div class="sg-chat-content">${author}${body}${showTime?`<small class="sg-chat-time">${esc(fmtTime(m.created_at))}</small>`:''}</div>${mine?avatarHtml:''}</div>`;
    }).join('');out.scrollTop=out.scrollHeight;
  }

  async function loadChatExact(targetId){
    const sb=getSharedSupabase(),me=await getMe();if(!sb||!me)return;const [meProfile,targetProfile,meAdmin,targetAdmin]=await Promise.all([getProfile(me.id),getProfile(targetId),getAdminFlag(me.id),getAdminFlag(targetId)]);
    const {data,error}=await sb.from('direct_messages').select('id,sender_id,recipient_id,message,message_type,created_at').or(`and(sender_id.eq.${me.id},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${me.id})`).order('created_at',{ascending:true}).limit(500);
    if(error){const out=document.getElementById('sgMessages');if(out)out.innerHTML='<div class="sg-empty">Unable to load messages.</div>';return}renderMessages(data||[],me.id,meProfile,targetProfile,meAdmin,targetAdmin);
  }

  async function sendImageExact(file,targetId){
    const sb=getSharedSupabase(),me=await getMe();if(!sb||!me||!file)return;if(!file.type.startsWith('image/')){alert('Please select an image.');return}
    if(file.size>8*1024*1024){alert('Image must be 8 MB or smaller.');return}
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const path=`${me.id}/${crypto.randomUUID()}.${ext}`;
    const {error:uploadError}=await sb.storage.from('quiz-chat-images').upload(path,file,{contentType:file.type,upsert:false});if(uploadError){alert('Image could not be uploaded: '+uploadError.message);return}
    const {data:publicData}=sb.storage.from('quiz-chat-images').getPublicUrl(path),imageUrl=publicData?.publicUrl;if(!imageUrl){alert('Image URL could not be created.');return}
    const {error}=await sb.from('direct_messages').insert({sender_id:me.id,recipient_id:targetId,message:imageUrl,message_type:'image'});if(error){alert('Image message could not be sent: '+error.message);return}
    await loadChatExact(targetId);
  }

  function subscribeChat(targetId){
    const sb=getSharedSupabase(),meId=window.__sgChatMeId;if(!sb||!meId)return null;
    return sb.channel(`main-hub-direct-chat-${meId}-${targetId}-${Date.now()}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},payload=>{const m=payload.new;if(!m)return;const belongs=(String(m.sender_id)===String(meId)&&String(m.recipient_id)===String(targetId))||(String(m.sender_id)===String(targetId)&&String(m.recipient_id)===String(meId));if(belongs)loadChatExact(targetId)}).subscribe();
  }

  async function openExactChat(targetId){
    const sb=getSharedSupabase(),me=await getMe();if(!sb||!me){if(typeof openAuth==='function')openAuth();return}
    const rel=await getRelation(me.id,targetId);if(!rel.mutual){alert('Messaging is available after you follow each other.');return}
    const target=await getProfile(targetId),title=`Chat with ${target?.display_name||'User'}`;let modal=document.getElementById('sgChatModal');
    if(!modal){modal=document.createElement('div');modal.id='sgChatModal';modal.className='sg-modal';modal.innerHTML=`<div class="sg-box"><div class="sg-head"><h2 id="sgChatTitle"></h2><button class="sg-close" type="button">×</button></div><div class="sg-body"></div></div>`;document.body.appendChild(modal);modal.querySelector('.sg-close').onclick=()=>modal.classList.remove('open');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')})}
    modal.querySelector('#sgChatTitle').textContent=title;
    modal.querySelector('.sg-body').innerHTML=`<div class="sg-chat"><div id="sgMessages" class="sg-messages"></div><div class="sg-chat-image-picker-row"><input id="sgChatImageInput" type="file" accept="image/*" hidden><button id="sgChatPlus" class="sg-chat-plus" type="button" title="Add picture">+</button></div><div class="sg-chat-compose-row"><textarea id="sgMessageInput" maxlength="1000" rows="2" placeholder="Write a message..."></textarea><button id="sgChatSend" class="sg-btn sg-chat-send" type="button">Send</button></div><div class="sg-chat-note">Direct chat is available only between mutual followers.</div></div>`;
    modal.classList.add('open');window.__sgChatMeId=me.id;const oldChannel=window.__sgChatChannel;if(oldChannel){try{await oldChannel.unsubscribe()}catch{}}
    await loadChatExact(targetId);window.__sgChatChannel=subscribeChat(targetId);
    const input=document.getElementById('sgMessageInput'),file=document.getElementById('sgChatImageInput');document.getElementById('sgChatPlus').onclick=()=>file.click();file.onchange=()=>{if(file.files?.[0])sendImageExact(file.files[0],targetId)};
    const send=async()=>{const text=input.value.trim();if(!text)return;const {error}=await sb.from('direct_messages').insert({sender_id:me.id,recipient_id:targetId,message:text.slice(0,1000),message_type:'text'});if(error){alert('Message could not be sent: '+error.message);return}input.value='';};
    document.getElementById('sgChatSend').onclick=send;input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
  }

  window.sgOpenChat=openExactChat;
  setTimeout(()=>{window.sgOpenChat=openExactChat},300);
  setTimeout(()=>{window.sgOpenChat=openExactChat},1000);
})();
