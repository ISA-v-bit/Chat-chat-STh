export default async function handler(req, res) {
  // Telegram шлёт POST
  if (req.method !== 'POST') {
    return res.status(200).send('ok');
  }

  try {
    const update = req.body; // Vercel парсит JSON автоматически
    const token = process.env.BOT_TOKEN; // добавим в переменные окружения
    const api = (method, payload) =>
      fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

    const msg = update.message;
    const text = msg?.text;

    // Реакция на /start
    if (text === '/start') {
      await api('sendMessage', {
        chat_id: msg.chat.id,
        text: 'Выберите время для записи:',
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Открыть календарь',
              web_app: { url: 'https://chat-chat-s-th.vercel.app' }
            }
          ]]
        }
      });
    }

    // Всегда отвечаем 200 OK, чтобы Telegram не ретрайл
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Не паникуем — всё равно 200, но логируем
    console.error(e);
    return res.status(200).json({ ok: true });
  }
}
