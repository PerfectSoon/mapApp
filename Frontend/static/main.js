// main.js
document.addEventListener('DOMContentLoaded', () => {
  // 1. Проверка авторизации
  const token = localStorage.getItem("access_token");
  if (!token) {
    return window.location.replace("login.html");
  }

  // 2. Скрываем/показываем кнопки из header
  const loginBtn   = document.getElementById("loginBtn");
  const profileBtn = document.getElementById("profileBtn");
  if (loginBtn)   loginBtn.style.display   = "none";
  if (profileBtn) profileBtn.style.display = "block";

  // 3. Обработчики профиля/выхода
  profileBtn?.addEventListener("click", () => {
    const modal = document.getElementById("profileModal");
    modal && (modal.style.display = "block");
    fetchProfile();
  });
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("access_token");
    window.location.replace("login.html");
  });

  // 4. Инициализация карты
  const map = L.map('map').setView([55.751244, 37.618423], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  let markers = [];

  // 5. Фильтры
  const typeFilter   = document.getElementById('typeFilter');
  const regionFilter = document.getElementById('regionFilter');
  const phFilter     = document.getElementById('phFilter');
  const fishFilter   = document.getElementById('fishFilter');
  const searchInput  = document.getElementById('searchInput');
  document.getElementById('applyFilterBtn')?.addEventListener('click', filterWaterBodies);
  document.getElementById('resetFilterBtn')?.addEventListener('click', () => {
    [typeFilter, regionFilter, phFilter, fishFilter].forEach(f => f.value = '');
    searchInput.value = '';
    filterWaterBodies();
  });

  let allWaterBodies = [];

  // 6. Загрузка данных и первичный рендер
  async function loadWaterBodies() {
    try {
      allWaterBodies = await Common.fetchData('/water_bodies/search', {
        headers: { Authorization: 'Bearer ' + token }
      });
      updateFilters();
      renderMap(allWaterBodies);
    } catch (err) {
      console.error('Ошибка загрузки водоёмов:', err);
      alert('Не удалось загрузить данные водоёмов');
    }
  }
  loadWaterBodies();

  // 7. Обновление фильтров по загруженным данным
  function updateFilters() {
    const types   = [...new Set(allWaterBodies.map(w => w.type?.name).filter(Boolean))];
    const regions = [...new Set(allWaterBodies.map(w => w.region?.name).filter(Boolean))];
    const fishes  = [...new Set(allWaterBodies.flatMap(w => w.organisms?.map(o => o.name) || []))];

    if (typeFilter) {
      typeFilter.innerHTML = `<option value="">Все типы</option>${
        types.map(t => `<option>${t}</option>`).join('')
      }`;
    }
    if (regionFilter) {
      regionFilter.innerHTML = `<option value="">Все регионы</option>${
        regions.map(r => `<option>${r}</option>`).join('')
      }`;
    }
    if (fishFilter) {
      fishFilter.innerHTML = `<option value="">Все виды</option>${
        fishes.map(f => `<option>${f}</option>`).join('')
      }`;
    }
  }

  // 8. Применение фильтров
  function filterWaterBodies() {
    const t = typeFilter?.value;
    const r = regionFilter?.value;
    const p = phFilter?.value;
    const f = fishFilter?.value;
    const q = searchInput?.value.trim().toLowerCase() || '';

    const filtered = allWaterBodies.filter(wb => {
      if (t && wb.type?.name !== t) return false;
      if (r && wb.region?.name !== r) return false;
      if (p) {
        const ph = parseFloat(wb.ph);
        if (p === 'acidic'   && ph >= 6.5)              return false;
        if (p === 'neutral'  && (ph < 6.5 || ph > 7.5)) return false;
        if (p === 'alkaline' && ph <= 7.5)              return false;
      }
      if (f && !wb.organisms?.some(o => o.name === f)) return false;
      if (q && !wb.name.toLowerCase().includes(q))     return false;
      return true;
    });

    renderMap(filtered);
  }

  // 9. Рендер карты и боковой панели
  function renderMap(list) {
    // Снимаем старые маркеры
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    const panel = document.getElementById('waterBodyList');
    panel && (panel.innerHTML = '');

    if (!list.length) {
      panel && (panel.innerHTML = '<p>Ничего не найдено</p>');
      return;
    }

    const bounds = L.latLngBounds();
    list.forEach(wb => {
      // Панель
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h2>${wb.name}</h2>
        <ul>
          <li>Тип: ${wb.type?.name || '—'}</li>
          <li>Регион: ${wb.region?.name || '—'}</li>
          <li>Глубина: ${wb.depth || '—'} м</li>
        </ul>
      `;
      card.addEventListener('click', () => openDetailModal(wb));
      panel.appendChild(card);

      // Маркер
      if (wb.latitude && wb.longitude) {
        const m = L.marker([wb.latitude, wb.longitude]).addTo(map);
        m.bindPopup(`
          <b>${wb.name}</b><br>
          Тип: ${wb.type?.name || '—'}<br>
          Глубина: ${wb.depth || '—'} м<br>
          Рыбы: ${wb.organisms?.map(o => o.name).join(', ') || '—'}
        `);
        markers.push(m);
        bounds.extend([wb.latitude, wb.longitude]);
      }
    });

    if (markers.length) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // 10. Модалка детали водоёма
function openDetailModal(wb) {
  const modal = document.getElementById('modal');
  const body  = document.getElementById('modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <h2>${wb.name}</h2>
    <p><strong>Тип:</strong> ${wb.type?.name || '—'}</p>
    <p><strong>Регион:</strong> ${wb.region?.name || '—'}</p>
    <p><strong>Глубина:</strong> ${wb.depth || '—'} м</p>
    <p><strong>Координаты:</strong> ${wb.latitude}, ${wb.longitude}</p>
    <p><strong>Рыбы:</strong> ${wb.organisms?.map(o => o.name).join(', ') || '—'}</p>
  `;
  modal.style.display = 'block';
}

  const modalCloseBtn = document.getElementById('modal-close');
if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', () => {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
  });
}

// Закрытие модалки по клику вне содержимого
window.addEventListener('click', e => {
  const modal = document.getElementById('modal');
  if (modal && e.target === modal) {
    modal.style.display = 'none';
  }
});

  // 11. Логика профиля (общая)
  function fetchProfile() {
    const t = localStorage.getItem("access_token");
    fetch("/auth/profile", {
      headers: { Authorization: 'Bearer ' + t }
    })
    .then(res => {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("access_token");
        alert("Сессия истекла, войдите снова.");
        return window.location.replace("login.html");
      }
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then(data => {
      const emailEl = document.getElementById("profileEmail");
      const roleEl  = document.getElementById("profileRole");
      if (emailEl) emailEl.textContent = data.email;
      if (roleEl)  roleEl.textContent  = formatRole(data.role);
    })
    .catch(err => console.error("fetchProfile:", err));
  }
  function formatRole(r) {
    return r === "admin"      ? "Администратор"
         : r === "scientific" ? "Научный сотрудник"
         : r === "user"       ? "Гость"
         : r || "неизвестно";
  }

  // 12. Инициализация экспорта
  Common.initExport({
    btnId: 'exportBtn',
    modalId: 'exportModal',
    listId: 'exportList',
    searchId: 'exportSearch',
    closeBtnId: 'export-modal-close',
    cancelBtnId: 'exportCancelBtn',
    confirmBtnId: 'exportConfirmBtn',
    fetchListEndpoint: '/water_bodies/search',
    exportEndpoint: '/export/json',
    authHeaderFactory: () => ({
      Authorization: 'Bearer ' + localStorage.getItem('access_token')
    })
  });
});
