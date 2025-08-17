const slotContainer = document.getElementById('slots');
let selectedSlot = null;

// Пример слотов (заглушка)
const slots = [
  { id: 1, date: '2025-08-18', time: '10:00' },
  { id: 2, date: '2025-08-18', time: '11:00' },
  { id: 3, date: '2025-08-19', time: '14:00' }
];

slots.forEach(slot => {
  const btn = document.createElement('button');
  btn.textContent = `${slot.date} ${slot.time}`;
  btn.className = "block w-full border p-2 rounded hover:bg-blue-100";
  btn.onclick = () => {
    selectedSlot = slot;
    document.querySelectorAll('#slots button').forEach(b => b.classList.remove('bg-blue-200'));
    btn.classList.add('bg-blue-200');
  };
  slotContainer.appendChild(btn);
});

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedSlot) return alert('Выберите слот');

  const formData = new FormData(e.target);
  const payload = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    slotId: selectedSlot.id,
  };

  console.log("Отправка данных:", payload);
  alert("Запись успешно отправлена!");

  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.close();
  }
});
