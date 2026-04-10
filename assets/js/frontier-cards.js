// ===========================================
// Frontier Cards — Interactive Pillar/Phase Selection
// ===========================================
(function () {
  'use strict';

  var STORAGE_PREFIX = 'aimat-frontier-';
  var CUSTOMER_KEY = 'aimat-notes-customer';

  function getCustomer() {
    try { return localStorage.getItem(CUSTOMER_KEY) || ''; } catch (e) { return ''; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function loadState(cardsetId) {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + cardsetId);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { selected: null, notes: {} };
  }

  function saveState(cardsetId, state) {
    try {
      localStorage.setItem(STORAGE_PREFIX + cardsetId, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  function renderCards(container, cardsetId, data) {
    var state = loadState(cardsetId);
    if (!state.notes) state.notes = {};

    container.innerHTML = '';

    var cardsRow = document.createElement('div');
    cardsRow.className = 'fc-cards-row';

    data.forEach(function (item) {
      var id = item.id;
      var isSelected = state.selected === id;

      var card = document.createElement('div');
      card.className = 'fc-card' + (isSelected ? ' fc-card--selected' : '');
      card.setAttribute('data-card-id', id);
      card.style.setProperty('--fc-accent', item.color || '#58a6ff');

      // Header with icon + title
      var header = document.createElement('div');
      header.className = 'fc-card-header';
      header.innerHTML =
        '<iconify-icon icon="' + escapeHtml(item.icon) + '" width="28" height="28"></iconify-icon>' +
        '<div class="fc-card-titles">' +
          '<span class="fc-card-subtitle">' + escapeHtml(item.subtitle) + '</span>' +
          '<span class="fc-card-title">' + escapeHtml(item.title) + '</span>' +
        '</div>';

      // Select row (hidden radio + custom indicator)
      var selectRow = document.createElement('div');
      selectRow.className = 'fc-select-row';
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'fc-card-' + cardsetId;
      radio.value = id;
      radio.className = 'fc-radio';
      radio.checked = isSelected;
      radio.id = 'fc-radio-' + cardsetId + '-' + id;
      var label = document.createElement('label');
      label.className = 'fc-select-label';
      label.setAttribute('for', radio.id);
      label.innerHTML =
        '<span class="fc-indicator' + (isSelected ? ' fc-indicator--active' : '') + '"></span>' +
        '<span class="fc-select-text">' + (isSelected ? 'Selected' : 'Select') + '</span>';
      selectRow.appendChild(radio);
      selectRow.appendChild(label);

      // Summary text
      var summaryDiv = document.createElement('div');
      summaryDiv.className = 'fc-card-summary';
      summaryDiv.textContent = item.summary;

      // Notes textarea
      var notesWrap = document.createElement('div');
      notesWrap.className = 'fc-card-notes';
      var notesArea = document.createElement('textarea');
      notesArea.className = 'fc-notes-input';
      notesArea.placeholder = 'Notes…';
      notesArea.rows = 2;
      notesArea.value = state.notes[id] || '';
      notesArea.setAttribute('data-card-id', id);
      notesWrap.appendChild(notesArea);

      // Image (if present)
      var imageDiv = null;
      if (item.image) {
        imageDiv = document.createElement('details');
        imageDiv.className = 'fc-collapsible';
        if (isSelected) imageDiv.setAttribute('open', '');
        var imgSummary = document.createElement('summary');
        imgSummary.className = 'fc-collapsible-title';
        imgSummary.textContent = '🖼️ Visual';
        var imgBody = document.createElement('div');
        imgBody.className = 'fc-collapsible-body';
        var baseUrl = document.querySelector('meta[name="baseurl"]');
        var base = baseUrl ? baseUrl.getAttribute('content') : '';
        imgBody.innerHTML = '<img src="' + base + '/assets/images/frontier/' + escapeHtml(item.image) +
          '" alt="' + escapeHtml(item.title) + '" style="max-width:100%;border-radius:6px;" />';
        imageDiv.appendChild(imgSummary);
        imageDiv.appendChild(imgBody);
      }

      // Content sections (collapsible)
      var sectionElements = [];
      if (item.sections) {
        item.sections.forEach(function (sec, idx) {
          var details = document.createElement('details');
          details.className = 'fc-collapsible';
          if (isSelected && idx === 0 && !imageDiv) details.setAttribute('open', '');
          if (isSelected && idx === 0 && imageDiv) details.setAttribute('open', '');
          var summary = document.createElement('summary');
          summary.className = 'fc-collapsible-title';
          summary.innerHTML = sec.title;
          var body = document.createElement('div');
          body.className = 'fc-collapsible-body';
          body.innerHTML = sec.content;
          details.appendChild(summary);
          details.appendChild(body);
          sectionElements.push(details);
        });
      }

      // Assemble card
      card.appendChild(header);
      card.appendChild(selectRow);
      card.appendChild(summaryDiv);
      card.appendChild(notesWrap);
      if (imageDiv) card.appendChild(imageDiv);
      sectionElements.forEach(function (el) { card.appendChild(el); });

      cardsRow.appendChild(card);
    });

    container.appendChild(cardsRow);

    // Event delegation — selection
    container.addEventListener('change', function (e) {
      if (e.target.classList.contains('fc-radio')) {
        state.selected = e.target.value;
        saveState(cardsetId, state);
        updateSelection(container, state.selected);
      }
    });

    // Event delegation — notes
    container.addEventListener('input', function (e) {
      if (e.target.classList.contains('fc-notes-input')) {
        var cid = e.target.getAttribute('data-card-id');
        state.notes[cid] = e.target.value;
        saveState(cardsetId, state);
      }
    });
  }

  function updateSelection(container, selectedId) {
    var cards = container.querySelectorAll('.fc-card');
    for (var i = 0; i < cards.length; i++) {
      var cardId = cards[i].getAttribute('data-card-id');
      var isSelected = cardId === selectedId;
      cards[i].classList.toggle('fc-card--selected', isSelected);

      var indicator = cards[i].querySelector('.fc-indicator');
      if (indicator) indicator.classList.toggle('fc-indicator--active', isSelected);
      var selectText = cards[i].querySelector('.fc-select-text');
      if (selectText) selectText.textContent = isSelected ? 'Selected' : 'Select';

      // Collapse/expand: selected card opens first collapsible, others close
      var details = cards[i].querySelectorAll('.fc-collapsible');
      for (var d = 0; d < details.length; d++) {
        if (isSelected && d === 0) {
          details[d].setAttribute('open', '');
        } else {
          details[d].removeAttribute('open');
        }
      }
    }
  }

  // Initialize all frontier card containers
  function initAll() {
    var containers = document.querySelectorAll('.fc-container');
    containers.forEach(function (container) {
      var cardsetId = container.getAttribute('data-cardset');
      if (!cardsetId) return;
      var dataEl = document.getElementById('fc-data-' + cardsetId);
      if (!dataEl) return;
      try {
        var data = JSON.parse(dataEl.textContent);
        renderCards(container, cardsetId, data);
      } catch (e) {
        container.innerHTML = '<p style="color:#f85149;">Error loading card data.</p>';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
