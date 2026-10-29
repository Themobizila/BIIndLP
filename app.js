(function () {
  'use strict';

  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lenis = null;

  /* ========================================================================
     1. INICIALIZAÇÃO DO RELÓGIO ÚNICO (SINGLE-TICKER SYNC: GSAP + LENIS)
     ======================================================================== */
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  if (hasGSAP && hasLenis && !prefersReducedMotion) {
    lenis = new Lenis({
      autoRaf: false,
      duration: 1.2,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      smoothWheel: true
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  /* ========================================================================
     2. NAVEGAÇÃO POR ÂNCORAS EXCLUSIVA VIA LENIS
     ======================================================================== */
  const anchorLinks = document.querySelectorAll('[data-scroll-to]');
  anchorLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      const targetSelector = link.getAttribute('data-scroll-to');
      if (!targetSelector) return;
      const targetEl = document.querySelector(targetSelector);
      if (!targetEl) return;

      event.preventDefault();
      if (lenis) {
        lenis.scrollTo(targetEl, {
          offset: targetEl.classList.contains('scene') || targetEl.classList.contains('scene-h') ? 0 : -64,
          duration: 1.2
        });
      } else {
        targetEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    });
  });

  /* ========================================================================
     3. TELEMETRIA PROCEDURAL EM CANVAS (HERO FRAME SCRUBBING)
     ======================================================================== */
  const canvas = document.getElementById('telemetry-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const telemetryState = { progress: 0.15 };

    const routes = [
      { yRatio: 0.22, speed: 1.0, offset: 0.08, color: '116, 113, 239' },
      { yRatio: 0.38, speed: 1.35, offset: 0.34, color: '83, 198, 224' },
      { yRatio: 0.56, speed: 0.85, offset: 0.62, color: '116, 113, 239' },
      { yRatio: 0.74, speed: 1.15, offset: 0.19, color: '83, 198, 224' }
    ];

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width * dpr));
      canvas.height = Math.max(320, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawTelemetry(telemetryState.progress, rect.width, rect.height);
    }

    function drawTelemetry(progress, width, height) {
      ctx.clearRect(0, 0, width, height);

      const stepX = Math.max(90, width / 12);
      ctx.strokeStyle = 'rgba(116, 113, 239, 0.05)';
      ctx.lineWidth = 1;

      for (let x = stepX; x < width; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      routes.forEach(function (route) {
        const y = height * route.yRatio;
        ctx.strokeStyle = 'rgba(' + route.color + ', 0.12)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        for (let nx = stepX * 2; nx < width - stepX; nx += stepX * 3) {
          ctx.fillStyle = 'rgba(' + route.color + ', 0.32)';
          ctx.fillRect(nx - 2, y - 2, 4, 4);
        }

        const pulsePos = ((progress * route.speed + route.offset) % 1) * (width + 180) - 90;
        const grad = ctx.createLinearGradient(pulsePos - 80, y, pulsePos + 20, y);
        grad.addColorStop(0, 'rgba(' + route.color + ', 0)');
        grad.addColorStop(0.85, 'rgba(' + route.color + ', 0.65)');
        grad.addColorStop(1, 'rgba(' + route.color + ', 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(pulsePos - 80, y);
        ctx.lineTo(pulsePos + 20, y);
        ctx.stroke();
        ctx.lineWidth = 1;
      });
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (hasGSAP && !prefersReducedMotion) {
      gsap.to(telemetryState, {
        progress: 1,
        ease: 'none',
        scrollTrigger: {
          id: 'hero-telemetry',
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
          onUpdate: function () {
            const rect = canvas.parentElement.getBoundingClientRect();
            drawTelemetry(telemetryState.progress, rect.width, rect.height);
          }
        }
      });
    }
  }

  /* ========================================================================
     4. ANIMAÇÕES DO HERO E NIVELAMENTO 3D DO COCKPIT
     ======================================================================== */
  if (hasGSAP && !prefersReducedMotion) {
    gsap.from('.reveal-hero', {
      y: 24,
      opacity: 0,
      duration: 0.85,
      stagger: 0.1,
      ease: 'power3.out',
      clearProps: 'transform,opacity'
    });

    const heroCockpit = document.getElementById('hero-cockpit');
    if (heroCockpit) {
      gsap.fromTo(
        heroCockpit,
        { rotateX: 9, scale: 0.97, y: 16 },
        {
          rotateX: 0,
          scale: 1,
          y: 0,
          ease: 'power2.out',
          scrollTrigger: {
            id: 'hero-cockpit-level',
            trigger: '.hero-perspective-stage',
            start: 'top 82%',
            end: 'top 25%',
            scrub: 1
          }
        }
      );
    }
  }

  /* ========================================================================
     5. CENAS STICKY (SUBSTITUEM O PIN DO GSAP)
     A altura de cada cena vem do CSS. O progresso e lido da propria secao a
     cada frame de scroll, entao nao existe calculo previo que possa ficar
     desatualizado (fontes, imagens, zoom ou altura da janela).
     ======================================================================== */
  const rootEl = document.documentElement;
  const sceneMQ = window.matchMedia('(min-width: 1081px) and (prefers-reduced-motion: no-preference)');

  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }

  function smooth(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function scenesEnabled() {
    return rootEl.classList.contains('scenes-on');
  }

  Array.from(document.querySelectorAll('.scene[data-steps]')).forEach(function (el) {
    el.style.setProperty('--scene-steps', el.getAttribute('data-steps'));
  });

  function readScene(el) {
    const r = el.getBoundingClientRect();
    const range = r.height - window.innerHeight;
    return { p: range > 0 ? clamp(-r.top / range, 0, 1) : 0, range: range };
  }

  function seekScene(el, fraction) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const range = r.height - window.innerHeight;
    const target = window.scrollY + r.top + clamp(fraction, 0, 1) * Math.max(0, range);
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.1 });
    } else {
      window.scrollTo({ top: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }

  /* --- A. Modulos (4 capitulos) --- */
  const modulesScene = document.getElementById('modulos');
  const moduleTitles = [
    'Módulo 01 — Painel Geral de Produção',
    'Módulo 01 — Tabela de Ordens de Produção',
    'Módulo 02 — Painel de Estoque',
    'Módulo 02 — Cobertura de Estoque'
  ];
  const chapters = Array.from(document.querySelectorAll('.module-chapter'));
  const screens = Array.from(document.querySelectorAll('.bi-screen'));
  const activeChapterNum = document.getElementById('active-chapter-num');
  const activeModuleTitle = document.getElementById('bi-active-module-title');
  const chapterProgressFill = document.getElementById('chapter-progress-fill');
  let currentModuleIdx = -1;

  function setModule(idx) {
    if (idx === currentModuleIdx) return;
    currentModuleIdx = idx;
    chapters.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
    screens.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
    if (activeChapterNum) activeChapterNum.textContent = '0' + (idx + 1);
    if (activeModuleTitle) activeModuleTitle.textContent = moduleTitles[idx] || moduleTitles[0];
  }

  function updateModules(p) {
    const idx = clamp(Math.floor(p * chapters.length), 0, chapters.length - 1);
    setModule(idx);
    if (chapterProgressFill) {
      chapterProgressFill.style.transform = 'scaleX(' + (0.04 + 0.96 * p).toFixed(3) + ')';
    }
  }

  /* --- B. Tres camadas (Producao, Estoque, Crie Sua Analise) --- */
  const layersScene = document.getElementById('camadas');
  const layerSlides = Array.from(document.querySelectorAll('.layer-slide'));
  const layerTrackItems = Array.from(document.querySelectorAll('.layer-track-item'));
  let currentLayerIdx = -1;

  function setLayer(idx) {
    if (idx === currentLayerIdx) return;
    currentLayerIdx = idx;
    layerSlides.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
    layerTrackItems.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
  }

  function updateLayers(p) {
    setLayer(clamp(Math.floor(p * layerSlides.length), 0, layerSlides.length - 1));
  }

  layerTrackItems.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      if (scenesEnabled()) {
        seekScene(layersScene, (i + 0.5) / layerSlides.length);
      } else if (layerSlides[i]) {
        layerSlides[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* --- C. Experiencia neon: fade in, movimento guiado pelo mouse, fade out --- */
  const neonScene = document.getElementById('neon');
  const neonStage = document.getElementById('neon-stage');
  const neonScene3d = document.getElementById('neon-scene3d');
  const neonLayers = neonScene3d ? Array.from(neonScene3d.querySelectorAll('[data-depth]')) : [];
  const pointer = { x: 0, y: 0, cx: 0, cy: 0, lastMove: 0 };
  let neonRaf = 0;
  let neonLive = false;

  function neonLoop(now) {
    if (!neonLive) {
      neonRaf = 0;
      return;
    }
    const idle = now - pointer.lastMove > 1800;
    const tx = idle ? Math.sin(now * 0.00035) * 0.35 : pointer.x;
    const ty = idle ? Math.cos(now * 0.0003) * 0.2 : pointer.y;
    pointer.cx += (tx - pointer.cx) * 0.07;
    pointer.cy += (ty - pointer.cy) * 0.07;

    neonScene3d.style.transform =
      'rotateX(' + (-pointer.cy * 8).toFixed(2) + 'deg) rotateY(' + (pointer.cx * 13).toFixed(2) + 'deg)';

    neonLayers.forEach(function (layer) {
      const d = parseFloat(layer.getAttribute('data-depth')) || 0;
      layer.style.translate =
        (-pointer.cx * d * 30).toFixed(1) + 'px ' + (-pointer.cy * d * 22).toFixed(1) + 'px';
    });

    neonRaf = requestAnimationFrame(neonLoop);
  }

  function setNeonLive(live) {
    if (live === neonLive) return;
    neonLive = live;
    if (neonStage) neonStage.classList.toggle('is-live', live);
    if (live && !neonRaf) neonRaf = requestAnimationFrame(neonLoop);
  }

  if (neonStage) {
    neonStage.addEventListener('pointermove', function (e) {
      const r = neonStage.getBoundingClientRect();
      pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      pointer.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      pointer.lastMove = performance.now();
      neonStage.style.setProperty('--mx', e.clientX - r.left + 'px');
      neonStage.style.setProperty('--my', e.clientY - r.top + 'px');
    });
    neonStage.addEventListener('pointerleave', function () {
      pointer.x = 0;
      pointer.y = 0;
    });
  }

  function updateNeon(p) {
    if (!neonStage) return;
    const fadeIn = smooth(p / 0.2);
    const fadeOut = 1 - smooth((p - 0.8) / 0.2);
    const fade = Math.min(fadeIn, fadeOut);
    const content = clamp((fade - 0.35) / 0.65, 0, 1);
    neonStage.style.setProperty('--fade', fade.toFixed(3));
    neonStage.style.setProperty('--content', content.toFixed(3));
    rootEl.classList.toggle('neon-dark', fade > 0.55 && p > 0 && p < 1);
    setNeonLive(fade > 0.02 && p > 0 && p < 1);
  }

  /* --- D. Niveis de decisao: trilha horizontal dentro de uma caixa --- */
  const levelsScene = document.getElementById('arquitetura');
  const levelsBox = document.getElementById('h-viewport-box');
  const levelsTrack = document.getElementById('horizontal-track');
  const levelsFill = document.getElementById('h-progress-fill');
  let levelsDistance = 0;

  function measureLevels() {
    if (!levelsScene || !levelsBox || !levelsTrack) return;
    if (!scenesEnabled()) {
      levelsScene.style.height = '';
      levelsTrack.style.transform = '';
      return;
    }
    levelsDistance = Math.max(0, levelsTrack.scrollWidth - levelsBox.clientWidth);
    /* a trilha ocupa 80% do percurso; 10% de pausa no inicio e no fim */
    levelsScene.style.height = Math.round(window.innerHeight + levelsDistance / 0.8) + 'px';
  }

  function updateLevels(p) {
    if (!levelsTrack) return;
    const t = clamp((p - 0.1) / 0.8, 0, 1);
    levelsTrack.style.transform = 'translate3d(' + (-t * levelsDistance).toFixed(1) + 'px, 0, 0)';
    if (levelsFill) levelsFill.style.transform = 'scaleX(' + t.toFixed(3) + ')';
  }

  /* --- E. Mobile (3 atos) --- */
  const mobileScene = document.getElementById('mobile-showcase');
  const mobileStepButtons = Array.from(document.querySelectorAll('[data-mobile-step]'));
  const mobileViews = Array.from(document.querySelectorAll('[data-m-view]'));
  let currentMobileIdx = -1;

  function setMobile(idx) {
    if (idx === currentMobileIdx) return;
    currentMobileIdx = idx;
    mobileStepButtons.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
    mobileViews.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
  }

  function updateMobile(p) {
    setMobile(clamp(Math.floor(p * mobileViews.length), 0, mobileViews.length - 1));
  }

  mobileStepButtons.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      if (scenesEnabled()) {
        seekScene(mobileScene, (i + 0.5) / mobileViews.length);
      } else {
        setMobile(i);
      }
    });
  });

  /* --- Laco unico de atualizacao --- */
  const sceneHandlers = [
    [modulesScene, updateModules],
    [layersScene, updateLayers],
    [neonScene, updateNeon],
    [levelsScene, updateLevels],
    [mobileScene, updateMobile]
  ].filter(function (pair) { return !!pair[0]; });

  let frameQueued = false;

  function runScenes() {
    frameQueued = false;
    if (!scenesEnabled()) return;
    sceneHandlers.forEach(function (pair) {
      pair[1](readScene(pair[0]).p);
    });
  }

  function queueScenes() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(runScenes);
  }

  window.addEventListener('scroll', queueScenes, { passive: true });
  if (lenis) lenis.on('scroll', queueScenes);

  let refreshTimer = 0;
  function refreshLayout() {
    measureLevels();
    queueScenes();
    if (hasGSAP) {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 120);
    }
  }

  function syncSceneMode() {
    rootEl.classList.toggle('scenes-on', sceneMQ.matches);
    if (!sceneMQ.matches) {
      rootEl.classList.remove('neon-dark');
      setNeonLive(false);
      if (neonStage) {
        neonStage.style.removeProperty('--fade');
        neonStage.style.removeProperty('--content');
      }
      if (neonScene3d) neonScene3d.style.transform = '';
      neonLayers.forEach(function (layer) { layer.style.translate = ''; });
    }
    refreshLayout();
  }

  if (sceneMQ.addEventListener) {
    sceneMQ.addEventListener('change', syncSceneMode);
  } else if (sceneMQ.addListener) {
    sceneMQ.addListener(syncSceneMode);
  }

  window.addEventListener('resize', refreshLayout);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refreshLayout);
  }
  syncSceneMode();

  /* ========================================================================
     6. REVEALS, MENU ATIVO, BARRA DE PROGRESSO E PILL FLUTUANTE
     ======================================================================== */
  if (hasGSAP) {
    if (!prefersReducedMotion) {
      gsap.utils.toArray('.reveal-up').forEach(function (el) {
        gsap.from(el, {
          y: 28,
          opacity: 0,
          duration: 0.75,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        });
      });
    }

    const navLinks = Array.from(document.querySelectorAll('.main-nav .nav-link'));
    const trackedSelectors = ['#diagnostico', '#modulos', '#camadas', '#arquitetura', '#mobile-showcase', '#resultados'];
    const trackedEls = trackedSelectors
      .map(function (sel) { return { selector: sel, el: document.querySelector(sel) }; })
      .filter(function (item) { return !!item.el; });

    function syncActiveNavLink() {
      if (navLinks.length === 0 || trackedEls.length === 0) return;
      const probeY = window.innerHeight * 0.38;
      let activeSel = '';
      for (let i = 0; i < trackedEls.length; i++) {
        const rect = trackedEls[i].el.getBoundingClientRect();
        if (rect.top <= probeY && rect.bottom > probeY) {
          activeSel = trackedEls[i].selector;
          break;
        }
      }
      navLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('data-scroll-to') === activeSel);
      });
    }

    const progressBar = document.getElementById('scroll-progress-bar');
    if (progressBar) {
      gsap.to(progressBar, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          id: 'global-progress',
          start: 0,
          end: 'max',
          scrub: 0.15,
          onUpdate: syncActiveNavLink
        }
      });
    }

    const floatingPill = document.getElementById('floating-cta-pill');
    const floatingClose = document.getElementById('floating-pill-close');
    let isFloatingDismissed = false;

    if (floatingPill) {
      ScrollTrigger.create({
        start: 450,
        end: 'max',
        onUpdate: function (self) {
          if (isFloatingDismissed) return;
          const scrollY = self.scroll();
          const docHeight = document.documentElement.scrollHeight;
          const isNearBottom = scrollY + window.innerHeight > docHeight - 450;
          const vh = window.innerHeight;
          const coversContent = Array.from(document.querySelectorAll('[data-hide-pill]')).some(function (el) {
            const r = el.getBoundingClientRect();
            return scenesEnabled() && r.top < vh - 100 && r.bottom > 100;
          });
          floatingPill.classList.toggle('is-visible', scrollY > 400 && !isNearBottom && !coversContent);
        }
      });

      if (floatingClose) {
        floatingClose.addEventListener('click', function () {
          isFloatingDismissed = true;
          floatingPill.classList.remove('is-visible');
        });
      }
    }
  }


  /* ==========================================================================
     NEON INTERACTIVE MODAL & RELATED SCREENS GALLERY
     ========================================================================== */
  const NEON_MODULES_DATA = {
    producao: {
      badge: 'MÓDULO DE PRODUÇÃO',
      title: 'Telas e Visões de Produção Industrial',
      summary: 'Acompanhe metas de fábrica, ordens concluídas e pontualidade da entrega sem esperar pelo fechamento do dia.',
      screens: [
        {
          name: 'Painel Executivo',
          tag: 'Painel Geral de Produção',
          img: './images/Painel Prod.png',
          title: 'Painel Geral de Produção',
          desc: 'Visão executiva diária para gerentes industriais acompanharem o atingimento de metas, percentual de ordens concluídas, pontualidade de entrega e ranking dos principais produtos fabricados.',
          tags: ['Metas Customizáveis', 'Status de OPs', 'Pontualidade Fabril', 'Visão Consolidada']
        },
        {
          name: 'Matriz Analítica',
          tag: 'Matriz de Produção',
          img: './images/Matriz Prod.png',
          title: 'Matriz Analítica de Produção',
          desc: 'Cruzamento multidimensional do volume produzido por família de itens, linha de montagem e centros de trabalho, permitindo identificar gargalos de produtividade por período.',
          tags: ['Por Família de Produto', 'Centros de Trabalho', 'Histórico Temporal', 'Desvios de Linha']
        },
        {
          name: 'Tabela Granular',
          tag: 'Tabela Operacional de Ordens',
          img: './images/Tabela Prod.png',
          title: 'Tabela Granular de Ordens de Produção',
          desc: 'Detalhamento transacional no nível de ordem de produção (OP), datas de abertura, previsão de término, quantidades planejadas versus apontadas e status de entrega.',
          tags: ['Nível Transacional', 'Previsão vs Realizado', 'Rastreio de Lotes', 'Auditoria de Apontamento']
        }
      ]
    },
    estoque: {
      badge: 'MÓDULO DE ESTOQUE',
      title: 'Telas e Visões de Gestão de Estoque',
      summary: 'Controle de capital imobilizado, dias de cobertura e prevenção ativa contra rupturas de insumos na fábrica.',
      screens: [
        {
          name: 'Painel Executivo',
          tag: 'Painel Geral de Estoque',
          img: './images/Painel Estoque.png',
          title: 'Painel Executivo de Estoque',
          desc: 'Acompanhe o valor financeiro total imobilizado em estoque, os dias médios de cobertura fabril e receba alertas imediatos dos produtos com risco iminente de ruptura de linha.',
          tags: ['Valor Imobilizado', 'Dias de Cobertura', 'Alertas de Ruptura', 'Visão por Filial']
        },
        {
          name: 'Matriz de Famílias',
          tag: 'Matriz de Almoxarifados',
          img: './images/Matriz Estoque.png',
          title: 'Matriz de Famílias e Almoxarifados',
          desc: 'Cruzamento analítico de saldo e rotatividade por grupo de estoque, tipo de material (matéria-prima, intermediário e acabados) e múltiplos locais de armazenagem.',
          tags: ['Por Almoxarifado', 'Giro de Materiais', 'Famílias de Itens', 'Saldo Físico']
        },
        {
          name: 'Tabela Analítica',
          tag: 'Tabela de Reposição e SKUs',
          img: './images/Tabela Estoque.png',
          title: 'Tabela Analítica de Reposição e Curva ABC',
          desc: 'Visão detalhada por SKU com comparação de estoque mínimo, estoque de segurança, ponto de pedido, lote econômico de compra e classificação ABC para compras assertivas.',
          tags: ['Curva ABC', 'Ponto de Pedido', 'Estoque Mínimo', 'Sugestão de Reposição']
        }
      ]
    },
    csa: {
      badge: 'CRIE SUA ANÁLISE (SELF-SERVICE)',
      title: 'Liberdade Analítica Total e Self-Service BI',
      summary: 'Monte cruzamentos sob demanda selecionando dimensões e medidas na hora, com autonomia para o gestor sem depender de filas da TI.',
      screens: [
        {
          name: 'Painel CSA Produção',
          tag: 'Análise Livre de Fabricação',
          img: './images/Painel CSA_Prod.png',
          title: 'Painel Dinâmico de Produção',
          desc: 'Selecione métricas e dimensões de fabricação em tempo real para gerar gráficos dinâmicos com filtros instantâneos por período, filial, centro de custo ou família.',
          tags: ['Filtros Sob Demanda', 'Dimensões Livres', 'Sem Filas na TI', 'Atualização Imediata']
        },
        {
          name: 'Painel CSA Estoque',
          tag: 'Análise Livre de Estoque',
          img: './images/Painel CSA_Est.png',
          title: 'Painel Dinâmico de Estoque e Suprimentos',
          desc: 'Alterne a análise para o módulo de estoque com um único clique para correlacionar consumo de matérias-primas, evolução de saldo e saídas por período.',
          tags: ['Consumo de Materiais', 'Múltiplos Depósitos', 'Cruzamento Livre', 'Visão Unificada']
        },
        {
          name: 'Matriz Multidimensional',
          tag: 'Matriz Dinâmica CSA',
          img: './images/Matriz CSA_Prod.png',
          title: 'Matriz Dinâmica Multidimensional',
          desc: 'Visão em matriz no estilo tabela dinâmica avançada para aprofundar investigações analíticas, com hierarquias expansíveis e exportação para relatórios.',
          tags: ['Estilo Planilha Dinâmica', 'Hierarquias Expansíveis', 'Drill-Down Ágil', 'Exportação Direta']
        },
        {
          name: 'Tabela Granular CSA',
          tag: 'Tabela Livre Granular',
          img: './images/Tabela CSA_Prod.png',
          title: 'Tabela Granular para Conferência e Auditoria',
          desc: 'Acesso a todos os campos e atributos para conferência detalhada, batimento de apontamentos e validação de relatórios com total precisão.',
          tags: ['Conferência de Apontamentos', 'Validação de Fechamento', 'Tabela Aberta', 'Máxima Flexibilidade']
        }
      ]
    },
    mobile: {
      badge: 'VERSÃO MOBILE EXECUTIVA',
      title: 'Consisa BI Mobile na Palma da Mão',
      summary: 'Telas desenhadas especificamente para o smartphone, permitindo que a liderança tome decisões estratégicas onde estiver.',
      screens: [
        {
          name: 'Visão Geral Mobile',
          tag: 'KPIs no Smartphone',
          img: './images/Mobile Principal.png',
          title: 'Visão Executiva de Bolso',
          desc: 'Layout vertical nativo com os números vitais da indústria condensados em cartões de alta legibilidade para leitura rápida em trânsito ou reuniões externas.',
          tags: ['Mobile First', 'Design Nativo', 'Leitura em 3 Segundos', 'Indicadores de Bolso']
        },
        {
          name: 'Detalhe de Produção',
          tag: 'Ritmo Fabril Mobile',
          img: './images/Mobile_DetalheProd.png',
          title: 'Acompanhamento Fabril no Celular',
          desc: 'Detalhamento do volume produzido no dia, ordens em andamento e alertas de desvio fabril diretamente na tela do seu smartphone.',
          tags: ['Ritmo da Fábrica', 'Alertas no Bolso', 'Consulta em Viagem', 'Decisão Imediata']
        },
        {
          name: 'Detalhe de Estoque',
          tag: 'Estoque Mobile',
          img: './images/Mobile_DetalheEst.png',
          title: 'Gestão de Estoque na Palma da Mão',
          desc: 'Consulte rapidamente o saldo de itens essenciais e acompanhe riscos de parada de linha a qualquer momento, de qualquer lugar.',
          tags: ['Itens Críticos', 'Saldo em Tempo Real', 'Visão por Almoxarifado', 'Acesso Seguro']
        }
      ]
    }
  };

  function initNeonModal() {
    const modal = document.getElementById('neon-modal');
    if (!modal) return;

    const backdrop = document.getElementById('neon-modal-backdrop');
    const closeBtn = document.getElementById('neon-modal-close');
    const badgeEl = document.getElementById('neon-modal-badge');
    const titleEl = document.getElementById('neon-modal-title');
    const summaryEl = document.getElementById('neon-modal-summary');
    const tabsContainer = document.getElementById('neon-modal-tabs');
    const screenTag = document.getElementById('neon-modal-screen-tag');
    const counterEl = document.getElementById('neon-modal-counter');
    const imgEl = document.getElementById('neon-modal-img');
    const captionTitle = document.getElementById('neon-modal-caption-title');
    const captionText = document.getElementById('neon-modal-caption-text');
    const captionMeta = document.getElementById('neon-modal-caption-meta');
    const dotsContainer = document.getElementById('neon-modal-dots');
    const prevBtn = document.getElementById('neon-modal-prev');
    const nextBtn = document.getElementById('neon-modal-next');

    let currentModule = null;
    let currentScreenIndex = 0;
    let lastActiveElement = null;

    function renderScreen(index) {
      if (!currentModule || !NEON_MODULES_DATA[currentModule]) return;
      const mod = NEON_MODULES_DATA[currentModule];
      const total = mod.screens.length;
      currentScreenIndex = (index + total) % total;
      const screen = mod.screens[currentScreenIndex];

      // Atualiza tabs
      if (tabsContainer) {
        const tabBtns = tabsContainer.querySelectorAll('.neon-modal-tab');
        tabBtns.forEach(function (tab, i) {
          tab.classList.toggle('is-active', i === currentScreenIndex);
          tab.setAttribute('aria-selected', i === currentScreenIndex ? 'true' : 'false');
        });
      }

      // Atualiza dots
      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.neon-modal-dot');
        dots.forEach(function (dot, i) {
          dot.classList.toggle('is-active', i === currentScreenIndex);
        });
      }

      // Transicao de imagem
      if (imgEl) {
        if (imgEl.getAttribute('src') !== screen.img) {
          imgEl.classList.add('is-loading');
          imgEl.src = screen.img;
          imgEl.alt = screen.title;
          imgEl.onload = function () {
            imgEl.classList.remove('is-loading');
          };
          imgEl.onerror = function () {
            imgEl.classList.remove('is-loading');
          };
        } else {
          imgEl.classList.remove('is-loading');
        }
      }

      // Atualiza textos e tags
      if (screenTag) screenTag.textContent = screen.tag || screen.name;
      if (counterEl) counterEl.textContent = (currentScreenIndex + 1) + ' de ' + total;
      if (captionTitle) captionTitle.textContent = screen.title;
      if (captionText) captionText.textContent = screen.desc;

      if (captionMeta) {
        captionMeta.innerHTML = '';
        if (Array.isArray(screen.tags)) {
          screen.tags.forEach(function (tagText) {
            const span = document.createElement('span');
            span.className = 'neon-modal-tag';
            span.textContent = tagText;
            captionMeta.appendChild(span);
          });
        }
      }
    }

    function openModal(moduleKey, screenIndex) {
      if (!NEON_MODULES_DATA[moduleKey]) return;
      currentModule = moduleKey;
      currentScreenIndex = screenIndex || 0;
      lastActiveElement = document.activeElement;

      const mod = NEON_MODULES_DATA[moduleKey];

      // Ativa modo mobile dedicado caso seja o modulo mobile
      if (moduleKey === 'mobile') {
        modal.classList.add('is-mobile-view');
      } else {
        modal.classList.remove('is-mobile-view');
      }

      // Preenche cabecalho
      if (badgeEl) badgeEl.textContent = mod.badge;
      if (titleEl) titleEl.textContent = mod.title;
      if (summaryEl) summaryEl.textContent = mod.summary;

      // Monta as tabs dinamicamente
      if (tabsContainer) {
        tabsContainer.innerHTML = '';
        mod.screens.forEach(function (screen, idx) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'neon-modal-tab' + (idx === currentScreenIndex ? ' is-active' : '');
          btn.setAttribute('role', 'tab');
          btn.setAttribute('aria-selected', idx === currentScreenIndex ? 'true' : 'false');
          btn.innerHTML = '<span class="neon-modal-tab-index">0' + (idx + 1) + '</span><span>' + screen.name + '</span>';
          btn.addEventListener('click', function () {
            renderScreen(idx);
          });
          tabsContainer.appendChild(btn);
        });
      }

      // Monta os dots dinamicamente
      if (dotsContainer) {
        dotsContainer.innerHTML = '';
        mod.screens.forEach(function (_, idx) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'neon-modal-dot' + (idx === currentScreenIndex ? ' is-active' : '');
          dot.setAttribute('aria-label', 'Ir para tela ' + (idx + 1));
          dot.addEventListener('click', function () {
            renderScreen(idx);
          });
          dotsContainer.appendChild(dot);
        });
      }

      renderScreen(currentScreenIndex);

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');

      // Pausa Lenis para liberar rolagem nativa de mouse dentro do dialog
      if (lenis && typeof lenis.stop === 'function') {
        lenis.stop();
      }
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      if (closeBtn) closeBtn.focus();
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.classList.remove('is-mobile-view');
      modal.setAttribute('aria-hidden', 'true');

      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';

      // Retoma Lenis para navegacao suave na pagina principal
      if (lenis && typeof lenis.start === 'function') {
        lenis.start();
      }

      if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
        lastActiveElement.focus();
      }
    }

    // Eventos de clique nas figuras interativas
    const interactivePlanes = document.querySelectorAll('[data-neon-modal]');
    interactivePlanes.forEach(function (plane) {
      const moduleKey = plane.getAttribute('data-neon-modal');
      plane.addEventListener('click', function (e) {
        e.preventDefault();
        openModal(moduleKey, 0);
      });
      plane.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(moduleKey, 0);
        }
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    if (backdrop) {
      backdrop.addEventListener('click', closeModal);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        renderScreen(currentScreenIndex - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        renderScreen(currentScreenIndex + 1);
      });
    }

    // Teclado: Escape fecha, setas esquerda/direita navegam
    window.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        renderScreen(currentScreenIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        renderScreen(currentScreenIndex + 1);
      }
    });

    // Expor globalmente para testes e automacoes
    window.openNeonModal = openModal;
    window.closeNeonModal = closeModal;
  }


  initNeonModal();

  window.addEventListener('load', refreshLayout);
})();
