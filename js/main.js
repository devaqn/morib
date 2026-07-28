/* ============================================================
   WORKSHOP DE COMUNICAÇÃO ESTRATÉGICA — Morib Macedo
   Script principal — motor de movimento
   ------------------------------------------------------------
   Filosofia: uma ÚNICA fila de rAF por scroll, transforms na GPU,
   tudo desligável por prefers-reduced-motion. Nada bloqueia a
   rolagem — os efeitos são de compositor (transform/opacity).
   ------------------------------------------------------------
   Índice:
   01. Helpers
   02. Título do hero revelado palavra por palavra
   03. Preloader + entrada do hero (+ spotlight do cursor)
   04. Motor de scroll: header, progresso, floats, parallax, marquee
   05. Revelação no scroll (cascata + variações direcionais)
   06. Botões magnéticos
   07. Tilt 3D (cartão do hero + galeria)
   08. Formulário → WhatsApp
   09. Lightbox navegável (setas, teclado, arrastar)
   10. FAQ com deslize suave de altura
   11. Ano do rodapé
   ============================================================ */

/* ---------- 01. HELPERS ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// acessibilidade + capacidade do dispositivo
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer  = matchMedia('(pointer: fine)').matches;
const canHover     = finePointer && !reduceMotion;

/* ---------- 02. TÍTULO DO HERO PALAVRA POR PALAVRA ----------
   Cada palavra é embrulhada numa "janela" (.word, overflow hidden)
   com um interior (.word-in) que sobe para dentro. O <em> "oratória"
   é tratado como uma palavra só, preservando seu brilho dourado.
   Ao adicionar .hero.in (abaixo), as palavras sobem em cascata. */
function splitHeroTitle(h1) {
  const frag = document.createDocumentFragment();
  let i = 0;

  const addWord = content => {
    const outer = document.createElement('span'); outer.className = 'word';
    const inner = document.createElement('span'); inner.className = 'word-in';
    inner.style.setProperty('--wd', (i * 0.055).toFixed(3) + 's'); // atraso por palavra
    i++;
    if (typeof content === 'string') inner.textContent = content;
    else inner.appendChild(content);
    outer.appendChild(inner);
    frag.appendChild(outer);
  };

  [...h1.childNodes].forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      // divide o texto preservando os espaços entre as palavras
      node.textContent.split(/(\s+)/).forEach(part => {
        if (part.trim() === '') { if (part.length) frag.appendChild(document.createTextNode(' ')); }
        else addWord(part);
      });
    } else {
      addWord(node); // elemento (o <em>) entra inteiro como uma palavra
    }
  });

  h1.textContent = '';
  h1.appendChild(frag);
  // o título fica visível na hora; quem anima agora são as palavras
  h1.style.cssText = 'opacity:1;transform:none;transition:none';
}

const heroTitle = $('.hero h1');
if (heroTitle && !reduceMotion) splitHeroTitle(heroTitle);

/* ---------- 03. PRELOADER + ENTRADA DO HERO ----------
   A tela de carregamento sai em cortina e SÓ ENTÃO a classe .in
   dispara a sequência do hero (palavras, kicker, texto, botões,
   foto) — assim o visitante vê a abertura acontecer.
   A barra "engatinha" até ~92% e completa quando a página termina
   de carregar (window load), com tempo mínimo de exibição e um
   teto de segurança para nunca prender a tela. */
const hero = $('.hero');
function startHero() {
  if (!hero) return;
  hero.classList.add('in');
  // após a entrada das palavras, libera o overflow para os acentos
  // (á, ó, ã) não ficarem cortados no topo da máscara
  setTimeout(() => hero.classList.add('revealed'), 1500);
}

const preloader = $('#preloader');
if (preloader) {
  const fill  = $('.pre-fill', preloader);
  const numEl = $('#preNum');
  const setBar = v => { fill.style.width = v + '%'; if (numEl) numEl.textContent = Math.round(v); };

  // palavra-chave que cicla enquanto carrega (Comunicação → Presença → …)
  const cycleEl = $('#preCycle');
  let cycleTimer = 0;
  if (cycleEl && !reduceMotion) {
    const words = ['Comunicação', 'Presença', 'Persuasão', 'Liderança', 'Oratória'];
    let ci = 0;
    cycleTimer = setInterval(() => {
      ci = (ci + 1) % words.length;
      cycleEl.classList.add('swap');
      setTimeout(() => { cycleEl.textContent = words[ci]; cycleEl.classList.remove('swap'); }, 300);
    }, 950);
  }

  let p = 0, loaded = false, ended = false;
  const started = performance.now();

  function finish() {
    if (ended) return; ended = true;
    clearInterval(cycleTimer);
    setBar(100);
    preloader.classList.add('done');
    document.body.classList.remove('loading');
    document.documentElement.classList.remove('loading');
    startHero();                               // abre o hero ao revelar
    setTimeout(() => preloader.remove(), 900); // limpa o DOM depois da cortina
  }

  function tick() {
    const ceil = loaded ? 100 : 92;
    p += (ceil - p) * 0.06;                     // desaceleração natural
    if (loaded && p > 99) { finish(); return; }
    setBar(p);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // marca como carregado (respeitando um tempo mínimo de exibição)
  const markLoaded = () => {
    const wait = Math.max(0, 650 - (performance.now() - started));
    setTimeout(() => { loaded = true; }, wait);
  };
  if (document.readyState === 'complete') markLoaded();
  else addEventListener('load', markLoaded, { once: true });

  // teto de segurança: no máximo ~4,5s presos aqui
  setTimeout(() => { loaded = true; }, 4500);
} else {
  // sem preloader (ex.: removido): abre o hero direto
  document.body.classList.remove('loading');
  requestAnimationFrame(() => requestAnimationFrame(startHero));
}

if (hero && canHover) {
  let rafGlow = 0;
  hero.addEventListener('pointermove', e => {
    cancelAnimationFrame(rafGlow);
    rafGlow = requestAnimationFrame(() => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }, { passive: true });
}

/* ---------- 04. MOTOR DE SCROLL ----------
   Um só handler, throttled por rAF, cuida de tudo que depende do
   scroll: estado do header, barra de progresso, floats, parallax
   e a velocidade do letreiro. */
const topbar   = $('#topbar');
const progress = $('.progress');
const waFloat  = $('.wa-float');
const sticky   = $('.sticky-cta');

// alvos de parallax (elementos decorativos com data-parallax="velocidade")
const parallaxEls = $$('[data-parallax]').map(el => ({ el, speed: parseFloat(el.dataset.parallax) }));

// letreiro: controla a velocidade pela Web Animations API
const marqueeTrack = $('.marquee-track');
let marqueeAnim = null, marqSpeed = 1, marqRAF = 0;
function decayMarquee() {
  marqSpeed += (1 - marqSpeed) * 0.06;          // volta suave para a velocidade base
  if (marqueeAnim) marqueeAnim.playbackRate = marqSpeed;
  if (Math.abs(marqSpeed - 1) > 0.01) marqRAF = requestAnimationFrame(decayMarquee);
  else { if (marqueeAnim) marqueeAnim.playbackRate = 1; marqRAF = 0; }
}

let lastY = scrollY, ticking = false;

function onScroll() {
  const y  = scrollY;
  const vh = innerHeight;
  const goal = document.body.scrollHeight - vh;
  const vel  = Math.abs(y - lastY);

  // header: sólido após 10px; some ao descer, volta ao subir
  topbar.classList.toggle('solid', y > 10);
  topbar.classList.toggle('hidden', y > 400 && y > lastY);

  // barra de progresso (scaleX = puro compositor)
  progress.style.transform = `scaleX(${goal > 0 ? (y / goal).toFixed(4) : 0})`;

  // WhatsApp e barra fixa aparecem depois do hero
  const past = y > vh * 0.6;
  waFloat.classList.toggle('show', past);
  sticky.classList.toggle('show', past);

  // parallax (só quando faz diferença de movimento)
  if (!reduceMotion) {
    for (const p of parallaxEls) {
      const r = p.el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) continue;      // fora da tela: pula
      const off = (r.top + r.height / 2) - vh / 2;
      p.el.style.transform = `translate3d(0, ${(-off * p.speed).toFixed(1)}px, 0)`;
    }

    // letreiro acelera com a velocidade do scroll e desacelera sozinho
    if (marqueeAnim && vel > 0) {
      marqSpeed = Math.min(1 + vel / 22, 4.5);
      if (!marqRAF) marqRAF = requestAnimationFrame(decayMarquee);
    }
  }

  lastY = y;
  ticking = false;
}
addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
addEventListener('resize', onScroll, { passive: true });

// pega a animação do letreiro depois que ela já está rodando
addEventListener('load', () => {
  if (marqueeTrack && marqueeTrack.getAnimations) {
    marqueeAnim = marqueeTrack.getAnimations()[0] || null;
  }
});
onScroll(); // estado inicial correto

/* ---------- 05. REVELAÇÃO NO SCROLL ----------
   .reveal entra quando aparece. Dentro de [data-stagger] cada item
   ganha atraso incremental (--d). Alguns recebem uma variação de
   direção (vindo do lado, em escala ou em cortina) atribuída aqui. */

// atribui variações sem precisar sujar o HTML
const tag = (sel, cls) => $$(sel).forEach(el => el.classList.add(cls));
tag('.spk-visual.reveal', 'rv-left');                 // foto do apresentador entra da esquerda
tag('.spk > .reveal:not(.spk-visual)', 'rv-right');   // texto entra da direita
tag('.gal-hero.reveal', 'rv-clip');                   // banner em cortina
tag('.gal-tile.reveal', 'rv-scale');                  // tiles em escala
tag('.int-grid > .reveal:last-child', 'rv-right');    // texto da INTEGRA da direita
tag('.cta-box.reveal', 'rv-scale');                   // caixa de inscrição em escala

// atraso em cascata dentro de cada grupo
$$('[data-stagger]').forEach(group => {
  $$('.reveal', group).forEach((el, i) => {
    el.style.setProperty('--d', `${Math.min(i * 85, 500)}ms`);
  });
});

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- 06. BOTÕES MAGNÉTICOS ----------
   Os CTAs principais "puxam" levemente na direção do cursor, e o
   conteúdo interno se desloca um pouco mais (profundidade). O texto
   é embrulhado em .btn-lbl para poder mover-se de forma independente. */
if (canHover) {
  $$('.btn-y, .btn-navy, .btn-site').forEach(btn => {
    const lbl = document.createElement('span');
    lbl.className = 'btn-lbl';
    while (btn.firstChild) lbl.appendChild(btn.firstChild);
    btn.appendChild(lbl);
    btn.classList.add('is-magnetic');

    let raf = 0;
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        btn.style.transition = 'transform .18s ease';
        btn.style.transform  = `translate(${clamp(mx * 0.25, -16, 16)}px, ${clamp(my * 0.4, -12, 12)}px)`;
        lbl.style.transform  = `translate(${clamp(mx * 0.12, -8, 8)}px, ${clamp(my * 0.18, -6, 6)}px)`;
      });
    });
    btn.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      btn.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)'; // volta com quique
      btn.style.transform  = '';
      lbl.style.transform  = '';
    });
  });
}

/* ---------- 07. TILT 3D ----------
   Inclina o elemento seguindo o cursor e volta suave ao sair.
   Reaproveitado no cartão do hero e nas fotos da galeria. */
function makeTilt(el, max) {
  let raf = 0;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width  - 0.5;
    const py = (e.clientY - r.top)  / r.height - 0.5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.transition = 'transform .12s linear';
      el.style.transform  = `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
    });
  });
  el.addEventListener('pointerleave', () => {
    cancelAnimationFrame(raf);
    el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
    el.style.transform  = 'perspective(900px)';
  });
}
if (canHover) {
  const card = $('.photo-card'); if (card) makeTilt(card, 7);
  const gh = $('.gal-hero');     if (gh) makeTilt(gh, 4);
  $$('.gal-tile').forEach(t => makeTilt(t, 8));
}

/* ---------- 08. FORMULÁRIO → WHATSAPP ----------
   Captura o nome e abre o WhatsApp com a mensagem pronta. */
$('#leadForm').addEventListener('submit', ev => {
  ev.preventDefault();
  const nome = $('#leadName').value.trim();
  const msg  = nome
    ? `Olá! Sou ${nome} e quero garantir minha vaga no Workshop de Comunicação Estratégica – Uma Nova Oratória para Liderar.`
    : 'Olá! Quero garantir minha vaga no Workshop de Comunicação Estratégica – Uma Nova Oratória para Liderar.';
  open('https://wa.me/5581973268686?text=' + encodeURIComponent(msg), '_blank', 'noopener');
});

/* ---------- 09. LIGHTBOX NAVEGÁVEL ----------
   Clique numa foto abre a imagem ampliada. Dá para navegar entre
   todas as fotos da galeria (setas na tela, ← → do teclado e
   arrastar no celular). Fecha no X, no fundo ou com Esc. */
const lightbox    = $('#lightbox');
const lightboxImg = $('#lightboxImg');
const lbCount     = $('#lightboxCount');
const shots = $$('[data-full]').map(el => ({
  src: el.dataset.full,
  alt: (el.querySelector('img') || {}).alt || ''
}));
let lbIndex = 0;

function showShot(i) {
  lbIndex = (i + shots.length) % shots.length; // circular
  const s = shots[lbIndex];
  lightboxImg.src = s.src;
  lightboxImg.alt = s.alt;
  lbCount.textContent = `${lbIndex + 1} / ${shots.length}`;
  // pré-carrega a próxima para a troca ser instantânea
  const next = new Image();
  next.src = shots[(lbIndex + 1) % shots.length].src;
}
function openLightbox(i) {
  showShot(i);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

$$('[data-full]').forEach((el, i) => el.addEventListener('click', () => openLightbox(i)));
$('#lightboxClose').addEventListener('click', closeLightbox);
$('#lightboxPrev').addEventListener('click', () => showShot(lbIndex - 1));
$('#lightboxNext').addEventListener('click', () => showShot(lbIndex + 1));
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  showShot(lbIndex - 1);
  if (e.key === 'ArrowRight') showShot(lbIndex + 1);
});

// arrastar/deslizar horizontalmente para trocar de foto (celular)
let swipeX = null;
lightbox.addEventListener('pointerdown', e => { swipeX = e.clientX; });
lightbox.addEventListener('pointerup', e => {
  if (swipeX === null) return;
  const dx = e.clientX - swipeX;
  if (Math.abs(dx) > 45) showShot(lbIndex + (dx < 0 ? 1 : -1));
  swipeX = null;
});

/* ---------- 10. FAQ COM DESLIZE SUAVE DE ALTURA ----------
   Anima a altura da resposta (0 ↔ altura real) para uma transição
   suave. Só entra em ação quando há movimento permitido; sob
   prefers-reduced-motion o <details> nativo abre/fecha instantâneo.
   Um timeout de segurança conclui o estado caso 'transitionend'
   não dispare (ex.: duração ~0 em alguns navegadores). */
if (!reduceMotion) {
  $$('.faq details').forEach(det => {
    const summary = det.querySelector('summary');
    const ans     = det.querySelector('.ans');
    if (!summary || !ans) return;
    let animating = false;

    // conclui a animação de forma idempotente (via evento OU timeout)
    const settle = (fn) => {
      let done = false;
      const finish = () => { if (done) return; done = true; fn(); animating = false; ans.removeEventListener('transitionend', finish); };
      ans.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, 480); // rede de segurança
    };

    summary.addEventListener('click', e => {
      e.preventDefault();
      if (animating) return;
      animating = true;

      if (det.open) {                 // ---- FECHAR ----
        ans.style.height = ans.scrollHeight + 'px';
        ans.style.opacity = '1';
        requestAnimationFrame(() => { ans.style.height = '0px'; ans.style.opacity = '0'; });
        settle(() => { det.open = false; ans.style.height = ans.style.opacity = ''; });
      } else {                        // ---- ABRIR ----
        det.open = true;              // renderiza o conteúdo primeiro
        const target = ans.scrollHeight;
        ans.style.height = '0px';
        ans.style.opacity = '0';
        requestAnimationFrame(() => { ans.style.height = target + 'px'; ans.style.opacity = '1'; });
        settle(() => { ans.style.height = 'auto'; });
      }
    });
  });
}

/* ---------- 11. ANO DO RODAPÉ ---------- */
$('#year').textContent = new Date().getFullYear();
