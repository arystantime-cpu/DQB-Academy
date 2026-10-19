(() => {
  'use strict';
  const plans = {
    online: { name: 'EASY Онлайн', price: 27500, description: 'Теория онлайн, учебные тесты и внутренний итоговый экзамен.' },
    practice: { name: 'EASY Практика', price: 45000, description: 'Онлайн-теория и 5 групповых практических занятий в Павлодаре.' },
    mid: { name: 'MID-M', price: 310000, description: 'Теория, практика на мультироторе, документы и организация независимого экзамена.' }
  };
  const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₸';
  const storageKey = 'dqb-academy-demo-selection';
  let currentPlan = 'practice';
  let returnFocus = null;
  const checkout = document.querySelector('#checkout');
  const addon = document.querySelector('#addon');
  const menu = document.querySelector('.menu-toggle');
  function closeModal(dialog) { if (dialog?.open) dialog.close(); }
  function openModal(dialog, trigger) {
    if (!dialog) return;
    returnFocus = trigger || document.activeElement;
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]')?.addEventListener('click', () => closeModal(dialog));
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) closeModal(dialog);
    });
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) {
        document.body.classList.remove('modal-open');
        if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      }
    });
    const title = dialog.querySelector('h2');
    if (title && !title.id) title.id = dialog.id + '-title';
    if (title) dialog.setAttribute('aria-labelledby', title.id);
  });
  function updateTotal() {
    document.querySelector('#order-total').textContent = money(plans[currentPlan].price + (addon.checked ? 12500 : 0));
  }
  function selectPlan(key, trigger) {
    if (!plans[key]) return;
    currentPlan = key;
    document.querySelector('#checkout-title').textContent = plans[key].name;
    document.querySelector('#checkout-description').textContent = plans[key].description;
    document.querySelector('#course-price').textContent = money(plans[key].price);
    document.querySelector('#mid-note').hidden = key !== 'mid';
    addon.checked = false;
    updateTotal();
    openModal(checkout, trigger);
  }
  document.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => selectPlan(button.dataset.plan, button)));
  addon?.addEventListener('change', updateTotal);
  document.querySelector('#save-order')?.addEventListener('click', () => {
    const selection = { plan: currentPlan, addon: addon.checked };
    try { localStorage.setItem(storageKey, JSON.stringify(selection)); } catch (_) { /* The URL also carries a non-personal demo selection. */ }
    window.location.href = 'cabinet.html?plan=' + currentPlan + '&addon=' + (addon.checked ? '1' : '0');
  });
  document.querySelectorAll('[data-quiz]').forEach(button => button.addEventListener('click', () => openModal(document.querySelector('#quiz'), button)));
  document.querySelectorAll('[data-recommend]').forEach(button => button.addEventListener('click', () => {
    const trigger = returnFocus;
    closeModal(document.querySelector('#quiz'));
    selectPlan(button.dataset.recommend, trigger);
  }));
  document.querySelector('[data-turnkey]')?.addEventListener('click', event => openModal(document.querySelector('#turnkey-info'), event.currentTarget));
  document.querySelector('#turnkey-select')?.addEventListener('click', () => {
    closeModal(document.querySelector('#turnkey-info'));
    document.querySelector('#programs').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  menu?.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    menu.setAttribute('aria-label', expanded ? 'Закрыть меню' : 'Открыть меню');
    document.querySelector('#nav').classList.toggle('open', expanded);
    menu.textContent = expanded ? '×' : '☰';
  });
  document.querySelectorAll('#nav a').forEach(link => link.addEventListener('click', () => {
    document.querySelector('#nav').classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Открыть меню');
    menu.textContent = '☰';
  }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') menu.click(); });
  if (document.querySelector('.cabinet-body')) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch (_) { /* Start with an empty cabinet if storage is unavailable. */ }
    const params = new URLSearchParams(window.location.search);
    if (plans[params.get('plan')]) {
      saved = { plan: params.get('plan'), addon: params.get('addon') === '1' };
      try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (_) { /* Demo still works without storage. */ }
    }
    if (saved && plans[saved.plan]) {
      const chosen = plans[saved.plan];
      document.querySelector('#selected-plan').textContent = chosen.name;
      document.querySelector('#selected-description').textContent = chosen.description + (saved.addon === true ? ' Дополнительно: сопровождение «Под ключ».' : ' Без дополнительного сопровождения.');
      const total = document.querySelector('#selected-total');
      total.textContent = money(chosen.price + (saved.addon === true ? 12500 : 0));
      const note = document.createElement('small'); note.textContent = 'Предварительная стоимость · не является заказом'; total.append(note);
      document.querySelector('#change-course').textContent = 'Изменить программу ↗';
    }
    const panels = [...document.querySelectorAll('[data-view]')];
    function displayPanel(name, focus) {
      if (!panels.some(panel => panel.dataset.view === name)) name = 'overview';
      panels.forEach(panel => { panel.hidden = panel.dataset.view !== name; });
      document.querySelectorAll('.sidebar [data-panel]').forEach(button => {
        button.classList.toggle('active', button.dataset.panel === name);
        if (button.dataset.panel === name) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
      });
      if (focus) {
        const title = document.querySelector('[data-view="' + name + '"] h1');
        title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true });
      }
    }
    document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
      displayPanel(button.dataset.panel, true);
      history.replaceState(null, '', window.location.pathname + window.location.search + '#' + button.dataset.panel);
    }));
    window.addEventListener('hashchange', () => displayPanel(window.location.hash.slice(1), false));
    displayPanel(window.location.hash.slice(1) || 'overview', false);
  }
})();
