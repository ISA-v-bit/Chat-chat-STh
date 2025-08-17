# Chat-chat-STh
# Telegram Bot with WebApp Calendar

Простой Telegram-бот с WebApp-интерфейсом для выбора слотов в календаре и записи пользователя. Идеально подходит для бронирования встреч, консультаций, сессий и т.п.

---

## 🔧 Возможности

- WebApp с календарём и доступными слотами
- Telegram-интеграция через Bot API и Web App
- Форма регистрации: имя + телефон
- Отправка данных на backend
- Подтверждение записи в Telegram
- Готовность к добавлению слота в Google/Apple календарь
- Поддержка брендинга (лого, цвета, шрифты)

---

## 🏗️ Архитектура проекта

```plaintext
Telegram Bot (BotFather + Web App кнопка)
        ↓
      WebApp (HTML + Tailwind + JS)
        ↓
 Backend (Firebase Functions / Supabase)
        ↙             ↓             ↘
 Google Calendar   Supabase DB     Уведомления в Telegram
