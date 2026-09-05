/* Sus Games Main Hub UI bridge */
(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const sb = (typeof supabaseClient !== 'undefined') ? supabaseClient : window.supabaseClient;
    if (!sb) {
      console.error('[Sus Games] Supabase client missing');
      return;
    }

    const $ = id => document.getElementById(id);
    const originalShowSection = window.showSection;
    let searchTimer = null;
    let searchRequest = 0;

    const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;'
    }[c]));

    function avatar(url, name) {
      if (url && /^https?:\/\//i.test(url)) {
        return `<img src="${esc(url)}" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;background:#242833" onerror="this.style.display='none'">`;
      }
      return `<div style="width:46px;height:46px;border-radius:50%;background:#242833;display:grid;place-items:center;font-weight:700;font-size:18px">${esc((name || 'P').slice(0,1).toUpperCase())}</div>`;
    }

    function injectSearchStyle() {
      if ($('susHubSearchStyle')) return;
      const style = document.createElement('style');
      style.id = 'susHubSearchStyle';
      style.textContent = `
        #hubPlayerSearchModal { align-items:flex-start !important; justify-content:center !important; padding:6vh 15px 30px !important; }
        #hubPlayerSearchModal .modal-box { margin:0 auto !important; }
        #hubPlayerSearchResults .hub-search-result { transition:background .15s,border-color .15s; }
        #hubPlayerSearchResults .hub-search-result:hover { background:rgba(255,255,255,.07) !important; border-color:rgba(255,255,255,.18) !important; }
        #hubPlayerSearchResults .hub-search-empty { text-align:center; padding:26px 12px; color:#858b98; }
        @media (max-width:600px) {
          #hubPlayerSearchModal { padding:3vh 10px 20px !important; }
          #hubPlayerSearchModal .modal-box { padding:20px !important; }
          #hubPlayerSearchGo { display:none; }
        }
      `;
      document.head.appendChild(style);
    }

    function ensureSearchModal() {
      let modal = $('hubPlayerSearchModal');
      if (modal) return modal;

      injectSearchStyle();
      modal = document.createElement('div');
      modal.id = 'hubPlayerSearchModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-box" style="width:min(760px,100%)">
          <div class="modal-head">
            <h2>Search Players</h2>
            <button class="close" id="hubSearchClose" aria-label="Close">×</button>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <input id="hubPlayerSearchInput"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              placeholder="Search username, display name or User ID..."
              style="flex:1;min-width:0;background:#11141b;border:1px solid var(--line);color:#fff;border-radius:10px;padding:13px 14px;font-size:14px">
            <button id="hubPlayerSearchGo" class="profile-action" style="width:auto;margin:0;padding:13px 20px">Search</button>
          </div>
          <p class="hint">Start typing — matching players will appear automatically.</p>
          <div id="hubPlayerSearchResults" style="margin-top:18px"></div>
        </div>`;
      document.body.appendChild(modal);

      $('hubSearchClose').onclick = () => modal.classList.remove('open');
      modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('open');
      });

      $('hubPlayerSearchGo').onclick = runSearch;
      $('hubPlayerSearchInput').oninput = scheduleSearch;
      $('hubPlayerSearchInput').onkeydown = e => {
        if (e.key === 'Escape') {
          modal.classList.remove('open');
          return;
        }
        if (e.key === 'Enter') runSearch();
      };

      return modal;
    }

    function openSearch() {
      const modal = ensureSearchModal();
      modal.classList.add('open');
      const input = $('hubPlayerSearchInput');
      const out = $('hubPlayerSearchResults');
      if (input && !input.value.trim()) {
        if (out) out.innerHTML = '<div class="hub-search-empty">Search for a player by username, name or User ID.</div>';
      }
      setTimeout(() => input?.focus(), 30);
    }

    function scheduleSearch() {
      clearTimeout(searchTimer);
      const input = $('hubPlayerSearchInput');
      const out = $('hubPlayerSearchResults');
      const raw = input?.value.trim() || '';
      if (!out) return;
      if (!raw) {
        out.innerHTML = '<div class="hub-search-empty">Search for a player by username, name or User ID.</div>';
        return;
      }
      if (raw.length < 1) return;
      out.innerHTML = '<div class="hub-search-empty">Searching...</div>';
      searchTimer = setTimeout(() => runSearch(false), 180);
    }

    function validUuid(value) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }

    async function runSearch(showEmptyMessage = true) {
      const input = $('hubPlayerSearchInput');
      const out = $('hubPlayerSearchResults');
      const raw = input?.value.trim() || '';
      if (!out) return;

      if (!raw) {
        out.innerHTML = '<div class="hub-search-empty">Start typing to search players.</div>';
        return;
      }

      const requestId = ++searchRequest;
      const q = raw.replace(/[%,]/g, '').trim();
      if (!q) return;
      out.innerHTML = '<div class="hub-search-empty">Searching...</div>';

      let rows = [];
      let error = null;

      // Normal text search: display name and email are text columns.
      const textResult = await sb
        .from('profiles')
        .select('id,user_id,display_name,email,avatar_url,created_at')
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(30);

      if (requestId !== searchRequest) return;
      if (textResult.error) {
        error = textResult.error;
      } else {
        rows = textResult.data || [];
      }

      // User IDs are UUIDs, so only use an exact equality lookup when the input is a valid UUID.
      if (validUuid(raw)) {
        const idResult = await sb
          .from('profiles')
          .select('id,user_id,display_name,email,avatar_url,created_at')
          .eq('user_id', raw)
          .limit(1);
        if (requestId !== searchRequest) return;
        if (!idResult.error && idResult.data?.length) {
          const found = idResult.data[0];
          if (!rows.some(r => r.id === found.id)) rows.unshift(found);
        }
      }

      if (error) {
        console.error('[Sus Games] Player search failed:', error);
        out.innerHTML = `<div class="hub-search-empty">Search failed. Please try again.</div>`;
        return;
      }

      if (!rows.length) {
        out.innerHTML = showEmptyMessage
          ? `<div class="hub-search-empty">No player found for <strong>${esc(raw)}</strong>.</div>`
          : '<div class="hub-search-empty">No matching players.</div>';
        return;
      }

      out.innerHTML = rows.map(p => `
        <div class="hub-search-result" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.035);margin-bottom:8px;cursor:pointer" data-player-id="${esc(p.id)}">
          ${avatar(p.avatar_url, p.display_name)}
          <div style="min-width:0;flex:1">
            <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.display_name || 'Player')}</strong>
            <small style="display:block;color:#858b98;margin-top:4px">User ID: ${esc(p.user_id || 'N/A')}</small>
            ${p.email ? `<small style="display:block;color:#6f7580;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.email)}</small>` : ''}
          </div>
          <span style="color:#858b98;font-size:18px">›</span>
        </div>`).join('');

      out.querySelectorAll('[data-player-id]').forEach(card => {
        card.onclick = () => openFoundProfile(card.dataset.playerId);
      });
    }

    async function openFoundProfile(id) {
      const result = await sb
        .from('profiles')
        .select('id,user_id,display_name,email,avatar_url,created_at')
        .eq('id', id)
        .maybeSingle();

      if (result.error || !result.data) {
        alert(result.error?.message || 'Profile not found.');
        return;
      }

      const p = result.data;
      const [followers, following, likes] = await Promise.all([
        sb.from('profile_follows').select('id', { count:'exact', head:true }).eq('following_id', id),
        sb.from('profile_follows').select('id', { count:'exact', head:true }).eq('follower_id', id),
        sb.from('profile_likes').select('id', { count:'exact', head:true }).eq('user_id', id)
      ]);

      const modal = ensureSearchModal();
      $('hubPlayerSearchResults').innerHTML = `
        <div style="text-align:center;padding:10px 4px 4px">
          ${p.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" style="width:84px;height:84px;border-radius:50%;object-fit:cover;background:#242833" onerror="this.style.display='none'">` : ''}
          <h3 style="margin-top:12px">${esc(p.display_name || 'Player')}</h3>
          <p class="hint">User ID: ${esc(p.user_id || 'N/A')}</p>
          ${p.email ? `<p class="hint">${esc(p.email)}</p>` : ''}
          <div style="display:flex;justify-content:center;gap:28px;margin:18px 0">
            <span><strong>${likes.count || 0}</strong><br><small class="hint">Likes</small></span>
            <span><strong>${followers.count || 0}</strong><br><small class="hint">Followers</small></span>
            <span><strong>${following.count || 0}</strong><br><small class="hint">Following</small></span>
          </div>
          <button id="hubSearchBack" class="profile-action" style="width:auto;margin:0">← Back to Search</button>
        </div>`;
      $('hubSearchBack').onclick = () => {
        modal.classList.add('open');
        runSearch();
      };
    }

    window.showSection = (type) => {
      if (type === 'search') {
        document.getElementById('menu')?.classList.remove('open');
        document.getElementById('profileMenu')?.classList.remove('open');
        openSearch();
        return;
      }
      if (type === 'social') {
        if (window.SusHub?.open) {
          window.SusHub.open();
          return;
        }
        const oldSocial = document.getElementById('hubSocialModal');
        if (oldSocial) {
          oldSocial.classList.add('open');
          return;
        }
      }
      return originalShowSection ? originalShowSection(type) : undefined;
    };

    window.SusHubSearch = { open: openSearch, search: runSearch };
    console.log('[Sus Games] Main Hub search bridge ready');
  }, { once:true });
})();