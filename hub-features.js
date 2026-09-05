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
  style.textContent = `
    #adminBtn, .admin-menu-btn {
      display:inline-flex !important;align-items:center;justify-content:center;gap:8px;
      min-height:44px;padding:10px 18px;border-radius:12px;box-sizing:border-box;font:inherit;
    }
  `;
  document.head.appendChild(style);

  const applyHubHeaderLayout = () => {
    const nav = document.querySelector('.header .nav');
    const header = document.querySelector('.header');
    if (!nav || !header || document.getElementById('sgHeaderLayout')) return;
    const style = document.createElement('style');
    style.id = 'sgHeaderLayout';
    style.textContent = `
      .header{position:sticky;top:0;z-index:50;}
      .header .nav{flex:1;justify-content:flex-end;min-width:0;}
      .sg-hub-links{display:flex;align-items:center;justify-content:center;gap:24px;margin-left:auto;margin-right:24px;}
      .sg-hub-link{border:0;background:transparent;color:#aaa;text-decoration:none;font-size:14px;font-weight:600;padding:6px 0;cursor:pointer;white-space:nowrap;}
      .sg-hub-link:hover{color:#fff;}
      .sg-hub-actions{display:flex;align-items:center;gap:8px;}
      .sg-hub-actions .profile{order:10;}.sg-hub-actions #loginBtn{order:11;}.sg-hub-actions .more{order:12;}
      @media(max-width:1000px){.sg-hub-links{gap:14px;margin-right:14px}.sg-hub-link{font-size:13px}.sg-hub-actions{gap:6px}}
      @media(max-width:800px){.sg-hub-links{display:none}.sg-hub-actions{margin-left:auto}.header .nav{flex:1}}
    `;
    document.head.appendChild(style);
    const links = document.createElement('div');
    links.className = 'sg-hub-links';
    links.innerHTML = `
      <button type="button" class="sg-hub-link" onclick="window.location.href='https://babysusplay.github.io/quiz-website/'">Quiz</button>
      <button type="button" class="sg-hub-link" onclick="window.location.href='https://babysusplay.github.io/quiz-website/#create'">Create</button>
      <button type="button" class="sg-hub-link" onclick="showSection('about')">About</button>
    `;
    const actions = document.createElement('div');
    actions.className = 'sg-hub-actions';
    while (nav.firstChild) actions.appendChild(nav.firstChild);
    nav.appendChild(links);
    nav.appendChild(actions);
  };

  const bind = () => {
    if (typeof window.openAdminPanel === 'function') window.openAdmin = window.openAdminPanel;
    if (typeof window.sgEditProfile === 'function') window.editProfile = window.sgEditProfile;
    if (typeof window.sgViewProfile === 'function') {
      window.viewProfile = () => {
        if (window.currentUser?.id && typeof window.sgViewProfile === 'function') window.sgViewProfile(window.currentUser.id);
        document.getElementById('profileMenu')?.classList.remove('open');
      };
    }
    applyHubHeaderLayout();
  };
  bind();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else setTimeout(bind, 0);

  /* Quiz-style direct chat. Storage, table and permissions remain the shared production system. */
  const chatCss = document.createElement('style');
  chatCss.id = 'sgQuizStyleChat';
  chatCss.textContent = `
    .sg-chat{height:62vh!important;min-height:430px;display:flex;flex-direction:column}
    .sg-messages{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:3px;padding:6px 4px 10px}
    .sg-chat-row{display:flex;align-items:flex-end;gap:8px;width:100%;padding:2px 4px}
    .sg-chat-row.me{justify-content:flex-end}.sg-chat-row.them{justify-content:flex-start}
    .sg-chat-avatar{width:42px;height:42px;flex:0 0 42px;border-radius:50%;object-fit:cover;background:#242833;border:1px solid rgba(255,255,255,.10)}
    .sg-chat-avatar.spacer{visibility:hidden}
    .sg-chat-content{max-width:min(72%,620px);display:flex;flex-direction:column;gap:3px}
    .sg-chat-row.me .sg-chat-content{align-items:flex-end}.sg-chat-author{font-size:13px;font-weight:800;color:#fff;line-height:1.2;padding:0 4px}
    .sg-chat-bubble{padding:9px 12px;border-radius:12px;background:#242833;color:#fff;line-height:1.35;word-break:break-word}
    .sg-chat-row.me .sg-chat-bubble{background:#30343e}
    .sg-chat-time{display:none;color:#777d8a;font-size:10px;padding:0 4px}
    .sg-chat-time.show{display:block}
    .sg-chat-image{display:block;max-width:240px;max-height:300px;border-radius:10px;object-fit:cover;cursor:pointer}
    .sg-chat-compose{display:flex;align-items:center;gap:8px;margin-top:10px}
    .sg-chat-compose textarea{flex:1;min-height:54px;max-height:140px;resize:vertical;background:#0f1117!important;color:#fff!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:12px!important;padding:13px!important}
    .sg-chat-compose input[type=file]{display:none!important}
    .sg-chat-plus{width:58px;height:58px;flex:0 0 58px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(255,255,255,.055);color:#fff;font-size:28px;font-weight:700;display:grid;place-items:center;cursor:pointer}
    .sg-chat-plus:hover{background:rgba(255,255,255,.12)}
    .sg-chat-send{min-height:58px!important;border-radius:12px!important;padding:0 20px!important}
    .sg-chat-note{color:#858b98;font-size:12px;margin-top:8px}
    @media(max-width:700px){.sg-chat-content{max-width:80%}.sg-chat-avatar{width:36px;height:36px;flex-basis:36px}.sg-chat-image{max-width:72vw}.sg-chat-plus{width:50px;height:50px;flex-basis:50px}.sg-chat-send{min-height:50px!important;padding:0 14px!important}}
  `;
  document.head.appendChild(chatCss);

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fallbackAvatar = name => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#242833"/><text x="40" y="48" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="#9da3b0">${String(name||'P').trim().slice(0,1).toUpperCase()}</text></svg>`);

  async function getMe(){
    const sb=window.supabaseClient;
    if(!sb)return null;
    try{const {data}=await sb.auth.getUser();return data?.user||null}catch{return null}
  }
  async function getProfile(id){
    const sb=window.supabaseClient;
    if(!sb||!id)return null;
    try{const {data}=await sb.from('profiles').select('id,display_name,avatar_url').eq('id',id).maybeSingle();return data||null}catch{return null}
  }
  async function getRelation(a,b){
    const sb=window.supabaseClient;
    const [{data:f},{data:r}]=await Promise.all([
      sb.from('profile_follows').select('id').eq('follower_id',a).eq('following_id',b).maybeSingle(),
      sb.from('profile_follows').select('id').eq('follower_id',b).eq('following_id',a).maybeSingle()
    ]);
    return {following:!!f,mutual:!!f&&!!r};
  }
  const fmtTime=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleString([], {month:'numeric',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});};
  const isImageMessage=m=>String(m?.message_type||'').toLowerCase()==='image';

  function renderMessages(rows, meId, meProfile, targetProfile){
    const out=document.getElementById('sgMessages');if(!out)return;
    if(!rows.length){out.innerHTML='<div class="sg-empty">No messages yet.</div>';return;}
    let lastShownTime=null,lastSender=null;
    out.innerHTML=rows.map((m,i)=>{
      const mine=String(m.sender_id)===String(meId);
      const sender=mine?meProfile:targetProfile;
      const name=sender?.display_name||(mine?'You':'Player');
      const avatar=sender?.avatar_url||fallbackAvatar(name);
      const dt=new Date(m.created_at);
      const showTime=!lastShownTime || (!Number.isNaN(dt.getTime()) && dt.getTime()-lastShownTime.getTime()>=30*60*1000);
      if(showTime&&!Number.isNaN(dt.getTime()))lastShownTime=dt;
      const showIdentity=String(m.sender_id)!==String(lastSender);
      lastSender=m.sender_id;
      const avatarHtml=showIdentity?`<img class="sg-chat-avatar" src="${esc(avatar)}" alt="" onerror="this.src='${esc(fallbackAvatar(name))}'">`:`<span class="sg-chat-avatar spacer"></span>`;
      const body=isImageMessage(m)?`<img class="sg-chat-image" src="${esc(m.message||'')}" alt="Shared image" onclick="window.open('${esc(m.message||'')}','_blank')">`:`<div class="sg-chat-bubble">${esc(m.message||'')}</div>`;
      return `<div class="sg-chat-row ${mine?'me':'them'}">${mine?'':avatarHtml}<div class="sg-chat-content">${showIdentity?`<div class="sg-chat-author">${esc(name)}</div>`:''}${body}${showTime?`<small class="sg-chat-time show">${esc(fmtTime(m.created_at))}</small>`:''}</div>${mine?avatarHtml:''}</div>`;
    }).join('');
    out.scrollTop=out.scrollHeight;
  }

  async function loadChatExact(targetId, channel){
    const sb=window.supabaseClient, me=await getMe();
    if(!sb||!me)return;
    const [meProfile,targetProfile]=await Promise.all([getProfile(me.id),getProfile(targetId)]);
    const {data,error}=await sb.from('direct_messages').select('id,sender_id,recipient_id,message,message_type,created_at').or(`and(sender_id.eq.${me.id},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${me.id})`).order('created_at',{ascending:true}).limit(500);
    if(error){const out=document.getElementById('sgMessages');if(out)out.innerHTML='<div class="sg-empty">Unable to load messages.</div>';return;}
    renderMessages(data||[],me.id,meProfile,targetProfile);
    if(channel)channel.unsubscribe();
  }

  async function sendImageExact(file,targetId){
    const sb=window.supabaseClient,me=await getMe();
    if(!sb||!me||!file)return;
    if(!file.type.startsWith('image/')){alert('Please select an image.');return;}
    const path=`${me.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const {error:uploadError}=await sb.storage.from('quiz-chat-images').upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError){alert('Image could not be uploaded: '+uploadError.message);return;}
    const {data:publicData}=sb.storage.from('quiz-chat-images').getPublicUrl(path);
    const imageUrl=publicData?.publicUrl;
    if(!imageUrl){alert('Image URL could not be created.');return;}
    const {error}=await sb.from('direct_messages').insert({sender_id:me.id,recipient_id:targetId,message:imageUrl,message_type:'image'});
    if(error){alert('Image message could not be sent: '+error.message);return;}
    await loadChatExact(targetId);
  }

  function subscribeChat(targetId){
    const sb=window.supabaseClient,meId=window.__sgChatMeId;
    if(!sb||!meId)return null;
    const channel=sb.channel(`main-hub-direct-chat-${meId}-${targetId}-${Date.now()}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},payload=>{
      const m=payload.new;if(!m)return;
      const belongs=(String(m.sender_id)===String(meId)&&String(m.recipient_id)===String(targetId))||(String(m.sender_id)===String(targetId)&&String(m.recipient_id)===String(meId));
      if(!belongs)return;
      loadChatExact(targetId);
    }).subscribe();
    return channel;
  }

  async function openExactChat(targetId){
    const sb=window.supabaseClient,me=await getMe();
    if(!sb||!me){if(typeof openAuth==='function')openAuth();return;}
    const rel=await getRelation(me.id,targetId);if(!rel.mutual){alert('Messaging is available after you follow each other.');return;}
    const target=await getProfile(targetId);const title=`Message ${target?.display_name||'User'}`;
    let modal=document.getElementById('sgChatModal');
    if(!modal){
      modal=document.createElement('div');modal.id='sgChatModal';modal.className='sg-modal';
      modal.innerHTML=`<div class="sg-box"><div class="sg-head"><h2 id="sgChatTitle"></h2><button class="sg-close" type="button">×</button></div><div class="sg-body"></div></div>`;
      document.body.appendChild(modal);modal.querySelector('.sg-close').onclick=()=>modal.classList.remove('open');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
    }
    modal.querySelector('#sgChatTitle').textContent=title;
    modal.querySelector('.sg-body').innerHTML=`<div class="sg-chat"><div id="sgMessages" class="sg-messages"></div><div class="sg-chat-compose"><input id="sgChatImageInput" class="sg-hidden" type="file" accept="image/*"><button id="sgChatPlus" class="sg-chat-plus" type="button" title="Send picture">+</button><textarea id="sgMessageInput" maxlength="1000" placeholder="Write a message..."></textarea><button id="sgChatSend" class="sg-btn sg-chat-send" type="button">Send</button></div><div class="sg-chat-note">Direct chat is available only between mutual followers.</div></div>`;
    modal.classList.add('open');
    window.__sgChatMeId=me.id;
    const oldChannel=window.__sgChatChannel;if(oldChannel){try{await oldChannel.unsubscribe()}catch{}}
    await loadChatExact(targetId);
    window.__sgChatChannel=subscribeChat(targetId);
    const input=document.getElementById('sgMessageInput'),file=document.getElementById('sgChatImageInput');
    document.getElementById('sgChatPlus').onclick=()=>file.click();
    file.onchange=()=>{if(file.files?.[0])sendImageExact(file.files[0],targetId)};
    const send=async()=>{const text=input.value.trim();if(!text)return;const {error}=await sb.from('direct_messages').insert({sender_id:me.id,recipient_id:targetId,message:text.slice(0,1000),message_type:'text'});if(error){alert('Message could not be sent: '+error.message);return}input.value='';};
    document.getElementById('sgChatSend').onclick=send;
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  }

  const install=()=>{
    window.sgOpenChat=openExactChat;
  };
  install();
  setTimeout(install,300);
  setTimeout(install,1000);
})();
