export function renderHero(el) {
  el.innerHTML = `
    <div class="container hero">
      <div class="hero__text">
        <h1>Клуб Мышления</h1>
        <p>Прокачивай инструменты мышления и повышай свою эффективность в жизни и бизнесе</p>
        <button class="btn btn-primary" data-open-modal>Записаться на встречу</button>
      </div>
      <div class="hero__image">
        <img src="/assets/hero.jpg" alt="Hero"/>
      </div>
    </div>
  `;
}
