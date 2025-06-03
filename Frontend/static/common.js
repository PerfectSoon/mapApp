// common.js
(function(window) {
  // --- Утилиты ---
  async function fetchData(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Ошибка запроса ${url}: ${res.statusText}`);
    return res.json();
  }

  // --- Экспортные модалки ---
  let _exportItems = [];
  let _exportListEl, _exportModalEl, _exportSearchEl;

  function _renderExportList(items) {
    _exportListEl.innerHTML = '';
    if (!items.length) {
      _exportListEl.innerHTML = '<p>Никаких элементов не найдено</p>';
      return;
    }
    items.forEach(item => {
      const label = document.createElement('label');
      label.innerHTML = `<input type="checkbox" value="${item.id}"> ${item.name}`;
      _exportListEl.appendChild(label);
    });
  }

  function _filterExportList(q) {
    const ql = q.trim().toLowerCase();
    _renderExportList(_exportItems.filter(i => i.name.toLowerCase().includes(ql)));
  }

  async function _confirmExport(endpoint, authHeader) {
    const ids = Array.from(_exportListEl.querySelectorAll('input:checked'))
                     .map(cb => cb.value);
    if (!ids.length) {
      return alert('Выберите хотя бы один элемент');
    }
    try {
      const params = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
      const data = await fetchData(`${endpoint}?${params}`, {
        headers: authHeader
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      _closeExportModal();
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      alert('Не удалось экспортировать данные');
    }
  }

  function _openExportModal(endpoint) {
    // подготовка списка
    _exportModalEl.style.display = 'block';
    if (!_exportListEl.children.length) {
      _renderExportList(_exportItems);
    }
    // запомним endpoint
    _exportModalEl.dataset.exportEndpoint = endpoint;
  }

  function _closeExportModal() {
    _exportModalEl.style.display = 'none';
    _exportSearchEl.value = '';
    _renderExportList(_exportItems);
  }

  function initExport(options) {
    // options: {
    //   btnId, modalId, listId, searchId,
    //   closeBtnId, cancelBtnId, confirmBtnId,
    //   fetchListEndpoint, exportEndpoint,
    //   authHeaderFactory: () => ({ Authorization: 'Bearer ...' })
    // }
    const {
      btnId, modalId, listId, searchId,
      closeBtnId, cancelBtnId, confirmBtnId,
      fetchListEndpoint, exportEndpoint,
      authHeaderFactory
    } = options;

    const btn    = document.getElementById(btnId);
    _exportModalEl = document.getElementById(modalId);
    _exportListEl  = document.getElementById(listId);
    _exportSearchEl= document.getElementById(searchId);
    const closeBtn   = document.getElementById(closeBtnId);
    const cancelBtn  = document.getElementById(cancelBtnId);
    const confirmBtn = document.getElementById(confirmBtnId);

    // Загрузка списка имён
    fetchData(fetchListEndpoint, { headers: authHeaderFactory() })
      .then(data => {
        _exportItems = data.map(wb => ({ id: wb.id, name: wb.name }));
      })
      .catch(err => console.error('Не удалось загрузить список для экспорта:', err));

    // Навешиваем
    btn.addEventListener('click', () => _openExportModal(exportEndpoint));
    closeBtn.addEventListener('click', _closeExportModal);
    cancelBtn.addEventListener('click', _closeExportModal);
    _exportSearchEl.addEventListener('input', e => _filterExportList(e.target.value));
    confirmBtn.addEventListener('click', () =>
      _confirmExport(exportEndpoint, authHeaderFactory())
    );
    window.addEventListener('click', e => {
      if (e.target === _exportModalEl) _closeExportModal();
    });
  }

  // Export to global
  window.Common = {
    fetchData,
    initExport
  };
})(window);
