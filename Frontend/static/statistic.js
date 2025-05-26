// Функция для выполнения запроса и получения JSON-данных
async function fetchData(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`Ошибка запроса ${url}: ${response.statusText}`);
    }
    return await response.json();
}

// Глобальный массив для сохранения загруженных водоёмов (при необходимости)
let allWaterBodies = [];
let filteredData = [];
let sortState = { column: null, direction: 'asc' };

// Функция для загрузки списка водоёмов и заполнения таблицы
async function loadWaterBodies() {
    try {
        allWaterBodies = await fetchData('/water_bodies/search');
        filteredData = [...allWaterBodies];
        updateFilters(allWaterBodies);
        applyCurrentSort();
        updateInfoSection(filteredData);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
    }
}
function updateInfoSection(filteredData) {
    try {
        // Рассчитываем статистику на клиенте
        const total = filteredData.length;
        const avgBioIndex = total > 0
            ? (filteredData.reduce((sum, wb) => sum + (wb.biodiversity_index || 0), 0) / total).toFixed(2)
            : 0;

        const uniqueSpeciesSet = new Set();
        filteredData.forEach(wb => {
            if (Array.isArray(wb.organisms)) {
                wb.organisms.forEach(org => {
                    uniqueSpeciesSet.add(org.id);  // или org.name, если id отсутствует
                });
            }
        });
        const totalSpecies = uniqueSpeciesSet.size;

        // Обновляем DOM
        const formatValue = (value) => value.toLocaleString('ru-RU');

        document.querySelector('.info-card:nth-child(1) .info-value').textContent = formatValue(total);
        document.querySelector('.info-card:nth-child(2) .info-value').textContent = avgBioIndex;
        document.querySelector('.info-card:nth-child(3) .info-value').textContent = formatValue(totalSpecies);

    } catch (error) {
        console.error("Ошибка обновления информации:", error);
    }
}



// Инициализация графика сравнения выбранных водоёмов как группированный столбчатый график
const ctxComparison = document.getElementById('comparisonChart').getContext('2d');
let comparisonChart = new Chart(ctxComparison, {
    type: 'bar',
    data: {
        labels: [], // Имена выбранных водоёмов
        datasets: [
            {
                label: 'pH',
                data: [],
                backgroundColor: 'rgba(54, 162, 235, 0.7)'
            },
            {
                label: 'Количество видов',
                data: [],
                backgroundColor: 'rgba(255, 159, 64, 0.7)'
            },
            {
                label: 'Индекс биоразнообразия',
                data: [],
                backgroundColor: 'rgba(75, 192, 192, 0.7)'
            },
            {
                label: 'Глубина',
                data: [],
                backgroundColor: 'rgba(153, 102, 255, 0.7)'
            }
        ]
    },
    options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
            x: { title: { display: true, text: 'Название водоёма' } },
            y: { beginAtZero: true, title: { display: true, text: 'Значения' } }
        }
    }
});
// Функция для обновления таблицы с водоёмами
function updateTable(data) {
    const tbody = document.getElementById('waterBodyData');
    tbody.innerHTML = ''; // Очистка таблицы

    const statusDictionary = {
        // Английские ключи -> Русские значения
        'great': 'Отличный',
        'good': 'Хороший',
        'avg': 'Средний',
        'low': 'Низкий',

        // Русские значения -> Английские ключи (для обратного преобразования)
        'отличный': 'great',
        'хороший': 'good',
        'средний': 'avg',
        'низкий': 'low'
    };

    data.forEach(wb => {
        const typeName = wb.type && wb.type.name ? wb.type.name : wb.type || '';
        const regionName = wb.region && wb.region.name ? wb.region.name : wb.region || '';
        const speciesCount = Array.isArray(wb.organisms) ? wb.organisms.length : 0;

        const rawStatus = (wb.ecological_status || '').toString().trim().toLowerCase();

        let statusKey = statusDictionary[rawStatus] || rawStatus;
        if (statusDictionary[statusKey]) {
            statusText = statusDictionary[statusKey];
        } else {
            const reverseKey = Object.entries(statusDictionary).find(
                ([key, val]) => val.toLowerCase() === rawStatus
            )?.[0];
            statusKey = reverseKey || rawStatus;
            statusText = statusDictionary[statusKey] || rawStatus;
        }

        const statusClass = statusKey in statusDictionary ? `status-${statusKey}` : 'status-unknown';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="waterbody-checkbox" value="${wb.id}"></td>
            <td>${wb.name}</td>
            <td>${typeName}</td>
            <td>${regionName}</td>
            <td>${wb.ph}</td>
            <td>${speciesCount}</td>
            <td>${wb.biodiversity_index}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.querySelector('.data-count').innerText = `(всего: ${data.length})`;
}
function sortData(data) {
    if (!sortState.column) return data;

    return data.sort((a, b) => {
        let valueA, valueB;

        switch(sortState.column) {
            case 4: // pH
                valueA = parseFloat(a.ph) || 0;
                valueB = parseFloat(b.ph) || 0;
                break;
            case 5: // Количество видов
                valueA = Array.isArray(a.organisms) ? a.organisms.length : 0;
                valueB = Array.isArray(b.organisms) ? b.organisms.length : 0;
                break;
            case 6: // Индекс биоразнообразия
                valueA = parseFloat(a.biodiversity_index) || 0;
                valueB = parseFloat(b.biodiversity_index) || 0;
                break;
            default:
                return 0;
        }

        return sortState.direction === 'asc' ? valueA - valueB : valueB - valueA;
    });
}

// Функция для обработки кликов по заголовкам
function handleSort(columnIndex) {
    if (sortState.column === columnIndex) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.column = columnIndex;
        sortState.direction = 'asc';
    }

    // Обновляем UI сортировки
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });

    const header = document.querySelector(`th[data-column="${sortState.column}"]`);
    if (header) {
        header.classList.add(`sorted-${sortState.direction}`);
    }

    applyCurrentSort();
}


function updateFilters(waterBodies) {
    // Получаем уникальные типы, регионы и диапазоны pH
    const types = Array.from(new Set(waterBodies.map(wb => {
        return wb.type && wb.type.name ? wb.type.name : wb.type || '';
    }))).filter(v => v);
    const regions = Array.from(new Set(waterBodies.map(wb => {
        return wb.region && wb.region.name ? wb.region.name : wb.region || '';
    }))).filter(v => v);
    const phValues = Array.from(new Set(waterBodies.map(wb => wb.ph))).filter(v => v !== undefined);

    // Обновляем select для типов
    const typeFilter = document.getElementById('typeFilter');
    typeFilter.innerHTML = `<option value="">Все типы</option>`;
    types.forEach(t => {
        typeFilter.innerHTML += `<option value="${t}">${t}</option>`;
    });

    // Обновляем select для регионов
    const regionFilter = document.getElementById('regionFilter');
    regionFilter.innerHTML = `<option value="">Все регионы</option>`;
    regions.forEach(r => {
        regionFilter.innerHTML += `<option value="${r}">${r}</option>`;
    });

    // Обновляем select для pH (например, сортируем уникальные значения)
   const phFilter = document.getElementById('phFilter');
    phFilter.innerHTML = `
        <option value="">Все значения</option>
        <option value="acidic">Кислые (pH < 6.5)</option>
        <option value="neutral">Нейтральные (6.5–7.5)</option>
        <option value="alkaline">Щелочные (pH > 7.5)</option>
    `;
}

function filterWaterBodies() {
    // Получаем значения фильтров
    const selectedType = document.getElementById('typeFilter').value;
    const selectedRegion = document.getElementById('regionFilter').value;
    const selectedPhRange = document.getElementById('phFilter').value;
    const searchText = document.getElementById('searchInput').value.toLowerCase();

    const filtered = allWaterBodies.filter(wb => {
        const typeName = wb.type && wb.type.name ? wb.type.name : wb.type || '';
        const regionName = wb.region && wb.region.name ? wb.region.name : wb.region || '';
        const ph = wb.ph !== undefined ? wb.ph.toString() : '';

        // Проверка фильтра по типу, региону, pH и поисковому тексту по названию
        const typeMatch = selectedType ? (typeName === selectedType) : true;
        const regionMatch = selectedRegion ? (regionName === selectedRegion) : true;
        let phMatch = true;
        if (selectedPhRange) {
            const ph = parseFloat(wb.ph);
            switch(selectedPhRange) {
                case 'acidic':
                    phMatch = ph < 6.5;
                    break;
                case 'neutral':
                    phMatch = ph >= 6.5 && ph <= 7.5;
                    break;
                case 'alkaline':
                    phMatch = ph > 7.5;
                    break;
            }
        }
        const searchMatch = searchText ? wb.name.toLowerCase().includes(searchText) : true;

        return typeMatch && regionMatch && phMatch && searchMatch;
    });
    applyCurrentSort();
    updateTable(filtered);
    updateInfoSection(filtered);
    compareSelectedWaterBodies();

    sortState = { column: null, direction: 'asc' };
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
}

function applyCurrentSort() {
    const sorted = sortData([...filteredData]);
    updateTable(sorted);
}
// Функция для сравнения выбранных водоёмов (обновлённая версия)
async function compareSelectedWaterBodies() {
    const checkboxes = document.querySelectorAll('#waterBodyData input[type="checkbox"]:checked');
    const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (ids.length === 0) {
        comparisonChart.data.labels = [];
        comparisonChart.data.datasets.forEach(ds => ds.data = []);
        comparisonChart.update();
        return;
    }

    try {
        // Эндпоинт возвращает расширенные данные: { id, name, ph, depth, organisms_count, biodiversity_index, ... }
        const compareData = await fetchData('/statistics/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ water_body_ids: ids })
        });

        // Собираем данные для графика: имена и параметры
        const names = compareData.map(wb => wb.name);
        const phValues = compareData.map(wb => wb.ph);
        // Если organisms_count отсутствует, рассчитываем по массиву organisms (если есть)
        const speciesCounts = compareData.map(wb => wb.organisms_count !== undefined ? wb.organisms_count : (Array.isArray(wb.organisms) ? wb.organisms.length : 0));
        const biodIndices = compareData.map(wb => wb.biodiversity_index);
        const depths = compareData.map(wb => wb.depth);

        comparisonChart.data.labels = names;
        comparisonChart.data.datasets[0].data = phValues;
        comparisonChart.data.datasets[1].data = speciesCounts;
        comparisonChart.data.datasets[2].data = biodIndices;
        comparisonChart.data.datasets[3].data = depths;
        comparisonChart.update();

    } catch (error) {
        console.error("Ошибка при сравнении водоёмов:", error);
    }
}
// Автоматически запускаем загрузку водоёмов после загрузки страницы
document.addEventListener('DOMContentLoaded', async function() {
    await loadWaterBodies();
    // Если какие-то водоёмы уже выбраны (например, при экспорте), можно сразу запустить сравнение
    compareSelectedWaterBodies();
});

// Используем делегирование событий: при изменении любого чекбокса в таблице запускаем сравнение
document.getElementById('waterBodyData').addEventListener('change', function(event) {
    if (event.target.matches('input[type="checkbox"]')) {
        compareSelectedWaterBodies();
    }
});

// Дополнительно: обработчики для других кнопок, например экспорт
document.getElementById("statisticBtn").addEventListener("click", function() {
    window.location.href = "index.html";
});
if (document.getElementById("exportBtn")) {
    document.getElementById("exportBtn").addEventListener("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allWaterBodies, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "water_bodies.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
    });
}
document.getElementById("applyFilterBtn").addEventListener("click", filterWaterBodies);
document.getElementById("resetFilterBtn").addEventListener("click", function() {
    document.getElementById("typeFilter").value = "";
    document.getElementById("regionFilter").value = "";
    document.getElementById("phFilter").value = "";
    document.getElementById("searchInput").value = "";
    // После сброса фильтров выводим все водоёмы
    updateTable(allWaterBodies);
    compareSelectedWaterBodies();
    filterWaterBodies();
});