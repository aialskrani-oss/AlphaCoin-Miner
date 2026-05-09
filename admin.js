import { auth, db } from "./firebase-config.js";
  import {
    onAuthStateChanged, signOut
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
  import {
    ref, get, set, update, remove, onValue, push, runTransaction, query, orderByChild, limitToLast
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  const ADMIN_EMAIL = "aialskrani@gmail.com";

  // ── Auth guard ────────────────────────────────────────────────
  let adminUser = null;
  onAuthStateChanged(auth, async user => {
    if (!user || user.email !== ADMIN_EMAIL) {
      window.location.href = "/";
      return;
    }
    adminUser = user;
    initAdmin();
  });

  function initAdmin() {
    listenUsers();
    listenCoupons();
    listenCards();
    listenSettings();
    loadReferralStats();
    setDefaultCardTimes();
  }

  // ── Sidebar navigation ────────────────────────────────────────
  window.showSection = function(id) {
    document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".sidebar-item").forEach(b => b.classList.remove("active"));
    const sec = document.getElementById("sec-" + id);
    const btn = document.querySelector(`[data-sec="${id}"]`);
    if (sec) sec.classList.add("active");
    if (btn) btn.classList.add("active");
    if (id === "leaderboard-admin") loadAdminLeaderboard();
    if (id === "dashboard") buildDashboard();
  };

  // ── Toast ─────────────────────────────────────────────────────
  function toast(msg, type="ok") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg; t.className = "toast show " + type;
    setTimeout(() => t.classList.remove("show"), 3500);
  }
  function setMsg(id, msg, type="ok") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg; el.className = "section-msg " + type;
  }
  function escHtml(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  // ── Modal helpers ─────────────────────────────────────────────
  window.closeModal = (id) => { const el=document.getElementById(id); if(el) el.style.display="none"; };

  // ── USERS ─────────────────────────────────────────────────────
  let allUsers = {};
  let usersPage = 1;
  const USERS_PER_PAGE = 20;
  let usersSortKey = "joinedAt";
  let usersSortAsc = false;
  let filteredUsers = [];

  function listenUsers() {
    onValue(ref(db,"users"), snap => {
      allUsers = {};
      if (snap.exists()) snap.forEach(u => { allUsers[u.key] = u.val(); });
      buildDashboard();
      filterUsers();
    });
  }

  window.filterUsers = function() {
    const q      = (document.getElementById("user-search")?.value || "").toLowerCase();
    const filter = document.getElementById("user-filter")?.value || "all";
    let users = Object.entries(allUsers);
    if (q) users = users.filter(([,u]) => (u.username||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q));
    if (filter === "banned") users = users.filter(([,u]) => u.isBanned);
    if (filter === "active") {
      const week = Date.now() - 7*86400000;
      users = users.filter(([,u]) => (u.lastClaimTime||0) > week || (u.lastLoginDate||"") >= new Date(week).toISOString().slice(0,10));
    }
    users.sort((a,b) => {
      const av = a[1][usersSortKey] ?? 0, bv = b[1][usersSortKey] ?? 0;
      if (typeof av === "string") return usersSortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return usersSortAsc ? av-bv : bv-av;
    });
    filteredUsers = users;
    usersPage = 1;
    renderUsersTable();
  };

  window.sortUsers = function(key) {
    if (usersSortKey === key) usersSortAsc = !usersSortAsc;
    else { usersSortKey = key; usersSortAsc = false; }
    filterUsers();
  };

  function renderUsersTable() {
    const tbody = document.getElementById("users-tbody");
    const label = document.getElementById("users-count-label");
    const pag   = document.getElementById("users-pagination");
    if (!tbody) return;
    const total = filteredUsers.length;
    const pages = Math.ceil(total / USERS_PER_PAGE);
    const slice = filteredUsers.slice((usersPage-1)*USERS_PER_PAGE, usersPage*USERS_PER_PAGE);
    if (label) label.textContent = `إجمالي: ${total} مستخدم — الصفحة ${usersPage}/${pages||1}`;

    tbody.innerHTML = slice.map(([uid, u]) => {
      const joinDate = u.joinedAt ? new Date(u.joinedAt).toLocaleDateString("ar-SA") : "—";
      return `<tr>
        <td><span style="font-weight:600">${escHtml(u.username||"—")}</span>${u.isBanned?`<span class="banned-badge">محظور</span>`:""}<br/><span style="font-size:.68rem;color:var(--text3)">${escHtml(u.email||"")}</span></td>
        <td style="font-family:'Orbitron',monospace;color:var(--gold)">${(u.balance||0).toFixed(4)}</td>
        <td>${u.streak||0} 🔥</td>
        <td style="font-size:.72rem;color:var(--text2)">${joinDate}</td>
        <td>${u.isBanned?`<span style="color:var(--red);font-size:.75rem">🚫 محظور</span>`:`<span style="color:var(--green);font-size:.75rem">✅ نشط</span>`}</td>
        <td>
          <div style="display:flex;gap:.3rem;flex-wrap:wrap">
            <button class="btn-action btn-blue" style="padding:.3rem .6rem;font-size:.7rem" onclick="openEditModal('${uid}')">✏️</button>
            <button class="btn-action btn-gold" style="padding:.3rem .6rem;font-size:.7rem" onclick="openRewardModal('${uid}')">🎁</button>
            <button class="btn-action ${u.isBanned?"btn-green":"btn-red"}" style="padding:.3rem .6rem;font-size:.7rem" onclick="toggleBan('${uid}',${!u.isBanned})">${u.isBanned?"🔓":"🔒"}</button>
            <button class="btn-action btn-red" style="padding:.3rem .6rem;font-size:.7rem" onclick="deleteUser('${uid}')">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    // Pagination
    if (pag) {
      pag.innerHTML = Array.from({length:pages},(_,i)=>
        `<button class="page-btn ${i+1===usersPage?"active":""}" onclick="goPage(${i+1})">${i+1}</button>`
      ).join("");
    }
  }

  window.goPage = (p) => { usersPage=p; renderUsersTable(); };

  // ── Edit user ─────────────────────────────────────────────────
  let editUid = null;
  window.openEditModal = (uid) => {
    const u = allUsers[uid];
    if (!u) return;
    editUid = uid;
    document.getElementById("edit-username").value  = u.username||"";
    document.getElementById("edit-balance").value   = u.balance||0;
    document.getElementById("edit-power").value     = u.miningPower||1;
    document.getElementById("edit-duration").value  = u.maxMiningDuration||1;
    document.getElementById("edit-ban-reason").value= u.banReason||"";
    setMsg("edit-msg","","");
    document.getElementById("edit-modal").style.display="flex";
  };

  window.saveUserEdit = async () => {
    if (!editUid) return;
    const username  = document.getElementById("edit-username").value.trim();
    const balance   = parseFloat(document.getElementById("edit-balance").value)||0;
    const power     = parseFloat(document.getElementById("edit-power").value)||1;
    const duration  = parseFloat(document.getElementById("edit-duration").value)||1;
    const banReason = document.getElementById("edit-ban-reason").value.trim();
    const isBanned  = !!banReason;
    try {
      await update(ref(db,`users/${editUid}`),{username,balance,miningPower:power,maxMiningDuration:duration,isBanned,banReason:banReason||""});
      setMsg("edit-msg","✅ تم الحفظ","ok"); toast("تم تحديث المستخدم ✅");
      setTimeout(()=>closeModal("edit-modal"),1200);
    } catch(e){setMsg("edit-msg","❌ "+e.message,"err");}
  };

  // ── Reward user ───────────────────────────────────────────────
  let rewardUid = null;
  window.openRewardModal = (uid) => {
    rewardUid = uid;
    document.getElementById("reward-amount").value = "";
    document.getElementById("reward-reason").value = "";
    setMsg("reward-msg","","");
    document.getElementById("reward-modal").style.display="flex";
  };

  window.saveReward = async () => {
    if (!rewardUid) return;
    const amount = parseFloat(document.getElementById("reward-amount").value)||0;
    if (amount<=0){setMsg("reward-msg","أدخل مبلغاً صحيحاً","err");return;}
    try {
      await runTransaction(ref(db,`users/${rewardUid}/balance`),bal=>Math.round(((bal||0)+amount)*1e6)/1e6);
      setMsg("reward-msg",`✅ تم منح α${amount}`,"ok"); toast("تم منح المكافأة ✅");
      setTimeout(()=>closeModal("reward-modal"),1200);
    } catch(e){setMsg("reward-msg","❌ "+e.message,"err");}
  };

  // ── Bulk reward ───────────────────────────────────────────────
  window.executeBulkReward = async () => {
    const amount = parseFloat(document.getElementById("bulk-amount").value)||0;
    const scope  = document.getElementById("bulk-scope").value;
    if (amount<=0){setMsg("bulk-msg","أدخل مبلغاً صحيحاً","err");return;}
    setMsg("bulk-msg","⏳ جار التنفيذ…","info");
    let users = Object.entries(allUsers);
    if (scope === "active") {
      const week = Date.now()-7*86400000;
      users = users.filter(([,u])=>(u.lastClaimTime||0)>week);
    }
    let count=0;
    try {
      for (const [uid] of users) {
        await runTransaction(ref(db,`users/${uid}/balance`),bal=>Math.round(((bal||0)+amount)*1e6)/1e6);
        count++;
      }
      setMsg("bulk-msg",`✅ تم منح α${amount} لـ ${count} مستخدم`,"ok");
      toast(`✅ مكافأة جماعية: ${count} مستخدم`);
      setTimeout(()=>closeModal("bulk-modal"),2000);
    } catch(e){setMsg("bulk-msg","❌ "+e.message,"err");}
  };

  // ── Ban / Unban / Delete ──────────────────────────────────────
  window.toggleBan = async (uid, ban) => {
    const reason = ban ? (prompt("سبب الحظر:") || "مخالفة قوانين الاستخدام") : "";
    try {
      await update(ref(db,`users/${uid}`),{isBanned:ban,banReason:reason});
      toast(ban?"🚫 تم الحظر":"✅ تم رفع الحظر");
    } catch(e){toast("❌ "+e.message,"err");}
  };

  window.deleteUser = async (uid) => {
    if (!confirm("حذف هذا المستخدم نهائياً؟")) return;
    try { await remove(ref(db,`users/${uid}`)); toast("🗑 تم الحذف"); }
    catch(e){toast("❌ "+e.message,"err");}
  };

  // ── Export CSV ────────────────────────────────────────────────
  window.exportCSV = () => {
    const rows=[["UID","الاسم","البريد","الرصيد","Streak","تاريخ التسجيل","الحالة"]];
    Object.entries(allUsers).forEach(([uid,u])=>{
      rows.push([uid,u.username||"",u.email||"",(u.balance||0).toFixed(6),u.streak||0,
        u.joinedAt?new Date(u.joinedAt).toLocaleDateString("ar-SA"):"",
        u.isBanned?"محظور":"نشط"]);
    });
    const csv="\uFEFF"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");
    a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download="alphacoin_users_"+new Date().toISOString().slice(0,10)+".csv";
    a.click(); toast("📤 تم تصدير CSV");
  };

  // ── Dashboard ─────────────────────────────────────────────────
  let chartInstance = null;
  function buildDashboard() {
    const users = Object.values(allUsers);
    const today = new Date().toISOString().slice(0,10);
    const totalBal = users.reduce((s,u)=>s+(u.balance||0),0);
    const activeToday = users.filter(u=>u.lastLoginDate===today).length;
    const bannedCount = users.filter(u=>u.isBanned).length;
    document.getElementById("stat-total-users").textContent = users.length;
    document.getElementById("stat-total-balance").textContent = totalBal.toFixed(2);
    document.getElementById("stat-active-today").textContent = activeToday;
    document.getElementById("stat-banned").textContent = bannedCount;

    // Top 5 by balance
    const top5 = [...users].sort((a,b)=>(b.balance||0)-(a.balance||0)).slice(0,5);
    const topEl = document.getElementById("top-users-list");
    if (topEl) topEl.innerHTML = top5.map((u,i)=>
      `<div class="item-row"><span class="item-name">${["🥇","🥈","🥉","4️⃣","5️⃣"][i]} ${escHtml(u.username||"—")}</span>
      <span class="item-meta">α ${(u.balance||0).toFixed(4)}</span></div>`
    ).join("");

    // Chart: users joined per day last 7 days
    const days=[], counts=[];
    for(let i=6;i>=0;i--){
      const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10);
      days.push(d.slice(5));
      counts.push(users.filter(u=>u.joinedAt&&new Date(u.joinedAt).toISOString().slice(0,10)===d).length);
    }
    const ctx=document.getElementById("chart-users");
    if(ctx){
      if(chartInstance) chartInstance.destroy();
      chartInstance=new Chart(ctx,{
        type:"bar",
        data:{labels:days,datasets:[{label:"مستخدمون جدد",data:counts,backgroundColor:"rgba(240,180,41,.5)",borderColor:"#f0b429",borderWidth:1,borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#a0a0b8",font:{family:"Cairo"}}}},scales:{x:{ticks:{color:"#a0a0b8"}},y:{ticks:{color:"#a0a0b8"},beginAtZero:true}}}
      });
    }
  }

  // ── Admin Leaderboard ─────────────────────────────────────────
  async function loadAdminLeaderboard() {
    const el = document.getElementById("admin-leaderboard-list");
    if (!el) return;
    el.innerHTML="<div style='color:var(--text3);font-size:.85rem'>جار التحميل…</div>";
    const q = query(ref(db,"users"),orderByChild("balance"),limitToLast(20));
    const snap = await get(q);
    const users=[];
    if(snap.exists()) snap.forEach(c=>users.push({uid:c.key,...c.val()}));
    users.sort((a,b)=>(b.balance||0)-(a.balance||0));
    el.innerHTML=users.map((u,i)=>`
      <div class="item-row">
        <span class="item-name">${["🥇","🥈","🥉"][i]||(i+1+".")} ${escHtml(u.username||"—")}</span>
        <span class="item-meta" style="color:var(--text2)">${escHtml(u.email||"")}</span>
        <span class="item-meta" style="color:var(--gold);font-family:'Orbitron',monospace">α${(u.balance||0).toFixed(4)}</span>
        <button class="btn-action btn-gold" style="padding:.25rem .6rem;font-size:.7rem" onclick="openRewardModal('${u.uid}')">🎁</button>
      </div>`).join("");
  }

  // ── Settings ──────────────────────────────────────────────────
  function listenSettings() {
    onValue(ref(db,"settings"), snap => {
      const s = snap.exists() ? snap.val() : {};
      // Maintenance
      const mEl = document.getElementById("maintenance-toggle");
      const mmEl= document.getElementById("maintenance-msg-inp");
      if(mEl) mEl.checked = !!(s.maintenance?.enabled);
      if(mmEl) mmEl.value = s.maintenance?.message || "";
      // Announcement
      const aEl = document.getElementById("ann-toggle");
      const atEl= document.getElementById("ann-text");
      const ayEl= document.getElementById("ann-type");
      if(aEl) aEl.checked = !!(s.announcement?.enabled);
      if(atEl) atEl.value = s.announcement?.message || "";
      if(ayEl) ayEl.value = s.announcement?.type || "info";
      // Daily bonus
      const dbEl  = document.getElementById("daily-toggle");
      const dbBase= document.getElementById("daily-base");
      const dbMul = document.getElementById("daily-multiplier");
      const dbMax = document.getElementById("daily-maxstreak");
      if(dbEl)   dbEl.checked  = s.dailyBonus?.enabled !== false;
      if(dbBase) dbBase.value  = s.dailyBonus?.baseAmount ?? 5;
      if(dbMul)  dbMul.value   = s.dailyBonus?.streakMultiplier ?? 1.2;
      if(dbMax)  dbMax.value   = s.dailyBonus?.maxStreak ?? 30;
      updateDailyPreview();
      // Referral
      const rEl  = document.getElementById("ref-toggle");
      const rRer = document.getElementById("ref-referrer");
      const rRee = document.getElementById("ref-referee");
      if(rEl)  rEl.checked = s.referral?.enabled !== false;
      if(rRer) rRer.value  = s.referral?.referrerReward ?? 20;
      if(rRee) rRee.value  = s.referral?.refereeReward  ?? 10;
    });
  }

  let saveSettingsTimer = null;
  function debounceSave(fn) {
    clearTimeout(saveSettingsTimer);
    saveSettingsTimer = setTimeout(fn, 800);
  }

  window.saveMaintenanceSetting = () => debounceSave(async () => {
    const enabled = document.getElementById("maintenance-toggle")?.checked || false;
    const message = document.getElementById("maintenance-msg-inp")?.value || "";
    try {
      await update(ref(db,"settings/maintenance"),{enabled,message});
      setMsg("maintenance-save-msg","✅ تم الحفظ تلقائياً","ok");
    } catch(e){setMsg("maintenance-save-msg","❌ "+e.message,"err");}
  });

  window.saveAnnouncementSetting = () => debounceSave(async () => {
    const enabled = document.getElementById("ann-toggle")?.checked || false;
    const message = document.getElementById("ann-text")?.value || "";
    const type    = document.getElementById("ann-type")?.value || "info";
    try {
      await update(ref(db,"settings/announcement"),{enabled,message,type});
      setMsg("ann-save-msg","✅ تم الحفظ تلقائياً","ok");
    } catch(e){setMsg("ann-save-msg","❌ "+e.message,"err");}
  });

  window.saveDailySettings = () => debounceSave(async () => {
    const enabled = document.getElementById("daily-toggle")?.checked !== false;
    const base    = parseFloat(document.getElementById("daily-base")?.value)||5;
    const mul     = parseFloat(document.getElementById("daily-multiplier")?.value)||1.2;
    const maxS    = parseInt(document.getElementById("daily-maxstreak")?.value)||30;
    try {
      await update(ref(db,"settings/dailyBonus"),{enabled,baseAmount:base,streakMultiplier:mul,maxStreak:maxS});
      setMsg("daily-save-msg","✅ تم الحفظ تلقائياً","ok");
      updateDailyPreview();
    } catch(e){setMsg("daily-save-msg","❌ "+e.message,"err");}
  });

  function updateDailyPreview() {
    const base = parseFloat(document.getElementById("daily-base")?.value)||5;
    const mul  = parseFloat(document.getElementById("daily-multiplier")?.value)||1.2;
    const el   = document.getElementById("daily-preview");
    if (!el) return;
    const d1  = (base * Math.pow(mul,0)).toFixed(4);
    const d5  = (base * Math.pow(mul,4)).toFixed(4);
    const d10 = (base * Math.pow(mul,9)).toFixed(4);
    el.textContent = `يوم 1: α${d1} | يوم 5: α${d5} | يوم 10: α${d10}`;
  }

  window.saveReferralSettings = () => debounceSave(async () => {
    const enabled  = document.getElementById("ref-toggle")?.checked !== false;
    const referrer = parseFloat(document.getElementById("ref-referrer")?.value)||20;
    const referee  = parseFloat(document.getElementById("ref-referee")?.value)||10;
    try {
      await update(ref(db,"settings/referral"),{enabled,referrerReward:referrer,refereeReward:referee});
      setMsg("ref-save-msg","✅ تم الحفظ تلقائياً","ok");
    } catch(e){setMsg("ref-save-msg","❌ "+e.message,"err");}
  });

  // ── Referral stats ────────────────────────────────────────────
  async function loadReferralStats() {
    const el = document.getElementById("referral-stats");
    if (!el) return;
    const snap = await get(ref(db,"referrals"));
    if (!snap.exists()) { el.innerHTML="<div style='color:var(--text3);font-size:.85rem'>لا توجد بيانات إحالة بعد</div>"; return; }
    let totalReferrals=0, topReferrer="—", topCount=0;
    snap.forEach(r => {
      const d=r.val();
      const count=d.usedBy?Object.keys(d.usedBy).length:0;
      totalReferrals+=count;
      if(count>topCount){topCount=count;topReferrer=d.ownerName||"—";}
    });
    el.innerHTML=`
      <div class="stats-grid" style="margin:0">
        <div class="stat-card"><div class="val">${totalReferrals}</div><div class="lbl">إجمالي الإحالات</div></div>
        <div class="stat-card"><div class="val" style="font-size:.9rem">${escHtml(topReferrer)}</div><div class="lbl">أكثر مُحيل (${topCount})</div></div>
      </div>`;
  }

  // ── COUPONS ───────────────────────────────────────────────────
  let allCoupons = {};
  function listenCoupons() {
    onValue(ref(db,"coupons"), snap => {
      allCoupons = {};
      if (snap.exists()) snap.forEach(c => { allCoupons[c.key] = c.val(); });
      renderCoupons();
    });
  }

  window.createCoupon = async () => {
    const code   = document.getElementById("coup-code")?.value?.trim().toUpperCase();
    const reward = parseFloat(document.getElementById("coup-reward")?.value)||0;
    const maxU   = parseInt(document.getElementById("coup-max")?.value)||0;
    if (!code) { setMsg("coup-create-msg","أدخل كود الكوبون","err"); return; }
    if (!reward) { setMsg("coup-create-msg","أدخل مكافأة صحيحة","err"); return; }
    try {
      await set(ref(db,`coupons/${code}`),{reward,maxUses:maxU,active:true,createdAt:Date.now(),usedBy:{}});
      setMsg("coup-create-msg","✅ تم إنشاء الكوبون","ok"); toast("تم إنشاء الكوبون ✅");
      document.getElementById("coup-code").value="";
      document.getElementById("coup-reward").value="";
    } catch(e){setMsg("coup-create-msg","❌ "+e.message,"err");}
  };

  function renderCoupons() {
    const el = document.getElementById("coupons-list");
    if (!el) return;
    const entries = Object.entries(allCoupons).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
    if (!entries.length) { el.innerHTML="<div style='color:var(--text3);font-size:.85rem;padding:.8rem'>لا توجد كوبونات</div>"; return; }
    el.innerHTML = entries.map(([code,c])=>{
      const uses=c.usedBy?Object.keys(c.usedBy).length:0;
      return `<div class="item-row">
        <span class="item-name" style="font-family:'Orbitron',monospace;font-size:.82rem">${escHtml(code)}</span>
        <span class="item-meta">α${c.reward} | ${uses}${c.maxUses>0?" / "+c.maxUses:""} استخدام</span>
        <button class="btn-action ${c.active?"btn-red":"btn-green"}" style="padding:.25rem .6rem;font-size:.7rem"
          onclick="toggleCoupon('${code}',${!c.active})">${c.active?"⏸ تعطيل":"▶ تفعيل"}</button>
        <button class="btn-action btn-red" style="padding:.25rem .6rem;font-size:.7rem"
          onclick="deleteCoupon('${code}')">🗑</button>
      </div>`;
    }).join("");
  }

  window.toggleCoupon = async (code, active) => {
    try { await update(ref(db,`coupons/${code}`),{active}); toast(active?"▶ تم التفعيل":"⏸ تم التعطيل"); }
    catch(e){toast("❌ "+e.message,"err");}
  };
  window.deleteCoupon = async (code) => {
    if (!confirm("حذف الكوبون؟")) return;
    try { await remove(ref(db,`coupons/${code}`)); toast("🗑 تم الحذف"); }
    catch(e){toast("❌ "+e.message,"err");}
  };

  // ── CARDS ─────────────────────────────────────────────────────
  let allCards = {};
  const CARD_COLORS = {
    gold:  {bg:"linear-gradient(135deg,#1a1505,#2a2008)",border:"#f0b429",accent:"#f0b429"},
    blue:  {bg:"linear-gradient(135deg,#050d1a,#08163a)",border:"#00d4ff",accent:"#00d4ff"},
    green: {bg:"linear-gradient(135deg,#051a0d,#072a12)",border:"#22c55e",accent:"#22c55e"},
    purple:{bg:"linear-gradient(135deg,#120518,#1c0830)",border:"#a855f7",accent:"#a855f7"},
    red:   {bg:"linear-gradient(135deg,#1a0505,#2a0808)",border:"#ef4444",accent:"#ef4444"},
  };

  function setDefaultCardTimes() {
    const now=new Date(), end=new Date(now.getTime()+86400000);
    const fmt=d=>d.toISOString().slice(0,16);
    const si=document.getElementById("card-start"), ei=document.getElementById("card-end");
    if(si)si.value=fmt(now); if(ei)ei.value=fmt(end);
  }

  function listenCards() {
    onValue(ref(db,"cards"), snap => {
      allCards={};
      if(snap.exists()) snap.forEach(c=>{allCards[c.key]=c.val();});
      renderCardsList();
    });
  }

  function readCardForm() {
    return {
      title:       document.getElementById("card-title")?.value||"بطاقة عرض",
      description: document.getElementById("card-desc")?.value||"",
      reward:      parseFloat(document.getElementById("card-reward")?.value)||10,
      icon:        document.getElementById("card-icon")?.value||"🎁",
      color:       document.getElementById("card-color")?.value||"gold",
      maxUses:     parseInt(document.getElementById("card-max-uses")?.value)||0,
      startTime:   new Date(document.getElementById("card-start")?.value).getTime()||Date.now(),
      endTime:     new Date(document.getElementById("card-end")?.value).getTime()||(Date.now()+86400000),
      isActive:    true, createdAt:Date.now(), claimedBy:{}
    };
  }

  document.getElementById("preview-card-btn")?.addEventListener("click", () => {
    const card=readCardForm(), col=CARD_COLORS[card.color||"gold"];
    const wrap=document.getElementById("card-preview-wrap");
    if(!wrap)return;
    wrap.style.display="block";
    wrap.innerHTML=`<div class="price-card live" style="max-width:240px;background:${col.bg};border-color:${col.border}">
      <div class="pc-header"><span class="pc-icon">${card.icon}</span><span class="pc-status live">● متاحة</span></div>
      <div class="pc-title" style="color:${col.accent}">${escHtml(card.title)}</div>
      <div class="pc-desc">${escHtml(card.description)}</div>
      <div class="pc-reward" style="color:${col.accent}">+α${card.reward.toFixed(4)}</div>
    </div>`;
  });

  document.getElementById("create-card-btn")?.addEventListener("click", async function() {
    const editId=this.dataset.editId;
    const card=readCardForm();
    if (!card.title){setMsg("card-create-msg","أدخل عنوان البطاقة","err");return;}
    if (!card.reward){setMsg("card-create-msg","أدخل مكافأة صحيحة","err");return;}
    if (card.endTime<=card.startTime){setMsg("card-create-msg","وقت الانتهاء يجب أن يكون بعد وقت البداية","err");return;}
    if (editId) {
      try {
        await update(ref(db,`cards/${editId}`),{title:card.title,description:card.description,reward:card.reward,icon:card.icon,color:card.color,maxUses:card.maxUses,startTime:card.startTime,endTime:card.endTime});
        setMsg("card-create-msg","✅ تم تحديث البطاقة!","ok"); toast("تم التحديث ✅");
        cancelCardEdit();
      } catch(e){setMsg("card-create-msg","❌ "+e.message,"err");}
    } else {
      try {
        await set(ref(db,"cards/card_"+Date.now()),card);
        setMsg("card-create-msg","✅ تم إنشاء البطاقة!","ok"); toast("تم إنشاء البطاقة ✅");
        ["card-title","card-desc","card-reward","card-icon"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
        document.getElementById("card-max-uses").value="0";
        document.getElementById("card-preview-wrap").style.display="none";
      } catch(e){setMsg("card-create-msg","❌ "+e.message,"err");}
    }
  });

  window.editCard = (cardId) => {
    const c=allCards[cardId]; if(!c)return;
    document.getElementById("card-title").value   =c.title||"";
    document.getElementById("card-desc").value    =c.description||"";
    document.getElementById("card-reward").value  =c.reward||"";
    document.getElementById("card-icon").value    =c.icon||"🎁";
    document.getElementById("card-color").value   =c.color||"gold";
    document.getElementById("card-max-uses").value=c.maxUses||0;
    const fmt=ts=>ts?new Date(ts).toISOString().slice(0,16):"";
    document.getElementById("card-start").value=fmt(c.startTime);
    document.getElementById("card-end").value  =fmt(c.endTime);
    const btn=document.getElementById("create-card-btn");
    btn.textContent="💾 تحديث البطاقة"; btn.dataset.editId=cardId;
    document.getElementById("cancel-edit-btn").style.display="inline-flex";
    document.getElementById("card-create-form-wrap")?.scrollIntoView({behavior:"smooth"});
    setMsg("card-create-msg","عدّل البيانات ثم اضغط تحديث البطاقة","info");
    showSection("cards");
  };

  window.cancelCardEdit = () => {
    const btn=document.getElementById("create-card-btn");
    btn.textContent="➕ إنشاء البطاقة"; delete btn.dataset.editId;
    document.getElementById("cancel-edit-btn").style.display="none";
    setMsg("card-create-msg","","");
  };

  window.toggleCard = async (cardId,isActive) => {
    try { await update(ref(db,`cards/${cardId}`),{isActive}); toast(isActive?"▶ تم التفعيل":"⏸ تم التعطيل"); }
    catch(e){toast("❌ "+e.message,"err");}
  };

  window.deleteCard = async (cardId) => {
    if (!confirm("حذف البطاقة نهائياً؟")) return;
    try { await remove(ref(db,`cards/${cardId}`)); toast("🗑 تم حذف البطاقة"); }
    catch(e){toast("❌ "+e.message,"err");}
  };

  function renderCardsList() {
    const el=document.getElementById("cards-list"); if(!el)return;
    const entries=Object.entries(allCards).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
    if(!entries.length){el.innerHTML="<div style='color:var(--text3);font-size:.85rem;padding:.8rem'>لا توجد بطاقات</div>";return;}
    const now=Date.now();
    el.innerHTML=entries.map(([id,c])=>{
      const col=CARD_COLORS[c.color||"gold"];
      const uses=c.claimedBy?Object.keys(c.claimedBy).length:0;
      const maxU=c.maxUses||0;
      const isLive=c.isActive&&now>=(c.startTime||0)&&now<=(c.endTime||Infinity)&&(maxU===0||uses<maxU);
      const endStr=c.endTime?new Date(c.endTime).toLocaleString("ar-SA",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
      return `<div class="price-card ${isLive?"live":"inactive"}" style="background:${col.bg};border-color:${col.border};margin-bottom:.7rem">
        <div class="pc-header">
          <span class="pc-icon">${c.icon||"🎁"}</span>
          <div class="pc-status-wrap">
            <span class="pc-status ${isLive?"live":"off"}">${isLive?"● مباشر":"◌ غير نشط"}</span>
            <span class="pc-uses">${uses}${maxU>0?" / "+maxU:""} استخدام</span>
          </div>
        </div>
        <div class="pc-title" style="color:${col.accent}">${escHtml(c.title||"")}</div>
        <div class="pc-reward" style="color:${col.accent}">+α${(c.reward||0).toFixed(4)}</div>
        <div class="pc-time-row">⏰ ينتهي: ${endStr}</div>
        <div class="pc-admin-actions">
          <button class="btn-action ${c.isActive?"btn-red":"btn-green"}" style="padding:.3rem .7rem;font-size:.75rem"
            onclick="toggleCard('${id}',${!c.isActive})">${c.isActive?"⏸ تعطيل":"▶ تفعيل"}</button>
          <button class="btn-action btn-blue" style="padding:.3rem .7rem;font-size:.75rem"
            onclick="editCard('${id}')">✏️ تعديل</button>
          <button class="btn-action btn-red" style="padding:.3rem .7rem;font-size:.75rem"
            onclick="deleteCard('${id}')">🗑️ حذف</button>
        </div>
      </div>`;
    }).join("");
  }
  