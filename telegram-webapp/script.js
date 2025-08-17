/* ===== ДАННЫЕ СЛОТОВ (пример) =====
   ключ — ISO-дата (YYYY-MM-DD), значение — массив времён */
const SLOTS_BY_DATE = {
  // примеры — замени/подгружай с API позже
  "2025-08-18": ["10:00", "11:00", "12:30", "14:00", "15:00"],
  "2025-08-19": ["09:00", "10:30", "13:00"],
  "2025-08-20": ["12:00", "13:30", "16:00", "18:00"],
  "2025-09-02": ["10:00", "11:00", "12:00"]
};
/* ===== /данные ===== */

const monthLabel = document.getElementById('monthLabel');
const calendarGrid = document.getElementById('calendarGrid');
const timesGrid = document.getElementById('times');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const form = document.getElementById('form');

let viewYear, viewMonth;  // отображаемый месяц
let selectedDate = null;  // ISO YYYY-MM-DD
let selectedTime = null;  // "HH:MM"

// инициализация на текущем месяце
const now = new Date();
viewYear = now.getFullYear();
viewMonth = now.getMonth(); // 0..11

document.getElementById('prevMonth').onclick = () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
};
document.getElementById('nextMonth').onclick = () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
};

function pad(n){ return n < 10 ? '0' + n : n; }
function toISO(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; } // m: 0..11

function renderCalendar(){
  // заголовок месяца
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  monthLabel.textContent = `${monthNames[viewMonth]} ${viewYear}`;

  // расчёт первой недели (понедельник — первый день)
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
    const hasSlots = Boolean(SLOTS_BY_DATE[iso]?.length);

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
      // активная дата — ярко-розовая
      btn.className = 'h-10 rounded-lg text-white bg-brandPink border border-brandPink font-semibold';
    }

    btn.onclick = () => {
      selectedDate = iso;
      selectedTime = null;
      renderCalendar();     // перерисуем, чтобы подсветить выбранную дату
      renderTimes();        // покажем слоты
      syncFormState();
    };

    calendarGrid.appendChild(btn);
  }
}

function renderTimes(){
  timesGrid.innerHTML = '';
  selectedDateLabel.classList.add('hidden');

  if (!selectedDate) return;

  const arr = SLOTS_BY_DATE[selectedDate] || [];
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
      renderTimes();   // перерисуем, чтобы выделить
      syncFormState();
    };

    timesGrid.appendChild(btn);
  });
}

function syncFormState(){
  form.date.value = selectedDate || '';
  form.time.value = selectedTime || '';
  form.querySelector('button[type="submit"]').disabled = !(selectedDate && selectedTime);
}

// сабмит формы (пока просто демонстрация)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedDate || !selectedTime) return;

  const fd = new FormData(form);
  const payload = {
    name: fd.get('name'),
    phone: fd.get('phone'),
    date: fd.get('date'),
    time: fd.get('time'),
    tgUserId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null
  };

  console.log('Бронь:', payload);
  alert(`Забронировано: ${payload.date} ${payload.time}\nМы свяжемся с вами.`);

  if (window.Telegram && Telegram.WebApp) Telegram.WebApp.close();
});

// первичная отрисовка
renderCalendar();
renderTimes();
syncFormState();
