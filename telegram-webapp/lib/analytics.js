export function getTelegramData() {
  const tg = window?.Telegram?.WebApp;
  if (!tg) return { ready: false };
  try { tg.ready(); tg.expand?.(); } catch {}
  const d = tg.initDataUnsafe || {};
  return {
    ready: true,
    userId: d?.user?.id,
    username: d?.user?.username,
    language: d?.user?.language_code,
    chatInstance: d?.chat_instance,
    themeParams: tg.themeParams || {}
  };
}
