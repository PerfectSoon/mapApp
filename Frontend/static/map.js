document.addEventListener("DOMContentLoaded", async function () {
    const map = L.map('map').setView([55.751244, 37.618423], 5);

    // Добавляем карту OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let allWaterBodies = [];  // Все водоемы
    let markers = [];         // Маркеры на карте

    async function loadWaterBodies() {
        try {
            const response = await fetch('/');
            allWaterBodies = await response.json();

            console.log("Загруженные данные о водоемах:", allWaterBodies);

            if (!Array.isArray(allWaterBodies)) {
                console.error("Ошибка: полученные данные не являются массивом!");
                return;
            }

            updateMap();
        } catch (error) {
            console.error("Ошибка загрузки данных:", error);
        }
    }

    function updateMap() {
        // Удаляем старые маркеры
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        if (!allWaterBodies || allWaterBodies.length === 0) {
            console.warn("Нет данных о водоемах!");
            return;
        }

        // Получаем значения фильтров
        const searchQuery = document.getElementById("search").value.toLowerCase();
        const filterType = document.getElementById("filter").value;
        const minDepth = parseFloat(document.getElementById("minDepth").value) || null;
        const maxDepth = parseFloat(document.getElementById("maxDepth").value) || null;
        const organismFilter = document.getElementById("organismFilter").value.toLowerCase();

        const filteredData = allWaterBodies.filter(waterBody => {
            if (!waterBody || !waterBody.name || !waterBody.type || !waterBody.latitude || !waterBody.longitude) {
                console.warn("Некорректные данные у водоема:", waterBody);
                return false;
            }

            const matchesType = !filterType || (waterBody.type && waterBody.type.name === filterType);
            const matchesName = !searchQuery || waterBody.name.toLowerCase().includes(searchQuery);
            const matchesDepth = (!minDepth || waterBody.depth >= minDepth) &&
                (!maxDepth || waterBody.depth <= maxDepth);
            const matchesOrganism = !organismFilter || (waterBody.organisms && waterBody.organisms.some(org => org.name.toLowerCase().includes(organismFilter)));

            return matchesType && matchesName && matchesDepth && matchesOrganism;
        });

        console.log("Отфильтрованные водоемы:", filteredData);

        filteredData.forEach(waterBody => {
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

    // Обновляем карту при изменении фильтра или поиска
    document.getElementById("search").addEventListener("input", updateMap);
    document.getElementById("filter").addEventListener("change", updateMap);
    document.getElementById("minDepth").addEventListener("input", updateMap);
    document.getElementById("maxDepth").addEventListener("input", updateMap);
    document.getElementById("organismFilter").addEventListener("input", updateMap);

    // Функция для экспорта JSON
    document.getElementById("export").addEventListener("click", () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allWaterBodies, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "water_bodies.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
    });

    await loadWaterBodies();
});
