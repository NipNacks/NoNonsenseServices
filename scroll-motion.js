// Locally bundled Lenis: smooth wheels and anchors, native touch and keyboard.
(() => {
  let scroller;
  const header = document.querySelector('.site-header');
  const offset = () => -(header?.offsetHeight || 90) - 24;
  function configure() {
    scroller?.destroy();
    scroller = undefined;
    if (!window.siteMotion.enabled() || !window.Lenis) return;
    scroller = new Lenis({
      autoRaf: true, lerp: 0.085, smoothWheel: true, syncTouch: false,
      anchors: {offset: offset()},
      prevent: node => node.matches?.('.modal, .dropdown-menu, textarea, select, [data-lenis-prevent]')
    });
    if (document.body.classList.contains('modal-open')) scroller.stop();
  }
  window.scrollToSection = target => {
    if (scroller) scroller.scrollTo(target, {offset: offset()});
    else target?.scrollIntoView({behavior: window.siteMotion.enabled() ? 'smooth' : 'instant'});
  };
  document.addEventListener('motionpreferencechange', configure);
  document.addEventListener('show.bs.modal', () => scroller?.stop());
  document.addEventListener('hidden.bs.modal', () => scroller?.start());
  addEventListener('resize', () => {
    if (scroller) scroller.options.anchors = {offset: offset()};
  }, {passive:true});
  configure();

  // Small, scroll-linked depth without translating content or changing layout.
  const photos = [...document.querySelectorAll('.about-slideshow, .editorial-image')];
  const visible = new Set();
  let frame = 0;
  function update() {
    frame = 0;
    if (!window.siteMotion.enabled()) return;
    visible.forEach(el => {
      const rect = el.getBoundingClientRect();
      const position = (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight;
      el.style.setProperty('--scroll-depth', `${Math.max(-10, Math.min(10, position * 24))}px`);
    });
  }
  function request() { if (!frame && visible.size) frame = requestAnimationFrame(update); }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(({target,isIntersecting}) => {
        if (isIntersecting) visible.add(target); else visible.delete(target);
      });
      request();
    });
    photos.forEach(el => {el.classList.add('scroll-depth');observer.observe(el);});
    addEventListener('scroll', request, {passive:true});
    addEventListener('resize', request, {passive:true});
    document.addEventListener('motionpreferencechange', () => {
      photos.forEach(el => el.style.removeProperty('--scroll-depth'));
      request();
    });
  }
})();
