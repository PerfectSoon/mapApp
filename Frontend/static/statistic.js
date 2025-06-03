// statistic.js
document.addEventListener('DOMContentLoaded', async () => {
  // 0. Подготовка: инициализируем chart до всего остального
  const canvas = document.getElementById('comparisonChart');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    window.comparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          { label: 'pH',                data: [], backgroundColor: 'rgba(54,162,235,0.7)' },
          { label: 'Количество видов',  data: [], backgroundColor: 'rgba(255,159,64,0.7)' },
          { label: 'Индекс биоразнообразия', data: [], backgroundColor: 'rgba(75,192,192,0.7)' },
          { label: 'Глубина',           data: [], backgroundColor: 'rgba(153,102,255,0.7)' }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { title: { display: true, text: 'Название водоёма' } },
          y: { beginAtZero: true,       title: { display: true, text: 'Значения' } }
        }
      }
    });
  }

  // 1. Проверка токена
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.replace("login.html");
    return;
  }

  // 2. Header-кнопки
  const loginBtn   = document.getElementById("loginBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn  = document.getElementById("logoutBtn");
  if (loginBtn)   loginBtn.style.display   = "none";
  if (profileBtn) profileBtn.style.display = "block";
  if (logoutBtn)  logoutBtn.style.display  = "inline-block";

  profileBtn?.addEventListener("click", () => {
    const modal = document.getElementById("profileModal");
    if (modal) modal.style.display = "block";
    fetchProfile();
  });
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("access_token");
    window.location.replace("login.html");
  });

  // 3. Загрузка всех водоёмов
  let allWaterBodies = [];
  try {
    allWaterBodies = await Common.fetchData("/water_bodies/search", {
      headers: { "Authorization": "Bearer " + token }
    });
  } catch (err) {
    console.error("Не удалось загрузить водоёмы:", err);
    return alert("Ошибка загрузки данных");
  }

  // 4. Переменные фильтра/сортировки
  let filteredData = [...allWaterBodies];
  let sortState = { column: null, direction: "asc" };

  // 5. Инициализация UI
  updateFilters(allWaterBodies);
  updateInfoSection(filteredData);
  updateTable(filteredData);
  initSorting();
  compareSelectedWaterBodies();

  // 6. Навешиваем события
  document.getElementById("applyFilterBtn")?.addEventListener("click", filterAndRender);
  document.getElementById("resetFilterBtn")?.addEventListener("click", () => {
    document.getElementById("typeFilter").value   = "";
    document.getElementById("regionFilter").value = "";
    document.getElementById("phFilter").value     = "";
    document.getElementById("searchInput").value  = "";
    filteredData = [...allWaterBodies];
    sortState = { column: null, direction: "asc" };
    clearSortIndicators();
    updateInfoSection(filteredData);
    updateTable(filteredData);
    compareSelectedWaterBodies();
  });
  document.getElementById("waterBodyData")?.addEventListener("change", event => {
    if (event.target.matches("input[type=checkbox]")) {
      compareSelectedWaterBodies();
    }
  });
  document.getElementById("statisticBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // 7. Экспорт через common.js
  Common.initExport({
    btnId:            "exportBtn",
    modalId:          "exportModal",
    listId:           "exportList",
    searchId:         "exportSearch",
    closeBtnId:       "export-modal-close",
    cancelBtnId:      "exportCancelBtn",
    confirmBtnId:     "exportConfirmBtn",
    fetchListEndpoint:"/water_bodies/search",
    exportEndpoint:   "/export/json",
    authHeaderFactory:() => ({
      "Authorization": "Bearer " + localStorage.getItem("access_token")
    })
  });

  // --- Функции ниже ---

  function fetchProfile() {
    Common.fetchData("/auth/profile", {
      headers: { "Authorization": "Bearer " + token }
    })
    .then(data => {
      const emailEl = document.getElementById("profileEmail");
      const roleEl  = document.getElementById("profileRole");
      if (emailEl) emailEl.textContent = data.email;
      if (roleEl)  roleEl.textContent = formatRole(data.role);
    })
    .catch(err => {
      console.warn("fetchProfile:", err);
      if (err.message.includes("401") || err.message.includes("403")) {
        localStorage.removeItem("access_token");
        alert("Сессия истекла, войдите снова.");
        window.location.replace("login.html");
      }
    });
  }

  function formatRole(r) {
    if (r === "admin")      return "Администратор";
    if (r === "scientific") return "Научный сотрудник";
    if (r === "user")       return "Гость";
    return r || "неизвестно";
  }

  function updateFilters(data) {
    const types   = [...new Set(data.map(wb => wb.type?.name || wb.type))].filter(Boolean);
    const regions = [...new Set(data.map(wb => wb.region?.name || wb.region))].filter(Boolean);
    document.getElementById("typeFilter").innerHTML = `<option value="">Все типы</option>` +
      types.map(t => `<option>${t}</option>`).join("");
    document.getElementById("regionFilter").innerHTML = `<option value="">Все регионы</option>` +
      regions.map(r => `<option>${r}</option>`).join("");
    document.getElementById("phFilter").innerHTML = `
      <option value="">Все значения</option>
      <option value="acidic">Кислые (pH < 6.5)</option>
      <option value="neutral">Нейтральные (6.5–7.5)</option>
      <option value="alkaline">Щелочные (pH > 7.5)</option>
    `;
  }

  function updateInfoSection(data) {
    const total = data.length;
    const avg = total
      ? (data.reduce((s, wb) => s + (wb.biodiversity_index || 0), 0) / total).toFixed(2)
      : 0;
    const speciesSet = new Set();
    data.forEach(wb => (wb.organisms || []).forEach(o => speciesSet.add(o.id)));
    document.querySelector('.info-card:nth-child(1) .info-value').textContent = total.toLocaleString("ru-RU");
    document.querySelector('.info-card:nth-child(2) .info-value').textContent = avg;
    document.querySelector('.info-card:nth-child(3) .info-value').textContent = speciesSet.size.toLocaleString("ru-RU");
  }

  function updateTable(data) {
    filteredData = data;
    const tbody = document.getElementById("waterBodyData");
    tbody.innerHTML = "";
    const dict = { great:"Отличный", good:"Хороший", avg:"Средний", low:"Низкий" };
    data.forEach(wb => {
      const typeName = wb.type?.name || wb.type || "";
      const region   = wb.region?.name || wb.region || "";
      const species  = (wb.organisms || []).length;
      const raw      = (wb.ecological_status || "").toLowerCase();
      const key      = dict[raw] ? raw : Object.entries(dict).find(([,v]) => v.toLowerCase()===raw)?.[0] || raw;
      const text     = dict[key] || raw;
      const cls      = `status-${key}`;
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><input type="checkbox" value="${wb.id}"></td>
        <td>${wb.name}</td>
        <td>${typeName}</td>
        <td>${region}</td>
        <td>${wb.ph}</td>
        <td>${species}</td>
        <td>${wb.biodiversity_index ?? ""}</td>
        <td><span class="status-badge ${cls}">${text}</span></td>
      `;
    });
    document.querySelector(".data-count").innerText = `(всего: ${data.length})`;
  }

  function initSorting() {
    document.querySelectorAll("th.sortable").forEach(th => {
      th.addEventListener("click", () => {
        const col = +th.dataset.column;
        if (sortState.column === col) {
          sortState.direction = sortState.direction==="asc" ? "desc" : "asc";
        } else {
          sortState.column = col;
          sortState.direction = "asc";
        }
        clearSortIndicators();
        th.classList.add(`sorted-${sortState.direction}`);
        applySort();
      });
    });
  }

  function clearSortIndicators() {
    document.querySelectorAll("th.sortable").forEach(th => {
      th.classList.remove("sorted-asc","sorted-desc");
    });
  }

  function applySort() {
    const sorted = [...filteredData].sort((a,b) => {
      let aV=0, bV=0;
      switch(sortState.column) {
        case 4: aV = +a.ph; bV = +b.ph; break;
        case 5: aV = (a.organisms||[]).length; bV = (b.organisms||[]).length; break;
        case 6: aV = +a.biodiversity_index||0; bV = +b.biodiversity_index||0; break;
      }
      return sortState.direction==="asc" ? aV - bV : bV - aV;
    });
    updateTable(sorted);
  }

  function filterAndRender() {
    const t = document.getElementById("typeFilter").value;
    const r = document.getElementById("regionFilter").value;
    const p = document.getElementById("phFilter").value;
    const q = document.getElementById("searchInput").value.trim().toLowerCase();

    filteredData = allWaterBodies.filter(wb => {
      if (t && (wb.type?.name||wb.type) !== t) return false;
      if (r && (wb.region?.name||wb.region) !== r) return false;
      const phv = +wb.ph;
      if (p==="acidic"   && phv>=6.5) return false;
      if (p==="neutral"  && (phv<6.5||phv>7.5)) return false;
      if (p==="alkaline" && phv<=7.5) return false;
      if (q && !wb.name.toLowerCase().includes(q)) return false;
      return true;
    });
    sortState = { column: null, direction: "asc" };
    clearSortIndicators();
    updateInfoSection(filteredData);
    updateTable(filteredData);
    compareSelectedWaterBodies();
  }

  async function compareSelectedWaterBodies() {
    const ids = Array.from(document.querySelectorAll('#waterBodyData input:checked'))
                     .map(cb => +cb.value);
    const chart = window.comparisonChart;
    if (!chart) return;
    if (!ids.length) {
      chart.data.labels = [];
      chart.data.datasets.forEach(ds => ds.data = []);
      return chart.update();
    }
    try {
      const resp = await Common.fetchData("/statistics/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ water_body_ids: ids })
      });
      chart.data.labels = resp.map(wb => wb.name);
      chart.data.datasets[0].data = resp.map(wb => wb.ph);
      chart.data.datasets[1].data = resp.map(wb =>
        wb.organisms_count != null ? wb.organisms_count : (wb.organisms||[]).length
      );
      chart.data.datasets[2].data = resp.map(wb => wb.biodiversity_index);
      chart.data.datasets[3].data = resp.map(wb => wb.depth);
      chart.update();
    } catch (err) {
      console.error("Ошибка сравнения:", err);
    }
  }
});
