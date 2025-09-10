/***** 1) НАСТРОЙКИ (rollback) *****/
(() => {
  console.log('webapp build v12 (via Vercel proxy)');

  // === ЭНДПОИНТЫ ПРОКСИ ===
  const API_GET  = '/api/sheets-get';
  const API_POST = '/api/sheets-post';

  // === API ===
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
/***** 3) ЭЛЕМЕНТЫ UI *****/
const monthLabel = document.getElementById('monthLabel');
const calendarGrid = document.getElementById('calendarGrid');
const timesGrid = document.getElementById('times');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const form = document.getElementById('form');
const submitBtn = form.querySelector('button[type="submit"]');

/***** 4) СОСТОЯНИЕ *****/
let viewYear, viewMonth;               // отображаемый месяц (0..11)
let selectedDate = null;               // 'YYYY-MM-DD'
let selectedTime = null;               // 'HH:MM'
window.SLOTS_BY_DATE = {};             // { 'YYYY-MM-DD': ['HH:MM', ...] }
window.SLOT_DETAILS = {};              // { date: { time: { rowIndex, start, end } } }

/***** 5) УТИЛИТЫ *****/
function pad(n){ return n < 10 ? '0' + n : '' + n; }
function toISO(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; } // m: 0..11
const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

/***** 5a) ХЕЛПЕРЫ ДЛЯ КАЛЕНДАРЯ *****/
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

/***** 6) API: ЗАГРУЗКА СЛОТОВ И БРОНЬ *****/
async function fetchSlotsForMonth(year, month0) {
  const month = `${year}-${String(month0+1).padStart(2,'0')}`;
  const resp = await fetch(`/api/sheets-get?month=${month}`);
  const json = await resp.json();
  if (!json.ok) throw new Error(json.error || 'slots fetch error');
  window.SLOTS_BY_DATE = json.slots || {};
  window.SLOT_DETAILS  = json.detailed || {};
}

async function bookSelected(detail, name, phone) {
  const resp = await fetch('/api/sheets-post', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ rowIndex: detail.rowIndex, name, phone })
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(json.error || 'book error');
  return json;
}
/***** 7) РЕНДЕР КАЛЕНДАРЯ *****/
function renderCalendar(){
  monthLabel.textContent = `${monthNames[viewMonth]} ${viewYear}`;

  // расчёт первой недели (Пн — первый день)
  const first = new Date(viewYear, viewMonth, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // 0=Пн ... 6=Вс
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  calendarGrid.innerHTML = '';

  // пустые ячейки до первого дня
  for (let i = 0; i < firstWeekday; i++){
    const blank = document.createElement('div');
    calendarGrid.appendChild(blank);
  }

  // дни месяца
  for (let d = 1; d <= daysInMonth; d++){
    const iso = toISO(viewYear, viewMonth, d);
    const hasSlots = Boolean(window.SLOTS_BY_DATE[iso]?.length);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = d;

    // базовые классы клетки
    btn.className = `
      h-10 rounded-lg border text-sm
      ${hasSlots
        ? 'border-brandPink text-brandDark bg-brandPink/10 hover:bg-brandPink/20'
        : 'border-brandDark/20 text-brandDark/50 cursor-default'}
    `;
    if (!hasSlots) btn.disabled = true;

    // выделение выбранной даты
    if (selectedDate === iso) {
      btn.className = 'h-10 rounded-lg text-white bg-brandPink border border-brandPink font-semibold';
    }

    btn.onclick = () => {
      selectedDate = iso;
      selectedTime = null;
      renderCalendar();  // перерисуем выделение даты
      renderTimes();     // покажем слоты времени
      syncFormState();
    };

    calendarGrid.appendChild(btn);
  }
}

/***** 8) РЕНДЕР ВРЕМЕНИ (3 в ряд) *****/
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

  selectedDateLabel.textContent = new Date(selectedDate).toLocaleDateString('ru-RU', { day:'2-digit', month:'long', year:'numeric' });
  selectedDateLabel.classList.remove('hidden');

  arr.forEach(time => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = time;

    // default стиль
    btn.className = `
      px-2 py-3 rounded-lg border text-center font-medium
      bg-white text-brandDark border-brandDark/30 shadow-sm
      hover:bg-brandPink/10 hover:border-brandPink transition
    `;

    // выделение выбранного времени
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

/***** 9) СИНХРОНИЗАЦИЯ ФОРМЫ *****/
function syncFormState(){
  form.date.value = selectedDate || '';
  form.time.value = selectedTime || '';
  submitBtn.disabled = !(selectedDate && selectedTime);
}

/***** 10) НАВИГАЦИЯ ПО МЕСЯЦАМ С ЗАГРУЗКОЙ ИЗ API *****/
async function loadAndRenderMonth() {
  // можно повесить лоадер
  calendarGrid.innerHTML = `<div class="col-span-7 text-center text-sm text-brandDark/60 py-2">Загрузка…</div>`;
  try {
    await fetchSlotsForMonth(viewYear, viewMonth);
  } catch (e) {
    calendarGrid.innerHTML = `<div class="col-span-7 text-center text-sm text-red-600 py-2">Ошибка загрузки слотов: ${e.message}</div>`;
    return;
  }
  // если выбранная дата вне текущего месяца — сбросим выбор
  if (selectedDate && !selectedDate.startsWith(`${viewYear}-${pad(viewMonth+1)}`)) {
    selectedDate = null;
    selectedTime = null;
  }
  renderCalendar();
  renderTimes();
  syncFormState();
}

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

/***** 11) САБМИТ ФОРМЫ (БРОНЬ) *****/
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
  submitBtn.textContent = 'Бронируем…';

  try {
    await bookSelected(detail, fd.get('name'), fd.get('phone'));

// берём дату/время из выбранного состояния
const dateISO = selectedDate;              // 'YYYY-MM-DD'
const startHHMM = selectedTime;            // 'HH:MM'
const endHHMM = (window.SLOT_DETAILS?.[dateISO]?.[startHHMM]?.end)
  || addMinutesToHHMM(startHHMM, 30);      // fallback: +30 минут, если в таблице нет end

// формируем диапазон для Google Calendar в UTC-формате
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

// Обновим слоты месяца и UI
await loadAndRenderMonth();
if (window.Telegram && Telegram.WebApp) Telegram.WebApp.close();

    // Обновим данные месяца, чтобы слот пропал из "free"
    await loadAndRenderMonth();

    // Можно закрыть WebApp в Telegram
    if (window.Telegram && Telegram.WebApp) Telegram.WebApp.close();
  } catch (err) {
    alert('Не удалось забронировать: ' + err.message);
  } finally {
    submitBtn.textContent = 'Подтвердить запись';
    syncFormState();
  }
});

/***** 12) СТАРТ *****/
(function init(){
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  loadAndRenderMonth();
})();
// первичная отрисовка
renderCalendar();
renderTimes();
syncFormState();
  })();
