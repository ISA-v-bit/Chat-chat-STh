export function renderHeader(el) {
  el.innerHTML = `
    <div class="container header">
      <div class="brand">
        <img src="/assets/logo.jpg" alt="Логотип" class="logo"/>
        <span class="title">Клуб Мышления</span>
      </div>
      <nav class="nav">
        <a href="#about">О клубе</a>
        <a href="#values">Формат</a>
        <a href="#apply" data-open-modal>Записаться</a>
      </nav>
    </div>
  `;
}
