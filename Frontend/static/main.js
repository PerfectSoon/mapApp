document.addEventListener('DOMContentLoaded', async () => {
  // Инициализация карты Leaflet
  const map = L.map('map').setView([55.751244, 37.618423], 6); // Центр карты (например, Москва)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let allWaterBodies = [];  // Все водоёмы, полученные с сервера
  let markers = [];         // Текущие маркеры на карте
  let selectedType = "";    // Выбранный тип водоёма (пустая строка — все)

  // Функция для выполнения запроса и получения JSON-данных
  async function fetchData(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Ошибка запроса ${url}: ${response.statusText}`);
    }
    return await response.json();
  }

  // Функция для динамического создания кнопок фильтрации по типу водоёмов
  function populateTypeFilters() {
    const typeContainer = document.getElementById('typeFilterContainer');
    if (!typeContainer) return;

    typeContainer.innerHTML = "";

    // Кнопка "Все типы"
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn';
    allButton.textContent = "Все типы";
    allButton.dataset.type = "";
    allButton.addEventListener('click', function() {
        document.querySelectorAll('#typeFilterContainer .filter-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        filterWaterBodies();
    });
    typeContainer.appendChild(allButton);

    // Получаем уникальные типы
    const types = Array.from(new Set(allWaterBodies.map(wb => {
        return wb.type && wb.type.name ? wb.type.name : wb.type || '';
    }))).filter(v => v);

    types.forEach(type => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = type;
        btn.dataset.type = type;
        btn.addEventListener('click', function() {
            document.querySelectorAll('#typeFilterContainer .filter-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterWaterBodies();
        });
        typeContainer.appendChild(btn);
    });
}



  // Функция для заполнения select-фильтра по регионам на основе БД
  function populateRegionFilter() {
    const regionSelect = document.getElementById('regionFilter');
    if (!regionSelect) return;
    // Получаем уникальные регионы
    const regions = Array.from(
      new Set(allWaterBodies
        .filter(wb => wb.region && (wb.region.name || wb.region))
        .map(wb => wb.region.name || wb.region)
      )
    ).sort();
    // Начальная опция "Все регионы"
    regionSelect.innerHTML = `<option value="">Все регионы</option>`;
    regions.forEach(region => {
      regionSelect.innerHTML += `<option value="${region}">${region}</option>`;
    });
  }

  // Функция для заполнения select-фильтра по pH (используем предопределённые диапазоны)
  function populatePhFilter() {
    const phSelect = document.getElementById('phFilter');
    if (!phSelect) return;
    phSelect.innerHTML = `
      <option value="">Все значения pH</option>
      <option value="acidic">Кислые (pH < 6.5)</option>
      <option value="neutral">Нейтральные (6.5–7.5)</option>
      <option value="alkaline">Щелочные (pH > 7.5)</option>
    `;
  }

  // Функция обновления всех фильтров (динамических и select)
 function updateFilters(waterBodies = []) { // Значение по умолчанию
    // Проверка типа данных
    if (!Array.isArray(waterBodies)) {
        console.error("Ожидается массив водоёмов, получено:", waterBodies);
        waterBodies = [];
    }

    // 3. Обновляем фильтр типов с проверкой элементов
    const typeFilter = document.getElementById('typeFilter');
    const types = Array.from(
        new Set(
            waterBodies
                .filter(wb => wb) // Фильтруем undefined/null
                .map(wb => {
                    return wb.type && wb.type.name
                        ? wb.type.name
                        : wb.type || '';
                })
        )
    ).filter(v => v);

    typeFilter.innerHTML = '<option value="">Все типы</option>';
    types.forEach(t => {
        typeFilter.innerHTML += `<option value="${t}">${t}</option>`;
    });

    // 4. Аналогично обновляем фильтр регионов
    const regionFilter = document.getElementById('regionFilter');
    const regions = Array.from(
        new Set(
            waterBodies
                .filter(wb => wb)
                .map(wb => {
                    return wb.region && wb.region.name
                        ? wb.region.name
                        : wb.region || '';
                })
        )
    ).filter(v => v);

    regionFilter.innerHTML = '<option value="">Все регионы</option>';
    regions.forEach(r => {
        regionFilter.innerHTML += `<option value="${r}">${r}</option>`;
    });
}
function filterWaterBodies() {
    const selectedType = document.getElementById('typeFilter').value;
    const selectedRegion = document.getElementById('regionFilter').value;
    const selectedPhRange = document.getElementById('phFilter').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();

    const filtered = allWaterBodies.filter(wb => {
        const typeName = wb.type && wb.type.name ? wb.type.name : wb.type || '';
        const regionName = wb.region && wb.region.name ? wb.region.name : wb.region || '';
        const ph = wb.ph !== undefined ? parseFloat(wb.ph) : null;

        return (
            (!selectedType || typeName === selectedType) &&
            (!selectedRegion || regionName === selectedRegion) &&
            (
                !selectedPhRange ||
                (selectedPhRange === 'acidic' && ph < 6.5) ||
                (selectedPhRange === 'neutral' && ph >= 6.5 && ph <= 7.5) ||
                (selectedPhRange === 'alkaline' && ph > 7.5)
            ) &&
            (!searchText || wb.name.toLowerCase().includes(searchText))
        );
    });

    updateMap(filtered);
}
  // Функция обновления боковой панели с карточками и карты (отображает отфильтрованные данные)
  function updateMap(filteredData = null) {
    // Если фильтрованные данные не переданы, используем все данные
    const dataToDisplay = filteredData || allWaterBodies;

    // Удаляем старые маркеры
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Обновляем боковую панель
    const waterBodyList = document.getElementById('waterBodyList');
    waterBodyList.innerHTML = '';

    dataToDisplay.forEach(waterBody => {
      // Создаём карточку для боковой панели
      const card = document.createElement('div');
      card.className = 'card';

      const title = document.createElement('h2');
      title.className = 'card__title';
      title.textContent = waterBody.name || 'Без названия';
      card.appendChild(title);

      const infoList = document.createElement('ul');
      infoList.className = 'card__info';

      const typeItem = document.createElement('li');
      typeItem.textContent = `Тип: ${waterBody.type ? (waterBody.type.name || waterBody.type) : 'Неизвестный'}`;
      infoList.appendChild(typeItem);

      const regionItem = document.createElement('li');
      regionItem.textContent = `Регион: ${waterBody.region ? (waterBody.region.name || waterBody.region) : 'Неизвестный'}`;
      infoList.appendChild(regionItem);

      const depthItem = document.createElement('li');
      depthItem.textContent = `Глубина: ${waterBody.depth ? waterBody.depth + " м" : '—'}`;
      infoList.appendChild(depthItem);

      card.appendChild(infoList);

      // При клике по карточке открываем модальное окно с подробностями
      card.addEventListener("click", () => {
        openModal(waterBody);
      });
      waterBodyList.appendChild(card);

      // Добавляем маркер на карту
      try {
        const marker = L.marker([waterBody.latitude, waterBody.longitude]).addTo(map);
        const organismNames = waterBody.organisms ? waterBody.organisms.map(org => org.name).join(", ") : "Нет данных";
        const waterBodyType = waterBody.type ? (waterBody.type.name || waterBody.type) : "Неизвестный тип";

        marker.bindPopup(`
          <b>${waterBody.name}</b><br>
          Тип: ${waterBodyType}<br>
          Глубина: ${waterBody.depth} м<br>
          Организмы: ${organismNames}
        `);
        markers.push(marker);
      } catch (error) {
        console.error("Ошибка при добавлении маркера:", error, waterBody);
      }
    });
  }

  // Функция открытия модального окна с подробной информацией о водоёме
  function openModal(waterBody) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");

    modalBody.innerHTML = `
      <h2>${waterBody.name}</h2>
      <p><strong>Тип:</strong> ${waterBody.type ? (waterBody.type.name || waterBody.type) : 'Неизвестный'}</p>
      <p><strong>Регион:</strong> ${waterBody.region ? (waterBody.region.name || waterBody.region) : 'Неизвестный'}</p>
      <p><strong>Глубина:</strong> ${waterBody.depth || '—'} м</p>
      <p><strong>Координаты:</strong> ${waterBody.latitude}, ${waterBody.longitude}</p>
      <p><strong>Организмы:</strong> ${waterBody.organisms ? waterBody.organisms.map(org => org.name).join(", ") : 'Нет данных'}</p>
    `;
    modal.style.display = "block";
  }

  // Функция закрытия модального окна
  function closeModal() {
    document.getElementById("modal").style.display = "none";
  }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  window.addEventListener("click", function(event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
      closeModal();
    }
  });

  // Функция загрузки данных о водоёмах
  async function loadWaterBodies() {
    try {
        const waterBodies = await fetchData('/water_bodies/search');

        // Гарантируем, что работаем с массивом
        allWaterBodies = Array.isArray(waterBodies) ? waterBodies : [];

        updateFilters(allWaterBodies);  // Передаём гарантированный массив
        updateMap();
    } catch (error) {
        console.error("Ошибка загрузки водоёмов:", error);
    }
}

  document.getElementById("applyFilterBtn").addEventListener("click", filterWaterBodies);
  document.getElementById("resetFilterBtn").addEventListener("click", function() {
    // Сброс кнопок типа
    document.querySelectorAll('#typeFilterContainer .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === "") btn.classList.add('active');
    });

    // Сброс других фильтров
    document.getElementById('regionFilter').value = "";
    document.getElementById('phFilter').value = "";
    document.getElementById('searchInput').value = "";

    filterWaterBodies();
});

  // Экспорт JSON с данными (если есть кнопка с id "exportBtn")
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allWaterBodies, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "water_bodies.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
    });
  }

  // Загружаем данные о водоёмах при загрузке страницы
  await loadWaterBodies();
});
