'use strict';

const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
window.siteMotion = { enabled: () => !systemMotion.matches };
function syncMotionPreference() {
    document.documentElement.dataset.motion = window.siteMotion.enabled() ? 'running' : 'paused';
    document.dispatchEvent(new Event('motionpreferencechange'));
}
systemMotion.addEventListener('change', syncMotionPreference);
syncMotionPreference();

document.querySelectorAll('[data-industry]').forEach(button =>
    button.addEventListener('click', () => {
        const field = document.getElementById('message');
        field.value =
            'Property type: ' +
            button.dataset.industry +
            '\n' +
            field.value.replace(/^Property type:.*\n/, '');
        window.scrollToSection(document.getElementById('contact'));
        document.getElementById('name').focus({ preventScroll: true });
    })
);
document.querySelectorAll('#navigation a').forEach(a =>
    a.addEventListener('click', () => {
        const nav = document.getElementById('navigation');
        if (nav.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(nav).hide();
    })
);
let enquiry = '';
const quoteForm = document.getElementById('quoteForm');
const formspreeEndpoint = window.siteConfig?.formspreeEndpoint || '';
const directEnquiries = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(formspreeEndpoint);
if (quoteForm) {
    quoteForm.querySelector('[type=submit]').disabled = false;
    if (directEnquiries) {
        quoteForm.action = formspreeEndpoint;
        quoteForm.querySelector('[type=submit]').textContent = 'Send enquiry';
        document.getElementById('quote-help').textContent = 'Tell us what you need and send your enquiry directly to our team. Fields marked * are required.';
        document.getElementById('formNextStep').textContent = 'Your details will be processed by Formspree to deliver your enquiry to No Nonsense Services.';
    }
}
if (directEnquiries) {
    document.querySelectorAll('.enquiry-faq .faq-answer p').forEach(p => {
        p.textContent = 'Complete the form and select Send enquiry. You will see a confirmation when your enquiry has been submitted. You can also call or email us directly.';
    });
}
async function sendDirectEnquiry(form) {
    if (form.dataset.sending === 'true') return;
    const status = document.getElementById('formStatus');
    const button = form.querySelector('[type=submit]');
    form.dataset.sending = 'true';
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.textContent = 'Sending…';
    status.hidden = false;
    status.textContent = 'Sending your enquiry…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(formspreeEndpoint, {
            method: 'POST',
            body: new FormData(form),
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            const errors = Array.isArray(result.errors) ? result.errors.map(error => error.message).filter(Boolean).join(' ') : '';
            throw new Error(response.status === 429
                ? 'Too many enquiries have been submitted. Please wait and try again, or call us on 0405 103 703.'
                : errors || 'Your enquiry could not be submitted. Please try again or contact us by phone or email.');
        }
        form.reset();
        status.textContent = 'Thank you. Your enquiry has been submitted to No Nonsense Services.';
    } catch (error) {
        status.textContent = error.name === 'AbortError' || error instanceof TypeError
            ? 'We could not confirm submission. Your details are still here. Please check your connection or call 0405 103 703 before retrying.'
            : error.message;
    } finally {
        clearTimeout(timer);
        form.dataset.sending = 'false';
        form.removeAttribute('aria-busy');
        button.disabled = false;
        button.textContent = 'Send enquiry';
    }
}
quoteForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!quoteForm.reportValidity()) return;
    if (directEnquiries) {
        sendDirectEnquiry(quoteForm);
        return;
    }
    const data = new FormData(quoteForm);
    const value = key => String(data.get(key) || '').trim();
    const labels = {
        name: 'Name',
        company: 'Company',
        email: 'Email',
        phone: 'Phone',
        service: 'Service',
        location: 'Location'
    };
    enquiry = [
        'Hello No Nonsense Services,',
        '',
        'I would like to discuss cleaning services for my property.',
        '',
        ...Object.entries(labels).map(
            ([key, label]) => label + ': ' + (value(key) || 'Not provided')
        ),
        '',
        'Details: ' + (value('message') || 'Please contact me to discuss.'),
        '',
        'Thank you.'
    ].join('\n');
    document.getElementById('enquiryText').value = enquiry;
    document.getElementById('openEnquiry').href =
        'mailto:nononsenseservicesptyltd@gmail.com?subject=' +
        encodeURIComponent('Website enquiry — ' + (value('company') || value('name'))) +
        '&body=' +
        encodeURIComponent(enquiry);
    document.getElementById('enquiryPreview').hidden = false;
    const status = document.getElementById('formStatus');
    status.hidden = false;
    status.textContent = 'Your draft is ready below. It has not been sent.';
    const preview = document.getElementById('enquiryText');
    preview.focus({ preventScroll: true });
    window.scrollToSection?.(document.getElementById('enquiryPreview'));
});
quoteForm?.addEventListener('input', () => {
    if (!document.getElementById('enquiryPreview').hidden) {
        document.getElementById('enquiryPreview').hidden = true;
        document.getElementById('formStatus').textContent =
            'Details changed. Select Review my enquiry to update your draft.';
    }
});
document.getElementById('copyEnquiry')?.addEventListener('click', async () => {
    const status = document.getElementById('formStatus');
    try {
        await navigator.clipboard.writeText(enquiry);
        status.textContent =
            'Copied. Paste your enquiry into an email to nononsenseservicesptyltd@gmail.com.';
    } catch {
        const text = document.getElementById('enquiryText');
        text.focus();
        text.select();
        status.textContent = 'Select and copy the draft above, then paste it into your email.';
    }
    status.hidden = false;
});
document.getElementById('year').textContent = new Date().getFullYear();

(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const running = new Map();
    const easing = 'cubic-bezier(.16,1,.3,1)';
    function play(element, frames, options = {}) {
        if (!element || !window.siteMotion.enabled() || element.contains(document.activeElement))
            return;
        running.get(element)?.cancel();
        const animation = element.animate(frames, {
            duration: 900,
            easing,
            fill: 'backwards',
            ...options
        });
        running.set(element, animation);
        const clear = () => {
            if (running.get(element) === animation) running.delete(element);
        };
        animation.onfinish = clear;
        animation.oncancel = clear;
    }
    const rise = [
        { opacity: 0, transform: 'translateY(35px)' },
        { opacity: 1, transform: 'translateY(0)' }
    ];

    document.querySelectorAll('.new-hero h1, .page-hero h1').forEach(heading => {
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode())
            if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
        let index = 0;
        nodes.forEach(node => {
            const fragment = document.createDocumentFragment();
            node.textContent.split(/(\s+)/).forEach(word => {
                if (!word.trim()) {
                    fragment.append(document.createTextNode(word));
                    return;
                }
                const span = document.createElement('span');
                span.className = 'motion-word';
                span.textContent = word;
                fragment.append(span);
            });
            node.replaceWith(fragment);
        });
        heading.querySelectorAll('.motion-word').forEach(word =>
            play(
                word,
                [
                    { opacity: 0, transform: 'translateY(42px) rotate(3deg)' },
                    { opacity: 1, transform: 'translateY(0) rotate(0deg)' }
                ],
                { delay: Math.min(index++ * 100, 600), duration: 1100 }
            )
        );
    });
    document
        .querySelectorAll(
            '.hero-kicker, .hero-message > p, .hero-actions, .hero-small-note, .page-hero > .site-container > p'
        )
        .forEach((el, i) => play(el, rise, { delay: 200 + i * 100 }));
    play(
        document.querySelector('.hero-image-frame'),
        [
            { opacity: 0, clipPath: 'inset(0 0 100% 0)', transform: 'scale(.96)' },
            { opacity: 1, clipPath: 'inset(0 0 0% 0)', transform: 'scale(1)' }
        ],
        { duration: 1450, delay: 180 }
    );
    play(
        document.querySelector('.hero-stamp'),
        [
            { opacity: 0, transform: 'translateX(-30px) scale(.9)' },
            { opacity: 1, transform: 'translateX(0) scale(1)' }
        ],
        { duration: 1100, delay: 650 }
    );
    const targets = document.querySelectorAll(
        '.process-grid > li, .faq-list details, .about-slideshow, .footer-layout > *, .assurance-item, .section-heading, .service-grid > div, .standard-row, .industries .col-lg-5, .industry-list button, .quote-band .site-container, #contact .row > .col-lg-5, #quoteForm, .detail-card, .accreditation-tile, .editorial-image, .home-about .col-lg-5, .sector-section .row > div, .specialist-row, .location-card, .page-cta .site-container'
    );
    const observer = new IntersectionObserver(
        entries => {
            let stagger = 0;
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                const el = entry.target;
                const delay = Math.min(stagger++ * 105, 315);
                if (el.matches('.editorial-image')) {
                    play(
                        el,
                        [
                            {
                                opacity: 0,
                                clipPath: 'inset(0 18% 0 0)',
                                transform: 'translateX(-20px)'
                            },
                            { opacity: 1, clipPath: 'inset(0 0% 0 0)', transform: 'translateX(0)' }
                        ],
                        { duration: 1200, delay }
                    );
                } else if (
                    el.matches(
                        '.service-grid > div, .detail-card, .accreditation-tile, .location-card'
                    )
                ) {
                    play(
                        el,
                        [
                            { opacity: 0, transform: 'translateY(45px) scale(.96)' },
                            { opacity: 1, transform: 'translateY(0) scale(1)' }
                        ],
                        { delay, duration: 1000 }
                    );
                } else {
                    play(el, rise, { delay });
                }
                const number = el.querySelector('.tile-number, .detail-number');
                play(
                    number,
                    [
                        { opacity: 0, transform: 'translateY(16px) scale(.65)' },
                        { opacity: 1, transform: 'translateY(0) scale(1)' }
                    ],
                    { delay: delay + 230, duration: 850 }
                );
                const eyebrow = el.querySelector('.eyebrow');
                if (eyebrow && window.siteMotion.enabled()) eyebrow.classList.add('motion-line');
            });
        },
        { threshold: 0, rootMargin: '0px 0px -30px 0px' }
    );
    targets.forEach(el => observer.observe(el));
    document.addEventListener('focusin', event => {
        running.forEach((animation, element) => {
            if (element.contains(event.target)) animation.cancel();
        });
    });
    document.addEventListener('motionpreferencechange', () => {
        if (!window.siteMotion.enabled()) {
            running.forEach(animation => animation.cancel());
            running.clear();
            document
                .querySelectorAll('.motion-line')
                .forEach(el => el.classList.remove('motion-line'));
        }
    });
})();

(() => {
    const header = document.querySelector('.site-header');
    let pending = false;
    const update = () => {
        const available = document.documentElement.scrollHeight - innerHeight;
        const progress = available > 0 ? Math.min(1, Math.max(0, scrollY / available)) : 0;
        header?.style.setProperty('--reading-progress', progress);
        header?.classList.toggle('is-scrolled', scrollY > 24);
        pending = false;
    };
    const request = () => {
        if (!pending) {
            pending = true;
            requestAnimationFrame(update);
        }
    };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request, { passive: true });
    addEventListener('load', request, { once: true });
    update();
})();

const enquiryForm = document.getElementById('quoteForm');
if (enquiryForm) {
    const params = new URLSearchParams(window.location.search);
    const serviceField = document.getElementById('service');
    const requestedService = params.get('service');
    if ([...serviceField.options].some(option => option.value === requestedService))
        serviceField.value = requestedService;
    const industries = {
    "commercial": "Office & commercial",
    "education": "School cleaning",
    "industrial": "Warehouse cleaning",
    "retail": "Retail cleaning",
    "healthcare": "Medical & dental clinics",
    "builders": "Builders & construction cleaning"
};
    const industry = industries[params.get('industry')];
    if (industry) {
        document.getElementById('message').value = 'Property type: ' + industry + '\n';
        serviceField.value =
            params.get('industry') === 'commercial' ? 'Office & commercial' : industry;
    }
}

(() => {
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const cards = document.querySelectorAll(
        '.sector-tile, .accreditation-tile, .detail-card, .location-card'
    );
    const resets = [];
    cards.forEach(card => {
        let frame = 0;
        const reset = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            card.classList.remove('pointer-lit');
            ['--tilt-x', '--tilt-y', '--light-x', '--light-y'].forEach(key =>
                card.style.removeProperty(key)
            );
        };
        resets.push(reset);
        card.addEventListener(
            'pointermove',
            event => {
                if (
                    !window.siteMotion.enabled() ||
                    !finePointer.matches ||
                    event.pointerType === 'touch'
                )
                    return;
                const { clientX, clientY } = event;
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => {
                    if (!window.siteMotion.enabled()) return;
                    const box = card.getBoundingClientRect();
                    const x = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
                    const y = Math.min(1, Math.max(0, (clientY - box.top) / box.height));
                    card.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
                    card.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
                    card.style.setProperty('--light-x', `${x * 100}%`);
                    card.style.setProperty('--light-y', `${y * 100}%`);
                    card.classList.add('pointer-lit');
                });
            },
            { passive: true }
        );
        card.addEventListener('pointerleave', reset);
        card.addEventListener('pointercancel', reset);
        card.addEventListener('focusin', reset);
    });
    document.addEventListener('motionpreferencechange', () => {
        if (!window.siteMotion.enabled()) resets.forEach(reset => reset());
    });
    finePointer.addEventListener('change', () => resets.forEach(reset => reset()));
    document.querySelectorAll('.btn').forEach(button =>
        button.addEventListener('click', event => {
            if (!window.siteMotion.enabled()) return;
            const box = button.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'click-wave';
            ripple.setAttribute('aria-hidden', 'true');
            ripple.style.left = `${event.detail ? event.clientX - box.left : box.width / 2}px`;
            ripple.style.top = `${event.detail ? event.clientY - box.top : box.height / 2}px`;
            button.append(ripple);
            setTimeout(() => ripple.remove(), 800);
        })
    );

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries =>
            entries.forEach(entry =>
                entry.target.classList.toggle('ambient-live', entry.isIntersecting)
            )
        );
        document
            .querySelectorAll('.new-hero, .page-hero, .home-accreditations')
            .forEach(el => observer.observe(el));
    }
    const visibility = () => {
        document.documentElement.dataset.tabHidden = String(document.hidden);
    };
    document.addEventListener('visibilitychange', visibility);
    visibility();
})();

(() => {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const active = new Map();
    document.querySelectorAll('main h2').forEach(heading => {
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode())
            if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const fragment = document.createDocumentFragment();
            node.textContent.split(/(\s+)/).forEach(word => {
                if (!word.trim()) {
                    fragment.append(document.createTextNode(word));
                    return;
                }
                const shell = document.createElement('span');
                shell.className = 'section-word-shell';
                const inner = document.createElement('span');
                inner.className = 'section-word';
                inner.textContent = word;
                shell.append(inner);
                fragment.append(shell);
            });
            node.replaceWith(fragment);
        });
    });
    const observer = new IntersectionObserver(
        entries =>
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                if (!window.siteMotion.enabled()) return;
                entry.target.querySelectorAll('.section-word').forEach((word, index) => {
                    const animation = word.animate(
                        [
                            { transform: 'translateY(110%) rotate(3deg)', opacity: 0 },
                            { transform: 'translateY(0) rotate(0deg)', opacity: 1 }
                        ],
                        {
                            duration: 1100,
                            delay: Math.min(index * 65, 390),
                            easing: 'cubic-bezier(.16,1,.3,1)',
                            fill: 'backwards'
                        }
                    );
                    active.set(word, animation);
                    animation.onfinish = () => active.delete(word);
                    animation.oncancel = () => active.delete(word);
                });
            }),
        { threshold: 0, rootMargin: '0px 0px -25px 0px' }
    );
    document.querySelectorAll('main h2').forEach(heading => observer.observe(heading));
    document.addEventListener('motionpreferencechange', () => {
        if (!window.siteMotion.enabled()) {
            active.forEach(animation => animation.cancel());
            active.clear();
        }
    });
})();

(() => {
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    document.querySelectorAll('.new-hero, .home-accreditations').forEach(section => {
        let frame = 0;
        const reset = () => {
            cancelAnimationFrame(frame);
            section.classList.remove('light-tracking');
            section.style.removeProperty('--pointer-x');
            section.style.removeProperty('--pointer-y');
        };
        section.addEventListener(
            'pointermove',
            event => {
                if (!window.siteMotion.enabled() || !fine.matches || event.pointerType === 'touch')
                    return;
                const { clientX, clientY } = event;
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => {
                    if (!window.siteMotion.enabled()) return;
                    const bounds = section.getBoundingClientRect();
                    section.style.setProperty('--pointer-x', `${clientX - bounds.left}px`);
                    section.style.setProperty('--pointer-y', `${clientY - bounds.top}px`);
                    section.classList.add('light-tracking');
                });
            },
            { passive: true }
        );
        section.addEventListener('pointerleave', reset);
        section.addEventListener('pointercancel', reset);
        document.addEventListener('motionpreferencechange', () => {
            if (!window.siteMotion.enabled()) reset();
        });
        fine.addEventListener('change', reset);
    });
})();

(() => {
    const carousel = document.querySelector('.about-slideshow');
    if (!carousel) return;
    const slides = [...carousel.querySelectorAll('.about-slide')];
    if (slides.length < 2) return;
    let current = 0,
        timer = null,
        inView = false;
    function show(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => {
            slide.classList.toggle('is-active', i === current);
            slide.setAttribute('aria-hidden', String(i !== current));
        });
    }
    function sync() {
        clearTimeout(timer);
        timer = null;
        if (!window.siteMotion.enabled() || !inView || document.hidden) return;
        timer = setTimeout(() => {
            show(current + 1);
            sync();
        }, 5000);
    }
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('motionpreferencechange', sync);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(
            entries => {
                inView = entries[0].isIntersecting;
                sync();
            },
            { threshold: 0.1 }
        ).observe(carousel);
    } else {
        inView = true;
    }
    sync();
})();

(() => {
    let scroller;
    const header = document.querySelector('.site-header');
    const offset = () => -(header?.offsetHeight || 90) - 24;
    function configure() {
        scroller?.destroy();
        scroller = undefined;
        if (!window.siteMotion.enabled() || !window.Lenis) return;
        scroller = new Lenis({
            autoRaf: true,
            lerp: 0.085,
            smoothWheel: true,
            syncTouch: false,
            anchors: { offset: offset() },
            prevent: node =>
                node.matches?.('.modal, .dropdown-menu, textarea, select, [data-lenis-prevent]')
        });
        if (document.body.classList.contains('modal-open')) scroller.stop();
    }
    window.scrollToSection = target => {
        if (scroller) scroller.scrollTo(target, { offset: offset() });
        else
            target?.scrollIntoView({
                behavior: window.siteMotion.enabled() ? 'smooth' : 'instant'
            });
    };
    document.addEventListener('motionpreferencechange', configure);
    document.addEventListener('show.bs.modal', () => scroller?.stop());
    document.addEventListener('hidden.bs.modal', () => scroller?.start());
    addEventListener(
        'resize',
        () => {
            if (scroller) scroller.options.anchors = { offset: offset() };
        },
        { passive: true }
    );
    configure();

    const photos = [...document.querySelectorAll('.about-slideshow, .editorial-image')];
    const visible = new Set();
    let frame = 0;
    function update() {
        frame = 0;
        if (!window.siteMotion.enabled()) return;
        visible.forEach(el => {
            const rect = el.getBoundingClientRect();
            const position = (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight;
            el.style.setProperty(
                '--scroll-depth',
                `${Math.max(-10, Math.min(10, position * 24))}px`
            );
        });
    }
    function request() {
        if (!frame && visible.size) frame = requestAnimationFrame(update);
    }
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(({ target, isIntersecting }) => {
                if (isIntersecting) visible.add(target);
                else visible.delete(target);
            });
            request();
        });
        photos.forEach(el => {
            el.classList.add('scroll-depth');
            observer.observe(el);
        });
        addEventListener('scroll', request, { passive: true });
        addEventListener('resize', request, { passive: true });
        document.addEventListener('motionpreferencechange', () => {
            photos.forEach(el => el.style.removeProperty('--scroll-depth'));
            request();
        });
    }
})();
