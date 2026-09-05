/* Sus Games - public profile privacy + admin badge */
(() => {
  'use strict';

  // The admin identity is resolved from the real admin account, never from a guessed/public User ID.
  const ADMIN_EMAIL = 'babysusplay@gmail.com';
  const adminCache = new Set();
  let adminTableLoaded = false;

  const getSB = () => {
    try { return (typeof supabaseClient !== 'undefined') ? supabaseClient : window.supabaseClient; }
    catch (_) { return window.supabaseClient; }
  };

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

    // Preferred source: the existing admin_users table used by the Quiz website.
    try {
      const { data } = await sb.from('admin_users').select('user_id');
      (data || []).forEach(r => {
        if (r?.user_id) adminCache.add(String(r.user_id));
      });
    } catch (_) {}

    // Resolve the real public profile ID from the configured admin email.
    // No email is rendered to public users; it is used only for identity resolution.
    try {
      const { data } = await sb
        .from('profiles')
        .select('id,user_id')
        .eq('email', ADMIN_EMAIL)
        .limit(1);
      (data || []).forEach(p => {
        if (p?.id) adminCache.add(String(p.id));
        if (p?.user_id) adminCache.add(String(p.user_id));
      });
    } catch (_) {}

    // If the current signed-in account is the admin email, always add its actual auth ID.
    try {
      const { data } = await sb.auth.getUser();
      const user = data?.user;
      if (user?.email?.toLowerCase() === ADMIN_EMAIL) {
        adminCache.add(String(user.id));
      }
    } catch (_) {}
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
    const matches = [
      text.match(/User ID:\s*([A-Za-z0-9_-]+)/i),
      container.dataset?.playerId ? [null, container.dataset.playerId] : null,
      container.dataset?.userId ? [null, container.dataset.userId] : null
    ].filter(Boolean);
    if (matches.some(m => isAdminPublicId(m[1]))) addBadge(nameEl, true, cls);
  }

  function scrubEmails(root=document) {
    root.querySelectorAll('.hub-search-result,.sg-user').forEach(card => {
      card.querySelectorAll('small,[data-public-email],.public-email').forEach(el => {
        if ((el.textContent || '').includes('@')) el.remove();
      });
    });
  }

  function scan() {
    scrubEmails();

    document.querySelectorAll('.sg-user').forEach(el =>
      addBadgeByContainer(el, '.sg-main strong', 'sg-admin-badge')
    );

    document.querySelectorAll('.hub-search-result').forEach(el =>
      addBadgeByContainer(el, 'strong', 'hub-admin-badge')
    );

    document.querySelectorAll('.lb-row').forEach(el => {
      const name = el.querySelector('.lb-player strong');
      if (!name) return;
      const id = el.dataset?.playerId || el.dataset?.userId;
      if (isAdminPublicId(id)) addBadge(name, true, 'lb-admin-badge');
    });

    const publicProfile = document.querySelector('#sgProfileModal .sg-profile');
    if (publicProfile) {
      const name = publicProfile.querySelector('h3');
      const idEl = publicProfile.querySelector('.sg-profile-id');
      const idMatch = (idEl?.textContent || '').match(/User ID:\s*([A-Za-z0-9_-]+)/i);
      if (name && idMatch && isAdminPublicId(idMatch[1])) addBadge(name, true);

      // Never show an email in a public player profile.
      publicProfile.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0 && (el.textContent || '').includes('@') && !el.matches('input')) el.remove();
      });
    }

    const profileName = document.getElementById('profileName');
    if (profileName) currentAdmin().then(ok => { if (ok) addBadge(profileName, true); });
  }

  function observe() {
    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function install() {
    injectStyle();
    loadAdminIds().then(scan);
    scan();
    observe();
    setTimeout(scan, 300);
    setTimeout(scan, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
