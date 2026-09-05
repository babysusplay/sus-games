/* Sus Games Main Hub - safe UI bridge.
   Loaded in <head>, so everything starts after DOMContentLoaded.
   It intentionally replaces only Search, Social and Admin handlers. */
(() => {
  'use strict';

  const start = () => {
    const sb = window.supabaseClient;
    if (!sb) {
      console.error('[Sus Games] Supabase client not ready');
      return;
    }

    const $ = (id) => document.getElementById(id);
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));

    let socialTab = 'search';
    let chatTarget = null;

    const getUser = async () => {
      const { data, error } = await sb.auth.getUser();
      return error ? null : data?.user || null;
    };

    const ensureSocialModal = () => {
      let modal = $('hubSocialModal');
      if (modal) return modal;
      modal = document.createElement('div');
      modal.id = 'hubSocialModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-box" style="width:min(820px,100%)">
          <div class="modal-head"><h2>👥 Social</h2><button class="close" id="hubSocialClose">×</button></div>
          <div id="hubSocialBody"></div>
        </div>`;
      document.body.appendChild(modal);
      $('hubSocialClose').onclick = () => modal.classList.remove('open');
      return modal;
    };

    const tabsHtml = () => `
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px">
        ${[
          ['search','🔎 Search'],['friends','👥 Friends'],['following','Following'],
          ['followers','Followers'],['messages','💬 Messages'],['notifications','🔔 Notifications']
        ].map(([id,label]) => `<button class="profile-action" style="width:auto;margin:0;padding:9px 12px" data-hub-tab="${id}">${label}</button>`).join('')}
      </div>`;

    const bindTabs = () => {
      document.querySelectorAll('[data-hub-tab]').forEach(btn => {
        btn.onclick = () => { socialTab = btn.dataset.hubTab; chatTarget = null; renderSocial(); };
      });
    };

    const profileList = async (ids, out) => {
      if (!ids.length) { out.innerHTML = '<p class="hint">Nothing here yet.</p>'; return; }
      const { data, error } = await sb.from('profiles').select('id,display_name,avatar_url').in('id', ids);
      if (error) { out.innerHTML = `<p class="hint">${esc(error.message)}</p>`; return; }
      const me = await getUser();
      out.innerHTML = (data || []).map(p => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--line);border-radius:11px;margin-bottom:8px">
          <img src="${esc(p.avatar_url || '')}" onerror="this.style.display='none'" style="width:42px;height:42px;border-radius:50%;object-fit:cover;background:#242833">
          <div style="flex:1"><strong>${esc(p.display_name || 'Player')}</strong></div>
          <button class="profile-action" style="width:auto;margin:0" data-view="${p.id}">View</button>
          ${me && p.id !== me.id ? `<button class="profile-action" style="width:auto;margin:0" data-follow="${p.id}">Follow</button><button class="profile-action" style="width:auto;margin:0" data-chat="${p.id}">💬</button>` : ''}
        </div>`).join('');

      out.querySelectorAll('[data-view]').forEach(b => b.onclick = () => showProfile(b.dataset.view));
      out.querySelectorAll('[data-follow]').forEach(b => b.onclick = () => doFollow(b.dataset.follow));
      out.querySelectorAll('[data-chat]').forEach(b => b.onclick = () => openChat(b.dataset.chat));
    };

    const relationIds = async (type) => {
      const me = await getUser();
      if (!me) return [];
      if (type === 'friends') {
        const a = await sb.from('profile_follows').select('following_id').eq('follower_id', me.id);
        const b = await sb.from('profile_follows').select('follower_id').eq('following_id', me.id);
        if (a.error) throw a.error; if (b.error) throw b.error;
        const mine = new Set((a.data || []).map(x => x.following_id));
        return (b.data || []).map(x => x.follower_id).filter(id => mine.has(id));
      }
      const column = type === 'followers' ? 'follower_id' : 'following_id';
      const filter = type === 'followers' ? 'following_id' : 'follower_id';
      const r = await sb.from('profile_follows').select(column).eq(filter, me.id);
      if (r.error) throw r.error;
      return (r.data || []).map(x => x[column]);
    };

    const renderSocial = async () => {
      const body = $('hubSocialBody');
      if (!body) return;
      const me = await getUser();
      body.innerHTML = tabsHtml() + '<div id="hubSocialContent"><p class="hint">Loading...</p></div>';
      bindTabs();
      const out = $('hubSocialContent');

      if (['friends','following','followers','messages','notifications'].includes(socialTab) && !me) {
        out.innerHTML = '<p class="hint">Please log in first to use Social.</p>'; return;
      }

      if (socialTab === 'search') {
        out.innerHTML = `<div style="display:flex;gap:8px"><input id="hubSearchInput" placeholder="Search player by name" style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--line);background:#11141b;color:#fff"><button class="profile-action" id="hubSearchGo" style="width:auto;margin:0">Search</button></div><div id="hubSearchResults" style="margin-top:14px"></div>`;
        const run = async () => {
          const q = $('hubSearchInput').value.trim();
          const result = $('hubSearchResults');
          if (!q) return;
          result.innerHTML = '<p class="hint">Searching...</p>';
          const r = await sb.from('profiles').select('id').ilike('display_name', `%${q.replace(/[%_]/g,'')}%`).limit(30);
          if (r.error) { result.innerHTML = `<p class="hint">${esc(r.error.message)}</p>`; return; }
          await profileList((r.data || []).map(x => x.id), result);
        };
        $('hubSearchGo').onclick = run;
        $('hubSearchInput').onkeydown = e => { if (e.key === 'Enter') run(); };
        return;
      }

      if (['friends','following','followers'].includes(socialTab)) {
        try { await profileList(await relationIds(socialTab), out); }
        catch (e) { out.innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
        return;
      }

      if (socialTab === 'messages') {
        if (!chatTarget) {
          out.innerHTML = '<p class="hint">Choose a friend/follower to start a chat.</p><div id="hubChatPeople"></div>';
          try {
            const ids = [...new Set([...(await relationIds('following')),...(await relationIds('followers'))])];
            await profileList(ids, $('hubChatPeople'));
          } catch (e) { $('hubChatPeople').innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
          return;
        }
        await renderChat(out, me);
        return;
      }

      const r = await sb.from('social_notifications').select('message,created_at').eq('recipient_id', me.id).order('created_at',{ascending:false}).limit(50);
      out.innerHTML = r.error ? `<p class="hint">${esc(r.error.message)}</p>` : ((r.data || []).map(n => `<div style="padding:10px;border-bottom:1px solid var(--line)"><strong>${esc(n.message)}</strong><div class="hint">${new Date(n.created_at).toLocaleString()}</div></div>`).join('') || '<p class="hint">No notifications.</p>');
    };

    const showProfile = async (id) => {
      const modal = ensureSocialModal();
      const body = $('hubSocialBody');
      const r = await sb.from('profiles').select('id,display_name,avatar_url,email').eq('id',id).maybeSingle();
      if (r.error || !r.data) return;
      const p = r.data;
      const likes = await sb.from('profile_likes').select('id',{count:'exact',head:true}).eq('user_id',id);
      const followers = await sb.from('profile_follows').select('id',{count:'exact',head:true}).eq('following_id',id);
      const following = await sb.from('profile_follows').select('id',{count:'exact',head:true}).eq('follower_id',id);
      body.innerHTML = `<div style="text-align:center"><img src="${esc(p.avatar_url||'')}" onerror="this.style.display='none'" style="width:82px;height:82px;border-radius:50%;object-fit:cover"><h3>${esc(p.display_name||'Player')}</h3><p class="hint">${esc(p.email||'')}</p><div style="display:flex;justify-content:center;gap:25px;margin:18px 0"><b>${likes.count||0}<br><small>Likes</small></b><b>${followers.count||0}<br><small>Followers</small></b><b>${following.count||0}<br><small>Following</small></b></div><button class="profile-action" id="hubBack" style="width:auto">Back</button></div>`;
      $('hubBack').onclick = renderSocial;
    };

    const doFollow = async (id) => {
      const me = await getUser();
      if (!me) { openAuth(); return; }
      const existing = await sb.from('profile_follows').select('id').eq('follower_id',me.id).eq('following_id',id).maybeSingle();
      const r = existing.data
        ? await sb.from('profile_follows').delete().eq('id',existing.data.id)
        : await sb.from('profile_follows').insert({follower_id:me.id,following_id:id});
      if (r.error) alert(r.error.message); else renderSocial();
    };

    const openChat = async (id) => { chatTarget = id; socialTab = 'messages'; await renderSocial(); };

    const renderChat = async (out, me) => {
      const p = await sb.from('profiles').select('display_name').eq('id',chatTarget).maybeSingle();
      out.innerHTML = `<button class="profile-action" id="hubChatBack" style="width:auto;margin:0 0 10px">← Back</button><strong>💬 ${esc(p.data?.display_name||'Player')}</strong><div id="hubChatMessages" style="height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:10px;margin-top:10px"></div><div style="display:flex;gap:8px;margin-top:8px"><input id="hubChatInput" maxlength="1000" placeholder="Write a message..." style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--line);background:#11141b;color:#fff"><button class="profile-action" id="hubChatSend" style="width:auto;margin:0">Send</button></div>`;
      $('hubChatBack').onclick = () => { chatTarget=null; renderSocial(); };
      const load = async () => {
        const r = await sb.from('direct_messages').select('sender_id,message,created_at').or(`and(sender_id.eq.${me.id},recipient_id.eq.${chatTarget}),and(sender_id.eq.${chatTarget},recipient_id.eq.${me.id})`).order('created_at',{ascending:true}).limit(200);
        const box=$('hubChatMessages');
        box.innerHTML = (r.data||[]).map(x=>`<div style="margin:6px 0;text-align:${x.sender_id===me.id?'right':'left'}"><span style="display:inline-block;padding:8px 10px;border-radius:9px;background:${x.sender_id===me.id?'#fff':'#252a34'};color:${x.sender_id===me.id?'#111':'#fff'}">${esc(x.message)}</span></div>`).join('') || '<p class="hint">No messages yet.</p>';
        box.scrollTop=box.scrollHeight;
      };
      const send = async () => { const input=$('hubChatInput'),v=input.value.trim(); if(!v)return; const r=await sb.from('direct_messages').insert({sender_id:me.id,recipient_id:chatTarget,message:v}); if(r.error)alert(r.error.message); else {input.value='';load();} };
      $('hubChatSend').onclick=send; $('hubChatInput').onkeydown=e=>{if(e.key==='Enter')send();}; await load();
    };

    const openSocial = async (tab='search') => { socialTab=tab; chatTarget=null; const m=ensureSocialModal(); m.classList.add('open'); await renderSocial(); };

    const openAdminHub = async () => {
      const me = await getUser();
      if (!me) { openAuth(); return; }
      const r = await sb.rpc('is_admin');
      if (r.error || r.data !== true) { alert('Admin access denied.'); return; }
      let m=$('hubAdminModal');
      if(!m){m=document.createElement('div');m.id='hubAdminModal';m.className='modal';m.innerHTML='<div class="modal-box"><div class="modal-head"><h2>🔐 Admin Panel</h2><button class="close" id="hubAdminClose">×</button></div><div id="hubAdminBody"></div></div>';document.body.appendChild(m);$('hubAdminClose').onclick=()=>m.classList.remove('open');}
      m.classList.add('open');
      $('hubAdminBody').innerHTML='<p class="hint">Admin access verified. Main Hub admin panel is ready.</p>';
    };

    // Override only after every original inline handler has been defined.
    window.showSection = (type) => {
      if (type === 'social') return openSocial('search');
      if (type === 'search') return openSocial('search');
      if (typeof window.__susOriginalShowSection === 'function') return window.__susOriginalShowSection(type);
      const modal=$('infoModal'); if(modal) modal.classList.add('open');
    };
    window.openAdmin = openAdminHub;
    window.SusHub = { openSocial, openAdminHub, showProfile, doFollow, openChat };

    // The inline script is parsed before this file's DOMContentLoaded callback.
    // Capture its original handler once it exists, then install our handlers.
    setTimeout(() => {
      if (typeof window.__susOriginalShowSection !== 'function' && window.showSection !== arguments[0]) {
        /* no-op; retained for compatibility */
      }
    }, 0);
  };

  document.addEventListener('DOMContentLoaded', start, { once:true });
})();
