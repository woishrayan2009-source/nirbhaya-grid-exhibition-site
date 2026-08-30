(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     Elements
     --------------------------------------------------------------------- */
  const canvas = document.getElementById('hr-chart');
  const ctx = canvas.getContext('2d');
  const hrValueEl = document.getElementById('hr-value');
  const hrStateEl = document.getElementById('hr-state');
  const motionValueEl = document.getElementById('motion-value');
  const motionFillEl = document.getElementById('motion-fill');
  const motionCaptionEl = document.getElementById('motion-caption');
  const exerciseNoteEl = document.getElementById('exercise-note');
  const locationPanelEl = document.getElementById('location-panel');
  const locStatusEl = document.getElementById('loc-status');
  const locTriggerEl = document.getElementById('loc-trigger');
  const locTimeEl = document.getElementById('loc-time');
  const logListEl = document.getElementById('log-list');

  const btnPanic = document.getElementById('btn-panic');
  const btnExercise = document.getElementById('btn-exercise');
  const btnDistress = document.getElementById('btn-distress');
  const btnReset = document.getElementById('btn-reset');

  const overlay = document.getElementById('alert-overlay');
  const alertDetail = document.getElementById('alert-detail');
  const alertAck = document.getElementById('alert-ack');

  const MOTION_CAPTIONS = {
    baseline: 'Steady, low-amplitude movement — consistent with normal daily activity.',
    exercise: 'Elevated but rhythmic and periodic — consistent with sustained physical activity.',
    distress: 'Sharp, irregular, forceful movement — inconsistent with normal activity or exercise.'
  };

  /* ---------------------------------------------------------------------
     State
     --------------------------------------------------------------------- */
  const HISTORY_LEN = 70;
  const state = {
    mode: 'baseline',       // baseline | exercise | distress
    hr: 76,
    motion: 8,
    history: Array.from({ length: HISTORY_LEN }, () => 76),
    phase: 0,               // used for smooth oscillation
    modeStartedAt: 0,
    alerted: false,
    tickHandle: null
  };

  /* ---------------------------------------------------------------------
     Helpers
     --------------------------------------------------------------------- */
  function nowStamp() {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function jitter(spread) { return (Math.random() * 2 - 1) * spread; }

  function addLog(type, text) {
    const empty = logListEl.querySelector('.log-empty');
    if (empty) empty.remove();
    const li = document.createElement('li');
    li.className = type; // log-manual | log-auto | log-info
    li.innerHTML = `<span class="log-time">${nowStamp()}</span><span>${text}</span>`;
    logListEl.insertBefore(li, logListEl.firstChild);
  }

  function setControlsEnabled(enabled) {
    btnExercise.disabled = !enabled;
    btnDistress.disabled = !enabled;
    btnPanic.disabled = !enabled;
  }

  /* ---------------------------------------------------------------------
     Chart rendering
     --------------------------------------------------------------------- */
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function chartColor() {
    if (state.mode === 'distress') return getCss('--red');
    if (state.mode === 'exercise') return getCss('--amber');
    return getCss('--teal');
  }

  function getCss(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function drawChart() {
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    // gridlines
    ctx.strokeStyle = getCss('--border-soft');
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const min = 50, max = 200;
    const step = w / (HISTORY_LEN - 1);
    ctx.strokeStyle = chartColor();
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.history.forEach((v, i) => {
      const x = i * step;
      const y = h - ((clamp(v, min, max) - min) / (max - min)) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // leading dot
    const lastY = h - ((clamp(state.history[state.history.length - 1], min, max) - min) / (max - min)) * h;
    ctx.fillStyle = chartColor();
    ctx.beginPath();
    ctx.arc(w - step, lastY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------------------------------------------------------------------
     Simulation tick
     --------------------------------------------------------------------- */
  function tick() {
    if (state.alerted) return;
    const elapsed = performance.now() - state.modeStartedAt;
    state.phase += 0.35;

    if (state.mode === 'baseline') {
      state.hr = 76 + jitter(3);
      state.motion = clamp(8 + jitter(4), 0, 100);
      hrStateEl.textContent = 'Baseline';
      hrStateEl.dataset.state = 'baseline';
      motionFillEl.dataset.state = 'baseline';
      motionCaptionEl.textContent = MOTION_CAPTIONS.baseline;
    }

    else if (state.mode === 'exercise') {
      const rampMs = 6500;
      const t = clamp(elapsed / rampMs, 0, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      const targetHr = lerp(76, 142, eased);
      state.hr = targetHr + jitter(2);
      state.motion = clamp(38 + Math.sin(state.phase) * 8, 0, 100);

      if (t >= 1) {
        hrStateEl.textContent = 'Exercise';
        exerciseNoteEl.classList.add('is-visible');
      } else {
        hrStateEl.textContent = 'Exercise — rising';
      }
      hrStateEl.dataset.state = 'exercise';
      motionFillEl.dataset.state = 'exercise';
      motionCaptionEl.textContent = MOTION_CAPTIONS.exercise;
    }

    else if (state.mode === 'distress') {
      const rampMs = 1200;
      const detectMs = 1000; // "confirming" window after the spike, before auto-trigger
      const t = clamp(elapsed / rampMs, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const targetHr = lerp(state.distressStartHr, 178, eased);
      state.hr = targetHr + jitter(6);
      state.motion = clamp(78 + jitter(18), 0, 100);
      motionFillEl.dataset.state = 'distress';
      motionCaptionEl.textContent = MOTION_CAPTIONS.distress;

      if (elapsed < rampMs) {
        hrStateEl.textContent = 'Anomaly rising';
        hrStateEl.dataset.state = 'distress';
      } else if (elapsed < rampMs + detectMs) {
        hrStateEl.textContent = 'Detecting anomaly…';
        hrStateEl.dataset.state = 'detecting';
      } else if (!state.alerted) {
        triggerAlert('auto');
        return;
      }
    }

    state.history.push(clamp(state.hr, 40, 210));
    if (state.history.length > HISTORY_LEN) state.history.shift();
    hrValueEl.textContent = Math.round(state.hr);
    motionValueEl.textContent = `${Math.round(state.motion)}%`;
    motionFillEl.style.width = `${clamp(state.motion, 3, 100)}%`;
    drawChart();
  }

  /* ---------------------------------------------------------------------
     Alert flow
     --------------------------------------------------------------------- */
  function triggerAlert(type) {
    state.alerted = true;
    setControlsEnabled(false);
    btnPanic.disabled = true;

    const isAuto = type === 'auto';
    alertDetail.textContent = isAuto
      ? `Trigger: Automatic — anomaly detected\nHR ${Math.round(state.hr)} bpm (sharp spike) · Motion irregular, forceful\nNo button press received`
      : `Trigger: Manual — panic button pressed\nHR ${Math.round(state.hr)} bpm · Motion ${Math.round(state.motion)}%`;

    overlay.classList.add('is-visible');
    alertAck.focus();

    addLog(isAuto ? 'log-auto' : 'log-manual',
      isAuto ? 'Alert fired — Auto-Detected (anomaly confirmed)' : 'Alert fired — Manual (panic button)');

    overlay.dataset.pendingType = type;
  }

  function acknowledgeAlert() {
    overlay.classList.remove('is-visible');
    const type = overlay.dataset.pendingType || 'manual';
    locStatusEl.textContent = 'Location shared with emergency contact';
    locTriggerEl.textContent = type === 'auto' ? 'Automatic — anomaly detected' : 'Manual — panic button';
    locTimeEl.textContent = nowStamp();
    locationPanelEl.classList.add('is-visible');
    addLog('log-info', 'Alert acknowledged — live location shared');
    btnReset.focus();
  }

  /* ---------------------------------------------------------------------
     Controls
     --------------------------------------------------------------------- */
  function startMode(mode) {
    state.mode = mode;
    state.modeStartedAt = performance.now();
    if (mode === 'distress') state.distressStartHr = state.hr;
    if (mode === 'exercise') exerciseNoteEl.classList.remove('is-visible');
    if (mode !== 'exercise') exerciseNoteEl.classList.remove('is-visible');
  }

  btnExercise.addEventListener('click', () => {
    if (state.alerted) return;
    btnExercise.disabled = true;
    btnDistress.disabled = true;
    addLog('log-info', 'Simulate Exercise started');
    startMode('exercise');
  });

  btnDistress.addEventListener('click', () => {
    if (state.alerted) return;
    btnExercise.disabled = true;
    btnDistress.disabled = true;
    addLog('log-info', 'Simulate Distress started');
    startMode('distress');
  });

  btnPanic.addEventListener('click', () => {
    if (state.alerted) return;
    triggerAlert('manual');
  });

  btnReset.addEventListener('click', () => {
    state.mode = 'baseline';
    state.hr = 76;
    state.motion = 8;
    state.history = Array.from({ length: HISTORY_LEN }, () => 76);
    state.alerted = false;
    state.modeStartedAt = performance.now();
    overlay.classList.remove('is-visible');
    locationPanelEl.classList.remove('is-visible');
    exerciseNoteEl.classList.remove('is-visible');
    hrStateEl.textContent = 'Baseline';
    hrStateEl.dataset.state = 'baseline';
    motionFillEl.dataset.state = 'baseline';
    motionCaptionEl.textContent = MOTION_CAPTIONS.baseline;
    setControlsEnabled(true);
    addLog('log-info', 'Demo reset');
    drawChart();
  });

  alertAck.addEventListener('click', acknowledgeAlert);

  window.addEventListener('resize', () => { resizeCanvas(); drawChart(); });

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  resizeCanvas();
  state.modeStartedAt = performance.now();
  state.tickHandle = setInterval(tick, 200);
  drawChart();
})();
