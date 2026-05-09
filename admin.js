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

  // ── DOM helpers ───────────────────────────────────────────────
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

  // ── Modal helpers ─────────────────────────────────────────────
  function openModal(id)  { $(id).classList.add("open"); }
  function closeModal(id) { $(id).classList.remove("open"); }
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal-overlay").forEach(ov => {
    ov.addEventListener("click", e => { if (e.target === ov) closeModal(ov.id); });
  });

  // ── State ─────────────────────────────────────────────────────
  let allUsers    = {};   // { uid: data }
  let allCoupons  = {};
  let editingUid  = null;
  let deletingUid = null;
  let rewardUid   = null;
  let chart       = null;

  // ── Auth gate ─────────────────────────────────────────────────
  onAuthStateChanged(auth, async user => {
    if (!user || user.email !== ADMIN_EMAIL) {
      $("admin-loading").innerHTML =
        `<div style="text-align:center;color:#ef4444;font-size:1rem">
          ⛔ غير مصرح لك بالدخول
          <br/><br/>
          <a href="/" style="color:#f0b429;text-decoration:none">← العودة للرئيسية</a>
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
    if (confirm("تأكيد تسجيل الخروج؟")) signOut(auth).then(() => location.href = "/");
  });

  // ── Load all data once ────────────────────────────────────────
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

  // ── Live listeners ────────────────────────────────────────────
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

  // ── Stats ─────────────────────────────────────────────────────
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

  // ── Chart ─────────────────────────────────────────────────────
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
          label: "مستخدمون جدد",
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

  // ── Users table ───────────────────────────────────────────────
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
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">لا يوجد مستخدمون</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const lastClaim = u.lastClaimTime
        ? new Date(u.lastClaimTime).toLocaleDateString("ar-SA")
        : "—";
      const avatar = u.photoURL
        ? `<img class="user-avatar-sm" src="${escHtml(u.photoURL)}" alt="" onerror="this.src=''"/>`
        : `<div class="user-avatar-sm" style="display:flex;align-items:center;justify-content:center;font-size:1rem;">👤</div>`;
      return `<tr>
        <td>
          <div class="user-cell">
            ${avatar}
            <div>
              <div class="user-name">${escHtml(u.username || "—")}</div>
              <div class="user-email">${escHtml(u.email || "—")}</div>
            </div>
          </div>
        </td>
        <td><span class="val-gold">${(u.balance||0).toFixed(4)}</span></td>
        <td><span class="val-cyan">${(u.totalMined||0).toFixed(4)}</span></td>
        <td>${u.miningPower||1} α/س</td>
        <td>${u.maxMiningDuration||3} س</td>
        <td style="font-size:.78rem;color:var(--text2)">${lastClaim}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon edit" title="تعديل" onclick="openEditModal('${u.uid}')">✏️</button>
            <button class="btn-icon reward" title="مكافأة سريعة" onclick="openRewardModal('${u.uid}')">🎁</button>
            <button class="btn-icon del" title="حذف" onclick="openDeleteModal('${u.uid}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  $("user-search").addEventListener("input",  renderUsersTable);
  $("user-sort").addEventListener("change",   renderUsersTable);

  // ── Edit modal ────────────────────────────────────────────────
  window.openEditModal = uid => {
    editingUid = uid;
    const u = allUsers[uid];
    if (!u) return;
    $("edit-user-info").innerHTML =
      `<strong>${escHtml(u.username||"—")}</strong> — ${escHtml(u.email||"—")}<br/>
      الرصيد الحالي: <strong style="color:var(--gold)">${(u.balance||0).toFixed(6)} α</strong>`;
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
      if (!confirm(`تغيير الرصيد بـ ${Math.abs(newBal-oldBal).toFixed(2)} α — هل أنت متأكد؟`)) return;
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
      setMsg("edit-user-msg", "✅ تم الحفظ بنجاح", "ok");
      toast("تم حفظ بيانات المستخدم ✅");
    } catch(e) { setMsg("edit-user-msg", "❌ خطأ: " + e.message, "err"); }
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
    if (!Object.keys(upd).length) { setMsg("edit-user-msg", "المستخدم على أعلى مستوى", "info"); return; }
    try {
      await update(ref(db, `users/${editingUid}`), upd);
      if (upd.miningPower)     $("edit-power").value      = upd.miningPower;
      if (upd.miningPowerLevel) $("edit-power-level").value = upd.miningPowerLevel;
      if (upd.maxMiningDuration) $("edit-duration").value  = upd.maxMiningDuration;
      if (upd.miningDurationLevel) $("edit-duration-level").value = upd.miningDurationLevel;
      setMsg("edit-user-msg", "✅ تمت الترقية المجانية", "ok");
      toast("تمت الترقية المجانية 🚀");
    } catch(e) { setMsg("edit-user-msg", "❌ خطأ: " + e.message, "err"); }
  });

  $("reset-mining-btn").addEventListener("click", async () => {
    if (!editingUid) return;
    if (!confirm("إعادة ضبط عداد التعدين لهذا المستخدم؟")) return;
    const now = Date.now();
    try {
      await update(ref(db, `users/${editingUid}`), { miningStartTime: now, lastClaimTime: now });
      setMsg("edit-user-msg", "✅ تمت إعادة ضبط التعدين", "ok");
      toast("تمت إعادة الضبط 🔄");
    } catch(e) { setMsg("edit-user-msg", "❌ خطأ: " + e.message, "err"); }
  });

  // ── Quick Reward modal ────────────────────────────────────────
  window.openRewardModal = uid => {
    rewardUid = uid;
    const u = allUsers[uid];
    if (!u) return;
    $("reward-user-info").innerHTML =
      `<strong>${escHtml(u.username||"—")}</strong> — رصيد حالي: <strong style="color:var(--gold)">${(u.balance||0).toFixed(6)} α</strong>`;
    $("reward-amount").value = "";
    setMsg("reward-msg", "", "");
    openModal("reward-modal");
  };

  $("confirm-reward-btn").addEventListener("click", async () => {
    if (!rewardUid) return;
    const amount = parseFloat($("reward-amount").value);
    if (!amount || amount <= 0) { setMsg("reward-msg", "أدخل مبلغاً صحيحاً", "err"); return; }
    const u      = allUsers[rewardUid];
    const newBal = Math.round(((u.balance || 0) + amount) * 1e6) / 1e6;
    try {
      await update(ref(db, `users/${rewardUid}`), { balance: newBal });
      toast(`+α${amount} تمت المكافأة ✅`);
      closeModal("reward-modal");
    } catch(e) { setMsg("reward-msg", "❌ خطأ: " + e.message, "err"); }
  });

  // ── Delete modal ──────────────────────────────────────────────
  window.openDeleteModal = uid => {
    deletingUid = uid;
    const u = allUsers[uid];
    $("delete-confirm-text").innerHTML =
      `هل أنت متأكد من حذف المستخدم <strong>${escHtml(u?.username||uid)}</strong>؟<br/>
      <strong style="color:var(--red)">لا يمكن التراجع عن هذه العملية.</strong>`;
    openModal("delete-modal");
  };

  $("confirm-delete-btn").addEventListener("click", async () => {
    if (!deletingUid) return;
    try {
      await remove(ref(db, `users/${deletingUid}`));
      toast("تم حذف المستخدم 🗑️", "ok");
      closeModal("delete-modal");
      deletingUid = null;
    } catch(e) { toast("خطأ: " + e.message, "err"); }
  });

  // ── Bulk Reward ───────────────────────────────────────────────
  $("bulk-reward-btn").addEventListener("click", async () => {
    const amount = parseFloat($("bulk-reward-val").value);
    if (!amount || amount <= 0) { setMsg("bulk-msg", "أدخل مبلغاً صحيحاً", "err"); return; }
    const users = Object.entries(allUsers);
    if (!users.length) { setMsg("bulk-msg", "لا يوجد مستخدمون", "err"); return; }
    if (!confirm(`تطبيق مكافأة +α${amount} على ${users.length} مستخدمين؟`)) return;

    $("bulk-reward-btn").disabled = true;
    setMsg("bulk-msg", `جار التطبيق على ${users.length} مستخدمين…`, "info");

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
    setMsg("bulk-msg", `✅ تمت المكافأة لـ ${done} مستخدمين${failed ? (" — فشل: " + failed) : ""}`, "ok");
    toast(`تم توزيع +α${amount} على ${done} مستخدمين 🎁`);
  });

  // ── Coupons table ─────────────────────────────────────────────
  function renderCouponsTable() {
    const tbody = $("coupons-tbody");
    const entries = Object.entries(allCoupons);
    if (!entries.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">لا توجد قسائم بعد</td></tr>`;
      return;
    }
    tbody.innerHTML = entries.map(([code, c]) => {
      const used = c.usedBy ? Object.keys(c.usedBy).length : 0;
      const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString("ar-SA") : "—";
      return `<tr>
        <td><span style="font-family:monospace;color:var(--gold);letter-spacing:1px">${escHtml(code)}</span></td>
        <td class="val-cyan">${c.rewardAmount} α</td>
        <td><span class="badge ${c.isActive?"badge-active":"badge-off"}">${c.isActive?"نشط":"معطّل"}</span></td>
        <td style="color:var(--text2)">${used} مرة</td>
        <td style="font-size:.78rem;color:var(--text2)">${date}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" title="${c.isActive?"تعطيل":"تفعيل"}"
              style="border-color:${c.isActive?"rgba(239,68,68,.4)":"rgba(34,197,94,.4)"};color:${c.isActive?"var(--red)":"var(--green)"}"
              onclick="toggleCoupon('${escHtml(code)}',${!c.isActive})">${c.isActive?"⏸":"▶"}</button>
            <button class="btn-icon del" title="حذف" onclick="deleteCoupon('${escHtml(code)}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  window.toggleCoupon = async (code, isActive) => {
    try {
      await update(ref(db, `coupons/${code}`), { isActive });
      toast(isActive ? "تم تفعيل القسيمة ✅" : "تم تعطيل القسيمة ⏸");
    } catch(e) { toast("خطأ: " + e.message, "err"); }
  };

  window.deleteCoupon = async code => {
    if (!confirm(`حذف القسيمة "${code}"؟`)) return;
    try {
      await remove(ref(db, `coupons/${code}`));
      toast("تم حذف القسيمة 🗑️");
    } catch(e) { toast("خطأ: " + e.message, "err"); }
  };

  // ── Create coupon ─────────────────────────────────────────────
  $("create-coupon-btn").addEventListener("click", async () => {
    let code   = ($("new-coupon-code").value || "").trim().toUpperCase();
    const reward = parseFloat($("new-coupon-reward").value);
    if (!code) code = "ALPHA-" + Math.random().toString(36).slice(2,8).toUpperCase();
    if (!reward || reward <= 0) { setMsg("coupon-create-msg", "أدخل مكافأة صحيحة", "err"); return; }
    if (allCoupons[code]) { setMsg("coupon-create-msg", "هذا الكود موجود بالفعل", "err"); return; }
    try {
      await set(ref(db, `coupons/${code}`), {
        rewardAmount: reward, isActive: true,
        createdAt: Date.now(), usedBy: {}
      });
      setMsg("coupon-create-msg", `✅ تم إنشاء القسيمة: ${code} (+α${reward})`, "ok");
      $("new-coupon-code").value   = "";
      $("new-coupon-reward").value = "";
      toast(`تم إنشاء القسيمة ${code} ✅`);
    } catch(e) { setMsg("coupon-create-msg", "❌ خطأ: " + e.message, "err"); }
  });

  // ── Utility ───────────────────────────────────────────────────
  function escHtml(s) {
    return String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  