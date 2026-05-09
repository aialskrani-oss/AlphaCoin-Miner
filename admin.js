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

  // ââ DOM helpers âââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Modal helpers âââââââââââââââââââââââââââââââââââââââââââââ
  function openModal(id)  { $(id).classList.add("open"); }
  function closeModal(id) { $(id).classList.remove("open"); }
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal-overlay").forEach(ov => {
    ov.addEventListener("click", e => { if (e.target === ov) closeModal(ov.id); });
  });

  // ââ State âââââââââââââââââââââââââââââââââââââââââââââââââââââ
  let allUsers    = {};   // { uid: data }
  let allCoupons  = {};
  let editingUid  = null;
  let deletingUid = null;
  let rewardUid   = null;
  let chart       = null;

  // ââ Auth gate âââââââââââââââââââââââââââââââââââââââââââââââââ
  onAuthStateChanged(auth, async user => {
    if (!user || user.email !== ADMIN_EMAIL) {
      $("admin-loading").innerHTML =
        `<div style="text-align:center;color:#ef4444;font-size:1rem">
          â ØºÙØ± ÙØµØ±Ø­ ÙÙ Ø¨Ø§ÙØ¯Ø®ÙÙ
          <br/><br/>
          <a href="/" style="color:#f0b429;text-decoration:none">â Ø§ÙØ¹ÙØ¯Ø© ÙÙØ±Ø¦ÙØ³ÙØ©</a>
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
    if (confirm("ØªØ£ÙÙØ¯ ØªØ³Ø¬ÙÙ Ø§ÙØ®Ø±ÙØ¬Ø")) signOut(auth).then(() => location.href = "/");
  });

  // ââ Load all data once ââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Live listeners ââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Stats âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // ââ Chart âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
          label: "ÙØ³ØªØ®Ø¯ÙÙÙ Ø¬Ø¯Ø¯",
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

  // ââ Users table âââââââââââââââââââââââââââââââââââââââââââââââ
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
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">ÙØ§ ÙÙØ¬Ø¯ ÙØ³ØªØ®Ø¯ÙÙÙ</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const lastClaim = u.lastClaimTime
        ? new Date(u.lastClaimTime).toLocaleDateString("ar-SA")
        : "â";
      const avatar = u.photoURL
        ? `<img class="user-avatar-sm" src="${escHtml(u.photoURL)}" alt="" onerror="this.src=''"/>`
        : `<div class="user-avatar-sm" style="display:flex;align-items:center;justify-content:center;font-size:1rem;">ð¤</div>`;
      return `<tr>
        <td>
          <div class="user-cell">
            ${avatar}
            <div>
              <div class="user-name">${escHtml(u.username || "â")}</div>
              <div class="user-email">${escHtml(u.email || "â")}</div>
            </div>
          </div>
        </td>
        <td><span class="val-gold">${(u.balance||0).toFixed(4)}</span></td>
        <td><span class="val-cyan">${(u.totalMined||0).toFixed(4)}</span></td>
        <td>${u.miningPower||1} Î±/Ø³</td>
        <td>${u.maxMiningDuration||3} Ø³</td>
        <td style="font-size:.78rem;color:var(--text2)">${lastClaim}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon edit" title="ØªØ¹Ø¯ÙÙ" onclick="openEditModal('${u.uid}')">âï¸</button>
            <button class="btn-icon reward" title="ÙÙØ§ÙØ£Ø© Ø³Ø±ÙØ¹Ø©" onclick="openRewardModal('${u.uid}')">ð</button>
            <button class="btn-icon del" title="Ø­Ø°Ù" onclick="openDeleteModal('${u.uid}')">ðï¸</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  $("user-search").addEventListener("input",  renderUsersTable);
  $("user-sort").addEventListener("change",   renderUsersTable);

  // ââ Edit modal ââââââââââââââââââââââââââââââââââââââââââââââââ
  window.openEditModal = uid => {
    editingUid = uid;
    const u = allUsers[uid];
    if (!u) return;
    $("edit-user-info").innerHTML =
      `<strong>${escHtml(u.username||"â")}</strong> â ${escHtml(u.email||"â")}<br/>
      Ø§ÙØ±ØµÙØ¯ Ø§ÙØ­Ø§ÙÙ: <strong style="color:var(--gold)">${(u.balance||0).toFixed(6)} Î±</strong>`;
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
      if (!confirm(`ØªØºÙÙØ± Ø§ÙØ±ØµÙØ¯ Ø¨Ù ${Math.abs(newBal-oldBal).toFixed(2)} Î± â ÙÙ Ø£ÙØª ÙØªØ£ÙØ¯Ø`)) return;
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
      setMsg("edit-user-msg", "â ØªÙ Ø§ÙØ­ÙØ¸ Ø¨ÙØ¬Ø§Ø­", "ok");
      toast("ØªÙ Ø­ÙØ¸ Ø¨ÙØ§ÙØ§Øª Ø§ÙÙØ³ØªØ®Ø¯Ù â");
    } catch(e) { setMsg("edit-user-msg", "â Ø®Ø·Ø£: " + e.message, "err"); }
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
    if (!Object.keys(upd).length) { setMsg("edit-user-msg", "Ø§ÙÙØ³ØªØ®Ø¯Ù Ø¹ÙÙ Ø£Ø¹ÙÙ ÙØ³ØªÙÙ", "info"); return; }
    try {
      await update(ref(db, `users/${editingUid}`), upd);
      if (upd.miningPower)     $("edit-power").value      = upd.miningPower;
      if (upd.miningPowerLevel) $("edit-power-level").value = upd.miningPowerLevel;
      if (upd.maxMiningDuration) $("edit-duration").value  = upd.maxMiningDuration;
      if (upd.miningDurationLevel) $("edit-duration-level").value = upd.miningDurationLevel;
      setMsg("edit-user-msg", "â ØªÙØª Ø§ÙØªØ±ÙÙØ© Ø§ÙÙØ¬Ø§ÙÙØ©", "ok");
      toast("ØªÙØª Ø§ÙØªØ±ÙÙØ© Ø§ÙÙØ¬Ø§ÙÙØ© ð");
    } catch(e) { setMsg("edit-user-msg", "â Ø®Ø·Ø£: " + e.message, "err"); }
  });

  $("reset-mining-btn").addEventListener("click", async () => {
    if (!editingUid) return;
    if (!confirm("Ø¥Ø¹Ø§Ø¯Ø© Ø¶Ø¨Ø· Ø¹Ø¯Ø§Ø¯ Ø§ÙØªØ¹Ø¯ÙÙ ÙÙØ°Ø§ Ø§ÙÙØ³ØªØ®Ø¯ÙØ")) return;
    const now = Date.now();
    try {
      await update(ref(db, `users/${editingUid}`), { miningStartTime: now, lastClaimTime: now });
      setMsg("edit-user-msg", "â ØªÙØª Ø¥Ø¹Ø§Ø¯Ø© Ø¶Ø¨Ø· Ø§ÙØªØ¹Ø¯ÙÙ", "ok");
      toast("ØªÙØª Ø¥Ø¹Ø§Ø¯Ø© Ø§ÙØ¶Ø¨Ø· ð");
    } catch(e) { setMsg("edit-user-msg", "â Ø®Ø·Ø£: " + e.message, "err"); }
  });

  // ââ Quick Reward modal ââââââââââââââââââââââââââââââââââââââââ
  window.openRewardModal = uid => {
    rewardUid = uid;
    const u = allUsers[uid];
    if (!u) return;
    $("reward-user-info").innerHTML =
      `<strong>${escHtml(u.username||"â")}</strong> â Ø±ØµÙØ¯ Ø­Ø§ÙÙ: <strong style="color:var(--gold)">${(u.balance||0).toFixed(6)} Î±</strong>`;
    $("reward-amount").value = "";
    setMsg("reward-msg", "", "");
    openModal("reward-modal");
  };

  $("confirm-reward-btn").addEventListener("click", async () => {
    if (!rewardUid) return;
    const amount = parseFloat($("reward-amount").value);
    if (!amount || amount <= 0) { setMsg("reward-msg", "Ø£Ø¯Ø®Ù ÙØ¨ÙØºØ§Ù ØµØ­ÙØ­Ø§Ù", "err"); return; }
    const u      = allUsers[rewardUid];
    const newBal = Math.round(((u.balance || 0) + amount) * 1e6) / 1e6;
    try {
      await update(ref(db, `users/${rewardUid}`), { balance: newBal });
      toast(`+Î±${amount} ØªÙØª Ø§ÙÙÙØ§ÙØ£Ø© â`);
      closeModal("reward-modal");
    } catch(e) { setMsg("reward-msg", "â Ø®Ø·Ø£: " + e.message, "err"); }
  });

  // ââ Delete modal ââââââââââââââââââââââââââââââââââââââââââââââ
  window.openDeleteModal = uid => {
    deletingUid = uid;
    const u = allUsers[uid];
    $("delete-confirm-text").innerHTML =
      `ÙÙ Ø£ÙØª ÙØªØ£ÙØ¯ ÙÙ Ø­Ø°Ù Ø§ÙÙØ³ØªØ®Ø¯Ù <strong>${escHtml(u?.username||uid)}</strong>Ø<br/>
      <strong style="color:var(--red)">ÙØ§ ÙÙÙÙ Ø§ÙØªØ±Ø§Ø¬Ø¹ Ø¹Ù ÙØ°Ù Ø§ÙØ¹ÙÙÙØ©.</strong>`;
    openModal("delete-modal");
  };

  $("confirm-delete-btn").addEventListener("click", async () => {
    if (!deletingUid) return;
    try {
      await remove(ref(db, `users/${deletingUid}`));
      toast("ØªÙ Ø­Ø°Ù Ø§ÙÙØ³ØªØ®Ø¯Ù ðï¸", "ok");
      closeModal("delete-modal");
      deletingUid = null;
    } catch(e) { toast("Ø®Ø·Ø£: " + e.message, "err"); }
  });

  // ââ Bulk Reward âââââââââââââââââââââââââââââââââââââââââââââââ
  $("bulk-reward-btn").addEventListener("click", async () => {
    const amount = parseFloat($("bulk-reward-val").value);
    if (!amount || amount <= 0) { setMsg("bulk-msg", "Ø£Ø¯Ø®Ù ÙØ¨ÙØºØ§Ù ØµØ­ÙØ­Ø§Ù", "err"); return; }
    const users = Object.entries(allUsers);
    if (!users.length) { setMsg("bulk-msg", "ÙØ§ ÙÙØ¬Ø¯ ÙØ³ØªØ®Ø¯ÙÙÙ", "err"); return; }
    if (!confirm(`ØªØ·Ø¨ÙÙ ÙÙØ§ÙØ£Ø© +Î±${amount} Ø¹ÙÙ ${users.length} ÙØ³ØªØ®Ø¯ÙÙÙØ`)) return;

    $("bulk-reward-btn").disabled = true;
    setMsg("bulk-msg", `Ø¬Ø§Ø± Ø§ÙØªØ·Ø¨ÙÙ Ø¹ÙÙ ${users.length} ÙØ³ØªØ®Ø¯ÙÙÙâ¦`, "info");

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
    setMsg("bulk-msg", `â ØªÙØª Ø§ÙÙÙØ§ÙØ£Ø© ÙÙ ${done} ÙØ³ØªØ®Ø¯ÙÙÙ${failed ? (" â ÙØ´Ù: " + failed) : ""}`, "ok");
    toast(`ØªÙ ØªÙØ²ÙØ¹ +Î±${amount} Ø¹ÙÙ ${done} ÙØ³ØªØ®Ø¯ÙÙÙ ð`);
  });

  // ââ Coupons table âââââââââââââââââââââââââââââââââââââââââââââ
  function renderCouponsTable() {
    const tbody = $("coupons-tbody");
    const entries = Object.entries(allCoupons);
    if (!entries.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">ÙØ§ ØªÙØ¬Ø¯ ÙØ³Ø§Ø¦Ù Ø¨Ø¹Ø¯</td></tr>`;
      return;
    }
    tbody.innerHTML = entries.map(([code, c]) => {
      const used = c.usedBy ? Object.keys(c.usedBy).length : 0;
      const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString("ar-SA") : "â";
      return `<tr>
        <td><span style="font-family:monospace;color:var(--gold);letter-spacing:1px">${escHtml(code)}</span></td>
        <td class="val-cyan">${c.rewardAmount} Î±</td>
        <td><span class="badge ${c.isActive?"badge-active":"badge-off"}">${c.isActive?"ÙØ´Ø·":"ÙØ¹Ø·ÙÙ"}</span></td>
        <td style="color:var(--text2)">${used} ÙØ±Ø©</td>
        <td style="font-size:.78rem;color:var(--text2)">${date}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" title="${c.isActive?"ØªØ¹Ø·ÙÙ":"ØªÙØ¹ÙÙ"}"
              style="border-color:${c.isActive?"rgba(239,68,68,.4)":"rgba(34,197,94,.4)"};color:${c.isActive?"var(--red)":"var(--green)"}"
              onclick="toggleCoupon('${escHtml(code)}',${!c.isActive})">${c.isActive?"â¸":"â¶"}</button>
            <button class="btn-icon del" title="Ø­Ø°Ù" onclick="deleteCoupon('${escHtml(code)}')">ðï¸</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  window.toggleCoupon = async (code, isActive) => {
    try {
      await update(ref(db, `coupons/${code}`), { isActive });
      toast(isActive ? "ØªÙ ØªÙØ¹ÙÙ Ø§ÙÙØ³ÙÙØ© â" : "ØªÙ ØªØ¹Ø·ÙÙ Ø§ÙÙØ³ÙÙØ© â¸");
    } catch(e) { toast("Ø®Ø·Ø£: " + e.message, "err"); }
  };

  window.deleteCoupon = async code => {
    if (!confirm(`Ø­Ø°Ù Ø§ÙÙØ³ÙÙØ© "${code}"Ø`)) return;
    try {
      await remove(ref(db, `coupons/${code}`));
      toast("ØªÙ Ø­Ø°Ù Ø§ÙÙØ³ÙÙØ© ðï¸");
    } catch(e) { toast("Ø®Ø·Ø£: " + e.message, "err"); }
  };

  // ââ Create coupon âââââââââââââââââââââââââââââââââââââââââââââ
  $("create-coupon-btn").addEventListener("click", async () => {
    let code   = ($("new-coupon-code").value || "").trim().toUpperCase();
    const reward = parseFloat($("new-coupon-reward").value);
    if (!code) code = "ALPHA-" + Math.random().toString(36).slice(2,8).toUpperCase();
    if (!reward || reward <= 0) { setMsg("coupon-create-msg", "Ø£Ø¯Ø®Ù ÙÙØ§ÙØ£Ø© ØµØ­ÙØ­Ø©", "err"); return; }
    if (allCoupons[code]) { setMsg("coupon-create-msg", "ÙØ°Ø§ Ø§ÙÙÙØ¯ ÙÙØ¬ÙØ¯ Ø¨Ø§ÙÙØ¹Ù", "err"); return; }
    try {
      await set(ref(db, `coupons/${code}`), {
        rewardAmount: reward, isActive: true,
        createdAt: Date.now(), usedBy: {}
      });
      setMsg("coupon-create-msg", `â ØªÙ Ø¥ÙØ´Ø§Ø¡ Ø§ÙÙØ³ÙÙØ©: ${code} (+Î±${reward})`, "ok");
      $("new-coupon-code").value   = "";
      $("new-coupon-reward").value = "";
      toast(`ØªÙ Ø¥ÙØ´Ø§Ø¡ Ø§ÙÙØ³ÙÙØ© ${code} â`);
    } catch(e) { setMsg("coupon-create-msg", "â Ø®Ø·Ø£: " + e.message, "err"); }
  });

  // ââ Utility âââââââââââââââââââââââââââââââââââââââââââââââââââ
  function escHtml(s) {
    return String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  

  // ════════════════════════════════════════════════════════════════
  // PRICE CARDS SYSTEM
  // ════════════════════════════════════════════════════════════════

  let allCards = {};

  // Live listener for cards
  onValue(ref(db, "cards"), snap => {
    allCards = {};
    if (snap.exists()) snap.forEach(c => { allCards[c.key] = c.val(); });
    renderCardsList();
  });

  // Set default datetime values (now → now+24h)
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
    const tlStr  = timeLeft > 0 ? formatCardTime(timeLeft) : "منتهي";
    const startStr = new Date(start).toLocaleString("ar-SA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
    const endStr   = new Date(end).toLocaleString("ar-SA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});

    return `<div class="price-card ${isLive ? "live" : "inactive"}" data-id="${cardId}"
      style="background:${col.bg};border-color:${col.border}">
      <div class="pc-glow" style="background:radial-gradient(circle,${col.accent}22,transparent 70%)"></div>
      <div class="pc-header">
        <span class="pc-icon">${escHtml(card.icon || "🎁")}</span>
        <div class="pc-status-wrap">
          <span class="pc-status ${isLive?"live":"off"}">${isLive?"● مباشر":"◌ غير نشط"}</span>
          ${isAdminView ? `<span class="pc-uses">${uses}${maxU>0?" / "+maxU:""} استخدام</span>` : ""}
        </div>
      </div>
      <div class="pc-title" style="color:${col.text}">${escHtml(card.title||"بطاقة عرض")}</div>
      <div class="pc-desc">${escHtml(card.description||"")}</div>
      <div class="pc-reward" style="color:${col.accent}">+α ${(card.reward||0).toLocaleString("ar",{maximumFractionDigits:4})}</div>
      ${isAdminView ? `
      <div class="pc-time-row">
        <span>⏱ ${startStr}</span><span>→</span><span>${endStr}</span>
      </div>` : `
      <div class="pc-timer" id="card-timer-${cardId}" style="color:${col.text}">
        ${isLive ? "⏳ متبقي: " + tlStr : "⌛ " + tlStr}
      </div>`}
      ${isAdminView ? `
      <div class="pc-admin-actions">
        <button class="btn-action ${card.isActive?"btn-red":"btn-green"}"
          style="padding:.35rem .8rem;font-size:.78rem"
          onclick="toggleCard('${cardId}',${!card.isActive})">
          ${card.isActive?"⏸ تعطيل":"▶ تفعيل"}
        </button>
        <button class="btn-action btn-blue"
          style="padding:.35rem .8rem;font-size:.78rem"
          onclick="editCard('${cardId}')">
          ✏️ تعديل
        </button>
        <button class="btn-action btn-red"
          style="padding:.35rem .8rem;font-size:.78rem"
          onclick="deleteCard('${cardId}')">
          🗑️ حذف
        </button>
      </div>` : `
      <button class="pc-claim-btn" id="claim-card-${cardId}"
        onclick="claimCard('${cardId}')"
        ${isLive ? "" : "disabled"}>
        ${isLive ? "🎁 احصل عليها الآن" : "غير متاحة"}
      </button>`}
    </div>`;
  }

  function formatCardTime(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60)   return s + " ثانية";
    if (s < 3600) return Math.floor(s/60) + " دقيقة";
    if (s < 86400) return Math.floor(s/3600) + " ساعة";
    return Math.floor(s/86400) + " يوم";
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
      title:     document.getElementById("card-title").value || "بطاقة عرض",
      description: document.getElementById("card-desc").value || "",
      reward:    parseFloat(document.getElementById("card-reward").value) || 10,
      icon:      document.getElementById("card-icon").value || "🎁",
      color:     document.getElementById("card-color").value || "gold",
      maxUses:   parseInt(document.getElementById("card-max-uses").value) || 0,
      startTime: new Date(document.getElementById("card-start").value).getTime() || Date.now(),
      endTime:   new Date(document.getElementById("card-end").value).getTime()   || (Date.now() + 86400000),
      isActive:  true,
      createdAt: Date.now(),
      claimedBy: {}
    };
  }

  // Create card
  document.getElementById("create-card-btn").addEventListener("click", async () => {
    const card = readCardForm();
    if (!card.title)  { setMsg("card-create-msg","أدخل عنوان البطاقة","err"); return; }
    if (!card.reward) { setMsg("card-create-msg","أدخل مكافأة صحيحة","err"); return; }
    if (card.endTime <= card.startTime) { setMsg("card-create-msg","وقت الانتهاء يجب أن يكون بعد وقت البداية","err"); return; }
    try {
      const cardId = "card_" + Date.now();
      await set(ref(db, `cards/${cardId}`), card);
      setMsg("card-create-msg","✅ تم إنشاء البطاقة بنجاح!","ok");
      toast("تم إنشاء البطاقة ✅");
      // Reset form
      document.getElementById("card-title").value  = "";
      document.getElementById("card-desc").value   = "";
      document.getElementById("card-reward").value = "";
      document.getElementById("card-icon").value   = "";
      document.getElementById("card-max-uses").value = "0";
      document.getElementById("card-preview-wrap").style.display = "none";
    } catch(e) { setMsg("card-create-msg","❌ خطأ: "+e.message,"err"); }
  });

  // Render cards list
  function renderCardsList() {
    const list    = document.getElementById("cards-list");
    const entries = Object.entries(allCards).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
    if (!entries.length) {
      list.innerHTML = `<div style="color:var(--text3);text-align:center;padding:1.5rem;font-size:.85rem">لا توجد بطاقات بعد</div>`;
      return;
    }
    list.innerHTML = `<div class="cards-grid">${entries.map(([id,c])=>buildCardHTML(c,id,true)).join("")}</div>`;
  }

  // Toggle card active
  window.toggleCard = async (cardId, isActive) => {
    try {
      await update(ref(db, `cards/${cardId}`), { isActive });
      toast(isActive ? "تم تفعيل البطاقة ▶" : "تم تعطيل البطاقة ⏸");
    } catch(e) { toast("خطأ: "+e.message,"err"); }
  };

  // Edit card (open modal with prefilled data)
  window.editCard = async (cardId) => {
    const card = allCards[cardId];
    if (!card) return;
    document.getElementById("card-title").value     = card.title || "";
    document.getElementById("card-desc").value      = card.description || "";
    document.getElementById("card-reward").value    = card.reward || "";
    document.getElementById("card-icon").value      = card.icon || "🎁";
    document.getElementById("card-color").value     = card.color || "gold";
    document.getElementById("card-max-uses").value  = card.maxUses || 0;
    const fmt = ts => ts ? new Date(ts).toISOString().slice(0,16) : "";
    document.getElementById("card-start").value = fmt(card.startTime);
    document.getElementById("card-end").value   = fmt(card.endTime);
    // Change create button to update mode
    const btn = document.getElementById("create-card-btn");
    btn.textContent = "💾 تحديث البطاقة";
    btn.dataset.editId = cardId;
    document.getElementById("card-create-form").scrollIntoView({ behavior:"smooth" });
    setMsg("card-create-msg","يمكنك تعديل البيانات ثم الضغط على تحديث البطاقة","info");
  };

  // Override create btn for edit mode
  const origCreateListener = document.getElementById("create-card-btn").onclick;
  document.getElementById("create-card-btn").addEventListener("click", async function() {
    const editId = this.dataset.editId;
    if (!editId) return;
    const card = readCardForm();
    try {
      await update(ref(db, `cards/${editId}`), {
        title: card.title, description: card.description, reward: card.reward,
        icon: card.icon, color: card.color, maxUses: card.maxUses,
        startTime: card.startTime, endTime: card.endTime
      });
      setMsg("card-create-msg","✅ تم تحديث البطاقة","ok");
      toast("تم تحديث البطاقة ✅");
      this.textContent = "➕ إنشاء البطاقة";
      delete this.dataset.editId;
    } catch(e) { setMsg("card-create-msg","❌ خطأ: "+e.message,"err"); }
  }, { once: false });

  // Delete card
  window.deleteCard = async (cardId) => {
    if (!confirm("حذف هذه البطاقة؟ لا يمكن التراجع.")) return;
    try {
      await remove(ref(db, `cards/${cardId}`));
      toast("تم حذف البطاقة 🗑️");
    } catch(e) { toast("خطأ: "+e.message,"err"); }
  };
  