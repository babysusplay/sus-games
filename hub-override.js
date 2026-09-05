/* Sus Games Main Hub - Search + Quiz-style profile UI bridge */
(() => {
  'use strict';
  const boot = () => {
    const sb = (typeof supabaseClient !== 'undefined') ? supabaseClient : window.supabaseClient;
    if (!sb) return;
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
    const fallback = name => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="50" fill="#242833"/><text x="50" y="59" text-anchor="middle" font-family="Arial" font-size="42" font-weight="700" fill="#9da3b0">${String(name||'P').slice(0,1).toUpperCase()}</text></svg>`);
    const avatar = (url,name) => `<img src="${esc(url||fallback(name))}" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;background:#242833" onerror="this.onerror=null;this.src='${esc(fallback(name))}'">`;

    const style=document.createElement('style');
    style.id='susHubReferenceStyle';
    style.textContent=`
      .sg-admin-badge,.profile-admin-badge{display:inline-flex;align-items:center;margin-left:7px;padding:2px 7px;border-radius:999px;background:rgba(255,70,70,.12);border:1px solid rgba(255,70,70,.55);color:#ff5f6d;font-size:11px;font-weight:800;line-height:1.2;vertical-align:middle;letter-spacing:.3px}
      .sg-edit-wrap{display:grid;gap:18px}.sg-edit-label{display:block;color:#c8cbd3;font-size:14px;font-weight:600;margin-bottom:8px}.sg-edit-main{position:relative;width:max-content}.sg-edit-main img{width:104px;height:104px;border-radius:50%;object-fit:cover;background:#242833;border:1px solid rgba(255,255,255,.12)}
      .sg-edit-remove{position:absolute;right:-4px;top:-4px;width:25px;height:25px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:#2a2e38;color:#fff;font-size:17px;line-height:21px;padding:0;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.35)}.sg-edit-remove:hover{background:#b83245}
      .sg-edit-gallery-reference{display:grid;grid-template-columns:repeat(5,72px);gap:10px}.sg-edit-tile{position:relative;width:72px;height:72px}.sg-edit-tile img{width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,.1)}
      .sg-edit-tile .sg-edit-remove{right:-6px;top:-6px;width:22px;height:22px;font-size:15px;line-height:18px}.sg-edit-plus{width:72px;height:72px;border-radius:12px;border:1px dashed rgba(255,255,255,.25);background:rgba(255,255,255,.04);color:#fff;font-size:27px;display:grid;place-items:center;cursor:pointer}
      @media(max-width:650px){.sg-edit-gallery-reference{grid-template-columns:repeat(4,64px)}.sg-edit-tile,.sg-edit-tile img,.sg-edit-plus{width:64px;height:64px}}
    `;
    document.head.appendChild(style);

    let searchTimer=null, searchRequest=0;
    function injectSearchStyle(){
      if($('susHubSearchStyle'))return;
      const s=document.createElement('style');s.id='susHubSearchStyle';s.textContent=`#hubPlayerSearchModal{align-items:flex-start!important;justify-content:center!important;padding:6vh 15px 30px!important}#hubPlayerSearchModal .modal-box{margin:0 auto!important}#hubPlayerSearchResults .hub-search-result{transition:background .15s,border-color .15s}#hubPlayerSearchResults .hub-search-result:hover{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.18)!important}.hub-search-empty{text-align:center;padding:26px 12px;color:#858b98}@media(max-width:600px){#hubPlayerSearchModal{padding:3vh 10px 20px!important}#hubPlayerSearchModal .modal-box{padding:20px!important}#hubPlayerSearchGo{display:none}}`;document.head.appendChild(s);
    }
    function ensureSearchModal(){
      let modal=$('hubPlayerSearchModal');if(modal)return modal;injectSearchStyle();
      modal=document.createElement('div');modal.id='hubPlayerSearchModal';modal.className='modal';
      modal.innerHTML=`<div class="modal-box" style="width:min(760px,100%)"><div class="modal-head"><h2>Search Players</h2><button class="close" id="hubSearchClose">×</button></div><div style="display:flex;gap:10px;align-items:center"><input id="hubPlayerSearchInput" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Search username, display name or User ID..." style="flex:1;min-width:0;background:#11141b;border:1px solid var(--line);color:#fff;border-radius:10px;padding:13px 14px;font-size:14px"><button id="hubPlayerSearchGo" class="profile-action" style="width:auto;margin:0;padding:13px 20px">Search</button></div><p class="hint">Start typing — matching players will appear automatically.</p><div id="hubPlayerSearchResults" style="margin-top:18px"></div></div>`;
      document.body.appendChild(modal);$('hubSearchClose').onclick=()=>modal.classList.remove('open');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});$('hubPlayerSearchGo').onclick=()=>runSearch();$('hubPlayerSearchInput').oninput=scheduleSearch;$('hubPlayerSearchInput').onkeydown=e=>{if(e.key==='Escape')modal.classList.remove('open');if(e.key==='Enter')runSearch()};return modal;
    }
    async function runSearch(showEmpty=true){
      const input=$('hubPlayerSearchInput'),out=$('hubPlayerSearchResults'),raw=input?.value.trim()||'';if(!out)return;if(!raw){out.innerHTML='<div class="hub-search-empty">Start typing to search players.</div>';return}
      const id=++searchRequest;const q=raw.replace(/[%,]/g,'').trim();out.innerHTML='<div class="hub-search-empty">Searching...</div>';
      const r=await sb.from('profiles').select('id,user_id,display_name,avatar_url,created_at').or(`display_name.ilike.%${q}%,user_id.ilike.%${q}%`).limit(30);if(id!==searchRequest)return;
      let rows=r.error?[]:(r.data||[]);
      if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)){const x=await sb.from('profiles').select('id,user_id,display_name,avatar_url,created_at').eq('id',raw).limit(1);if(id!==searchRequest)return;if(!x.error&&x.data?.length&&!rows.some(v=>v.id===x.data[0].id))rows.unshift(x.data[0])}
      if(r.error){console.error('[Sus Games] Search failed:',r.error);out.innerHTML='<div class="hub-search-empty">Search failed. Please try again.</div>';return}
      if(!rows.length){out.innerHTML=showEmpty?`<div class="hub-search-empty">No player found for <strong>${esc(raw)}</strong>.</div>`:'<div class="hub-search-empty">No matching players.</div>';return}
      out.innerHTML=rows.map(p=>`<div class="hub-search-result" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.035);margin-bottom:8px;cursor:pointer" data-player-id="${esc(p.id)}">${avatar(p.avatar_url,p.display_name)}<div style="min-width:0;flex:1"><strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.display_name||'Player')}</strong><small style="display:block;color:#858b98;margin-top:4px">User ID: ${esc(p.user_id||'N/A')}</small></div><span style="color:#858b98;font-size:18px">›</span></div>`).join('');
      out.querySelectorAll('[data-player-id]').forEach(card=>card.onclick=async()=>{if(typeof window.sgViewProfile==='function')await window.sgViewProfile(card.dataset.playerId);else if(typeof window.viewProfile==='function')await window.viewProfile(card.dataset.playerId)});
    }
    function scheduleSearch(){clearTimeout(searchTimer);const out=$('hubPlayerSearchResults'),input=$('hubPlayerSearchInput'),raw=input?.value.trim()||'';if(!out)return;if(!raw){out.innerHTML='<div class="hub-search-empty">Search for a player by username, name or User ID.</div>';return}out.innerHTML='<div class="hub-search-empty">Searching...</div>';searchTimer=setTimeout(()=>runSearch(false),180)}
    function openSearch(){const modal=ensureSearchModal();modal.classList.add('open');const input=$('hubPlayerSearchInput'),out=$('hubPlayerSearchResults');if(!input?.value.trim())out.innerHTML='<div class="hub-search-empty">Search for a player by username, name or User ID.</div>';setTimeout(()=>input?.focus(),30)}

    window.showSection=type=>{document.getElementById('menu')?.classList.remove('open');document.getElementById('profileMenu')?.classList.remove('open');if(type==='search'){openSearch();return}if(type==='social'&&typeof window.openSocial==='function'){window.openSocial();return}if(type==='leaderboard'&&typeof window.openGlobalLeaderboard==='function'){window.openGlobalLeaderboard();return}};
    window.SusHubSearch={open:openSearch,search:runSearch};

    let originalEdit=null, wrapped=false;
    async function enhanceEditProfile(){
      await new Promise(r=>setTimeout(r,80));
      const modal=document.getElementById('sgEditModal');if(!modal)return;
      const body=modal.querySelector('.sg-body');if(!body)return;
      body.classList.add('sg-edit-wrap');
      const gallery=body.querySelector('.sg-edit-gallery');
      if(gallery&&!gallery.dataset.referenceEnhanced){
        gallery.dataset.referenceEnhanced='1';gallery.classList.add('sg-edit-gallery-reference');
        [...gallery.children].forEach(child=>{
          if(child.classList.contains('sg-edit-add')){child.classList.add('sg-edit-plus');return}
          const img=child.querySelector?.('img')|| (child.tagName==='IMG'?child:null);if(!img)return;
          const tile=document.createElement('div');tile.className='sg-edit-tile';tile.dataset.url=img.src;tile.appendChild(img.cloneNode(true));
          const remove=document.createElement('button');remove.type='button';remove.className='sg-edit-remove';remove.setAttribute('aria-label','Remove profile picture');remove.textContent='×';
          remove.onclick=async ev=>{ev.stopPropagation();await removeGalleryImage(tile.dataset.url,tile,modal)};tile.appendChild(remove);child.replaceWith(tile);
        });
      }
      const main=body.querySelector('.sg-edit-avatar');if(main&&!main.parentElement.classList.contains('sg-edit-main')){const wrap=document.createElement('div');wrap.className='sg-edit-main';main.replaceWith(wrap);wrap.appendChild(main)}
    }
    async function removeGalleryImage(url,tile,modal){
      if(!url||!confirm('Remove this profile picture?'))return;
      try{
        const {data:{user}}=await sb.auth.getUser();if(!user)throw new Error('Please log in again.');
        const {error}=await sb.from('avatar_history').delete().eq('user_id',user.id).eq('avatar_url',url).eq('provider','profile_gallery');if(error)throw error;
        const p=await sb.from('profiles').select('avatar_url').eq('id',user.id).maybeSingle();
        if(!p.error&&p.data?.avatar_url===url){const g=await sb.from('avatar_history').select('avatar_url,changed_at').eq('user_id',user.id).eq('provider','profile_gallery').order('changed_at',{ascending:false}).limit(1);const next=g.data?.[0]?.avatar_url||null;await sb.from('profiles').update({avatar_url:next}).eq('id',user.id);const img=modal.querySelector('.sg-edit-avatar');if(img){if(next)img.src=next;else img.removeAttribute('src')}}
        tile?.remove();
      }catch(e){alert(e.message||'Could not remove profile picture.');console.error(e)}
    }
    function installEditWrapper(){if(wrapped||typeof window.editProfile!=='function')return;originalEdit=window.editProfile;window.editProfile=async function(...args){const result=await originalEdit.apply(this,args);enhanceEditProfile();return result};wrapped=true}
    const poll=setInterval(()=>{installEditWrapper();if(wrapped)clearInterval(poll)},100);
    function normalizeAdminBadges(){document.querySelectorAll('.sg-admin-badge,.profile-admin-badge').forEach(b=>{b.textContent='ADMIN';b.setAttribute('aria-label','Administrator')})}
    const observer=new MutationObserver(()=>{normalizeAdminBadges();if(typeof window.editProfile==='function'&&!wrapped)installEditWrapper()});observer.observe(document.body,{subtree:true,childList:true});
    normalizeAdminBadges();
    console.log('[Sus Games] Quiz-style profile reference bridge ready');
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
