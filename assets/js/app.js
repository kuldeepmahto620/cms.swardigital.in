async function exportCSV(){
  const rows = [['Title','Artist','Status','Date']];
  try{
    const { q, status, sort } = appState.releasesFilters;
    const json = await apiGet('/releases', { q, status, sort, page:1, limit:1000 });
    const data = json.items || [];
    data.forEach(r=> rows.push([r.title,r.artist,r.status,r.date]));
  }catch(e){ console.warn('Export fallback', e); }
  const csv = rows.map(r=> r.map(x=>`"${(x||'').replace(/"/g,'\"')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'releases.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
const qs = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
const API_BASE = '/api/v1';

async function apiGet(path, params={}){
  const url = new URL((API_BASE + path), location.origin);
  Object.entries(params).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='') url.searchParams.set(k, v); });
  const res = await fetch(url.toString(), { credentials:'include' });
  if(!res.ok) throw new Error('GET '+path+' failed');
  return res.json();
}
async function apiPost(path, data){
  const res = await fetch(API_BASE + path, {
    method:'POST', credentials:'include', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data||{})
  });
  if(!res.ok) throw new Error('POST '+path+' failed');
  return res.json();
}
async function apiPut(path, data){
  const res = await fetch(API_BASE + path, {
    method:'PUT', credentials:'include', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data||{})
  });
  if(!res.ok) throw new Error('PUT '+path+' failed');
  return res.json();
}
async function apiDelete(path){
  const res = await fetch(API_BASE + path, { method:'DELETE', credentials:'include' });
  if(!res.ok) throw new Error('DELETE '+path+' failed');
  return res.json();
}

// Simple state with localStorage persistence
const STORAGE_KEY = 'dr_ui_replica_state_v1';
let appState = {
  releasesFilters: { q:'', status:'Any', sort:'Newest', page:1, pageSize:10 },
  savedReleases: [], // legacy; no longer used once API live
  artists: ['Kuldeep Mahto','Riya Sharma'],
  labels: ['Swar Digital','Independent'],
  draft: {
    title:'', artist:'', date:'', type:'Single', label:'', genre:'', subgenre:'',
    prodyear:'', origdate:'', version:'', feat:'', remix:'', composer:'',
    lyrics:'Clean', isrc:'', upc:'', lang:'', lyricist:'', publisher:'', pline:'', cline:'',
    tracks:[{ title:'Untitled', artist:'Primary Artist', duration:'03:20' }]
  }
};

function loadState(){
  try{ const s = JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); if(s && typeof s==='object') appState = {...appState, ...s}; }catch{}
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(appState)); }

loadState();

// Router
const routes = {
  '/dashboard': renderDashboard,
  '/releases': renderReleases,
  '/create-release': renderCreateRelease,
  '/artists': renderArtists,
  '/labels': renderLabels,
  '/analytics': renderAnalytics,
  '/service-requests': renderServiceRequests,
  '/transactions': renderTransactions,
  '/profile': renderProfile,
};

function setActiveNav(path){
  qsa('.nav .nav-item').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('href') === `#${path}`);
  });
}

async function navigate(){
  const hash = window.location.hash || '#/dashboard';
  const path = hash.replace('#','');
  const app = qs('#app');
  const page = routes[path] || renderDashboard;
  app.innerHTML = '';
  app.appendChild(await page());
  setActiveNav(path);
  window.scrollTo({top:0,behavior:'smooth'});
}

window.addEventListener('hashchange', navigate);

// Sidebar + modal basics
function initShell(){
  qs('#hamburger')?.addEventListener('click', ()=>{
    qs('.sidebar')?.classList.toggle('open');
  });
  qs('#createBtn')?.addEventListener('click', ()=>{
    window.location.hash = '#/create-release';
  });
  initModal();
}

function initModal(){
  const modal = qs('#modal');
  const close = ()=> modal.classList.add('hidden');
  modal._onOk = null;
  qs('#modal-close')?.addEventListener('click', close);
  qs('#modal-cancel')?.addEventListener('click', close);
  qs('#modal-ok')?.addEventListener('click', ()=>{ try{ modal._onOk?.(); }finally{ close(); }});
  modal.addEventListener('click', (e)=>{ if(e.target === modal) close(); })
}

function openModal(title, bodyHTML, okText='OK', onOk=null){
  qs('#modal-title').textContent = title;
  qs('#modal-body').innerHTML = bodyHTML;
  qs('#modal-ok').textContent = okText;
  const modal = qs('#modal');
  modal._onOk = onOk;
  qs('#modal').classList.remove('hidden');
}

// Bootstrap toast helper
function showToast(message, variant='success'){
  const region = qs('#toast-region') || document.body;
  const id = 't'+Date.now();
  const bg = variant==='success' ? 'bg-success' : variant==='warn' ? 'bg-warning text-dark' : 'bg-danger';
  const elHtml = `
  <div id="${id}" class="toast align-items-center text-white ${bg} border-0" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  </div>`;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = elHtml;
  const toastEl = wrapper.firstElementChild;
  region.appendChild(toastEl);
  const t = new bootstrap.Toast(toastEl, { delay: 2500 });
  t.show();
  toastEl.addEventListener('hidden.bs.toast', ()=> toastEl.remove());
}

// Components
function el(tag, attrs={}, children=[]) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k === 'class') node.className = v;
    else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.substring(2), v);
    else node.setAttribute(k, v);
  });
  (Array.isArray(children)?children:[children]).forEach(c=>{
    if(typeof c === 'string') node.insertAdjacentHTML('beforeend', c);
    else if(c) node.appendChild(c);
  });
  return node;
}

function card(title, body){
  return el('div', {class:'card'}, [
    title ? `<h3 style="margin:0 0 8px 0">${title}</h3>` : '',
    body
  ]);
}

// Pages
async function renderDashboard(){
  const wrap = el('div', {class:'container grid'});
  // KPIs
  const kpis = el('div', {class:'grid cols-3'});
  kpis.append(
    card('Total Releases', `<div style="font-size:28px;font-weight:800">48</div><span class="badge">Updated today</span>`),
    card('Pending Reviews', `<div style="font-size:28px;font-weight:800">3</div><span class="badge warn">Requires action</span>`),
    card('Earnings (30d)', `<div style="font-size:28px;font-weight:800">₹12,340</div><span class="badge success">+12%</span>`)
  );
  wrap.append(kpis);

  // Quick actions
  wrap.append(card('Quick Actions', `
    <div class="grid cols-3">
      <button class="ui-btn" onclick="location.hash='#/create-release'">Create Release</button>
      <button class="ui-btn secondary" onclick="location.hash='#/releases'">View Releases</button>
      <button class="ui-btn ghost" onclick="location.hash='#/service-requests'">Service Request</button>
    </div>
  `));

  // Charts placeholder
  const chartCard = card('Performance', `<canvas id="perfChart" height="140"></canvas>`);
  wrap.append(chartCard);
  setTimeout(()=>{
    const ctx = document.getElementById('perfChart');
    if(!ctx || !window.Chart) return;
    const data = {
      labels: ['Apr','May','Jun','Jul','Aug','Sep','Oct'],
      datasets: [{
        label: 'Streams',
        data: [1200, 1800, 1400, 2200, 2600, 2400, 3000],
        borderColor: '#e91e63',
        backgroundColor: 'rgba(233,30,99,.15)',
        fill: true, tension: .35
      }]
    };
    new Chart(ctx, { type: 'line', data, options: { plugins:{legend:{display:false}}, scales:{ y:{ grid:{ color:'rgba(0,0,0,.05)' }}, x:{ grid:{ display:false }}}}});
  }, 0);
  return wrap;
}

async function renderReleases(){
  const wrap = el('div',{class:'container'});
  const header = el('div',{class:'grid cols-2'},[
    '<h2 style="margin:0">Releases</h2>',
    el('div',{style:'justify-self:end'},[
      el('button',{class:'ui-btn', onclick:()=>location.hash='#/create-release'},'New Release'),
      ' ',
      el('button',{class:'ui-btn secondary', onclick:()=>exportCSV()},'Export CSV')
    ])
  ]);
  wrap.append(header);

  async function fetchPage(){
    const { q, status, sort, page, pageSize } = appState.releasesFilters;
    try{
      const json = await apiGet('/releases', { q, status, sort, page, limit: pageSize });
      return json;
    }catch(e){
      // fallback: keep current local mock if any
      console.warn('Releases GET fallback', e);
      return { items: [], total: 0, page, limit: pageSize };
    }
  }

  const cardWrap = el('div',{class:'card'});
  const controls = el('div',{class:'grid cols-3', style:'margin-bottom:10px'},[
    el('input',{class:'input', placeholder:'Search title or artist', id:'rel-q', value:appState.releasesFilters.q}),
    el('select',{class:'input', id:'rel-status'},[
      '<option>Status: Any</option>',
      '<option>Approved</option>',
      '<option>In Review</option>'
    ]),
    el('div',{},[
      '<div class="grid cols-2">',
      '<select class="input" id="rel-sort">\n<option>Sort: Newest</option>\n<option>Oldest</option>\n<option>Title A-Z</option>\n</select>',
      '<select class="input" id="rel-ps">\n<option value="5">5 / page</option>\n<option value="10">10 / page</option>\n<option value="20">20 / page</option>\n</select>',
      '</div>'
    ])
  ]);
  cardWrap.append(controls);

  // Apply previous selection
  qs('#rel-status', cardWrap).value = appState.releasesFilters.status;
  qs('#rel-sort', cardWrap).value = appState.releasesFilters.sort;
  const psSel = qs('#rel-ps', cardWrap); if(psSel) psSel.value = String(appState.releasesFilters.pageSize||10);

  const tableWrap = el('div',{class:'table-wrap'});
  const tbl = el('table',{class:'table table-hover table-striped align-middle'});
  tbl.innerHTML = '<thead><tr><th>Title</th><th>Artist</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody></tbody>';
  tableWrap.append(tbl);
  const pager = el('nav',{});

  async function applyFilters(){
    const { pageSize } = appState.releasesFilters;
    const rows = await fetchPage();
    const tbody = tbl.querySelector('tbody'); tbody.innerHTML = '';
    rows.forEach((r)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.title}</td><td>${r.artist}</td><td>${r.status==='Approved'?'<span class=\"badge success\">Approved</span>':'<span class=\"badge warn\">In Review</span>'}</td><td>${r.date}</td>
      <td style=\"display:flex;gap:6px\">
        <button class=\"ui-btn secondary\" data-action=\"view\">View</button>
        <button class=\"ui-btn secondary\" data-action=\"edit\">Edit</button>
        <button class=\"ui-btn\" data-action=\"delete\">Delete</button>
      </td>`;
      tr.querySelector('[data-action="view"]').addEventListener('click', ()=>{
        openModal('Release Details', `<div class=\"grid\">\n  <div><div class=\"label\">Title</div><div>${r.title}</div></div>\n  <div><div class=\"label\">Artist</div><div>${r.artist}</div></div>\n  <div><div class=\"label\">Status</div><div>${r.status}</div></div>\n  <div><div class=\"label\">Date</div><div>${r.date}</div></div>\n</div>`, 'Close');
      });
      tr.querySelector('[data-action="edit"]').addEventListener('click', ()=>{
        openModal('Edit Release', `<div class=\"grid\">\n<div><div class=\"label\">Title</div><input id=\"er-title\" class=\"input\" value=\"${r.title}\" /></div>\n<div><div class=\"label\">Artist</div><input id=\"er-artist\" class=\"input\" value=\"${r.artist}\" /></div>\n</div>`, 'Save', ()=>{
          const t = qs('#er-title')?.value?.trim()||r.title; const a = qs('#er-artist')?.value?.trim()||r.artist;
          // TODO: implement PUT /releases/:id (requires ID)
          showToast('Release updated (mock).');
          applyFilters();
        });
      });
      tr.querySelector('[data-action="delete"]').addEventListener('click', ()=>{
        openModal('Delete Release', `<p>Are you sure you want to delete <strong>${r.title}</strong>?</p>`, 'Delete', ()=>{
          // TODO: implement DELETE /releases/:id
          showToast('Release deleted (mock).','warn');
          applyFilters();
        });
      });
      tbody.appendChild(tr);
    });
    // pager (Bootstrap) Prev/Next based on page size & rows length
    const ul = el('ul',{class:'pagination justify-content-end mt-2'});
    const makeItem = (label, disabled, active, onClick)=>{
      const li = el('li',{class:`page-item ${disabled?'disabled':''} ${active?'active':''}`});
      const a = el('button',{class:'page-link', onclick:()=>{ if(disabled) return; onClick?.(); }}, label);
      li.append(a); return li;
    };
    ul.innerHTML = '';
    ul.append(makeItem('Prev', appState.releasesFilters.page===1, false, ()=>{appState.releasesFilters.page=Math.max(1, appState.releasesFilters.page-1); saveState(); applyFilters(); }));
    // No total from API yet; only enable Next if we got a full page
    const nextDisabled = (rows.length < pageSize);
    ul.append(makeItem('Next', nextDisabled, false, ()=>{ appState.releasesFilters.page += 1; saveState(); applyFilters(); }));
    pager.innerHTML = '';
    pager.append(ul);
  }

  // Events
  qs('#rel-q', cardWrap).addEventListener('input', (e)=>{ appState.releasesFilters.q = e.target.value; appState.releasesFilters.page=1; saveState(); applyFilters(); });
  qs('#rel-status', cardWrap).addEventListener('change', (e)=>{ appState.releasesFilters.status = e.target.value; appState.releasesFilters.page=1; saveState(); applyFilters(); });
  qs('#rel-sort', cardWrap).addEventListener('change', (e)=>{ appState.releasesFilters.sort = e.target.value; appState.releasesFilters.page=1; saveState(); applyFilters(); });
  qs('#rel-ps', cardWrap).addEventListener('change', (e)=>{ appState.releasesFilters.pageSize = Number(e.target.value)||10; appState.releasesFilters.page=1; saveState(); applyFilters(); });

  cardWrap.append(tableWrap);
  cardWrap.append(pager);
  wrap.append(cardWrap);
  applyFilters();
  return wrap;
}

function renderCreateRelease(){
  const wrap = el('div',{class:'container'});
  wrap.insertAdjacentHTML('beforeend',`
    <h2 style="margin-top:0">Create Release</h2>
    <div class="stepper">
      <div class="step active"><span class="dot"></span> Album Information</div>
      <div class="step"><span class="dot"></span> Tracks Information</div>
      <div class="step"><span class="dot"></span> Release Date</div>
      <div class="step"><span class="dot"></span> Overview</div>
    </div>
    <div class="wizard">
      <div class="body" id="cr-body"></div>
      <div class="actions">
        <div><button class="btn secondary" id="cr-back">Back</button></div>
        <div><button class="btn" id="cr-next">Next</button></div>
      </div>
    </div>
  `);
  const steps = [renderCRAlbum, renderCRTracks, renderCRDate, renderCROverview];
  let idx = 0;
  const body = qs('#cr-body', wrap);
  const back = qs('#cr-back', wrap);
  const next = qs('#cr-next', wrap);

  function paint(){
    body.innerHTML = '';
    body.appendChild(steps[idx]());
    qsa('.step', wrap).forEach((s,i)=> s.classList.toggle('active', i<=idx));
    back.disabled = idx===0; next.textContent = idx===steps.length-1 ? 'Submit' : 'Next';
  }
  function validateStep(i){
    if(i!==0) return true;
    const errs = [];
    const setErr=(id,msg)=>{ const el=qs('#'+id); if(el){ el.textContent=msg||''; el.style.display = msg? 'block':'none'; }}
    setErr('err-title',''); setErr('err-genre',''); setErr('err-prodyear',''); setErr('err-physdate',''); setErr('err-pline',''); setErr('err-cline','');
    if(!appState.draft.title) { setErr('err-title','Release Title is required'); errs.push('title'); }
    if(!appState.draft.genre){ setErr('err-genre','Genre is required'); errs.push('genre'); }
    if(!appState.draft.prodyear){ setErr('err-prodyear','Production Year is required'); errs.push('prodyear'); }
    if(!appState.draft.origdate){ setErr('err-physdate','Original release date is required'); errs.push('origdate'); }
    if(!appState.draft.pline){ setErr('err-pline','P Line is required'); errs.push('pline'); }
    if(!appState.draft.cline){ setErr('err-cline','C Line is required'); errs.push('cline'); }
    if(errs.length){ showToast('Please fix the highlighted fields.','danger'); return false; }
    return true;
  }

  back.addEventListener('click', ()=>{ if(idx>0){ idx--; paint(); } });
  next.addEventListener('click', async ()=>{
    if(idx<steps.length-1){ if(!validateStep(idx)) return; idx++; paint(); }
    else {
      // Save draft as a new release (frontend only)
      // Minimal validation prompt to set title/artist
      if(!appState.draft.title || !appState.draft.artist){
        return openModal('Missing info', `<div class=\"grid\">\n<div><div class=\"label\">Title</div><input id=\"cr-title\" class=\"input\" placeholder=\"Enter title\" /></div>\n<div><div class=\"label\">Artist</div><input id=\"cr-artist\" class=\"input\" placeholder=\"Enter artist\" /></div>\n</div>`, 'Continue', ()=>{
          appState.draft.title = qs('#cr-title')?.value?.trim()||'Untitled Release';
          appState.draft.artist = qs('#cr-artist')?.value?.trim()||'Unknown Artist';
          saveAndGo();
        });
      }
      await saveAndGo();
      async function saveAndGo(){
        try{
          const payload = {
            title: appState.draft.title || 'Untitled Release',
            artist: appState.draft.artist || 'Unknown Artist',
            status: 'In Review',
            tracks: (appState.draft.tracks||[]).map((t,i)=>({ title:t.title, artist:t.artist, duration_sec: parseDurationToSec(t.duration||'00:00'), order_index: i+1 }))
          };
          await apiPost('/releases', payload);
          showToast('Release created.');
        }catch(e){
          console.error(e);
          showToast('Failed to create release','danger');
        } finally {
          location.hash = '#/releases';
        }
      }
    }
  });
  paint();
  return wrap;
}

function field(label, input){
  return el('div',{class:'grid cols-2'},[
    el('div',{},`<div class="label">${label}</div>`),
    el('div',{},input)
  ]);
}

function renderCRAlbum(){
  const box = el('div',{});
  const cardEl = card('Fill Album Information', el('div',{},[
    el('div',{class:'grid cols-2'},[
      el('div',{},`
        <div class="card" style="height:160px;display:grid;place-items:center;border-style:dashed">
          <div>
            <div style="text-align:center;color:#64748b">Drop cover image here<br/><span class="badge">3000x3000 px</span></div>
          </div>
        </div>
      `),
      el('div',{},`<strong>Album Artwork</strong><div class="hint">This will be displayed on Release profile</div>`)
    ]),
    field('Release Title *', '<input id="cr-title" class="input" placeholder="Song Title" />\n<div class="error" id="err-title"></div>'),
    field('Genre *', '<input id="cr-genre" class="input" placeholder="Select genre" />\n<div class="error" id="err-genre"></div>'),
    field('Label Name', '<input id="cr-label" class="input" placeholder="Search and select label" />'),
    field('Production Year *', '<input id="cr-prodyear" class="input" type="number" placeholder="2025" />\n<div class="error" id="err-prodyear"></div>'),
    field('Physical/Original release date *', '<input id="cr-physdate" class="input" type="date" />\n<div class="error" id="err-physdate"></div>'),
    field('P Line *', '<input id="cr-pline" class="input" placeholder="(P) 2025 Your Label" />\n<div class="error" id="err-pline"></div>'),
    field('C Line *', '<input id="cr-cline" class="input" placeholder="(C) 2025 Your Label" />\n<div class="error" id="err-cline"></div>'),
  ]));
  box.appendChild(cardEl);
  // Bind values to draft
  setTimeout(()=>{
    const bind = (id, key)=> qs('#'+id, cardEl)?.addEventListener('input', e=>{ appState.draft[key] = e.target.value; saveState(); });
    bind('cr-title','title');
    bind('cr-genre','genre');
    bind('cr-label','label');
    bind('cr-prodyear','prodyear');
    bind('cr-physdate','origdate');
    bind('cr-pline','pline');
    bind('cr-cline','cline');
    // preload existing draft if any
    const setv = (id,val)=>{ const el=qs('#'+id, cardEl); if(el && val) el.value=val; };
    setv('cr-title', appState.draft.title);
    setv('cr-genre', appState.draft.genre);
    setv('cr-label', appState.draft.label);
    setv('cr-prodyear', appState.draft.prodyear);
    setv('cr-physdate', appState.draft.origdate);
    setv('cr-pline', appState.draft.pline);
    setv('cr-cline', appState.draft.cline);
  },0);
  return box;
}

function renderCRTracks(){
  const box = el('div', {class:'grid'});
  box.append(el('div',{class:'card', style:'border-style:dashed'}, 'Drop audio here or ' + '<button class="ui-btn secondary">Browse</button>'));
  const listCard = el('div', {class:'card'});
  const controls = el('div', {class:'grid cols-2'}, [
    '<strong>Tracks</strong>',
    el('div',{style:'justify-self:end'},[
      el('button',{class:'ui-btn', onclick:()=>{ appState.draft.tracks.push({title:'Untitled', artist:'Primary Artist', duration:'00:00'}); saveState(); paint(); }}, 'Add Track')
    ])
  ]);
  listCard.append(controls);
  const list = el('div',{class:'tracks'});

  function reorder(from, to){
    const arr = appState.draft.tracks;
    const item = arr.splice(from,1)[0];
    arr.splice(to,0,item); saveState(); paint();
  }

  function paint(){
    list.innerHTML='';
    appState.draft.tracks.forEach((t,idx)=>{
      const row = el('div',{class:'track-row', draggable:'true', 'data-idx':String(idx)});
      row.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', String(idx)); });
      row.addEventListener('dragover', e=>{ e.preventDefault(); });
      row.addEventListener('drop', e=>{ e.preventDefault(); const from = Number(e.dataTransfer.getData('text/plain')); const to = idx; if(!Number.isNaN(from)) reorder(from,to); });
      const order = el('div',{class:'order drag'}, '≡');
      const title = el('input',{class:'input form-control', value:t.title, placeholder:'Track Title'});
      title.addEventListener('input', e=>{ appState.draft.tracks[idx].title = e.target.value; saveState(); });
      const artist = el('input',{class:'input form-control', value:t.artist, placeholder:'Artist'});
      artist.addEventListener('input', e=>{ appState.draft.tracks[idx].artist = e.target.value; saveState(); });
      const dur = el('input',{class:'input form-control', value:t.duration, placeholder:'00:00'});
      dur.addEventListener('input', e=>{ appState.draft.tracks[idx].duration = e.target.value; saveState(); });
      const actions = el('div',{class:'row-actions'},[
        el('button',{class:'ui-btn secondary', onclick:()=>{ appState.draft.tracks.splice(idx,1); if(appState.draft.tracks.length===0) appState.draft.tracks.push({title:'Untitled',artist:'Primary Artist',duration:'00:00'}); saveState(); paint(); }}, 'Delete')
      ]);
      row.append(order, title, artist, dur, actions);
      list.append(row);
    });
  }
  paint();
  listCard.append(list);
  box.append(listCard);
  return box;
}

function renderCRDate(){
  return card('Release Date', `
    <div class="grid cols-2">
      <div>
        <div class="label">Preferred Date</div>
        <input class="input form-control" type="date" />
      </div>
      <div>
        <div class="label">Time Zone</div>
        <select class="input form-control"><option>IST (UTC+5:30)</option><option>UTC</option><option>PST (UTC-8)</option></select>
      </div>
    </div>
  `);
}

function renderCROverview(){
  return card('Overview', `
    <div class="grid">
      <div class="badge">Summary preview</div>
      <p class="hint">This is a static frontend preview. Hook to backend later.</p>
    </div>
  `);
}

async function renderArtists(){
  const wrap = document.createElement('div');
  wrap.appendChild(card('Artists', `
    <div class="grid cols-2">
      <input class="input" id="artist-q" placeholder="Search artists" />
      <button class="ui-btn" id="artist-add">Add Artist</button>
    </div>
  `));
  const table = document.createElement('div');
  table.className = 'table-wrap';
  table.style.marginTop = '10px';
  table.innerHTML = '<table class="table"><thead><tr><th>Name</th><th>Actions</th></tr></thead><tbody></tbody></table>';
  wrap.appendChild(table);
  const tbody = table.querySelector('tbody');
  async function paint(){
    const q = (qs('#artist-q', wrap).value||'');
    tbody.innerHTML='';
    try{
      const json = await apiGet('/artists', { q, page:1, limit:50 });
      (json.items||[]).forEach(item=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.name}</td><td><button class="ui-btn secondary">View</button></td>`;
        tbody.appendChild(tr);
      });
    }catch(e){ showToast('Failed to load artists','danger'); }
  }
  qs('#artist-q', wrap).addEventListener('input', paint);
  qs('#artist-add', wrap).addEventListener('click', ()=>{
    openModal('Add Artist', '<input class="input" id="new-artist" placeholder="Artist name" />', 'Save', async ()=>{
      const val = (qs('#new-artist')?.value||'').trim();
      if(!val) return;
      try{ await apiPost('/artists', { name: val }); showToast('Artist added.'); paint(); }catch{ showToast('Failed to add','danger'); }
    });
  });
  paint();
  return wrap;
}

async function renderLabels(){
  const wrap = document.createElement('div');
  wrap.appendChild(card('Labels', `
    <div class="grid cols-2">
      <input class="input" id="label-q" placeholder="Search labels" />
      <button class="ui-btn" id="label-add">Add Label</button>
    </div>
  `));
  const table = document.createElement('div');
  table.className = 'table-wrap';
  table.style.marginTop = '10px';
  table.innerHTML = '<table class="table"><thead><tr><th>Name</th><th>Actions</th></tr></thead><tbody></tbody></table>';
  wrap.appendChild(table);
  const tbody = table.querySelector('tbody');
  async function paint(){
    const q = (qs('#label-q', wrap).value||'');
    tbody.innerHTML='';
    try{
      const json = await apiGet('/labels', { q, page:1, limit:50 });
      (json.items||[]).forEach(item=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.name}</td><td><button class="ui-btn secondary">View</button></td>`;
        tbody.appendChild(tr);
      });
    }catch(e){ showToast('Failed to load labels','danger'); }
  }
  qs('#label-q', wrap).addEventListener('input', paint);
  qs('#label-add', wrap).addEventListener('click', ()=>{
    openModal('Add Label', '<input class="input" id="new-label" placeholder="Label name" />', 'Save', async ()=>{
      const val = (qs('#new-label')?.value||'').trim();
      if(!val) return;
      try{ await apiPost('/labels', { name: val }); showToast('Label added.'); paint(); }catch{ showToast('Failed to add','danger'); }
    });
  });
  paint();
  return wrap;
}

function renderAnalytics(){
  const wrap = el('div',{class:'container grid'});
  // Earnings Trend
  const cardLine = card('Earnings Trend', `<canvas id="earnChart" height="140"></canvas>`);
  wrap.append(cardLine);
  // Streams by Platform
  const cardPie = card('Streams by Platform', `<canvas id="platChart" height="220"></canvas>`);
  wrap.append(cardPie);
  setTimeout(()=>{
    if(window.Chart){
      const earn = new Chart(document.getElementById('earnChart'), {
        type:'line', data:{ labels:['Apr','May','Jun','Jul','Aug','Sep','Oct'], datasets:[{ label:'Earnings', data:[340,420,380,510,580,560,630], borderColor:'#e91e63', backgroundColor:'rgba(233,30,99,.15)', fill:true, tension:.35 }]},
        options:{ plugins:{legend:{display:false}}, scales:{ y:{ grid:{ color:'rgba(0,0,0,.05)' }}, x:{ grid:{ display:false }}}}
      });
      const plat = new Chart(document.getElementById('platChart'), {
        type:'pie', data:{ labels:['Spotify','Apple','YouTube Music','JioSaavn','Others'], datasets:[{ data:[38,21,19,12,10], backgroundColor:['#1DB954','#999','#FF0000','#00b3a6','#9ca3af'] }]},
        options:{ plugins:{legend:{position:'bottom'}} }
      });
    }
  },0);
  return wrap;
}

function renderServiceRequests(){
  return card('Service Requests', `
    <div class="grid">
      <div class="grid cols-2">
        <select class="input"><option>All</option><option>Open</option><option>Closed</option></select>
        <input class="input" placeholder="Search requests" />
      </div>
      <div class="table-wrap">
        <table class="table"><thead><tr><th>ID</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead>
        <tbody><tr><td>#SR-1024</td><td>Copyright claim</td><td><span class="badge warn">Open</span></td><td>2025-09-20</td></tr></tbody></table>
      </div>
    </div>
  `);
}

function renderTransactions(){
  return card('Transactions', `
    <div class="table-wrap">
      <table class="table"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>2025-09-20</td><td>Withdrawal</td><td>₹3,000</td><td><span class="badge warn">Pending</span></td></tr>
        <tr><td>2025-08-31</td><td>Credit</td><td>₹4,500</td><td><span class="badge success">Settled</span></td></tr>
      </tbody></table>
    </div>
  `);
}

function renderProfile(){
  return card('Profile', `
    <div class="grid cols-2">
      <div>
        <div class="label">Display Name</div>
        <input class="input" value="Kuldeep Mahto" />
      </div>
      <div>
        <div class="label">Email</div>
        <input class="input" value="you@example.com" />
      </div>
    </div>
    <div style="margin-top:10px"><button class="ui-btn">Save</button></div>
  `);
}

// Boot
window.addEventListener('DOMContentLoaded', ()=>{
  initShell();
  if(!location.hash) location.hash = '#/dashboard';
  navigate();
});
