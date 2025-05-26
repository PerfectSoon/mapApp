document.addEventListener('DOMContentLoaded', async () => {
  // Инициализация карты Leaflet
  const map = L.map('map').setView([55.751244, 37.618423], 6); // Центр карты (например, Москва)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let allWaterBodies = [];  // Все водоёмы, полученные с сервера
  let markers = [];         // Текущие маркеры на карте
  let allFishes = [];       // Все виды рыб из всех водоёмов
  let selectedType = "";    // Выбранный тип водоёма (пустая строка — все)

  // Функция для выполнения запроса и получения JSON-данных
  async function fetchData(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Ошибка запроса ${url}: ${response.statusText}`);
    }
    return await response.json();
  }

  // Функция для сбора всех уникальных видов рыб из всех водоёмов
  function collectAllFishes(waterBodies) {
    const fishes = new Set();

    waterBodies.forEach(wb => {
      if (wb.organisms && Array.isArray(wb.organisms)) {
        wb.organisms.forEach(org => {
          if (org && org.name) {
            fishes.add(org.name);
          }
        });
      }
    });

    return Array.from(fishes).sort();
  }

  // Функция для заполнения select-фильтра по видам рыб
  function populateFishFilter() {
    const fishSelect = document.getElementById('fishFilter');
    if (!fishSelect) return;

    // Получаем все виды рыб
    allFishes = collectAllFishes(allWaterBodies);

    // Начальная опция "Все виды"
    fishSelect.innerHTML = `<option value="">Все виды</option>`;

    // Добавляем каждый вид рыб в выпадающий список
    allFishes.forEach(fish => {
      fishSelect.innerHTML += `<option value="${fish}">${fish}</option>`;
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

  // Функция обновления всех фильтров (динамических и select)
  function updateFilters(waterBodies = []) { // Значение по умолчанию
    // Проверка типа данных
    if (!Array.isArray(waterBodies)) {
        console.error("Ожидается массив водоёмов, получено:", waterBodies);
        waterBodies = [];
    }

    // Обновляем фильтр типов с проверкой элементов
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

    // Аналогично обновляем фильтр регионов
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

    // Обновляем фильтр по рыбам
    populateFishFilter();
  }

  function filterWaterBodies() {
    const selectedType = document.getElementById('typeFilter').value;
    const selectedRegion = document.getElementById('regionFilter').value;
    const selectedPhRange = document.getElementById('phFilter').value;
    const selectedFish = document.getElementById('fishFilter').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();

    const filtered = allWaterBodies.filter(wb => {
        const typeName = wb.type && wb.type.name ? wb.type.name : wb.type || '';
        const regionName = wb.region && wb.region.name ? wb.region.name : wb.region || '';
        const ph = wb.ph !== undefined ? parseFloat(wb.ph) : null;

        // Проверяем наличие выбранной рыбы в водоеме
        const hasFish = !selectedFish || (
            wb.organisms &&
            Array.isArray(wb.organisms) &&
            wb.organisms.some(org => org && org.name === selectedFish)
        );

        return (
            (!selectedType || typeName === selectedType) &&
            (!selectedRegion || regionName === selectedRegion) &&
            (
                !selectedPhRange ||
                (selectedPhRange === 'acidic' && ph < 6.5) ||
                (selectedPhRange === 'neutral' && ph >= 6.5 && ph <= 7.5) ||
                (selectedPhRange === 'alkaline' && ph > 7.5)
            ) &&
            (!searchText || wb.name.toLowerCase().includes(searchText)) &&
            hasFish // Добавляем фильтр по рыбам
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

    // Если есть данные для отображения
    if (dataToDisplay.length > 0) {
      // Создаем границы для центрирования карты на всех маркерах
      const bounds = L.latLngBounds();

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
          if (waterBody.latitude && waterBody.longitude) {
            const marker = L.marker([waterBody.latitude, waterBody.longitude]).addTo(map);
            const waterBodyType = waterBody.type ? (waterBody.type.name || waterBody.type) : "Неизвестный тип";

            // Форматируем список рыб для показа в попапе
            let fishList = 'Нет данных';
            if (waterBody.organisms && waterBody.organisms.length > 0) {
              fishList = waterBody.organisms.map(org => org.name).join(", ");
            }

            marker.bindPopup(`
              <b>${waterBody.name}</b><br>
              Тип: ${waterBodyType}<br>
              Глубина: ${waterBody.depth ? waterBody.depth + " м" : '—'}<br>
              Рыбы: ${fishList}
            `);
            markers.push(marker);

            // Расширяем границы для включения этого маркера
            bounds.extend([waterBody.latitude, waterBody.longitude]);
          }
        } catch (error) {
          console.error("Ошибка при добавлении маркера:", error, waterBody);
        }
      });

      // Если есть маркеры, центрируем карту на их границах
      if (markers.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      // Если нет водоемов для отображения, показываем сообщение
      const noDataMessage = document.createElement('div');
      noDataMessage.className = 'no-data-message';
      noDataMessage.textContent = 'Нет водоемов, соответствующих заданным критериям';
      waterBodyList.appendChild(noDataMessage);
    }
  }

  // Функция открытия модального окна с подробной информацией о водоёме
  function openModal(waterBody) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");

    // Форматируем список рыб для вывода
    let fishList = 'Нет данных';
    if (waterBody.organisms && waterBody.organisms.length > 0) {
      fishList = waterBody.organisms.map(org => org.name).join(", ");
    }

    modalBody.innerHTML = `
      <h2>${waterBody.name}</h2>
      <p><strong>Тип:</strong> ${waterBody.type ? (waterBody.type.name || waterBody.type) : 'Неизвестный'}</p>
      <p><strong>Регион:</strong> ${waterBody.region ? (waterBody.region.name || waterBody.region) : 'Неизвестный'}</p>
      <p><strong>Глубина:</strong> ${waterBody.depth || '—'} м</p>
      <p><strong>Координаты:</strong> ${waterBody.latitude}, ${waterBody.longitude}</p>
      <p><strong>Рыбы:</strong> ${fishList}</p>
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
    // Сброс всех фильтров
    document.getElementById('typeFilter').value = "";
    document.getElementById('regionFilter').value = "";
    document.getElementById('phFilter').value = "";
    document.getElementById('fishFilter').value = ""; // Сбрасываем фильтр по рыбам
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