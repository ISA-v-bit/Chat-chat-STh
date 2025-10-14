import { getTelegramData } from '/lib/telegram.js';
import { parseUTM } from '/lib/analytics.js';
import { postJSON } from '/lib/form.js';

const APP_SCRIPT_URL = window.APP_SCRIPT_URL || (window.ENV && window.ENV.APP_SCRIPT_URL);

export function mountModal(root) {
  root.innerHTML = `
    <div class="modal hidden" id="leadModal" aria-hidden="true">
      <div class="modal__backdrop" data-close-modal></div>
      <div class="modal__dialog">
        <button class="modal__close" data-close-modal>×</button>
        <h3>Записаться на встречу</h3>
        <form id="leadForm">
          <label>Имя*<input name="name" required /></label>
          <label>Email*<input name="email" type="email" required /></label>
          <label>Роль/должность<input name="role" /></label>
          <label>Компания<input name="company" /></label>
          <label>Предпочтительное время<input name="preferred_time" /></label>
          <label>Комментарий<textarea name="comment"></textarea></label>
          <label class="agree">
            <input type="checkbox" required />
            Соглашаюсь на обработку персональных данных
          </label>
          <button class="btn btn-primary" type="submit">Отправить</button>
        </form>
        <div class="form-status" id="formStatus"></div>
      </div>
    </div>
  `;

  const modal = document.getElementById('leadModal');
  const form = document.getElementById('leadForm');
  const statusEl = document.getElementById('formStatus');

  function open()  { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); }
  function close() { modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); status(''); form.reset(); }
  function status(msg, isErr=false) { statusEl.textContent = msg; statusEl.className = 'form-status' + (isErr ? ' error' : ''); }

  // Глобальные триггеры открытия
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open-modal]');
    const c = e.target.closest('[data-close-modal]');
    if (t) { e.preventDefault(); open(); }
    if (c) { e.preventDefault(); close(); }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const tg = getTelegramData();
    const utm = parseUTM({
      utm_source: 'telegram',
      utm_medium: 'webapp',
      utm_campaign: 'club_landing',
      utm_content: 'cta'
    });

    const payload = {
      name: fd.get('name')?.toString().trim(),
      email: fd.get('email')?.toString().trim(),
      role: fd.get('role')?.toString().trim(),
      company: fd.get('company')?.toString().trim(),
      preferred_time: fd.get('preferred_time')?.toString().trim(),
      comment: fd.get('comment')?.toString().trim(),
      telegram_user_id: tg.userId || '',
      telegram_username: tg.username || '',
      telegram_language: tg.language || '',
      chat_instance: tg.chatInstance || '',
      ...utm,
      page: 'club-landing',
      timestamp: new Date().toISOString()
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; status('Отправляем…');

    try {
      if (!APP_SCRIPT_URL) throw new Error('APP_SCRIPT_URL не задан');
      await postJSON(APP_SCRIPT_URL, payload);
      window?.Telegram?.WebApp?.sendData?.(JSON.stringify(payload));
      status('Заявка принята! Спасибо.');
      setTimeout(close, 1200);
    } catch (err) {
      console.error(err);
      status('Ошибка отправки. Попробуйте ещё раз.', true);
    } finally {
      btn.disabled = false;
    }
  });
}
