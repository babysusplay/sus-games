/* Sus Games - public profile privacy + admin badge */
(() => {
  'use strict';

  const ADMIN_PUBLIC_IDS = new Set(['USER-000001']);
  const adminCache = new Set(ADMIN_PUBLIC_IDS);
  let adminTableLoaded = false;

  const getSB = () => {
    try { return (typeof supabaseClient !== 'undefined') ? supabaseClient : window.supabaseClient; }
    catch (_) { return window.supabaseClient; }
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function injectStyle() {
    if (document.getElementById('susGamesPrivacyStyle')) return;
    const s = document.createElement('style');
    s.id = 'susGamesPrivacyStyle';
    s.textContent = `
      .sg-admin-badge,.hub-admin-badge,.lb-admin-badge {
        display:inline-flex;align-items:center;justify-content:center;
        margin-left:7px;padding:2px 7px;border-radius:999px;
        background:#d92d3f;color:#fff;border:1px solid rgba(255,255,255,.16);
        font-size:10px;font-weight:800;line-height:1;letter-spacing:.45px;
        vertical-align:middle;text-transform:uppercase;
      }
      .sg-admin-badge{font-size:10px}.hub-admin-badge,.lb-admin-badge{font-size:9px}
    `;
    document.head.appendChild(s);
  }

  async function loadAdminIds() {
    if (adminTableLoaded) return;
    adminTableLoaded = true;
    const sb = getSB();
    if (!sb) return;
    try {
      const { data } = await sb.from('admin_users').select('user_id');
      (data || []).forEach(r => { if (r?.user_id) adminCache.add(String(r.user_id)); });
    } catch (_) {
      // The table may intentionally be protected by RLS. Keep the known public admin ID fallback.
    }
  }

  async function currentAdmin() {
    const sb = getSB();
    if (!sb) return false;
    try {
      const { data } = await sb.rpc('is_admin');
      return data === true;
    } catch (_) { return false; }
  }

  function isAdminPublicId(id) {
    return !!id && adminCache.has(String(id));
  }

  function addBadge(nameEl, isAdmin, cls='sg-admin-badge') {
    if (!nameEl || !isAdmin || nameEl.querySelector?.('.sg-admin-badge,.hub-admin-badge,.lb-admin-badge')) return;
    const badge = document.createElement('span');
    badge.className = cls;
    badge.textContent = 'ADMIN';
    badge.setAttribute('aria-label', 'Administrator');
    nameEl.appendChild(badge);
  }

  function addBadgeByContainer(container, nameSelector, cls) {
    const nameEl = container.querySelector(nameSelector);
    if (!nameEl) return;
    const text = container.textContent || '';
    const match = text.match(/User ID:\s*([A-Za-z0-9_-]+)/i) || text.match(/\b(USER-[A-Za-z0-9_-]+)\b/i);
    if (match && isAdminPublicId(match[1])) addBadge(nameEl, true, cls);
  }

  function scrubEmails(root=document) {
    root.querySelectorAll('.hub-search-result').forEach(card => {
      card.querySelectorAll('small').forEach(el => {
        if ((el.textContent || '').includes('@')) el.remove();
      });
    });
    // Never expose an email inside public social/profile UI.
    root.querySelectorAll('.sg-user').forEach(card => {
      card.querySelectorAll('small').forEach(el => {
        if ((el.textContent || '').includes('@')) el.remove();
      });
    });
  }

  function scan() {
    scrubEmails();

    document.querySelectorAll('.sg-user').forEach(el => addBadgeByContainer(el, '.sg-main strong', 'sg-admin-badge'));
    document.querySelectorAll('.hub-search-result').forEach(el => addBadgeByContainer(el, 'strong', 'hub-admin-badge'));

    document.querySelectorAll('.lb-row').forEach(el => {
      const name = el.querySelector('.lb-player strong');
      if (!name) return;
      const text = el.textContent || '';
      const match = text.match(/\b(USER-[A-Za-z0-9_-]+)\b/i);
      if (match && isAdminPublicId(match[1])) addBadge(name, true, 'lb-admin-badge');
    });

    const publicProfile = document.querySelector('#sgProfileModal .sg-profile');
    if (publicProfile) {
      const name = publicProfile.querySelector('h3');
      const idEl = publicProfile.querySelector('.sg-profile-id');
      const idMatch = (idEl?.textContent || '').match(/User ID:\s*([A-Za-z0-9_-]+)/i);
      if (name && idMatch && isAdminPublicId(idMatch[1])) addBadge(name, true);
      // The public profile renderer should not display an email, even if another script adds one.
      publicProfile.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0 && (el.textContent || '').includes('@')) {
          if (!el.matches('input')) el.remove();
        }
      });
    }

    const profileName = document.getElementById('profileName');
    if (profileName) {
      currentAdmin().then(ok => { if (ok) addBadge(profileName, true); });
    }
  }

  function observe() {
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function install() {
    injectStyle();
    loadAdminIds();
    scan();
    observe();
    setTimeout(scan, 300);
    setTimeout(scan, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
