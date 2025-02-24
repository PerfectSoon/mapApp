document.addEventListener('DOMContentLoaded', async () => {
  // Инициализация карты Leaflet
  const map = L.map('map').setView([55.751244, 37.618423], 6); // Центр карты (например, Москва)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let allWaterBodies = [];  // Все водоёмы, полученные с сервера
  let markers = [];         // Текущие маркеры на карте
  let selectedType = "";    // Выбранный тип водоёма (пустая строка — все)

  // Функция для динамического создания кнопок типов водоёмов
  function populateTypeFilters() {
    const typeContainer = document.querySelector('.filters__types');
    typeContainer.innerHTML = ""; // очищаем контейнер

    // Кнопка "Все"
    const allButton = document.createElement('button');
    allButton.className = 'filters__btn';
    allButton.textContent = "Все";
    if (selectedType === "" || selectedType === "all") {
      allButton.classList.add('active');
    }
    allButton.addEventListener('click', () => {
      selectedType = "";
      Array.from(typeContainer.children).forEach(btn => btn.classList.remove('active'));
      allButton.classList.add('active');
      updateMap();
    });
    typeContainer.appendChild(allButton);

    // Уникальные типы водоёмов
    const types = Array.from(
      new Set(allWaterBodies
        .filter(wb => wb.type && wb.type.name)
        .map(wb => wb.type.name)
      )
    ).sort();

    types.forEach(type => {
      const button = document.createElement('button');
      button.className = 'filters__btn';
      button.textContent = type;
      if (selectedType === type) {
        button.classList.add('active');
      }
      button.addEventListener('click', () => {
        selectedType = type;
        Array.from(typeContainer.children).forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        updateMap();
      });
      typeContainer.appendChild(button);
    });
  }

  // Функция для открытия модального окна с подробной информацией
  function openModal(waterBody) {
    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modal-body");

    modalBody.innerHTML = `
      <h2>${waterBody.name}</h2>
      <p><strong>Тип:</strong> ${waterBody.type ? waterBody.type.name : 'Неизвестный'}</p>
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

  // Закрытие модального окна при клике по кнопке "×"
  document.getElementById("modal-close").addEventListener("click", closeModal);

  // Закрытие при клике вне области модального контента
  window.addEventListener("click", function(event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
      closeModal();
    }
  });

  // Функция загрузки данных о водоёмах
  async function loadWaterBodies() {
    try {
      const response = await fetch('/water_bodies'); // Убедитесь, что URL правильный
      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.statusText}`);
      }
      allWaterBodies = await response.json();

      console.log("Загруженные данные о водоёмах:", allWaterBodies);

      if (!Array.isArray(allWaterBodies)) {
        console.error("Ошибка: полученные данные не являются массивом!");
        return;
      }

      populateTypeFilters(); // Заполняем фильтры по типам
      updateMap();
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    }
  }

  // Функция обновления карты и правой панели с карточками
  function updateMap() {
    // Удаляем старые маркеры
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Очищаем панель карточек
    const waterBodyList = document.getElementById('waterBodyList');
    waterBodyList.innerHTML = '';

    if (!allWaterBodies || allWaterBodies.length === 0) {
      console.warn("Нет данных о водоёмах!");
      return;
    }

    // Получаем значения остальных фильтров (если они существуют)
    const searchInput = document.getElementById("search");
    const minDepthInput = document.getElementById("minDepth");
    const maxDepthInput = document.getElementById("maxDepth");
    const organismFilterInput = document.getElementById("organismFilter");

    const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
    const minDepth = minDepthInput ? parseFloat(minDepthInput.value) || null : null;
    const maxDepth = maxDepthInput ? parseFloat(maxDepthInput.value) || null : null;
    const organismFilter = organismFilterInput ? organismFilterInput.value.toLowerCase() : "";

    // Фильтрация данных
    const filteredData = allWaterBodies.filter(waterBody => {
      if (!waterBody || !waterBody.name || !waterBody.type || !waterBody.latitude || !waterBody.longitude) {
        console.warn("Некорректные данные у водоёма:", waterBody);
        return false;
      }

      const matchesType = !selectedType || (waterBody.type && waterBody.type.name === selectedType);
      const matchesName = !searchQuery || waterBody.name.toLowerCase().includes(searchQuery);
      const matchesDepth = (!minDepth || waterBody.depth >= minDepth) &&
                           (!maxDepth || waterBody.depth <= maxDepth);
      const matchesOrganism = !organismFilter ||
                              (waterBody.organisms && waterBody.organisms.some(org => org.name.toLowerCase().includes(organismFilter)));

      return matchesType && matchesName && matchesDepth && matchesOrganism;
    });

    console.log("Отфильтрованные водоёмы:", filteredData);

    // Отрисовка карточек и маркеров
    filteredData.forEach(waterBody => {
      // Создаём карточку для списка
      const card = document.createElement('div');
      card.className = 'card';

      const title = document.createElement('h2');
      title.className = 'card__title';
      title.textContent = waterBody.name || 'Без названия';
      card.appendChild(title);

      const infoList = document.createElement('ul');
      infoList.className = 'card__info';

      const typeItem = document.createElement('li');
      typeItem.textContent = `Тип: ${waterBody.type ? waterBody.type.name : 'Неизвестный'}`;
      infoList.appendChild(typeItem);

      const depthItem = document.createElement('li');
      depthItem.textContent = `Глубина: ${waterBody.depth + "м" || '—'}`;
      infoList.appendChild(depthItem);

      const organismItem = document.createElement('li');
      organismItem.textContent = `Организмы: ${waterBody.organisms ? waterBody.organisms.length : 'Неизвестно'}`;
      infoList.appendChild(organismItem);

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
        const waterBodyType = waterBody.type ? waterBody.type.name : "Неизвестный тип";

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
    console.log("Добавлено маркеров:", markers.length);
  }

  // Привязываем события для остальных фильтров (если они есть)
  if (document.getElementById("search")) {
    document.getElementById("search").addEventListener("input", updateMap);
  }
  if (document.getElementById("minDepth")) {
    document.getElementById("minDepth").addEventListener("input", updateMap);
  }
  if (document.getElementById("maxDepth")) {
    document.getElementById("maxDepth").addEventListener("input", updateMap);
  }
  if (document.getElementById("organismFilter")) {
    document.getElementById("organismFilter").addEventListener("input", updateMap);
  }

  // Экспорт JSON с данными (если есть кнопка с id "export")
  if (document.getElementById("export")) {
    document.getElementById("export").addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allWaterBodies, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "water_bodies.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
    });
  }

  // Загружаем данные
  await loadWaterBodies();
});
