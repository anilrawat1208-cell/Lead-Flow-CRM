// ── Constants ─────────────────────────────────────────────────────────────────
const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Mumbai","Bengaluru","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad","Surat","Jaipur","Lucknow","Chandigarh","Coimbatore","Kochi","Nagpur","Indore","Thane","Bhopal","Visakhapatnam","Vadodara","Ludhiana","Nashik"];
const SOURCES = ["LinkedIn","Website","Referral","Other"];
const STATUSES = ["New","Contacted","Won","Lost"];
const PER_PAGE = 8;

// ── State ─────────────────────────────────────────────────────────────────────
let S = {
  user: null, leads: [], view: "leads",
  search: "", filterStatus: "All",
  modal: false, form: {}, errors: {},
  deleteTarget: null, toast: null,
  page: 1, loading: false,
};

// ── API helpers ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function init() {
  try {
    const { user } = await api("GET", "/api/me");
    S.user = user;
    if (user) {
      const { leads } = await api("GET", "/api/leads");
      S.leads = leads;
    }
  } catch (e) { /* not logged in */ }
  render();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function formatINR(v) {
  const n = parseInt(v) || 0;
  if (n >= 10000000) return "₹" + (n/10000000).toFixed(1) + "Cr";
  if (n >= 100000) return "₹" + (n/100000).toFixed(1) + "L";
  if (n >= 1000) return "₹" + (n/1000).toFixed(0) + "K";
  return "₹" + n.toLocaleString("en-IN");
}
function initials(name) { return String(name||"").split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase() || "?"; }
const AVC = ["#2563EB","#16a34a","#D97706","#9333EA","#DB2777","#0891B2","#c2410c"];
function avatarColor(name) { let h=0; for(let c of String(name)) h=(h*31+c.charCodeAt(0))%AVC.length; return AVC[h]; }
function getFiltered() {
  let leads = [...S.leads];
  if (S.filterStatus !== "All") leads = leads.filter(l => l.status === S.filterStatus);
  if (S.search) { const q = S.search.toLowerCase(); leads = leads.filter(l => l.name.toLowerCase().includes(q) || l.location.toLowerCase().includes(q) || l.email.toLowerCase().includes(q)); }
  return leads;
}
function getStats() {
  const a = S.leads;
  return { total: a.length, new: a.filter(l=>l.status==="New").length, contacted: a.filter(l=>l.status==="Contacted").length, won: a.filter(l=>l.status==="Won").length, lost: a.filter(l=>l.status==="Lost").length, pipeline: a.reduce((s,l)=>s+(parseInt(l.value)||0),0), wonValue: a.filter(l=>l.status==="Won").reduce((s,l)=>s+(parseInt(l.value)||0),0) };
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  document.getElementById("root").innerHTML = S.user ? renderApp() : renderLogin();
  bind();
}

function renderLogin() {
  const err = new URLSearchParams(location.search).get("error");
  return `<div class="login-screen">
  <div class="login-card">
    <div class="login-logo"><i class="ti ti-chart-arrows-vertical"></i></div>
    <h1>LeadFlow CRM</h1>
    <p>Manage your leads, track deals, and grow your business — built for Indian small businesses.</p>
    ${err ? `<div class="error-banner"><i class="ti ti-alert-circle"></i> Sign-in failed. Please try again.</div>` : ""}
    <a href="/auth/google" class="google-btn">
      <svg class="google-logo" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Continue with Google
    </a>
    <p class="login-footer">Your data is stored securely on the server and is only accessible to you.<br/>No data is shared with third parties.</p>
  </div></div>`;
}

function renderApp() {
  const st = getStats();
  const filtered = getFiltered();
  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const page = Math.min(S.page, totalPages);
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const SRC_ICON = { LinkedIn:"ti-brand-linkedin", Website:"ti-world", Referral:"ti-users", Other:"ti-dots" };

  const rows = paginated.length ? paginated.map(l => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:50%;background:${avatarColor(l.name)};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${initials(l.name)}</div>
        <div><div class="lead-name">${esc(l.name)}</div><div class="lead-loc"><i class="ti ti-map-pin" style="font-size:11px"></i>${esc(l.location)}</div></div>
      </div></td>
      <td><div class="lead-email">${esc(l.email)||'—'}</div><div class="lead-phone">${esc(l.phone)}</div></td>
      <td><span class="source-badge"><i class="ti ${SRC_ICON[l.source]||'ti-dots'}" style="font-size:13px"></i>${esc(l.source)}</span></td>
      <td><div class="deal-value">${formatINR(l.value)}</div></td>
      <td><select class="status-select status-${l.status.toLowerCase()}" data-id="${l.id}">
        ${STATUSES.map(s=>`<option value="${s}"${s===l.status?" selected":""}>${s}</option>`).join("")}
      </select></td>
      <td><div class="actions">
        <button class="action-btn edit" data-edit="${l.id}" title="Edit"><i class="ti ti-edit"></i></button>
        <button class="action-btn delete" data-del="${l.id}" title="Delete"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`).join("") :
    `<tr><td colspan="6"><div class="empty-state"><i class="ti ti-inbox"></i><h3>No leads found</h3><p>${S.search||S.filterStatus!=="All"?"Try adjusting your search or filters.":"Add your first lead to get started."}</p>${!S.search&&S.filterStatus==="All"?`<button class="btn btn-primary" id="empty-add">
      <i class="ti ti-plus"></i>Add lead</button>`:""}</div></td></tr>`;

  const pages = () => {
    if (totalPages <= 1) return "";
    let b = "";
    for (let i=1; i<=totalPages; i++) b += `<button class="page-btn${i===page?" active":""}" data-page="${i}">${i}</button>`;
    return `<div class="pagination"><span class="page-info">Showing ${filtered.length===0?0:(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE,filtered.length)} of ${filtered.length}</span>
      <button class="page-btn" data-page="${page-1}" ${page===1?"disabled":""}><i class="ti ti-chevron-left"></i></button>${b}<button class="page-btn" data-page="${page+1}" ${page===totalPages?"disabled":""}><i class="ti ti-chevron-right"></i></button></div>`;
  };

  const avatar = S.user.picture ? `<img src="${esc(S.user.picture)}" alt="Profile" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center">${initials(S.user.name)}</span>` : initials(S.user.name);

  return `
  ${S.modal ? renderModal() : ""}
  ${S.deleteTarget ? renderConfirm() : ""}
  ${S.toast ? `<div class="toast ${S.toast.type}" role="status"><i class="ti ti-${S.toast.type==="success"?"circle-check":"alert-circle"}"></i>${esc(S.toast.msg)}</div>` : ""}

  <div class="app">
    <nav class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon"><i class="ti ti-chart-arrows-vertical"></i></div>
        <div><div class="logo-text">LeadFlow</div><div class="logo-sub">CRM for India</div></div>
      </div>
      <div class="nav">
        <div class="nav-section">Menu</div>
        <button class="nav-item${S.view==="leads"?" active":""}" data-nav="leads"><i class="ti ti-users"></i>Leads</button>
        <button class="nav-item${S.view==="dashboard"?" active":""}" data-nav="dashboard"><i class="ti ti-layout-dashboard"></i>Dashboard</button>
        <div class="nav-section" style="margin-top:12px">Account</div>
        <a href="/auth/logout" class="nav-item"><i class="ti ti-logout"></i>Sign out</a>
      </div>
      <div class="sidebar-user">
        <div class="user-avatar">${avatar}</div>
        <div class="user-info"><div class="user-name">${esc(S.user.name)}</div><div class="user-email">${esc(S.user.email)}</div></div>
      </div>
    </nav>

    <main class="main">
      <div class="topbar">
        <div class="topbar-title">${S.view==="dashboard"?"Dashboard":"Leads"}</div>
        <div class="topbar-right">
          <button class="btn btn-outline btn-sm" id="export-btn"><i class="ti ti-file-spreadsheet"></i>Export Excel</button>
          <button class="btn btn-primary btn-sm" id="add-lead-btn"><i class="ti ti-plus"></i>Add Lead</button>
        </div>
      </div>

      <div class="content">
        ${S.view==="dashboard" ? renderDashboard(st) : `
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${st.total}</div></div>
          <div class="stat-card"><div class="stat-label">New</div><div class="stat-value" style="color:var(--brand)">${st.new}</div></div>
          <div class="stat-card"><div class="stat-label">Contacted</div><div class="stat-value" style="color:var(--warning)">${st.contacted}</div></div>
          <div class="stat-card"><div class="stat-label">Won</div><div class="stat-value" style="color:var(--success)">${st.won}</div></div>
          <div class="stat-card"><div class="stat-label">Lost</div><div class="stat-value" style="color:var(--danger)">${st.lost}</div></div>
        </div>

        <div class="toolbar">
          <div class="search-wrap">
            <i class="ti ti-search"></i>
            <input type="search" id="search-input" placeholder="Search by name, city, or email…" value="${esc(S.search)}">
          </div>
          <select class="filter-select" id="status-filter">
            <option value="All"${S.filterStatus==="All"?" selected":""}>All statuses</option>
            ${STATUSES.map(s=>`<option value="${s}"${S.filterStatus===s?" selected":""}>${s}</option>`).join("")}
          </select>
          <div style="flex:1"></div>
          <span style="font-size:12px;color:#9CA3AF">${filtered.length} lead${filtered.length!==1?"s":""}</span>
        </div>

        <div class="table-wrap">
          <div class="table-header">
            <div><span class="table-title">All Leads</span><span class="table-count">${filtered.length} records</span></div>
          </div>
          <div style="overflow-x:auto">
            <table>
              <thead><tr><th>Lead</th><th>Contact</th><th>Source</th><th>Deal value</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${pages()}
        </div>`}
      </div>
    </main>
  </div>`;
}

function renderDashboard(st) {
  const convRate = st.total > 0 ? Math.round((st.won/st.total)*100) : 0;
  const avgDeal = st.total > 0 ? Math.round(st.pipeline/st.total) : 0;
  const statusColors = { New:"var(--brand)", Contacted:"var(--warning)", Won:"var(--success)", Lost:"var(--danger)" };
  const bars = STATUSES.map(s => {
    const cnt = st[s.toLowerCase()] || 0;
    const pct = st.total > 0 ? Math.round((cnt/st.total)*100) : 0;
    return `<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:13px;font-weight:500;color:#374151">${s}</span><span style="font-size:12px;color:#6B7280">${cnt} · ${pct}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${statusColors[s]}"></div></div></div>`;
  }).join("");

  const srcCounts = {};
  SOURCES.forEach(s => srcCounts[s] = S.leads.filter(l=>l.source===s).length);
  const srcBars = SOURCES.map(s => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="font-size:12px;font-weight:500;color:#374151;width:80px">${s}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${st.total>0?Math.round((srcCounts[s]/st.total)*100):0}%;background:var(--brand)"></div></div><span style="font-size:12px;color:#6B7280;width:20px;text-align:right">${srcCounts[s]}</span></div>`).join("");

  const recent = [...S.leads].sort((a,b)=>b.created-a.created).slice(0,5);

  return `<div class="dash-grid-top">
    <div class="stat-card"><div class="stat-label">Total leads</div><div class="stat-value">${st.total}</div><div class="stat-badge" style="background:#F1F5F9;color:#6B7280">All time</div></div>
    <div class="stat-card"><div class="stat-label">Pipeline value</div><div class="stat-value" style="font-size:20px">${formatINR(st.pipeline)}</div><div class="stat-badge" style="background:var(--brand-soft);color:var(--brand)">Total</div></div>
    <div class="stat-card"><div class="stat-label">Won value</div><div class="stat-value" style="font-size:20px;color:var(--success)">${formatINR(st.wonValue)}</div><div class="stat-badge" style="background:var(--success-soft);color:var(--success)">${st.won} deals</div></div>
    <div class="stat-card"><div class="stat-label">Win rate</div><div class="stat-value">${convRate}%</div><div class="stat-badge" style="background:${convRate>=30?"var(--success-soft)":"var(--danger-soft)"};color:${convRate>=30?"var(--success)":"var(--danger)"}">${convRate>=30?"On track":"Needs attention"}</div></div>
  </div>
  <div class="dash-grid-bottom">
    <div class="dash-card"><div class="dash-card-title">Leads by status</div>${bars}</div>
    <div class="dash-card"><div class="dash-card-title">Recent leads</div>
      ${recent.length ? recent.map(l=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F9FAFB">
        <div style="width:30px;height:30px;border-radius:50%;background:${avatarColor(l.name)};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${initials(l.name)}</div>
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.name)}</div><div style="font-size:11px;color:#6B7280">${esc(l.location)}</div></div>
        <div style="text-align:right;flex-shrink:0"><div style="font-size:12px;font-weight:600">${formatINR(l.value)}</div><span class="badge badge-${l.status.toLowerCase()}" style="font-size:10px;padding:2px 6px">${l.status}</span></div>
      </div>`).join("") : `<div style="color:#9CA3AF;font-size:13px">No leads yet</div>`}
    </div>
    <div class="dash-card"><div class="dash-card-title">Leads by source</div>${srcBars}</div>
    <div class="dash-card"><div class="dash-card-title">Quick stats</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[["Avg deal size",formatINR(avgDeal)],["Avg won size",st.won?formatINR(Math.round(st.wonValue/st.won)):"—"],["Open leads",st.new+st.contacted],["Closed leads",st.won+st.lost]].map(([label,val])=>`<div style="background:#F9FAFB;border-radius:8px;padding:12px"><div style="font-size:11px;color:#6B7280;font-weight:600;margin-bottom:4px">${label}</div><div style="font-size:17px;font-weight:700;color:#111827">${val}</div></div>`).join("")}
      </div>
    </div>
  </div>`;
}

function renderModal() {
  const f = S.form, isEdit = !!f.id, e = S.errors;
  return `<div class="overlay" id="modal-overlay">
  <div class="modal">
    <div class="modal-header"><div class="modal-title">${isEdit?"Edit lead":"Add new lead"}</div><button class="action-btn" id="modal-close"><i class="ti ti-x"></i></button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group full">
          <label>Lead name <span class="req">*</span></label>
          <input id="f-name" type="text" placeholder="e.g. Aarav Mehta" value="${esc(f.name||"")}" class="${e.name?"invalid":""}">
          ${e.name?`<span class="error-msg">${esc(e.name)}</span>`:""}
        </div>
        <div class="form-group">
          <label>State / City <span class="req">*</span></label>
          <input id="f-location" type="text" list="loc-list" placeholder="e.g. Mumbai" value="${esc(f.location||"")}" class="${e.location?"invalid":""}">
          <datalist id="loc-list">${STATES.map(s=>`<option value="${s}">`).join("")}</datalist>
          ${e.location?`<span class="error-msg">${esc(e.location)}</span>`:""}
        </div>
        <div class="form-group">
          <label>Phone <span class="req">*</span></label>
          <input id="f-phone" type="tel" placeholder="+91 98765 43210" value="${esc(f.phone||"")}" class="${e.phone?"invalid":""}">
          ${e.phone?`<span class="error-msg">${esc(e.phone)}</span>`:""}
        </div>
        <div class="form-group full">
          <label>Email address</label>
          <input id="f-email" type="email" placeholder="name@company.com" value="${esc(f.email||"")}" class="${e.email?"invalid":""}">
          ${e.email?`<span class="error-msg">${esc(e.email)}</span>`:""}
        </div>
        <div class="form-group">
          <label>Lead source <span class="req">*</span></label>
          <select id="f-source" class="${e.source?"invalid":""}">
            <option value="">Select source…</option>
            ${SOURCES.map(s=>`<option value="${s}"${f.source===s?" selected":""}>${s}</option>`).join("")}
          </select>
          ${e.source?`<span class="error-msg">${esc(e.source)}</span>`:""}
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="f-status">${STATUSES.map(s=>`<option value="${s}"${(f.status||"New")===s?" selected":""}>${s}</option>`).join("")}</select>
        </div>
        <div class="form-group full">
          <label>Deal value (₹)</label>
          <input id="f-value" type="number" min="0" placeholder="e.g. 500000" value="${esc(f.value||"")}">
          <span class="hint" id="value-hint">${f.value&&parseInt(f.value)?"= "+formatINR(f.value):""}</span>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" id="modal-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-save" ${S.loading?"disabled":""}><i class="ti ti-${isEdit?"device-floppy":"plus"}"></i>${S.loading?"Saving…":isEdit?"Save changes":"Add lead"}</button>
    </div>
  </div></div>`;
}

function renderConfirm() {
  return `<div class="confirm-overlay" id="confirm-overlay">
  <div class="confirm-box">
    <h3>Delete lead?</h3>
    <p>This will permanently remove <strong>${esc(S.deleteTarget.name)}</strong>. This cannot be undone.</p>
    <div class="confirm-actions">
      <button class="btn btn-outline" id="confirm-cancel">Cancel</button>
      <button class="btn btn-danger" id="confirm-delete" ${S.loading?"disabled":""}><i class="ti ti-trash"></i>${S.loading?"Deleting…":"Delete"}</button>
    </div>
  </div></div>`;
}

// ── Bind ──────────────────────────────────────────────────────────────────────
function bind() {
  if (!S.user) return;

  // nav
  document.querySelectorAll("[data-nav]").forEach(el => {
    el.onclick = () => { S.view = el.dataset.nav; render(); };
  });

  // top bar
  const addBtn = document.getElementById("add-lead-btn");
  if (addBtn) addBtn.onclick = () => { S.form = { status: "New" }; S.errors = {}; S.modal = true; render(); };

  const expBtn = document.getElementById("export-btn");
  if (expBtn) expBtn.onclick = exportExcel;

  // search + filter
  const si = document.getElementById("search-input");
  if (si) si.oninput = e => { S.search = e.target.value; S.page = 1; render(); };
  const sf = document.getElementById("status-filter");
  if (sf) sf.onchange = e => { S.filterStatus = e.target.value; S.page = 1; render(); };

  // empty add
  const ea = document.getElementById("empty-add");
  if (ea) ea.onclick = () => { S.form = { status: "New" }; S.errors = {}; S.modal = true; render(); };

  // table actions
  document.querySelectorAll("[data-edit]").forEach(el => {
    el.onclick = () => { const l = S.leads.find(x => x.id === el.dataset.edit); if (l) { S.form = {...l}; S.errors = {}; S.modal = true; render(); } };
  });
  document.querySelectorAll("[data-del]").forEach(el => {
    el.onclick = () => { const l = S.leads.find(x => x.id === el.dataset.del); if (l) { S.deleteTarget = l; render(); } };
  });
  document.querySelectorAll(".status-select").forEach(el => {
    el.onchange = async e => {
      try {
        const { lead } = await api("PATCH", `/api/leads/${el.dataset.id}/status`, { status: e.target.value });
        const idx = S.leads.findIndex(l => l.id === el.dataset.id);
        if (idx >= 0) S.leads[idx] = lead;
        showToast("Status updated", "success");
      } catch { showToast("Failed to update status", "error-t"); }
      render();
    };
  });

  // pagination
  document.querySelectorAll("[data-page]").forEach(el => {
    el.onclick = () => { const p = parseInt(el.dataset.page); if (p && !el.disabled) { S.page = p; render(); } };
  });

  // modal
  if (S.modal) {
    const close = () => { S.modal = false; S.form = {}; S.errors = {}; render(); };
    document.getElementById("modal-close").onclick = close;
    document.getElementById("modal-cancel").onclick = close;
    document.getElementById("modal-overlay").onclick = e => { if (e.target.id === "modal-overlay") close(); };

    const fv = document.getElementById("f-value");
    if (fv) fv.oninput = e => {
      const h = document.getElementById("value-hint");
      if (h) h.textContent = e.target.value && parseInt(e.target.value) ? "= " + formatINR(e.target.value) : "";
    };

    document.getElementById("modal-save").onclick = async () => {
      const form = {
        name: document.getElementById("f-name").value.trim(),
        location: document.getElementById("f-location").value.trim(),
        email: document.getElementById("f-email").value.trim(),
        phone: document.getElementById("f-phone").value.trim(),
        source: document.getElementById("f-source").value,
        status: document.getElementById("f-status").value,
        value: document.getElementById("f-value").value,
      };
      const errs = {};
      if (!form.name) errs.name = "Lead name is required";
      if (!form.location) errs.location = "Location is required";
      if (!form.phone) errs.phone = "Phone number is required";
      if (!form.source) errs.source = "Please select a source";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
      if (Object.keys(errs).length) { S.errors = errs; render(); return; }

      S.loading = true; render();
      try {
        if (S.form.id) {
          const { lead } = await api("PUT", `/api/leads/${S.form.id}`, form);
          const idx = S.leads.findIndex(l => l.id === S.form.id);
          if (idx >= 0) S.leads[idx] = lead;
          showToast("Lead updated", "success");
        } else {
          const { lead } = await api("POST", "/api/leads", form);
          S.leads.unshift(lead);
          showToast("Lead added", "success");
        }
        S.modal = false; S.form = {}; S.errors = {};
      } catch (err) { showToast(err.message || "Failed to save", "error-t"); }
      S.loading = false; render();
    };
  }

  // confirm delete
  if (S.deleteTarget) {
    document.getElementById("confirm-cancel").onclick = () => { S.deleteTarget = null; render(); };
    document.getElementById("confirm-overlay").onclick = e => { if (e.target.id === "confirm-overlay") { S.deleteTarget = null; render(); } };
    document.getElementById("confirm-delete").onclick = async () => {
      S.loading = true; render();
      try {
        await api("DELETE", `/api/leads/${S.deleteTarget.id}`);
        S.leads = S.leads.filter(l => l.id !== S.deleteTarget.id);
        showToast("Lead deleted", "success");
        S.deleteTarget = null;
      } catch { showToast("Failed to delete", "error-t"); }
      S.loading = false; render();
    };
  }

  // auto-dismiss toast
  if (S.toast) setTimeout(() => { S.toast = null; render(); }, 2800);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") { S.toast = { msg, type }; }

// ── Excel Export ──────────────────────────────────────────────────────────────
function exportExcel() {
  const filtered = getFiltered();
  const rows = filtered.map((l, i) => ({
    "#": i + 1,
    "Lead Name": l.name,
    "State/City": l.location,
    "Email": l.email || "",
    "Phone": l.phone,
    "Source": l.source,
    "Deal Value (₹)": parseInt(l.value) || 0,
    "Deal Value": formatINR(l.value),
    "Status": l.status,
    "Added On": new Date(l.created).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{wch:4},{wch:22},{wch:18},{wch:28},{wch:18},{wch:12},{wch:16},{wch:16},{wch:12},{wch:14}];

  const st = getStats();
  const summary = [
    ["LeadFlow CRM — Export"],
    ["Exported on", new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})],
    ["Exported by", S.user.name],[""],
    ["Total Leads", st.total], ["New", st.new], ["Contacted", st.contacted],
    ["Won", st.won], ["Lost", st.lost], ["Total Pipeline", formatINR(st.pipeline)], ["Won Value", formatINR(st.wonValue)],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summary);
  ws2["!cols"] = [{wch:20},{wch:30}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  XLSX.utils.book_append_sheet(wb, ws2, "Summary");
  XLSX.writeFile(wb, `LeadFlow_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast("Excel file downloaded", "success");
  render();
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
