document.addEventListener('DOMContentLoaded', function() {

  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');

  if (burger && navLinks) {
    burger.addEventListener('click', function(e) {
      e.stopPropagation();
      navLinks.classList.toggle('open');
      burger.classList.toggle('open');
    });

    document.addEventListener('click', function(e) {
      if (!burger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        burger.classList.remove('open');
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        navLinks.classList.remove('open');
        burger.classList.remove('open');
      }
    });

    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('open');
        burger.classList.remove('open');
      });
    });
  }

  var navEl = document.querySelector('nav');
  function onScroll() {
    if (!navEl) return;
    if (window.scrollY > 20) {
      navEl.classList.add('scrolled');
    } else {
      navEl.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length > 0) {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    reveals.forEach(function(el) { io.observe(el); });
  } else {
    reveals.forEach(function(el) { el.classList.add('in'); });
  }

  // Счётчики цифр (data-strip и кейс до/после): от 0 до значения при появлении в вьюпорте
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0 && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var cio = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        cio.unobserve(entry.target);
        var el = entry.target;
        var end = parseInt(el.getAttribute('data-count'), 10);
        var suffix = el.getAttribute('data-suffix') || '';
        var t0 = null;
        function tick(t) {
          if (t0 === null) t0 = t;
          var p = Math.min((t - t0) / 900, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('ru-RU') + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    counters.forEach(function(el) { cio.observe(el); });
  }

  // Калькулятор потерь: чек × записей в день × рабочих дней × 27%
  // (18% no-show без напоминаний + ~9% заявок теряется ночью: допущения в подписи блока)
  var calcNum = document.getElementById('calcNum');
  if (calcNum) {
    var calcInputs = Array.prototype.slice.call(document.querySelectorAll('.calc-section input[type="range"]'));
    var calcReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var calcRaf = null;
    var calcShown = 0;
    var fmtRu = function(n) { return Math.round(n).toLocaleString('ru-RU'); };

    var calcUpdate = function(animate) {
      var vals = calcInputs.map(function(inp) {
        var pct = (inp.value - inp.min) / (inp.max - inp.min) * 100;
        inp.style.setProperty('--fill', pct + '%');
        var out = inp.closest('.calc-row').querySelector('output');
        if (out) out.textContent = (+inp.value).toLocaleString('ru-RU') + (inp.getAttribute('data-unit') || '');
        return +inp.value;
      });
      var loss = vals[0] * vals[1] * vals[2] * 0.27;
      if (calcRaf) cancelAnimationFrame(calcRaf);
      if (!animate || calcReduced) {
        calcShown = loss;
        calcNum.textContent = fmtRu(loss);
        return;
      }
      var from = calcShown;
      var t0 = null;
      function tick(t) {
        if (t0 === null) t0 = t;
        var p = Math.min((t - t0) / 600, 1);
        calcShown = from + (loss - from) * (1 - Math.pow(1 - p, 3));
        calcNum.textContent = fmtRu(calcShown);
        if (p < 1) calcRaf = requestAnimationFrame(tick);
      }
      calcRaf = requestAnimationFrame(tick);
    };

    calcInputs.forEach(function(inp) {
      inp.addEventListener('input', function() { calcUpdate(true); });
    });
    calcUpdate(false); // заливка треков и стартовые значения при загрузке
  }

  // FAQ-аккордеон: открыт только один пункт, раскрытие анимирует CSS (::details-content)
  var faqItems = document.querySelectorAll('.faq-list details');
  faqItems.forEach(function(d) {
    d.addEventListener('toggle', function() {
      if (!d.open) return;
      faqItems.forEach(function(other) {
        if (other !== d) other.open = false;
      });
    });
  });

  // Mouse-follow glow на pricing-карточках (только устройства с курсором)
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.pricing-card').forEach(function(card) {
      card.addEventListener('mousemove', function(e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--x', (e.clientX - r.left) + 'px');
        card.style.setProperty('--y', (e.clientY - r.top) + 'px');
      });
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var href = this.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var offset = 90;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  var heroMark = document.querySelector('.hero-mark');
  if (heroMark && window.matchMedia('(min-width: 900px)').matches) {
    window.addEventListener('scroll', function() {
      var y = window.scrollY;
      if (y < window.innerHeight) {
        heroMark.style.transform = 'translateY(' + (y * 0.15) + 'px)';
      }
    }, { passive: true });
  }

  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      var nameInput = document.getElementById('name');
      var phoneInput = document.getElementById('phone');
      var nameErr = document.getElementById('nameError');
      var phoneErr = document.getElementById('phoneError');
      var success = document.getElementById('formSuccess');
      var btn = document.getElementById('submitBtn');
      var businessEl = document.getElementById('business');
      var packageEl = document.getElementById('package');
      var messageEl = document.getElementById('message');

      nameErr.classList.remove('visible');
      phoneErr.classList.remove('visible');
      success.classList.remove('visible');

      var ok = true;

      if (nameInput.value.trim().length < 2) {
        nameErr.classList.add('visible');
        ok = false;
      }

      if (phoneInput.value.replace(/\D/g, '').length < 7) {
        phoneErr.classList.add('visible');
        ok = false;
      }

      if (!ok) return;

      btn.textContent = 'Отправляем...';
      btn.disabled = true;

      var socialEl = document.getElementById('social');
      var honeypot = document.getElementById('company');
      var businessText = businessEl.options[businessEl.selectedIndex].text;
      var packageText = packageEl.options[packageEl.selectedIndex].text;
      var socialValue = socialEl ? socialEl.value.trim() : '';

      var text = 'TRIUMPH: Новая заявка с сайта\n'
        + '---\n'
        + 'Имя: ' + nameInput.value.trim() + '\n'
        + 'Телефон: ' + phoneInput.value + '\n'
        + (socialValue ? 'Соцсеть: ' + socialValue + '\n' : '')
        + 'Бизнес: ' + (businessEl.value ? businessText : 'Не указан') + '\n'
        + 'Формат: ' + (packageEl.value ? packageText : 'Не выбран') + '\n'
        + 'Сообщение: ' + (messageEl.value.trim() || 'Не указано') + '\n'
        + '---\n'
        + 'triumph-digital.ru';

      fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, company: honeypot ? honeypot.value : '' })
      })
      .then(function(res) {
        if (res.ok) {
          form.reset();
          success.classList.add('visible');
          setTimeout(function() { success.classList.remove('visible'); }, 5000);
        } else {
          alert('Ошибка отправки. Напишите нам в Telegram: @triumphmanage');
        }
      })
      .catch(function() {
        alert('Ошибка сети. Напишите нам в Telegram: @triumphmanage');
      })
      .finally(function() {
        btn.textContent = 'Отправить заявку';
        btn.disabled = false;
      });
    });
  }

  // ===== GSAP-слой скролл-анимаций: Lenis + pin-сцена «Как это чинится» + параллакс телефонов =====
  // Подключается только на index.html; если CDN не загрузился: тихо выходим, всё выше работает без него
  (function() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger);

    // плавный скролл: тот самый «маслянистый» ход из концепта
    if (typeof Lenis !== 'undefined') {
      var lenis = new Lenis({ duration: 1.1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function(time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    var mm = gsap.matchMedia();

    // pin-сцены только на десктопе: на мобильных обычный поток (.fix-list)
    mm.add('(min-width: 901px)', function() {

      // pin-сцена «Как это чинится»: секция зависает, 4 шага сменяются по скроллу
      var fix = document.getElementById('fix');
      if (fix) {
        fix.classList.add('fx'); // включает absolute-раскладку шагов только при живом GSAP
        var steps = gsap.utils.toArray('.fix-step');
        var dots = gsap.utils.toArray('.fix-dot');
        var bar = fix.querySelector('.fix-bar i');

        // GSAP владеет и transform, и видимостью: иначе на обратном скролле состояние рассинхронивается
        gsap.set(steps, { autoAlpha: 0, y: 40 });
        gsap.set(steps[0], { autoAlpha: 1, y: 0 }); // первый шаг виден сразу, блок никогда не пустой
        var setActiveDot = function(idx) {
          dots.forEach(function(d, di) { d.classList.toggle('is-active', di === idx); });
        };
        setActiveDot(0);

        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: fix, start: 'top top', end: '+=280%',
            pin: true, scrub: 0.6,
            anticipatePin: 1, invalidateOnRefresh: true
          }
        });
        // точки следуют за scrubbed-прогрессом таймлайна, а не за сырым скроллом: иначе точка обгоняет шаг
        tl.eventCallback('onUpdate', function() {
          setActiveDot(Math.min(steps.length - 1, Math.floor(tl.progress() * steps.length)));
        });
        steps.forEach(function(step, i) {
          if (i > 0) tl.to(step, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, i);
          if (i < steps.length - 1) {
            tl.to(step, { autoAlpha: 0, y: -40, duration: 0.7, ease: 'power2.in' }, i + 0.75);
          }
        });
        if (bar) tl.to(bar, { scaleX: 1, ease: 'none', duration: steps.length }, 0);

        // пересчёт после полной загрузки: шрифты/картинки сдвигают высоту → иначе pin не дорелизится и шаг наезжает на герой
        window.addEventListener('load', function() { ScrollTrigger.refresh(); });
      }

      // телефоны «Система в работе»: разноскоростной параллакс по скроллу
      // transform забирает GSAP, opacity оставляем reveal-у: иначе CSS-transition смазывает scrub
      gsap.utils.toArray('.phone').forEach(function(ph, i) {
        ph.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        gsap.to(ph, {
          y: [-34, 18, -14][i] || 0, ease: 'none',
          scrollTrigger: { trigger: '.live-row', start: 'top bottom', end: 'bottom top', scrub: 1 }
        });
      });

      return function() { if (fix) fix.classList.remove('fx'); };
    });
  })();

  var phoneEl = document.getElementById('phone');
  if (phoneEl) {
    phoneEl.addEventListener('input', function(e) {
      var v = e.target.value.replace(/\D/g, '').slice(0, 11);
      var f = '';
      if (v.length > 0) f = '+7';
      if (v.length > 1) f += ' (' + v.slice(1, 4);
      if (v.length >= 4) f += ') ' + v.slice(4, 7);
      if (v.length >= 7) f += '-' + v.slice(7, 9);
      if (v.length >= 9) f += '-' + v.slice(9, 11);
      e.target.value = f;
    });
  }

});
