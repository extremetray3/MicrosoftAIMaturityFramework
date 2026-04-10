// ===========================================
// Maturity Cards — Interactive Level Assessment
// ===========================================
(function () {
  'use strict';

  var STORAGE_PREFIX = 'aimat-maturity-';
  var CUSTOMER_KEY = 'aimat-notes-customer';

  function getCustomer() {
    try { return localStorage.getItem(CUSTOMER_KEY) || ''; } catch (e) { return ''; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function loadState(pillarId) {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + pillarId);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { selected: '100', notes: {} };
  }

  function saveState(pillarId, state) {
    try {
      localStorage.setItem(STORAGE_PREFIX + pillarId, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  function renderCards(container, pillarId, data) {
    var state = loadState(pillarId);
    if (!state.selected) state.selected = '100';
    if (!state.notes) state.notes = {};

    container.innerHTML = '';

    // Cards wrapper (horizontal layout)
    var cardsRow = document.createElement('div');
    cardsRow.className = 'mc-cards-row';

    data.forEach(function (level) {
      var lvl = String(level.level);
      var isSelected = state.selected === lvl;

      var card = document.createElement('div');
      card.className = 'mc-card' + (isSelected ? ' mc-card--selected' : '');
      card.setAttribute('data-level', lvl);

      // Level badge
      var badge = document.createElement('div');
      badge.className = 'mc-card-badge mc-badge-' + lvl;
      badge.innerHTML = '<span class="mc-level-num">' + lvl + '</span>' +
        '<span class="mc-level-title">' + escapeHtml(level.title) + '</span>';

      // Select indicator (hidden radio + custom visual)
      var selectRow = document.createElement('div');
      selectRow.className = 'mc-select-row';
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'mc-level-' + pillarId;
      radio.value = lvl;
      radio.className = 'mc-radio';
      radio.checked = isSelected;
      radio.setAttribute('aria-label', 'Select Level ' + lvl);
      radio.id = 'mc-radio-' + pillarId + '-' + lvl;
      var selectLabel = document.createElement('label');
      selectLabel.className = 'mc-select-label';
      selectLabel.setAttribute('for', radio.id);
      selectLabel.innerHTML = '<span class="mc-indicator' + (isSelected ? ' mc-indicator--active' : '') + '"></span>' +
        '<span class="mc-select-text">' + (isSelected ? 'Current Level' : 'Select') + '</span>';
      selectRow.appendChild(radio);
      selectRow.appendChild(selectLabel);

      // Notes textarea (above content controls)
      var notesWrap = document.createElement('div');
      notesWrap.className = 'mc-card-notes';
      var notesArea = document.createElement('textarea');
      notesArea.className = 'mc-notes-input';
      notesArea.placeholder = 'Notes for Level ' + lvl + '…';
      notesArea.rows = 2;
      notesArea.value = state.notes[lvl] || '';
      notesArea.setAttribute('data-level', lvl);
      notesWrap.appendChild(notesArea);

      // State section (collapsible) — open only if selected
      var stateSection = createCollapsible(
        '📋 State of ' + escapeHtml(level.stateLabel || level.title),
        level.state, isSelected
      );

      // Opportunity section (collapsible) — always closed by default
      var oppSection = createCollapsible(
        '🚀 Opportunity to progress',
        level.opportunity, false
      );

      card.appendChild(badge);
      card.appendChild(selectRow);
      card.appendChild(notesWrap);
      card.appendChild(stateSection);
      card.appendChild(oppSection);
      cardsRow.appendChild(card);
    });

    container.appendChild(cardsRow);

    // Event delegation
    container.addEventListener('change', function (e) {
      if (e.target.classList.contains('mc-radio')) {
        state.selected = e.target.value;
        saveState(pillarId, state);
        updateSelection(container, state.selected);
      }
    });

    container.addEventListener('input', function (e) {
      if (e.target.classList.contains('mc-notes-input')) {
        var lvl = e.target.getAttribute('data-level');
        state.notes[lvl] = e.target.value;
        saveState(pillarId, state);
      }
    });
  }

  function createCollapsible(title, contentHtml, openByDefault) {
    var details = document.createElement('details');
    details.className = 'mc-collapsible';
    if (openByDefault) details.setAttribute('open', '');

    var summary = document.createElement('summary');
    summary.className = 'mc-collapsible-title';
    summary.innerHTML = title;

    var body = document.createElement('div');
    body.className = 'mc-collapsible-body';
    body.innerHTML = contentHtml;

    details.appendChild(summary);
    details.appendChild(body);
    return details;
  }

  function updateSelection(container, selectedLevel) {
    var cards = container.querySelectorAll('.mc-card');
    for (var i = 0; i < cards.length; i++) {
      var cardLevel = cards[i].getAttribute('data-level');
      var isSelected = cardLevel === selectedLevel;
      cards[i].classList.toggle('mc-card--selected', isSelected);

      // Update indicator
      var indicator = cards[i].querySelector('.mc-indicator');
      if (indicator) indicator.classList.toggle('mc-indicator--active', isSelected);
      var selectText = cards[i].querySelector('.mc-select-text');
      if (selectText) selectText.textContent = isSelected ? 'Current Level' : 'Select';

      // Collapse/expand: selected card gets first section open; non-selected all closed
      var details = cards[i].querySelectorAll('.mc-collapsible');
      for (var d = 0; d < details.length; d++) {
        if (isSelected && d === 0) {
          details[d].setAttribute('open', '');
        } else {
          details[d].removeAttribute('open');
        }
      }
    }
  }

  // Export maturity assessment as markdown
  window.exportMaturityAssessment = function () {
    var customer = getCustomer() || 'Unknown Customer';
    var dateStr = new Date().toISOString().slice(0, 10);
    var lines = [];

    lines.push('# AI Maturity Assessment — ' + customer);
    lines.push('**Date:** ' + dateStr);
    lines.push('');

    // Gather all maturity states
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(STORAGE_PREFIX) === 0) keys.push(k);
      }
    } catch (e) { /* ignore */ }

    keys.sort();

    if (keys.length === 0) {
      alert('No maturity assessments to export.');
      return;
    }

    // Summary table
    lines.push('## Summary');
    lines.push('');
    lines.push('| Pillar | Selected Level |');
    lines.push('|:---|:---|');

    for (var j = 0; j < keys.length; j++) {
      try {
        var data = JSON.parse(localStorage.getItem(keys[j]));
        var pillarName = keys[j].substring(STORAGE_PREFIX.length).replace(/-/g, ' ');
        pillarName = pillarName.charAt(0).toUpperCase() + pillarName.slice(1);
        lines.push('| ' + pillarName + ' | Level ' + (data.selected || 'N/A') + ' |');

        // Detail section
        lines.push('');
        lines.push('### ' + pillarName);
        lines.push('**Selected Level:** ' + (data.selected || 'N/A'));
        if (data.notes) {
          var lvls = Object.keys(data.notes);
          for (var n = 0; n < lvls.length; n++) {
            if (data.notes[lvls[n]]) {
              lines.push('');
              lines.push('**Level ' + lvls[n] + ' Notes:** ' + data.notes[lvls[n]]);
            }
          }
        }
        lines.push('');
      } catch (e) { /* skip */ }
    }

    var filename = 'maturity-assessment-' + customer.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + dateStr + '.md';
    var blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Init: find all maturity containers and render
  function init() {
    var containers = document.querySelectorAll('.mc-container');
    for (var i = 0; i < containers.length; i++) {
      var pillarId = containers[i].getAttribute('data-pillar');
      var dataScript = document.getElementById('mc-data-' + pillarId);
      if (pillarId && dataScript) {
        try {
          var data = JSON.parse(dataScript.textContent);
          renderCards(containers[i], pillarId, data);
        } catch (e) {
          containers[i].innerHTML = '<p style="color: #f85149;">Error loading maturity data.</p>';
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
