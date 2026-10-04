/* Stephen Quartarone — portfolio interactions (shared by every page) */
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  /* ---- mobile nav ---- */
  var toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- reading progress (header underline) ---- */
  var bar = document.querySelector('.progress');
  if (bar) {
    var onScroll = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- cursor coordinate readout (desktop only, via CSS) ---- */
  var coords = document.querySelector('.coords');
  if (coords && window.matchMedia('(pointer:fine)').matches) {
    var cx = coords.querySelector('[data-x]');
    var cy = coords.querySelector('[data-y]');
    var pad = function (n) { return String(Math.max(0, Math.round(n))).padStart(4, '0'); };
    window.addEventListener('mousemove', function (e) {
      cx.textContent = pad(e.clientX);
      cy.textContent = pad(e.clientY + window.scrollY);
    }, { passive: true });
  }

  /* ---- reveal on scroll ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- image lightbox for figures ---- */
  var plates = document.querySelectorAll('.fig-plate');
  if (plates.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Enlarged image');
    box.innerHTML = '<button class="lightbox-close" type="button">Close ✕</button><figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(box);
    var bImg = box.querySelector('img');
    var bCap = box.querySelector('figcaption');
    var closeBtn = box.querySelector('.lightbox-close');
    var lastFocus = null;

    var close = function () {
      box.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };
    plates.forEach(function (plate) {
      var img = plate.querySelector('img');
      if (!img) return;
      // photo figures use a blurred copy of the image to fill the frame
      if (plate.parentElement.classList.contains('photo')) {
        plate.style.setProperty('--img', 'url("' + img.getAttribute('src') + '")');
      }
      plate.setAttribute('tabindex', '0');
      plate.setAttribute('role', 'button');
      plate.setAttribute('aria-label', 'Enlarge image: ' + (img.alt || 'figure'));
      var open = function () {
        lastFocus = plate;
        bImg.src = img.currentSrc || img.src;
        bImg.alt = img.alt;
        var cap = plate.parentElement.querySelector('figcaption');
        bCap.textContent = cap ? cap.textContent : img.alt;
        box.classList.add('open');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
      };
      plate.addEventListener('click', open);
      plate.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
    box.addEventListener('click', function (e) { if (e.target !== bImg) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('open')) close();
    });
  }

  /* ---- copy email ---- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var text = btn.getAttribute('data-copy');
      var done = function () {
        var prev = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('done');
        setTimeout(function () { btn.textContent = prev; btn.classList.remove('done'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    });
  });
})();
