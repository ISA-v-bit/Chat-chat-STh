/* script.js — лендинг + ленивый инит записи (WebApp) */
import { renderHeader } from '/components/header.js';
import { renderHero }   from '/components/hero.js';
import { renderAbout }  from '/components/about.js';
import { renderValues } from '/components/values.js';
import { renderCTA }    from '/components/cta.js';
// Если используешь модальную форму — раскомментируй:
// import { mountModal }   from '/components/modal-form.js';

/* ===== 0. Глобальные ENV (можно пробросить из index.html в window.ENV) ===== */
const APP_SCRIPT_URL = (window.ENV && window.ENV.APP_SCRIPT_URL) || '';
const API_GET  = '/api/sheets-get';
const API_POST = '/api/sheets-post';

/* ===== 1. Рендер «лендинга» сразу ===== */
renderHeader(document.querySelector('#app-header'));
renderHero(document.querySelector('#hero'));
renderAbout(document.querySelector('#about'));
renderValues(document.querySelector('#values'));
renderCTA(document.querySelector('#cta'));
// mountModal?.(document.querySelector('#modal-root')); // если нужна модалка

/* ===== 2. Telegram WebApp «мягкая» инициализация ===== */
(function initTG() {
  const tg = window?.Telegram?.WebApp;
  if (!tg) return;
  try { tg.ready(); tg.expand?.(); } catch {}
})();

/* ===== 3. Блок записи: оборачиваем твою логику в неймспейс Booking ===== */
const Booking = (() => {
  console.log('webapp build v13 (lazy init apply)');

  // ------ DOM-ссылки (будут подтянуты при initOnce) ------
  let monthLabel, calendarGrid, timesGrid, selectedDateLabel, form, submitBtn;

  // ------ Состояние ------
  let viewYear, viewMonth;               // отображаемый месяц (0..11)
  let selectedDate = null;               // 'YYYY-MM-DD'
  let selectedTime = null;               // 'HH:MM'
  window.SLOTS_BY_DATE = {};             // { 'YYYY-MM-DD': ['HH:MM', ...] }
  window.SLOT_DETAILS = {};              // { date: { time: { rowIndex, start, end } } }

  // ------ Утилиты ------
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const pad   = n => (n < 10 ? '0' + n : '' + n);
  const toISO = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;

  function addMinutesToHHMM(hhmm, mins) {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
  }
  function toGCalUTC(dateISO, hhmm) {
    const [y, mo, d] = dateISO.split('-').map(Number);
    const [hh, mm] = hhmm.split(':').map(Number);
    const local = new Date(y, mo - 1, d, hh, mm, 0);
    const Y = local.getUTCFullYear();
    const M = String(local.getUTCMonth() + 1).padStart(2, '0');
    const D = String(local.getUTCDate()).padStart(2, '0');
    const H = String(local.getUTCHours()).padStart(2, '0');
    const Min = String(local.getUTCMinutes()).padStart(2, '0');
    return `${Y}${M}${D}T${H}${Min}00Z`;
  }

  // ------ API ------
  async function fetchSlotsForMonth(year, month0) {
    const month = `${year}-${String(month0+1).padStart(2,'0')}`;
    const res = await fetch(`${API_GET}?month=${month}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'slots fetch error');
    window.SLOTS_BY_DATE = json.slots || {};
    window.SLOT_DETAILS  = json.detailed || {};
  }
  async function bookSelected(detail, name, phone) {
    const res = await fetch(API_POST, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ rowIndex: detail.rowIndex, name, phone })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'book error');
    return json;
  }

  // ------ Рендер ------
  function renderCalendar(){
    monthLabel.textContent = `${monthNames[viewMonth]} ${viewYear}`;

    const first = new Date(viewYear, viewMonth, 1);
    const firstWeekday = (first.getDay() + 6) % 7; // 0=Пн ... 6=Вс
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    calendarGrid.innerHTML = '';

    for (let i = 0; i < firstWeekday; i++){
      const blank = document.createElement('div');
      calendarGrid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++){
      const iso = toISO(viewYear, viewMonth, d);
      const hasSlots = Boolean(window.SLOTS_BY_DATE[iso]?.length);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = d;
      btn.className = `
        h-10 rounded-lg border text-sm
        ${hasSlots
          ? 'border-brandPink text-brandDark bg-brandPink/10 hover:bg-brandPink/20'
          : 'border-brandDark/20 text-brandDark/50 cursor-default'}
      `;
      if (!hasSlots) btn.disabled = true;

      if (selectedDate === iso) {
        btn.className = 'h-10 rounded-lg text-white bg-brandPink border border-brandPink font-semibold';
      }

      btn.onclick = () => {
        selectedDate = iso;
        selectedTime = null;
        renderCalendar();
        renderTimes();
        syncFormState();
      };

      calendarGrid.appendChild(btn);
    }
  }

  function renderTimes(){
    timesGrid.innerHTML = '';
    selectedDateLabel.classList.add('hidden');
    if (!selectedDate) return;

    const arr = window.SLOTS_BY_DATE[selectedDate] || [];
    if (arr.length === 0) {
      timesGrid.innerHTML = `<div class="col-span-3 text-center text-sm text-brandDark/60 py-2">
        На выбранную дату слотов нет
      </div>`;
      return;
    }

    selectedDateLabel.textContent = new Date(selectedDate).toLocaleDateString(
      'ru-RU', { day:'2-digit', month:'long', year:'numeric' }
    );
    selectedDateLabel.classList.remove('hidden');

    arr.forEach(time => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = time;
      btn.className = `
        px-2 py-3 rounded-lg border text-center font-medium
        bg-white text-brandDark border-brandDark/30 shadow-sm
        hover:bg-brandPink/10 hover:border-brandPink transition
      `;
      if (selectedTime === time) {
        btn.className = `
          px-2 py-3 rounded-lg border text-center font-semibold
          bg-brandPink text-white border-brandPink shadow
        `;
      }
      btn.onclick = () => {
        selectedTime = time;
        renderTimes();
        syncFormState();
      };
      timesGrid.appendChild(btn);
    });
  }

  function syncFormState(){
    form.date.value = selectedDate || '';
    form.time.value = selectedTime || '';
    submitBtn.disabled = !(selectedDate && selectedTime);
  }

  async function loadAndRenderMonth() {
    calendarGrid.innerHTML = `<div class="col-span-7 text-center text-sm text-brandDark/60 py-2">Загрузка…</div>`;
    try {
      await fetchSlotsForMonth(viewYear, viewMonth);
    } catch (e) {
      calendarGrid.innerHTML = `<div class="col-span-7 text-center text-sm text-red-600 py-2">Ошибка загрузки слотов: ${e.message}</div>`;
      return;
    }
    if (selectedDate && !selectedDate.startsWith(`${viewYear}-${pad(viewMonth+1)}`)) {
      selectedDate = null;
      selectedTime = null;
    }
    renderCalendar();
    renderTimes();
    syncFormState();
  }

  function bindNav() {
    document.getElementById('prevMonth').onclick = async () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      await loadAndRenderMonth();
    };
    document.getElementById('nextMonth').onclick = async () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      await loadAndRenderMonth();
    };
  }

  function bindSubmit() {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedDate || !selectedTime) return;

      const fd = new FormData(form);
      const detail = window.SLOT_DETAILS?.[selectedDate]?.[selectedTime];
      if (!detail?.rowIndex) {
        alert('Не найден слот для бронирования. Обновите страницу.');
        return;
      }

      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Бронируем…';

      try {
        await bookSelected(detail, fd.get('name'), fd.get('phone'));

        // gCal deep link
        const dateISO = selectedDate;
        const startHHMM = selectedTime;
        const endHHMM = (window.SLOT_DETAILS?.[dateISO]?.[startHHMM]?.end) || addMinutesToHHMM(startHHMM, 30);
        const startUTC = toGCalUTC(dateISO, startHHMM);
        const endUTC   = toGCalUTC(dateISO, endHHMM);

        const gcalUrl =
          `https://calendar.google.com/calendar/render?action=TEMPLATE` +
          `&text=${encodeURIComponent('Университет Мышления — встреча')}` +
          `&dates=${startUTC}/${endUTC}` +
          `&details=${encodeURIComponent('Ваша запись подтверждена.')}`;

        if (confirm('Слот забронирован! Добавить в Google Календарь?')) {
          window.open(gcalUrl, '_blank');
        }

        await loadAndRenderMonth();
        if (window.Telegram && Telegram.WebApp) Telegram.WebApp.close();
      } catch (err) {
        alert('Не удалось забронировать: ' + err.message);
      } finally {
        submitBtn.textContent = originalText;
        syncFormState();
      }
    });
  }

  // ---- Публичный метод: инициализировать блок записи один раз ----
  let inited = false;
  function initOnce() {
    if (inited) return;
    inited = true;

    // подтягиваем DOM-элементы только сейчас
    monthLabel        = document.getElementById('monthLabel');
    calendarGrid      = document.getElementById('calendarGrid');
    timesGrid         = document.getElementById('times');
    selectedDateLabel = document.getElementById('selectedDateLabel');
    form              = document.getElementById('form');
    submitBtn         = form?.querySelector('button[type="submit"]');

    // стартовые значения месяца
    const now = new Date();
    viewYear  = now.getFullYear();
    viewMonth = now.getMonth();

    bindNav();
    bindSubmit();
    // первичная отрисовка (до загрузки слотов)
    renderCalendar();
    renderTimes();
    syncFormState();

    // загрузка данных и повторная отрисовка
    loadAndRenderMonth();
  }

  return { initOnce };
})();

/* ===== 4. Ленивая инициализация блока #apply ===== */
(function lazyInitApply() {
  const applyEl = document.getElementById('apply');
  if (!applyEl) return;

  // 1) При клике на любые ссылки, ведущие к #apply
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#apply"]');
    if (a) Booking.initOnce();
  });

  // 2) При смене якоря на #apply
  window.addEventListener('hashchange', () => {
    if (location.hash === '#apply') Booking.initOnce();
  });

  // 3) Когда секция попадает в вьюпорт (IntersectionObserver)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        Booking.initOnce();
        io.disconnect();
      }
    });
  }, { rootMargin: '0px 0px -20% 0px' });
  io.observe(applyEl);

  // 4) Если страница уже открыта с #apply
  if (location.hash === '#apply') Booking.initOnce();
})();
