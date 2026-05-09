import { auth, db } from "./firebase-config.js";
  import {
    onAuthStateChanged, signOut
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
  import {
    ref, get, set, update, remove, onValue
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  const ADMIN_EMAIL = "aialskrani@gmail.com";

  const POWER_UPGRADES    = [
    {level:1,power:1,cost:0},{level:2,power:2,cost:100},
    {level:3,power:3,cost:300},{level:4,power:5,cost:800},{level:5,power:8,cost:2000}
  ];
  const DURATION_UPGRADES = [
    {level:1,hours:3,cost:0},{level:2,hours:6,cost:200},
    {level:3,hours:12,cost:600},{level:4,hours:24,cost:1500}
  ];

  // Ã¢ÂÂÃ¢ÂÂ DOM helpers Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const $ = id => document.getElementById(id);
  let toastTimer;
  function toast(msg, type="ok") {
    const el = $("admin-toast");
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.className = "toast", 3200);
  }
  function setMsg(id, msg, cls="info") {
    const el = $(id);
    if (el) { el.textContent = msg; el.className = `section-msg ${cls}`; }
  }

  // Ã¢ÂÂÃ¢ÂÂ Modal helpers Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function openModal(id)  { $(id).classList.add("open"); }
  function closeModal(id) { $(id).classList.remove("open"); }
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal-overlay").forEach(ov => {
    ov.addEventListener("click", e => { if (e.target === ov) closeModal(ov.id); });
  });

  // Ã¢ÂÂÃ¢ÂÂ State Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  let allUsers    = {};   // { uid: data }
  let allCoupons  = {};
  let editingUid  = null;
  let deletingUid = null;
  let rewardUid   = null;
  let chart       = null;

  // Ã¢ÂÂÃ¢ÂÂ Auth gate Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  onAuthStateChanged(auth, async user => {
    if (!user || user.email !== ADMIN_EMAIL) {
      $("admin-loading").innerHTML =
        `<div style="text-align:center;color:#ef4444;font-size:1rem">
          Ã¢ÂÂ ÃÂºÃÂÃÂ± ÃÂÃÂµÃÂ±ÃÂ­ ÃÂÃÂ ÃÂ¨ÃÂ§ÃÂÃÂ¯ÃÂ®ÃÂÃÂ
          <br/><br/>
          <a href="/" style="color:#f0b429;text-decoration:none">Ã¢ÂÂ ÃÂ§ÃÂÃÂ¹ÃÂÃÂ¯ÃÂ© ÃÂÃÂÃÂ±ÃÂ¦ÃÂÃÂ³ÃÂÃÂ©</a>
        </div>`;
      return;
    }
    $("admin-email-label").textContent = user.email;
    $("admin-loading").style.display   = "none";
    $("admin-panel").style.display     = "flex";
    await loadAllData();
    bindLiveListeners();
  });

  $("admin-logout-btn").addEventListener("click", () => {
    if (confirm("ÃÂªÃÂ£ÃÂÃÂÃÂ¯ ÃÂªÃÂ³ÃÂ¬ÃÂÃÂ ÃÂ§ÃÂÃÂ®ÃÂ±ÃÂÃÂ¬ÃÂ")) signOut(auth).then(() => location.href = "/");
  });

  // Ã¢ÂÂÃ¢ÂÂ Load all data once Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  async function loadAllData() {
    const [usersSnap, couponsSnap] = await Promise.all([
      get(ref(db, "users")),
      get(ref(db, "coupons"))
    ]);

    allUsers   = {};
    allCoupons = {};

    if (usersSnap.exists())   usersSnap.forEach(c   => { allUsers[c.key]   = c.val(); });
    if (couponsSnap.exists()) couponsSnap.forEach(c  => { allCoupons[c.key] = c.val(); });

    renderStats();
    renderUsersTable();
    renderCouponsTable();
    renderChart();
  }

  // Ã¢ÂÂÃ¢ÂÂ Live listeners Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function bindLiveListeners() {
    onValue(ref(db, "users"),   snap => {
      allUsers = {};
      if (snap.exists()) snap.forEach(c => { allUsers[c.key] = c.val(); });
      renderStats();
      renderUsersTable();
      renderChart();
    });
    onValue(ref(db, "coupons"), snap => {
      allCoupons = {};
      if (snap.exists()) snap.forEach(c => { allCoupons[c.key] = c.val(); });
      renderStats();
      renderCouponsTable();
    });
  }

  $("refresh-users-btn").addEventListener("click", loadAllData);

  // Ã¢ÂÂÃ¢ÂÂ Stats Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function renderStats() {
    const users   = Object.values(allUsers);
    const coupons = Object.values(allCoupons);

    const totalMined   = users.reduce((s, u) => s + (u.totalMined || 0), 0);
    const activeCoupons = coupons.filter(c => c.isActive).length;

    const todayStart  = new Date(); todayStart.setHours(0,0,0,0);
    const newToday    = users.filter(u => (u.createdAt || 0) >= todayStart.getTime()).length;

    $("stat-users").textContent       = users.length;
    $("stat-total-mined").textContent = totalMined.toFixed(2);
    $("stat-coupons").textContent     = activeCoupons;
    $("stat-new-today").textContent   = newToday;
  }

  // Ã¢ÂÂÃ¢ÂÂ Chart Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function renderChart() {
    const users = Object.values(allUsers);
    const days  = [];
    const counts = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      days.push(d.toLocaleDateString("ar-SA", { weekday:"short", day:"numeric" }));
      counts.push(users.filter(u => {
        const t = u.createdAt || 0;
        return t >= d.getTime() && t < next.getTime();
      }).length);
    }

    const ctx = $("users-chart").getContext("2d");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: days,
        datasets: [{
          label: "ÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂÃÂ ÃÂ¬ÃÂ¯ÃÂ¯",
          data: counts,
          backgroundColor: "rgba(240,180,41,.7)",
          borderColor: "#f0b429",
          borderWidth: 1.5,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(240,180,41,.9)",
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color:"#9090aa", font:{ family:"Cairo", size:12 } } },
          tooltip: { backgroundColor:"#1a1a2e", titleColor:"#f0b429", bodyColor:"#e8e8f0" }
        },
        scales: {
          x: { ticks:{ color:"#9090aa", font:{family:"Cairo"} }, grid:{ color:"rgba(255,255,255,.04)" } },
          y: { ticks:{ color:"#9090aa", font:{family:"Cairo"}, stepSize:1, precision:0 }, grid:{ color:"rgba(255,255,255,.04)" }, beginAtZero:true }
        }
      }
    });
  }

  // Ã¢ÂÂÃ¢ÂÂ Users table Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function getFilteredSortedUsers() {
    const q     = ($("user-search").value || "").toLowerCase().trim();
    const sort  = $("user-sort").value;
    let users   = Object.entries(allUsers).map(([uid, d]) => ({ uid, ...d }));

    if (q) users = users.filter(u =>
      (u.username || "").toLowerCase().includes(q) ||
      (u.email    || "").toLowerCase().includes(q)
    );

    const [field, dir] = sort.split("-");
    users.sort((a, b) => {
      const av = a[field] || 0;
      const bv = b[field] || 0;
      return dir === "desc" ? bv - av : av - bv;
    });
    return users;
  }

  function renderUsersTable() {
    const users  = getFilteredSortedUsers();
    const tbody  = $("users-tbody");

    if (users.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">ÃÂÃÂ§ ÃÂÃÂÃÂ¬ÃÂ¯ ÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂÃÂ</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const lastClaim = u.lastClaimTime
        ? new Date(u.lastClaimTime).toLocaleDateString("ar-SA")
        : "Ã¢ÂÂ";
      const avatar = u.photoURL
        ? `<img class="user-avatar-sm" src="${escHtml(u.photoURL)}" alt="" onerror="this.src=''"/>`
        : `<div class="user-avatar-sm" style="display:flex;align-items:center;justify-content:center;font-size:1rem;">Ã°ÂÂÂ¤</div>`;
      return `<tr>
        <td>
          <div class="user-cell">
            ${avatar}
            <div>
              <div class="user-name">${escHtml(u.username || "Ã¢ÂÂ")}</div>
              <div class="user-email">${escHtml(u.email || "Ã¢ÂÂ")}</div>
            </div>
          </div>
        </td>
        <td><span class="val-gold">${(u.balance||0).toFixed(4)}</span></td>
        <td><span class="val-cyan">${(u.totalMined||0).toFixed(4)}</span></td>
        <td>${u.miningPower||1} ÃÂ±/ÃÂ³</td>
        <td>${u.maxMiningDuration||3} ÃÂ³</td>
        <td style="font-size:.78rem;color:var(--text2)">${lastClaim}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon edit" title="ÃÂªÃÂ¹ÃÂ¯ÃÂÃÂ" onclick="openEditModal('${u.uid}')">Ã¢ÂÂÃ¯Â¸Â</button>
            <button class="btn-icon reward" title="ÃÂÃÂÃÂ§ÃÂÃÂ£ÃÂ© ÃÂ³ÃÂ±ÃÂÃÂ¹ÃÂ©" onclick="openRewardModal('${u.uid}')">Ã°ÂÂÂ</button>
            <button class="btn-icon del" title="ÃÂ­ÃÂ°ÃÂ" onclick="openDeleteModal('${u.uid}')">Ã°ÂÂÂÃ¯Â¸Â</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  $("user-search").addEventListener("input",  renderUsersTable);
  $("user-sort").addEventListener("change",   renderUsersTable);

  // Ã¢ÂÂÃ¢ÂÂ Edit modal Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  window.openEditModal = uid => {
    editingUid = uid;
    const u = allUsers[uid];
    if (!u) return;
    $("edit-user-info").innerHTML =
      `<strong>${escHtml(u.username||"Ã¢ÂÂ")}</strong> Ã¢ÂÂ ${escHtml(u.email||"Ã¢ÂÂ")}<br/>
      ÃÂ§ÃÂÃÂ±ÃÂµÃÂÃÂ¯ ÃÂ§ÃÂÃÂ­ÃÂ§ÃÂÃÂ: <strong style="color:var(--gold)">${(u.balance||0).toFixed(6)} ÃÂ±</strong>`;
    $("edit-balance").value        = u.balance       || 0;
    $("edit-total").value          = u.totalMined    || 0;
    $("edit-power").value          = u.miningPower   || 1;
    $("edit-power-level").value    = u.miningPowerLevel   || 1;
    $("edit-duration").value       = u.maxMiningDuration  || 3;
    $("edit-duration-level").value = u.miningDurationLevel || 1;
    setMsg("edit-user-msg", "", "");
    openModal("edit-modal");
  };

  $("save-edit-btn").addEventListener("click", async () => {
    if (!editingUid) return;
    const newBal = parseFloat($("edit-balance").value);
    const oldBal = allUsers[editingUid]?.balance || 0;
    if (Math.abs(newBal - oldBal) > 1000) {
      if (!confirm(`ÃÂªÃÂºÃÂÃÂÃÂ± ÃÂ§ÃÂÃÂ±ÃÂµÃÂÃÂ¯ ÃÂ¨ÃÂ ${Math.abs(newBal-oldBal).toFixed(2)} ÃÂ± Ã¢ÂÂ ÃÂÃÂ ÃÂ£ÃÂÃÂª ÃÂÃÂªÃÂ£ÃÂÃÂ¯ÃÂ`)) return;
    }
    const upd = {
      balance:             parseFloat($("edit-balance").value)        || 0,
      totalMined:          parseFloat($("edit-total").value)          || 0,
      miningPower:         parseFloat($("edit-power").value)          || 1,
      miningPowerLevel:    parseInt($("edit-power-level").value)      || 1,
      maxMiningDuration:   parseFloat($("edit-duration").value)       || 3,
      miningDurationLevel: parseInt($("edit-duration-level").value)   || 1,
    };
    try {
      await update(ref(db, `users/${editingUid}`), upd);
      setMsg("edit-user-msg", "Ã¢ÂÂ ÃÂªÃÂ ÃÂ§ÃÂÃÂ­ÃÂÃÂ¸ ÃÂ¨ÃÂÃÂ¬ÃÂ§ÃÂ­", "ok");
      toast("ÃÂªÃÂ ÃÂ­ÃÂÃÂ¸ ÃÂ¨ÃÂÃÂ§ÃÂÃÂ§ÃÂª ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂ Ã¢ÂÂ");
    } catch(e) { setMsg("edit-user-msg", "Ã¢ÂÂ ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err"); }
  });

  $("free-upgrade-edit-btn").addEventListener("click", async () => {
    if (!editingUid) return;
    const u   = allUsers[editingUid];
    const cPL = u.miningPowerLevel    || 1;
    const cDL = u.miningDurationLevel || 1;
    const nP  = POWER_UPGRADES.find(x => x.level === cPL + 1);
    const nD  = DURATION_UPGRADES.find(x => x.level === cDL + 1);
    const upd = {};
    if (nP) { upd.miningPower = nP.power;  upd.miningPowerLevel = nP.level; }
    if (nD) { upd.maxMiningDuration = nD.hours; upd.miningDurationLevel = nD.level; }
    if (!Object.keys(upd).length) { setMsg("edit-user-msg", "ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂ ÃÂ¹ÃÂÃÂ ÃÂ£ÃÂ¹ÃÂÃÂ ÃÂÃÂ³ÃÂªÃÂÃÂ", "info"); return; }
    try {
      await update(ref(db, `users/${editingUid}`), upd);
      if (upd.miningPower)     $("edit-power").value      = upd.miningPower;
      if (upd.miningPowerLevel) $("edit-power-level").value = upd.miningPowerLevel;
      if (upd.maxMiningDuration) $("edit-duration").value  = upd.maxMiningDuration;
      if (upd.miningDurationLevel) $("edit-duration-level").value = upd.miningDurationLevel;
      setMsg("edit-user-msg", "Ã¢ÂÂ ÃÂªÃÂÃÂª ÃÂ§ÃÂÃÂªÃÂ±ÃÂÃÂÃÂ© ÃÂ§ÃÂÃÂÃÂ¬ÃÂ§ÃÂÃÂÃÂ©", "ok");
      toast("ÃÂªÃÂÃÂª ÃÂ§ÃÂÃÂªÃÂ±ÃÂÃÂÃÂ© ÃÂ§ÃÂÃÂÃÂ¬ÃÂ§ÃÂÃÂÃÂ© Ã°ÂÂÂ");
    } catch(e) { setMsg("edit-user-msg", "Ã¢ÂÂ ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err"); }
  });

  $("reset-mining-btn").addEventListener("click", async () => {
    if (!editingUid) return;
    if (!confirm("ÃÂ¥ÃÂ¹ÃÂ§ÃÂ¯ÃÂ© ÃÂ¶ÃÂ¨ÃÂ· ÃÂ¹ÃÂ¯ÃÂ§ÃÂ¯ ÃÂ§ÃÂÃÂªÃÂ¹ÃÂ¯ÃÂÃÂ ÃÂÃÂÃÂ°ÃÂ§ ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂ")) return;
    const now = Date.now();
    try {
      await update(ref(db, `users/${editingUid}`), { miningStartTime: now, lastClaimTime: now });
      setMsg("edit-user-msg", "Ã¢ÂÂ ÃÂªÃÂÃÂª ÃÂ¥ÃÂ¹ÃÂ§ÃÂ¯ÃÂ© ÃÂ¶ÃÂ¨ÃÂ· ÃÂ§ÃÂÃÂªÃÂ¹ÃÂ¯ÃÂÃÂ", "ok");
      toast("ÃÂªÃÂÃÂª ÃÂ¥ÃÂ¹ÃÂ§ÃÂ¯ÃÂ© ÃÂ§ÃÂÃÂ¶ÃÂ¨ÃÂ· Ã°ÂÂÂ");
    } catch(e) { setMsg("edit-user-msg", "Ã¢ÂÂ ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err"); }
  });

  // Ã¢ÂÂÃ¢ÂÂ Quick Reward modal Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  window.openRewardModal = uid => {
    rewardUid = uid;
    const u = allUsers[uid];
    if (!u) return;
    $("reward-user-info").innerHTML =
      `<strong>${escHtml(u.username||"Ã¢ÂÂ")}</strong> Ã¢ÂÂ ÃÂ±ÃÂµÃÂÃÂ¯ ÃÂ­ÃÂ§ÃÂÃÂ: <strong style="color:var(--gold)">${(u.balance||0).toFixed(6)} ÃÂ±</strong>`;
    $("reward-amount").value = "";
    setMsg("reward-msg", "", "");
    openModal("reward-modal");
  };

  $("confirm-reward-btn").addEventListener("click", async () => {
    if (!rewardUid) return;
    const amount = parseFloat($("reward-amount").value);
    if (!amount || amount <= 0) { setMsg("reward-msg", "ÃÂ£ÃÂ¯ÃÂ®ÃÂ ÃÂÃÂ¨ÃÂÃÂºÃÂ§ÃÂ ÃÂµÃÂ­ÃÂÃÂ­ÃÂ§ÃÂ", "err"); return; }
    const u      = allUsers[rewardUid];
    const newBal = Math.round(((u.balance || 0) + amount) * 1e6) / 1e6;
    try {
      await update(ref(db, `users/${rewardUid}`), { balance: newBal });
      toast(`+ÃÂ±${amount} ÃÂªÃÂÃÂª ÃÂ§ÃÂÃÂÃÂÃÂ§ÃÂÃÂ£ÃÂ© Ã¢ÂÂ`);
      closeModal("reward-modal");
    } catch(e) { setMsg("reward-msg", "Ã¢ÂÂ ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err"); }
  });

  // Ã¢ÂÂÃ¢ÂÂ Delete modal Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  window.openDeleteModal = uid => {
    deletingUid = uid;
    const u = allUsers[uid];
    $("delete-confirm-text").innerHTML =
      `ÃÂÃÂ ÃÂ£ÃÂÃÂª ÃÂÃÂªÃÂ£ÃÂÃÂ¯ ÃÂÃÂ ÃÂ­ÃÂ°ÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂ <strong>${escHtml(u?.username||uid)}</strong>ÃÂ<br/>
      <strong style="color:var(--red)">ÃÂÃÂ§ ÃÂÃÂÃÂÃÂ ÃÂ§ÃÂÃÂªÃÂ±ÃÂ§ÃÂ¬ÃÂ¹ ÃÂ¹ÃÂ ÃÂÃÂ°ÃÂ ÃÂ§ÃÂÃÂ¹ÃÂÃÂÃÂÃÂ©.</strong>`;
    openModal("delete-modal");
  };

  $("confirm-delete-btn").addEventListener("click", async () => {
    if (!deletingUid) return;
    try {
      await remove(ref(db, `users/${deletingUid}`));
      toast("ÃÂªÃÂ ÃÂ­ÃÂ°ÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂ Ã°ÂÂÂÃ¯Â¸Â", "ok");
      closeModal("delete-modal");
      deletingUid = null;
    } catch(e) { toast("ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err"); }
  });

  // Ã¢ÂÂÃ¢ÂÂ Bulk Reward Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  $("bulk-reward-btn").addEventListener("click", async () => {
    const amount = parseFloat($("bulk-reward-val").value);
    if (!amount || amount <= 0) { setMsg("bulk-msg", "ÃÂ£ÃÂ¯ÃÂ®ÃÂ ÃÂÃÂ¨ÃÂÃÂºÃÂ§ÃÂ ÃÂµÃÂ­ÃÂÃÂ­ÃÂ§ÃÂ", "err"); return; }
    const users = Object.entries(allUsers);
    if (!users.length) { setMsg("bulk-msg", "ÃÂÃÂ§ ÃÂÃÂÃÂ¬ÃÂ¯ ÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂÃÂ", "err"); return; }
    if (!confirm(`ÃÂªÃÂ·ÃÂ¨ÃÂÃÂ ÃÂÃÂÃÂ§ÃÂÃÂ£ÃÂ© +ÃÂ±${amount} ÃÂ¹ÃÂÃÂ ${users.length} ÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂÃÂÃÂ`)) return;

    $("bulk-reward-btn").disabled = true;
    setMsg("bulk-msg", `ÃÂ¬ÃÂ§ÃÂ± ÃÂ§ÃÂÃÂªÃÂ·ÃÂ¨ÃÂÃÂ ÃÂ¹ÃÂÃÂ ${users.length} ÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂÃÂÃ¢ÂÂ¦`, "info");

    let done = 0, failed = 0;
    await Promise.all(users.map(async ([uid, u]) => {
      try {
        const newBal = Math.round(((u.balance||0) + amount) * 1e6) / 1e6;
        await update(ref(db, `users/${uid}`), { balance: newBal });
        done++;
      } catch { failed++; }
    }));

    $("bulk-reward-btn").disabled = false;
    $("bulk-reward-val").value    = "";
    setMsg("bulk-msg", `Ã¢ÂÂ ÃÂªÃÂÃÂª ÃÂ§ÃÂÃÂÃÂÃÂ§ÃÂÃÂ£ÃÂ© ÃÂÃÂ ${done} ÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂÃÂ${failed ? (" Ã¢ÂÂ ÃÂÃÂ´ÃÂ: " + failed) : ""}`, "ok");
    toast(`ÃÂªÃÂ ÃÂªÃÂÃÂ²ÃÂÃÂ¹ +ÃÂ±${amount} ÃÂ¹ÃÂÃÂ ${done} ÃÂÃÂ³ÃÂªÃÂ®ÃÂ¯ÃÂÃÂÃÂ Ã°ÂÂÂ`);
  });

  // Ã¢ÂÂÃ¢ÂÂ Coupons table Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function renderCouponsTable() {
    const tbody = $("coupons-tbody");
    const entries = Object.entries(allCoupons);
    if (!entries.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">ÃÂÃÂ§ ÃÂªÃÂÃÂ¬ÃÂ¯ ÃÂÃÂ³ÃÂ§ÃÂ¦ÃÂ ÃÂ¨ÃÂ¹ÃÂ¯</td></tr>`;
      return;
    }
    tbody.innerHTML = entries.map(([code, c]) => {
      const used = c.usedBy ? Object.keys(c.usedBy).length : 0;
      const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString("ar-SA") : "Ã¢ÂÂ";
      return `<tr>
        <td><span style="font-family:monospace;color:var(--gold);letter-spacing:1px">${escHtml(code)}</span></td>
        <td class="val-cyan">${c.rewardAmount} ÃÂ±</td>
        <td><span class="badge ${c.isActive?"badge-active":"badge-off"}">${c.isActive?"ÃÂÃÂ´ÃÂ·":"ÃÂÃÂ¹ÃÂ·ÃÂÃÂ"}</span></td>
        <td style="color:var(--text2)">${used} ÃÂÃÂ±ÃÂ©</td>
        <td style="font-size:.78rem;color:var(--text2)">${date}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" title="${c.isActive?"ÃÂªÃÂ¹ÃÂ·ÃÂÃÂ":"ÃÂªÃÂÃÂ¹ÃÂÃÂ"}"
              style="border-color:${c.isActive?"rgba(239,68,68,.4)":"rgba(34,197,94,.4)"};color:${c.isActive?"var(--red)":"var(--green)"}"
              onclick="toggleCoupon('${escHtml(code)}',${!c.isActive})">${c.isActive?"Ã¢ÂÂ¸":"Ã¢ÂÂ¶"}</button>
            <button class="btn-icon del" title="ÃÂ­ÃÂ°ÃÂ" onclick="deleteCoupon('${escHtml(code)}')">Ã°ÂÂÂÃ¯Â¸Â</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  window.toggleCoupon = async (code, isActive) => {
    try {
      await update(ref(db, `coupons/${code}`), { isActive });
      toast(isActive ? "ÃÂªÃÂ ÃÂªÃÂÃÂ¹ÃÂÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© Ã¢ÂÂ" : "ÃÂªÃÂ ÃÂªÃÂ¹ÃÂ·ÃÂÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© Ã¢ÂÂ¸");
    } catch(e) { toast("ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err"); }
  };

  window.deleteCoupon = async code => {
    if (!confirm(`ÃÂ­ÃÂ°ÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© "${code}"ÃÂ`)) return;
    try {
      await remove(ref(db, `coupons/${code}`));
      toast("ÃÂªÃÂ ÃÂ­ÃÂ°ÃÂ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© Ã°ÂÂÂÃ¯Â¸Â");
    } catch(e) { toast("ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err"); }
  };

  // Ã¢ÂÂÃ¢ÂÂ Create coupon Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  $("create-coupon-btn").addEventListener("click", async () => {
    let code   = ($("new-coupon-code").value || "").trim().toUpperCase();
    const reward = parseFloat($("new-coupon-reward").value);
    if (!code) code = "ALPHA-" + Math.random().toString(36).slice(2,8).toUpperCase();
    if (!reward || reward <= 0) { setMsg("coupon-create-msg", "ÃÂ£ÃÂ¯ÃÂ®ÃÂ ÃÂÃÂÃÂ§ÃÂÃÂ£ÃÂ© ÃÂµÃÂ­ÃÂÃÂ­ÃÂ©", "err"); return; }
    if (allCoupons[code]) { setMsg("coupon-create-msg", "ÃÂÃÂ°ÃÂ§ ÃÂ§ÃÂÃÂÃÂÃÂ¯ ÃÂÃÂÃÂ¬ÃÂÃÂ¯ ÃÂ¨ÃÂ§ÃÂÃÂÃÂ¹ÃÂ", "err"); return; }
    try {
      await set(ref(db, `coupons/${code}`), {
        rewardAmount: reward, isActive: true,
        createdAt: Date.now(), usedBy: {}
      });
      setMsg("coupon-create-msg", `Ã¢ÂÂ ÃÂªÃÂ ÃÂ¥ÃÂÃÂ´ÃÂ§ÃÂ¡ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ©: ${code} (+ÃÂ±${reward})`, "ok");
      $("new-coupon-code").value   = "";
      $("new-coupon-reward").value = "";
      toast(`ÃÂªÃÂ ÃÂ¥ÃÂÃÂ´ÃÂ§ÃÂ¡ ÃÂ§ÃÂÃÂÃÂ³ÃÂÃÂÃÂ© ${code} Ã¢ÂÂ`);
    } catch(e) { setMsg("coupon-create-msg", "Ã¢ÂÂ ÃÂ®ÃÂ·ÃÂ£: " + e.message, "err"); }
  });

  // Ã¢ÂÂÃ¢ÂÂ Utility Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function escHtml(s) {
    return String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  

  // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // PRICE CARDS SYSTEM
  // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  let allCards = {};

  // Live listener for cards
  onValue(ref(db, "cards"), snap => {
    allCards = {};
    if (snap.exists()) snap.forEach(c => { allCards[c.key] = c.val(); });
    renderCardsList();
  });

  // Set default datetime values (now â now+24h)
  (function setDefaultTimes() {
    const now   = new Date();
    const end   = new Date(now.getTime() + 24 * 3600 * 1000);
    const fmt   = d => d.toISOString().slice(0,16);
    const si    = document.getElementById("card-start");
    const ei    = document.getElementById("card-end");
    if (si) si.value = fmt(now);
    if (ei) ei.value = fmt(end);
  })();

  // Color config
  const CARD_COLORS = {
    gold:   { bg: "linear-gradient(135deg,#1a1505,#2a2008)", border: "#f0b429", accent: "#f0b429", text: "#f0b429" },
    blue:   { bg: "linear-gradient(135deg,#050d1a,#08163a)", border: "#00d4ff", accent: "#00d4ff", text: "#00d4ff" },
    green:  { bg: "linear-gradient(135deg,#051a0d,#072a12)", border: "#22c55e", accent: "#22c55e", text: "#22c55e" },
    purple: { bg: "linear-gradient(135deg,#120518,#1c0830)", border: "#a855f7", accent: "#a855f7", text: "#a855f7" },
    red:    { bg: "linear-gradient(135deg,#1a0505,#2a0808)", border: "#ef4444", accent: "#ef4444", text: "#ef4444" },
  };

  function buildCardHTML(card, cardId, isAdminView = true) {
    const col    = CARD_COLORS[card.color || "gold"];
    const now    = Date.now();
    const start  = card.startTime || 0;
    const end    = card.endTime   || Infinity;
    const uses   = card.claimedBy ? Object.keys(card.claimedBy).length : 0;
    const maxU   = card.maxUses || 0;
    const isLive = card.isActive && now >= start && now <= end && (maxU === 0 || uses < maxU);
    const timeLeft = end - now;
    const tlStr  = timeLeft > 0 ? formatCardTime(timeLeft) : "ÙÙØªÙÙ";
    const startStr = new Date(start).toLocaleString("ar-SA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
    const endStr   = new Date(end).toLocaleString("ar-SA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});

    return `<div class="price-card ${isLive ? "live" : "inactive"}" data-id="${cardId}"
      style="background:${col.bg};border-color:${col.border}">
      <div class="pc-glow" style="background:radial-gradient(circle,${col.accent}22,transparent 70%)"></div>
      <div class="pc-header">
        <span class="pc-icon">${escHtml(card.icon || "ð")}</span>
        <div class="pc-status-wrap">
          <span class="pc-status ${isLive?"live":"off"}">${isLive?"â ÙØ¨Ø§Ø´Ø±":"â ØºÙØ± ÙØ´Ø·"}</span>
          ${isAdminView ? `<span class="pc-uses">${uses}${maxU>0?" / "+maxU:""} Ø§Ø³ØªØ®Ø¯Ø§Ù</span>` : ""}
        </div>
      </div>
      <div class="pc-title" style="color:${col.text}">${escHtml(card.title||"Ø¨Ø·Ø§ÙØ© Ø¹Ø±Ø¶")}</div>
      <div class="pc-desc">${escHtml(card.description||"")}</div>
      <div class="pc-reward" style="color:${col.accent}">+Î± ${(card.reward||0).toLocaleString("ar",{maximumFractionDigits:4})}</div>
      ${isAdminView ? `
      <div class="pc-time-row">
        <span>â± ${startStr}</span><span>â</span><span>${endStr}</span>
      </div>` : `
      <div class="pc-timer" id="card-timer-${cardId}" style="color:${col.text}">
        ${isLive ? "â³ ÙØªØ¨ÙÙ: " + tlStr : "â " + tlStr}
      </div>`}
      ${isAdminView ? `
      <div class="pc-admin-actions">
        <button class="btn-action ${card.isActive?"btn-red":"btn-green"}"
          style="padding:.35rem .8rem;font-size:.78rem"
          onclick="toggleCard('${cardId}',${!card.isActive})">
          ${card.isActive?"â¸ ØªØ¹Ø·ÙÙ":"â¶ ØªÙØ¹ÙÙ"}
        </button>
        <button class="btn-action btn-blue"
          style="padding:.35rem .8rem;font-size:.78rem"
          onclick="editCard('${cardId}')">
          âï¸ ØªØ¹Ø¯ÙÙ
        </button>
        <button class="btn-action btn-red"
          style="padding:.35rem .8rem;font-size:.78rem"
          onclick="deleteCard('${cardId}')">
          ðï¸ Ø­Ø°Ù
        </button>
      </div>` : `
      <button class="pc-claim-btn" id="claim-card-${cardId}"
        onclick="claimCard('${cardId}')"
        ${isLive ? "" : "disabled"}>
        ${isLive ? "ð Ø§Ø­ØµÙ Ø¹ÙÙÙØ§ Ø§ÙØ¢Ù" : "ØºÙØ± ÙØªØ§Ø­Ø©"}
      </button>`}
    </div>`;
  }

  function formatCardTime(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60)   return s + " Ø«Ø§ÙÙØ©";
    if (s < 3600) return Math.floor(s/60) + " Ø¯ÙÙÙØ©";
    if (s < 86400) return Math.floor(s/3600) + " Ø³Ø§Ø¹Ø©";
    return Math.floor(s/86400) + " ÙÙÙ";
  }

  // Preview
  document.getElementById("preview-card-btn").addEventListener("click", () => {
    const card = readCardForm();
    const wrap = document.getElementById("card-preview-wrap");
    const prev = document.getElementById("card-preview");
    prev.innerHTML = buildCardHTML(card, "preview", true);
    wrap.style.display = "block";
  });

  function readCardForm() {
    return {
      title:     document.getElementById("card-title").value || "Ø¨Ø·Ø§ÙØ© Ø¹Ø±Ø¶",
      description: document.getElementById("card-desc").value || "",
      reward:    parseFloat(document.getElementById("card-reward").value) || 10,
      icon:      document.getElementById("card-icon").value || "ð",
      color:     document.getElementById("card-color").value || "gold",
      maxUses:   parseInt(document.getElementById("card-max-uses").value) || 0,
      startTime: new Date(document.getElementById("card-start").value).getTime() || Date.now(),
      endTime:   new Date(document.getElementById("card-end").value).getTime()   || (Date.now() + 86400000),
      isActive:  true,
      createdAt: Date.now(),
      claimedBy: {}
    };
  }

  // Create / Edit card — single merged handler
    document.getElementById("create-card-btn").addEventListener("click", async function() {
      const editId = this.dataset.editId;
      const card   = readCardForm();
      if (!card.title)  { setMsg("card-create-msg","أدخل عنوان البطاقة","err"); return; }
      if (!card.reward) { setMsg("card-create-msg","أدخل مكافأة صحيحة","err"); return; }
      if (card.endTime <= card.startTime) { setMsg("card-create-msg","وقت الانتهاء يجب أن يكون بعد وقت البداية","err"); return; }

      if (editId) {
        // ── UPDATE mode ──────────────────────────────────────────
        try {
          await update(ref(db, `cards/${editId}`), {
            title: card.title, description: card.description, reward: card.reward,
            icon: card.icon, color: card.color, maxUses: card.maxUses,
            startTime: card.startTime, endTime: card.endTime
          });
          setMsg("card-create-msg","✅ تم تحديث البطاقة بنجاح!","ok");
          toast("تم تحديث البطاقة ✅");
          this.textContent = "➕ إنشاء البطاقة";
          delete this.dataset.editId;
        } catch(e) { setMsg("card-create-msg","❌ خطأ: "+e.message,"err"); }
      } else {
        // ── CREATE mode ───────────────────────────────────────────
        try {
          const cardId = "card_" + Date.now();
          await set(ref(db, `cards/${cardId}`), card);
          setMsg("card-create-msg","✅ تم إنشاء البطاقة بنجاح!","ok");
          toast("تم إنشاء البطاقة ✅");
          document.getElementById("card-title").value    = "";
          document.getElementById("card-desc").value     = "";
          document.getElementById("card-reward").value   = "";
          document.getElementById("card-icon").value     = "";
          document.getElementById("card-max-uses").value = "0";
          document.getElementById("card-preview-wrap").style.display = "none";
        } catch(e) { setMsg("card-create-msg","❌ خطأ: "+e.message,"err"); }
      }
    });

  // Delete card
  window.deleteCard = async (cardId) => {
    if (!confirm("Ø­Ø°Ù ÙØ°Ù Ø§ÙØ¨Ø·Ø§ÙØ©Ø ÙØ§ ÙÙÙÙ Ø§ÙØªØ±Ø§Ø¬Ø¹.")) return;
    try {
      await remove(ref(db, `cards/${cardId}`));
      toast("ØªÙ Ø­Ø°Ù Ø§ÙØ¨Ø·Ø§ÙØ© ðï¸");
    } catch(e) { toast("Ø®Ø·Ø£: "+e.message,"err"); }
  };
  