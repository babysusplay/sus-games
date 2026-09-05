/* Main Hub feature bridge - stable public handlers */
(() => {
  'use strict';

  // These are the real production handlers exposed by hub-override.js.
  // Keep the legacy HTML button entry point, but route it to the live system.
  window.showSection = function(type) {
    if (type === 'search' && typeof window.openPlayerSearch === 'function') return window.openPlayerSearch();
    if (type === 'social' && typeof window.openSocial === 'function') return window.openSocial();
    if (type === 'leaderboard' && typeof window.openLeaderboard === 'function') return window.openLeaderboard();
    if (type === 'about') {
      const m = document.getElementById('sgAboutModal');
      if (m) { m.classList.add('open'); return; }
    }
  };

  // Keep the Admin button the same visual size/shape as the Social button.
  const style = document.createElement('style');
  style.id = 'susGamesHubButtonFix';
  style.textContent = `
    #adminBtn, .admin-menu-btn {
      display:inline-flex !important;
      align-items:center;
      justify-content:center;
      gap:8px;
      min-height:44px;
      padding:10px 18px;
      border-radius:12px;
      box-sizing:border-box;
      font:inherit;
    }
  `;
  document.head.appendChild(style);

  // Reposition the Main Hub header to match the established Quiz header layout.
  // This is layout-only: existing buttons and their handlers are preserved.
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
      .sg-hub-actions .profile{order:10;}
      .sg-hub-actions #loginBtn{order:11;}
      .sg-hub-actions .more{order:12;}
      @media(max-width:1000px){.sg-hub-links{gap:14px;margin-right:14px}.sg-hub-link{font-size:13px}.sg-hub-actions{gap:6px}}
      @media(max-width:800px){.sg-hub-links{display:none}.sg-hub-actions{margin-left:auto}.header .nav{flex:1}}
    `;
    document.head.appendChild(style);

    // Keep the original functional controls intact, only regroup their DOM nodes.
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

  // Re-assert the legacy aliases after parsing so inline legacy declarations cannot win.
  const bind = () => {
    if (typeof window.openAdminPanel === 'function') window.openAdmin = window.openAdminPanel;
    if (typeof window.sgEditProfile === 'function') window.editProfile = window.sgEditProfile;
    if (typeof window.sgViewProfile === 'function') {
      window.viewProfile = () => {
        if (window.currentUser?.id && typeof window.sgViewProfile === 'function') window.sgViewProfile(window.currentUser.id);
        document.getElementById('profileMenu')?.style && (document.getElementById('profileMenu').style.display = 'none');
      };
    }
    applyHubHeaderLayout();
  };
  bind();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else setTimeout(bind, 0);

  /*
   * Quiz-style direct-chat presentation.
   * This layer deliberately sits on top of the existing production chat
   * handlers so message storage, realtime subscriptions and permissions are
   * not replaced. It only improves the rendered conversation UI.
   */
  const chatCss = document.createElement('style');
  chatCss.id = 'sgQuizStyleChat';
  chatCss.textContent = `
    .sg-chat{height:62vh!important;min-height:430px;display:flex;flex-direction:column}
    .sg-messages{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:6px 4px 10px}
    .sg-chat-message{display:flex;align-items:flex-end;gap:9px;width:100%;padding:2px 4px}
    .sg-chat-message.me{justify-content:flex-end}
    .sg-chat-message.them{justify-content:flex-start}
    .sg-chat-avatar{width:42px;height:42px;flex:0 0 42px;border-radius:50%;object-fit:cover;background:#242833;border:1px solid rgba(255,255,255,.10)}
    .sg-chat-content{max-width:min(72%,620px);display:flex;flex-direction:column;gap:3px}
    .sg-chat-message.me .sg-chat-content{align-items:flex-end}
    .sg-chat-author{font-size:13px;font-weight:800;color:#fff;line-height:1.2;padding:0 4px}
    .sg-chat-message.me .sg-chat-author{text-align:right}
    .sg-chat-bubble{padding:9px 12px;border-radius:12px;background:#242833;color:#fff;line-height:1.35;word-break:break-word}
    .sg-chat-message.me .sg-chat-bubble{background:#30343e}
    .sg-chat-time{display:none!important;color:#777d8a;font-size:10px;padding:0 4px}
    .sg-chat-message.sg-show-time .sg-chat-time{display:block!important}
    .sg-chat-image{display:block;max-width:min(360px,62vw);max-height:360px;border-radius:10px;cursor:pointer}
    .sg-chat-image-link{display:block;text-decoration:none;color:inherit}
    .sg-chat-compose{display:flex;align-items:flex-end;gap:8px;margin-top:10px}
    .sg-chat-compose textarea{flex:1;min-height:54px;max-height:140px;resize:vertical;background:#0f1117!important;color:#fff!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:12px!important;padding:13px!important}
    .sg-chat-compose input[type=file]{display:none}
    .sg-chat-plus{width:58px;height:58px;flex:0 0 58px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(255,255,255,.055);color:#fff;font-size:27px;font-weight:700;display:grid;place-items:center;cursor:pointer}
    .sg-chat-plus:hover{background:rgba(255,255,255,.12)}
    .sg-chat-send{min-height:58px;border-radius:12px!important;padding:0 20px!important}
    .sg-chat-note{color:#858b98;font-size:12px;margin-top:8px}
    @media(max-width:700px){.sg-chat-content{max-width:80%}.sg-chat-avatar{width:36px;height:36px;flex-basis:36px}.sg-chat-image{max-width:72vw}.sg-chat-compose{gap:6px}.sg-chat-plus{width:50px;height:50px;flex-basis:50px}.sg-chat-send{min-height:50px;padding:0 14px!important}}
  `;
  document.head.appendChild(chatCss);

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fallbackAvatar = name => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="#242833"/><text x="40" y="48" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="#9da3b0">${String(name||'P').trim().slice(0,1).toUpperCase()}</text></svg>`);

  async function chatProfile(id){
    try{
      const sb = window.supabaseClient;
      if(!sb || !id) return null;
      const {data} = await sb.from('profiles').select('id,display_name,avatar_url').eq('id',id).maybeSingle();
      return data || null;
    }catch{return null}
  }

  function formatChatTime(value){
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], {month:'numeric',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  }

  function messageTime(node){
    const small = node.querySelector('small');
    if(small?.textContent?.trim()) return small.textContent.trim();
    return node.dataset?.createdAt || node.getAttribute('data-created-at') || '';
  }

  async function enhanceChat(targetId){
    const modal = document.getElementById('sgChatModal') || document.querySelector('.sg-modal.open');
    if(!modal) return;
    const messages = modal.querySelector('.sg-messages');
    if(!messages) return;
    const meId = window.currentUser?.id || window.__sgCurrentUser?.id || '';
    const [meProfile,targetProfile] = await Promise.all([chatProfile(meId),chatProfile(targetId)]);
    const meName = meProfile?.display_name || window.currentUser?.user_metadata?.name || 'You';
    const targetName = targetProfile?.display_name || 'Player';
    const meAvatar = meProfile?.avatar_url || fallbackAvatar(meName);
    const targetAvatar = targetProfile?.avatar_url || fallbackAvatar(targetName);

    [...messages.querySelectorAll('.sg-msg')].forEach(node => {
      if(node.dataset.sgEnhanced === '1') return;
      const isMe = node.classList.contains('me');
      const text = node.querySelector('small') ? node.cloneNode(true) : node;
      const time = messageTime(node);
      const raw = node.textContent.replace(time,'').trim();
      const safeText = esc(raw);
      const avatar = isMe ? meAvatar : targetAvatar;
      const name = isMe ? meName : targetName;
      node.classList.add('sg-chat-message', isMe ? 'me' : 'them');
      node.innerHTML = `<img class="sg-chat-avatar" src="${esc(avatar)}" alt="" onerror="this.src='${esc(fallbackAvatar(name))}'"><div class="sg-chat-content"><div class="sg-chat-author">${esc(name)}</div><div class="sg-chat-bubble">${safeText}</div><small class="sg-chat-time">${esc(time)}</small></div>`;
      node.dataset.sgEnhanced = '1';
    });

    // Show a timestamp only for the first message and then at 30-minute boundaries.
    let lastTime = null;
    [...messages.querySelectorAll('.sg-chat-message')].forEach(node => {
      const t = node.querySelector('.sg-chat-time')?.textContent?.trim() || '';
      const d = new Date(t);
      let show = false;
      if(!lastTime){show = true; if(!Number.isNaN(d.getTime())) lastTime=d;}
      else if(!Number.isNaN(d.getTime())){
        show = (d.getTime()-lastTime.getTime()) >= 30*60*1000;
        if(show) lastTime=d;
      }
      node.classList.toggle('sg-show-time',show);
    });

    const compose = modal.querySelector('.sg-compose');
    if(compose && !compose.dataset.sgQuizChat){
      compose.dataset.sgQuizChat='1';
      const oldInput = compose.querySelector('input[type="text"],input:not([type]),textarea');
      if(oldInput){
        oldInput.classList.add('sg-chat-text');
        if(oldInput.tagName==='INPUT'){
          const ta=document.createElement('textarea');
          ta.placeholder=oldInput.placeholder||'Write a message...';
          ta.value=oldInput.value;
          ta.id=oldInput.id; ta.name=oldInput.name;
          oldInput.replaceWith(ta);
        }
      }
      const file=document.createElement('input');file.type='file';file.accept='image/*';file.className='sg-chat-file';
      const plus=document.createElement('button');plus.type='button';plus.className='sg-chat-plus';plus.textContent='+';plus.title='Send picture';
      plus.onclick=()=>file.click();
      compose.insertBefore(plus,compose.firstChild);compose.appendChild(file);
      file.addEventListener('change',()=>{
        const f=file.files?.[0];
        if(!f)return;
        // Preserve the existing production sender/upload flow when it exposes an image handler.
        if(typeof window.sgSendImage==='function') window.sgSendImage(f,targetId);
        else if(typeof window.sendChatImage==='function') window.sendChatImage(f,targetId);
        else {
          const ta=compose.querySelector('textarea');
          if(ta) ta.value = `[Image selected: ${f.name}]`;
        }
      });
      const send=compose.querySelector('button:last-child');
      if(send) send.classList.add('sg-chat-send');
      const note=document.createElement('div');note.className='sg-chat-note';note.textContent='Direct chat is available only between mutual followers.';
      compose.parentElement?.appendChild(note);
    }
  }

  // Remember the recipient and enhance the existing production chat after it opens.
  const wrapChat=()=>{
    if(typeof window.sgOpenChat!=='function' || window.sgOpenChat.__sgQuizWrapped) return false;
    const original=window.sgOpenChat;
    const wrapped=function(id){
      window.__sgChatTargetId=id;
      const result=original.apply(this,arguments);
      setTimeout(()=>enhanceChat(id),150);
      setTimeout(()=>enhanceChat(id),600);
      setTimeout(()=>enhanceChat(id),1400);
      return result;
    };
    wrapped.__sgQuizWrapped=true;
    window.sgOpenChat=wrapped;
    return true;
  };
  if(!wrapChat()){
    let tries=0;
    const timer=setInterval(()=>{if(wrapChat()||++tries>80)clearInterval(timer)},100);
  }

  // Re-enhance after realtime message inserts without replacing the production subscription.
  const observer=new MutationObserver(()=>{
    const modal=document.getElementById('sgChatModal');
    if(modal?.classList.contains('open') && window.__sgChatTargetId) enhanceChat(window.__sgChatTargetId);
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
