/* ==========================================================================
   100 Calculators — Core Framework
   Real-time calculation engine, toggle groups, donut charts, formatting
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Number Formatting ---------- */
  const fmt = {
    number(val, decimals = 0) {
      if (val == null || isNaN(val)) return '—';
      return Number(val).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    },
    compact(val) {
      if (val == null || isNaN(val)) return '—';
      if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
      return this.number(val);
    },
    currency(val, decimals = 2) {
      if (val == null || isNaN(val)) return '—';
      return '$' + this.number(val, decimals);
    },
    percent(val, decimals = 0) {
      if (val == null || isNaN(val)) return '—';
      return this.number(val, decimals) + '%';
    },
  };

  /* ---------- Input Helpers ---------- */
  function clampToBounds(value, el) {
    let next = value;
    const minAttr = el.getAttribute('min');
    const maxAttr = el.getAttribute('max');
    if (minAttr !== null) {
      const min = parseFloat(minAttr);
      if (!isNaN(min)) next = Math.max(next, min);
    }
    if (maxAttr !== null) {
      const max = parseFloat(maxAttr);
      if (!isNaN(max)) next = Math.min(next, max);
    }
    return next;
  }

  function parseNumericInput(el) {
    const raw = String(el.value ?? '').trim().replace(/,/g, '');
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return 0;
    return clampToBounds(parsed, el);
  }

  function normalizeNumberInput(el) {
    if (!el || (el.type !== 'number' && el.type !== 'range')) return;
    const raw = String(el.value ?? '').trim();
    if (!raw) return;
    const normalized = parseNumericInput(el);
    el.value = String(normalized);
  }

  function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number' || el.type === 'range') return parseNumericInput(el);
    const v = parseFloat(String(el.value ?? '').replace(/,/g, ''));
    return isNaN(v) ? 0 : v;
  }

  function setResult(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setResultColor(id, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('result-good', 'result-warn', 'result-bad');
    if (cls) el.classList.add(cls);
  }

  /* ---------- Toggle Groups ---------- */
  function initToggles() {
    document.querySelectorAll('.toggle-group').forEach(group => {
      const buttons = group.querySelectorAll('.toggle-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const inputId = group.dataset.for;
          if (inputId) {
            const hidden = document.getElementById(inputId);
            if (hidden) {
              hidden.value = btn.dataset.value;
              hidden.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
          document.dispatchEvent(new CustomEvent('calc:input'));
        });
      });
    });
  }

  function getToggleVal(groupId) {
    const group = document.getElementById(groupId);
    if (!group) {
      const groups = document.querySelectorAll(`.toggle-group[data-for="${groupId}"]`);
      if (groups.length) {
        const active = groups[0].querySelector('.toggle-btn.active');
        return active ? active.dataset.value : '';
      }
      return '';
    }
    if (group.classList.contains('toggle-group')) {
      const active = group.querySelector('.toggle-btn.active');
      return active ? active.dataset.value : '';
    }
    return group.value || '';
  }

  /* ---------- Range Slider Sync ---------- */
  function initSliders() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      const display = document.getElementById(slider.id + '-val');
      if (display) {
        const update = () => { display.textContent = slider.value; };
        update();
        slider.addEventListener('input', update);
      }
    });
  }

  /* ---------- Donut Chart ---------- */
  function drawDonut(canvasId, segments, opts = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = opts.size || 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 4;
    const innerR = outerR * (opts.thickness || 0.65);
    const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);

    ctx.clearRect(0, 0, size, size);

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, innerR, Math.PI * 2, 0, true);
      ctx.fillStyle = '#e5e7eb';
      ctx.fill();
      return;
    }

    let angle = -Math.PI / 2;
    segments.forEach(seg => {
      const sweep = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, angle, angle + sweep);
      ctx.arc(cx, cy, innerR, angle + sweep, angle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      angle += sweep;
    });

    // update legend
    const legend = document.getElementById(canvasId + '-legend');
    if (legend) {
      legend.innerHTML = segments
        .filter(s => s.value > 0)
        .map(s => `
          <div class="chart-legend-item">
            <span class="swatch" style="background:${s.color}"></span>
            ${s.label}: <strong>${s.display || fmt.number(s.value)}</strong>
          </div>
        `)
        .join('');
    }

    // update center text
    const center = document.getElementById(canvasId + '-center');
    if (center && opts.centerText) {
      center.innerHTML = `
        <div class="chart-total">${opts.centerText}</div>
        ${opts.centerLabel ? `<div class="chart-label">${opts.centerLabel}</div>` : ''}
      `;
    }
  }

  /* ---------- Bar Chart (horizontal) ---------- */
  function drawBars(containerId, items, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const max = Math.max(...items.map(i => i.value), 1);
    container.innerHTML = items
      .map(
        item => `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:0.85rem;font-weight:600">${item.label}</span>
            <span style="font-family:var(--font-mono);font-size:0.85rem;font-weight:600">${item.display || item.value}</span>
          </div>
          <div style="background:var(--bg-alt);border-radius:6px;height:12px;overflow:hidden">
            <div style="background:${item.color || 'var(--primary)'};height:100%;border-radius:6px;width:${(item.value / max) * 100}%;transition:width 0.3s ease"></div>
          </div>
        </div>
      `
      )
      .join('');
  }

  /* ---------- Calculator Init ---------- */
  function initCalculator(calcFn) {
    initToggles();
    initSliders();

    // bind all inputs
    document.querySelectorAll('input, select').forEach(el => {
      if (el.type === 'number' || el.type === 'range') {
        el.addEventListener('blur', () => {
          normalizeNumberInput(el);
          calcFn();
        });
      }
      el.addEventListener('input', () => calcFn());
      el.addEventListener('change', () => calcFn());
    });

    // listen for toggle changes
    document.addEventListener('calc:input', () => calcFn());

    // normalize numeric fields first to keep calculations in valid bounds
    document.querySelectorAll('input[type="number"], input[type="range"]').forEach(el => normalizeNumberInput(el));

    // initial calculation
    calcFn();
  }

  /* ---------- Export ---------- */
  window.CalcCore = {
    fmt,
    getVal,
    setResult,
    setResultColor,
    getToggleVal,
    drawDonut,
    drawBars,
    initCalculator,
  };
})();
