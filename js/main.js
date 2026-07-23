/* ============================================================
   WORKSHOP DE COMUNICAÇÃO ESTRATÉGICA — Morib Macedo
   Script principal
   ------------------------------------------------------------
   Índice:
   01. Helpers
   02. Entrada cinematográfica do hero
   03. Header inteligente (sólido + esconde/mostra) e barra de progresso
   04. Revelação no scroll com cascata (stagger)
   05. Parallax da marca d'água "ORATÓRIA"
   06. Tilt 3D no cartão de foto do hero
   07. WhatsApp flutuante + barra fixa mobile
   08. Formulário de inscrição → WhatsApp com nome preenchido
   09. Ano do rodapé
   ============================================================ */

/* ---------- 01. HELPERS ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// respeita usuários que preferem menos movimento (acessibilidade)
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 02. ENTRADA DO HERO ----------
   A classe .in dispara a sequência de entrada definida no CSS
   (kicker → título → texto → botões → meta → foto).
   requestAnimationFrame duplo garante que o navegador pinte o
   estado inicial antes de animar. */
requestAnimationFrame(() =>
  requestAnimationFrame(() => $('.hero').classList.add('in'))
);

/* ---------- 03. HEADER + BARRA DE PROGRESSO ----------
   - Header fica sólido (fundo branco) após 10px de rolagem.
   - Rolou para baixo além de 400px? Header se esconde para
     liberar a tela. Rolou para cima? Reaparece na hora.
   - A barra amarela do topo mostra o progresso de leitura.
   Tudo dentro de um único requestAnimationFrame por scroll
   (nenhum trabalho pesado no evento em si). */
const topbar   = $('#topbar');
const progress = $('.progress');
let lastY   = 0;      // última posição para detectar direção
let ticking = false;  // evita empilhar frames

function onScroll() {
  const y    = scrollY;
  const goal = document.body.scrollHeight - innerHeight;

  // estado sólido
  topbar.classList.toggle('solid', y > 10);

  // esconde ao descer / mostra ao subir
  topbar.classList.toggle('hidden', y > 400 && y > lastY);

  // progresso de leitura (transform = sem reflow, só compositor)
  progress.style.transform = `scaleX(${goal > 0 ? y / goal : 0})`;

  // elementos que aparecem depois do hero
  const past = y > innerHeight * 0.6;
  $('.wa-float').classList.toggle('show', past);
  $('.sticky-cta').classList.toggle('show', past);

  lastY   = y;
  ticking = false;
}
addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll(); // estado correto já no carregamento

/* ---------- 04. REVELAÇÃO NO SCROLL COM CASCATA ----------
   Elementos .reveal entram quando ficam visíveis.
   Dentro de um container [data-stagger], cada item recebe um
   atraso incremental (--d) — efeito de onda, um após o outro. */
$$('[data-stagger]').forEach(group => {
  $$('.reveal', group).forEach((el, i) => {
    el.style.setProperty('--d', `${Math.min(i * 90, 540)}ms`);
  });
});

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('on');
      io.unobserve(e.target); // anima uma vez só; observer é liberado
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

$$('.reveal').forEach(el => io.observe(el));

/* ---------- 05. PARALLAX DA MARCA D'ÁGUA ----------
   O "ORATÓRIA" gigante do hero desliza mais devagar que o
   scroll — profundidade sutil, custo quase zero (transform). */
const mark = $('.hero-mark');
if (mark && !reduceMotion) {
  addEventListener('scroll', () => {
    requestAnimationFrame(() => {
      mark.style.transform = `translateY(${scrollY * -0.12}px)`;
    });
  }, { passive: true });
}

/* ---------- 06. TILT 3D NO CARTÃO DE FOTO ----------
   O cartão inclina levemente seguindo o mouse (máx. 7°) e volta
   suave ao sair. Desligado em telas touch e p/ quem prefere
   menos movimento. */
const card = $('.photo-card');
if (card && !reduceMotion && matchMedia('(pointer: fine)').matches) {
  const MAX = 7; // graus máximos de inclinação

  card.addEventListener('pointermove', e => {
    const r  = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width  - 0.5; // -0.5 … 0.5
    const py = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transition = 'transform .1s linear';
    card.style.transform =
      `perspective(900px) rotateY(${px * MAX}deg) rotateX(${-py * MAX}deg)`;
  });

  card.addEventListener('pointerleave', () => {
    card.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
    card.style.transform  = 'perspective(900px)';
  });
}

/* ---------- 07. (WhatsApp flutuante + barra mobile) ----------
   A exibição é controlada no onScroll acima — aparecem só depois
   que o visitante passa do hero, sem atrapalhar a primeira dobra. */

/* ---------- 08. FORMULÁRIO → WHATSAPP ----------
   Captura o nome e abre o WhatsApp com a mensagem personalizada.
   Sem backend: a conversão acontece direto no aplicativo. */
$('#leadForm').addEventListener('submit', ev => {
  ev.preventDefault();
  const nome = $('#leadName').value.trim();
  const msg  = nome
    ? `Olá! Sou ${nome} e quero garantir minha vaga no Workshop de Comunicação Estratégica – Uma Nova Oratória para Liderar.`
    : 'Olá! Quero garantir minha vaga no Workshop de Comunicação Estratégica – Uma Nova Oratória para Liderar.';
  open('https://wa.me/5581973268686?text=' + encodeURIComponent(msg),
       '_blank', 'noopener');
});

/* ---------- 09. ANO DO RODAPÉ ---------- */
$('#year').textContent = new Date().getFullYear();
