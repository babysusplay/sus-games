/* Sus Games Main Hub search bridge */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const sb = (typeof supabaseClient !== 'undefined') ? supabaseClient : window.supabaseClient;
    if (!sb) return;
    const $ = id => document.getElementById(id);
    let searchTimer = null, searchRequest = 0;
    const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
    const fallback = name => 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="50" fill="#242833"/><text x="50" y="59" text-anchor="middle" font-family="Arial" font-size="42" font-weight="700" fill="#9da3b0">${String(name||'P').slice(0,1).toUpperCase()}</text></svg>`);
    const avatar = (url,name) => `<img src="${esc(url||fallback(name))}" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;background:#242833" onerror="this.onerror=null;this.src='${esc(fallback(name))}'">`;

    function injectStyle(){
      if($('susHubSearchStyle'))return;
      const s=document.createElement('style');s.id='susHubSearchStyle';s.textContent=`
        #hubPlayerSearchModal{align-items:flex-start!important;justify-content:center!important;padding:6vh 15px 30px!important}
        #hubPlayerSearchModal .modal-box{margin:0 auto!important}
        #hubPlayerSearchResults .hub-search-result{transition:background .15s,border-color .15s}
        #hubPlayerSearchResults .hub-search-result:hover{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.18)!important}
        #hubPlayerSearchResults .hub-search-empty{text-align:center;padding:26px 12px;color:#858b98}
        @media(max-width:600px){#hubPlayerSearchModal{padding:3vh 10px 20px!important}#hubPlayerSearchModal .modal-box{padding:20px!important}#hubPlayerSearchGo{display:none}}
      `;document.head.appendChild(s);
    }
    function ensureSearchModal(){
      let modal=$('hubPlayerSearchModal');if(modal)return modal;injectStyle();
      modal=document.createElement('div');modal.id='hubPlayerSearchModal';modal.className='modal';
      modal.innerHTML=`<div class="modal-box" style="width:min(760px,100%)"><div class="modal-head"><h2>Search Players</h2><button class="close" id="hubSearchClose">×</button></div><div style="display:flex;gap:10px;align-items:center"><input id="hubPlayerSearchInput" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Search username, display name or User ID..." style="flex:1;min-width:0;background:#11141b;border:1px solid var(--line);color:#fff;border-radius:10px;padding:13px 14px;font-size:14px"><button id="hubPlayerSearchGo" class="profile-action" style="width:auto;margin:0;padding:13px 20px">Search</button></div><p class="hint">Start typing — matching players will appear automatically.</p><div id="hubPlayerSearchResults" style="margin-top:18px"></div></div>`;
      document.body.appendChild(modal);
      $('hubSearchClose').onclick=()=>modal.classList.remove('open');
      modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
      $('hubPlayerSearchGo').onclick=runSearch;$('hubPlayerSearchInput').oninput=scheduleSearch;
      $('hubPlayerSearchInput').onkeydown=e=>{if(e.key==='Escape'){modal.classList.remove('open');return}if(e.key==='Enter')runSearch()};
      return modal;
    }
    function openSearch(){const modal=ensureSearchModal();modal.classList.add('open');const input=$('hubPlayerSearchInput'),out=$('hubPlayerSearchResults');if(input&&!input.value.trim()&&out)out.innerHTML='<div class="hub-search-empty">Search for a player by username, name or User ID.</div>';setTimeout(()=>input?.focus(),30)}
    function scheduleSearch(){clearTimeout(searchTimer);const input=$('hubPlayerSearchInput'),out=$('hubPlayerSearchResults'),raw=input?.value.trim()||'';if(!out)return;if(!raw){out.innerHTML='<div class="hub-search-empty">Search for a player by username, name or User ID.</div>';return}out.innerHTML='<div class="hub-search-empty">Searching...</div>';searchTimer=setTimeout(()=>runSearch(false),180)}
    function validUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)}
    async function runSearch(showEmpty=true){
      const input=$('hubPlayerSearchInput'),out=$('hubPlayerSearchResults'),raw=input?.value.trim()||'';if(!out)return;if(!raw){out.innerHTML='<div class="hub-search-empty">Start typing to search players.</div>';return}
      const requestId=++searchRequest;const q=raw.replace(/[%,]/g,'').trim();if(!q)return;out.innerHTML='<div class="hub-search-empty">Searching...</div>';
      const textResult=await sb.from('profiles').select('id,user_id,display_name,email,avatar_url,created_at').or(`display_name.ilike.%${q}%,email.ilike.%${q}%,user_id.ilike.%${q}%`).limit(30);
      if(requestId!==searchRequest)return;let rows=textResult.error?[]:(textResult.data||[]);
      if(validUuid(raw)){const exact=await sb.from('profiles').select('id,user_id,display_name,email,avatar_url,created_at').eq('id',raw).limit(1);if(requestId!==searchRequest)return;if(!exact.error&&exact.data?.length&&!rows.some(r=>r.id===exact.data[0].id))rows.unshift(exact.data[0])}
      if(textResult.error){console.error('[Sus Games] Player search failed:',textResult.error);out.innerHTML='<div class="hub-search-empty">Search failed. Please try again.</div>';return}
      if(!rows.length){out.innerHTML=showEmpty?`<div class="hub-search-empty">No player found for <strong>${esc(raw)}</strong>.</div>`:'<div class="hub-search-empty">No matching players.</div>';return}
      out.innerHTML=rows.map(p=>`<div class="hub-search-result" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.035);margin-bottom:8px;cursor:pointer" data-player-id="${esc(p.id)}">${avatar(p.avatar_url,p.display_name)}<div style="min-width:0;flex:1"><strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.display_name||'Player')}</strong><small style="display:block;color:#858b98;margin-top:4px">User ID: ${esc(p.user_id||'N/A')}</small>${p.email?`<small style="display:block;color:#6f7580;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.email)}</small>`:''}</div><span style="color:#858b98;font-size:18px">›</span></div>`).join('');
      out.querySelectorAll('[data-player-id]').forEach(card=>{card.onclick=async()=>{if(typeof window.sgViewProfile==='function'){await window.sgViewProfile(card.dataset.playerId)}else{await openFoundProfile(card.dataset.playerId)}}});
    }
    async function openFoundProfile(id){
      if(typeof window.sgViewProfile==='function'){await window.sgViewProfile(id);return}
      const r=await sb.from('profiles').select('id,user_id,display_name,email,avatar_url').eq('id',id).maybeSingle();if(r.error||!r.data){alert(r.error?.message||'Profile not found.');return}
    }
    window.showSection=type=>{
      if(type==='search'){document.getElementById('menu')?.classList.remove('open');document.getElementById('profileMenu')?.classList.remove('open');openSearch();return}
      if(type==='social'&&typeof window.openSocial==='function'){window.openSocial();return}
      if(type==='leaderboard'&&typeof window.openGlobalLeaderboard==='function'){window.openGlobalLeaderboard();return}
    };
    window.SusHubSearch={open:openSearch,search:runSearch};
    console.log('[Sus Games] Search bridge ready');
  },{once:true});
})();
