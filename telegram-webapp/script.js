/***** 1) НАСТРОЙКИ *****/
const API_BASE = 'https://script.google.com/macros/s/AKfycbxI5Hd2rE8CFvqLioYtugcvT9HKFcgzBVYLjuAnCGNp2dWiu479YUl6_3vIJUcwV8pE/exec'; // <- ТВОЙ /exec

/***** 2) ЭЛЕМЕНТЫ UI *****/
const monthLabel = document.getElementById('monthLabel');
const calendarGrid = document.getElementById('calendarGrid');
const timesGrid = document.getElementById('times');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const form = document.getElementById('form');
const submitBtn = form.querySelector('button[type="submit"]');

/***** 3) СОСТОЯНИЕ *****/
let viewYear, viewMonth;               // отображаемый месяц (0..11)
let selectedDate = null;               // 'YYYY-MM-DD'
let selectedTime = null;               // 'HH:MM'
window.SLOTS_BY_DATE = {};             // { 'YYYY-MM-DD': ['HH:MM', ...] }
window.SLOT_DETAILS = {};              // { date: { time: { rowIndex, start, end } } }

/***** 4) УТИЛИТЫ *****/
function pad(n){ return n < 10 ? '0' + n : '' + n; }
function toISO(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; } // m: 0..11
const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

/***** 5) API: ЗАГРУЗКА СЛОТОВ И БРОНЬ *****/
async function fetchSlotsForMonth(year, month0) {
  const month = `${year}-${pad(month0+1)}`; // YYYY-MM
  const resp = await fetch(`${API_BASE}?month=${month}`);
  const json = await resp.json();
  if (!json.ok) throw new Error(json.error || 'slots fetch error');
  window.SLOTS_BY_DATE = json.slots || {};
  window.SLOT_DETAILS  = json.detailed || {};
}

async function bookSelected(detail, name, phone) {
  const resp = await fetch(API_BASE, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ rowIndex: detail.rowIndex, name, phone })
  });
  const json = await resp.json();
  if (!json.ok) throw new Error(json.error || 'book error');
  return json;
}

/***** 6) РЕНДЕР КАЛЕНДАРЯ *****/
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

/***** 7) РЕНДЕР ВРЕМЕНИ (3 в ряд) *****/
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

/***** 8) СИНХРОНИЗАЦИЯ ФОРМЫ *****/
function syncFormState(){
  form.date.value = selectedDate || '';
  form.time.value = selectedTime || '';
  submitBtn.disabled = !(selectedDate && selectedTime);
}

/***** 9) НАВИГАЦИЯ ПО МЕСЯЦАМ С ЗАГРУЗКОЙ ИЗ API *****/
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

/***** 10) САБМИТ ФОРМЫ (БРОНЬ) *****/
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
    alert('Слот забронирован!');

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

/***** 11) СТАРТ *****/
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
