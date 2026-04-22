/* ═══════════════════════════════════════════════════════════════════
   SG-Portfolio — Main JavaScript
   Shubham Gupta · m4verick · RAVEN'34
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════════════════════════
// GLOBALS & STATE
// ═══════════════════════════════════════════════════════════════════

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

let safeWidth  = window.innerWidth;
let safeHeight = window.innerHeight;
let scrollY    = 0;
let introComplete = false;
let contrastActive = false;

// ═══════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

function cachedFetch(key, url, ttl = 3600000) {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < ttl) return Promise.resolve(data);
    }
  } catch (e) { /* ignore */ }
  return fetch(url)
    .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
    .then(data => {
      try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch(e) {}
      return data;
    });
}

// ═══════════════════════════════════════════════════════════════════
// BINARY SEPARATOR ANIMATION
// ═══════════════════════════════════════════════════════════════════

function initSeparators() {
  $$('.js-sep-binary').forEach(el => {
    const strings = el.dataset.strings.split('|');
    const encoded = strings.map(s => {
      return s.split('').map(c => {
        const code = c.charCodeAt(0).toString(2).padStart(8, '0');
        return code;
      }).join(' ');
    }).join('  ·  ');
    el.textContent = encoded;

    // Randomly toggle bits
    setInterval(() => {
      const chars = el.textContent.split('');
      for (let i = 0; i < chars.length; i++) {
        if ((chars[i] === '0' || chars[i] === '1') && Math.random() < 0.08) {
          chars[i] = chars[i] === '0' ? '1' : '0';
        }
      }
      el.textContent = chars.join('');
    }, 120);
  });
}

// ═══════════════════════════════════════════════════════════════════
// MATRIX RAIN (Intro + Hero)
// ═══════════════════════════════════════════════════════════════════

class MatrixRain {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.chars  = '01';
    this.fontSize = options.fontSize || 14;
    this.opacity  = options.opacity  || 0.25;
    this.color    = options.color    || '#60a5fa';
    this.bgAlpha  = options.bgAlpha  || 0.05;
    this.columns  = [];
    this.animId   = null;
    this.running  = false;
    this.mouseX   = -999;
    this.mouseY   = -999;
    this.repulse  = options.repulse !== false;
    this.resize();
  }

  resize() {
    this.canvas.width  = this.canvas.offsetWidth  || safeWidth;
    this.canvas.height = this.canvas.offsetHeight || safeHeight;
    const cols = Math.floor(this.canvas.width / this.fontSize);
    // Preserve existing columns, add/remove as needed
    while (this.columns.length < cols) {
      this.columns.push({ y: Math.random() * this.canvas.height / this.fontSize });
    }
    this.columns.length = cols;
  }

  setColor(color) { this.color = color; }

  tick() {
    const { ctx, canvas, fontSize } = this;
    const w = canvas.width, h = canvas.height;

    // Trail fade
    ctx.fillStyle = `rgba(9,9,11,${this.bgAlpha})`;
    ctx.fillRect(0, 0, w, h);

    ctx.font = `${fontSize}px JetBrains Mono, monospace`;

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      const x   = i * fontSize;

      // Mouse repulsion
      if (this.repulse) {
        const dx = x - this.mouseX;
        const dy = col.y * fontSize - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) { continue; } // skip drawing near cursor
      }

      const char   = this.chars[Math.floor(Math.random() * this.chars.length)];
      const alpha  = rand(0.05, 0.2) * this.opacity / 0.25;
      ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('rgba(', '');

      // Use fillStyle directly with hex + alpha via globalAlpha
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.fillText(char, x, col.y * fontSize);
      ctx.globalAlpha = 1;

      if (col.y * fontSize > h && Math.random() > 0.975) {
        col.y = 0;
      } else {
        col.y += 1;
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.tick();
      this.animId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
  }

  setMouse(x, y) { this.mouseX = x; this.mouseY = y; }
}

// ═══════════════════════════════════════════════════════════════════
// INTRO LOADER
// ═══════════════════════════════════════════════════════════════════

function initIntro() {
  const intro       = $('.js-intro');
  const introCanvas = $('.js-intro-matrix');
  const logo        = $('.js-logo-intro');
  const tagline     = $('.js-intro-tagline');
  const borderTop   = $('.js-border-top');
  const borderLeft  = $('.js-border-left');
  const borderRight = $('.js-border-right');
  const wrapper     = $('.js-site-wrapper');
  const mount       = $('.js-mount');

  if (!intro) return;

  // Size canvas
  introCanvas.width  = window.innerWidth;
  introCanvas.height = window.innerHeight;

  const rain = new MatrixRain(introCanvas, {
    fontSize: 14,
    opacity: 0.3,
    bgAlpha: 0.06,
    repulse: false,
  });
  rain.start();

  // GSAP Timeline
  const tl = gsap.timeline();

  // Show wrapper behind intro immediately
  tl.set(wrapper, { opacity: 1 }, 0);

  // Logo appear
  tl.to(logo, {
    opacity: 1,
    scale: 1,
    duration: 0.8,
    ease: 'power4.out',
  }, 0.3);

  // Tagline appear
  tl.to(tagline, {
    opacity: 1,
    duration: 0.6,
    ease: 'power3.out',
  }, 0.8);

  // Borders extend
  tl.to(borderTop, {
    scaleX: 1,
    transformOrigin: 'left center',
    duration: 1.5,
    ease: 'power3.inOut',
  }, 1.0);
  tl.to([borderLeft, borderRight], {
    scaleY: 1,
    transformOrigin: 'top center',
    duration: 1.5,
    ease: 'power3.inOut',
  }, 1.0);

  // Fade out matrix
  tl.to(introCanvas, {
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    onComplete: () => rain.stop(),
  }, 2.2);

  // Logo disappear
  tl.to(logo, {
    opacity: 0,
    scale: 0.8,
    duration: 0.5,
    ease: 'power4.in',
  }, 2.4);
  tl.to(tagline, { opacity: 0, duration: 0.3 }, 2.4);
  tl.to([borderTop, borderLeft, borderRight], {
    opacity: 0,
    duration: 0.4,
  }, 2.6);

  // Reveal
  tl.add(() => {
    // Dispatch intro event
    document.dispatchEvent(new CustomEvent('intro'));
    introComplete = true;
  }, 2.8);

  tl.to(mount, { opacity: 1, duration: 0.3 }, 3.0);

  tl.add(() => {
    intro.remove();
    document.documentElement.classList.remove('is-scroll-blocked');
    // Show hero stats
    const stats = $('.s-hero__stats');
    if (stats) stats.classList.add('visible');
  }, 3.5);
}

// ═══════════════════════════════════════════════════════════════════
// HERO MATRIX (background)
// ═══════════════════════════════════════════════════════════════════

function initHeroMatrix() {
  const canvas = $('.js-hero-matrix');
  if (!canvas) return;

  canvas.style.width  = '100%';
  canvas.style.height = '100%';
  canvas.width  = canvas.parentElement.offsetWidth  || safeWidth;
  canvas.height = canvas.parentElement.offsetHeight || safeHeight;

  const rain = new MatrixRain(canvas, {
    fontSize: 14,
    opacity: 0.18,
    bgAlpha: 0.04,
    color: '#60a5fa',
    repulse: true,
  });

  // Enable mouse repulsion after intro
  document.addEventListener('intro', () => {
    rain.start();

    canvas.parentElement.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      rain.setMouse(e.clientX - rect.left, e.clientY - rect.top);
    });
    canvas.parentElement.addEventListener('mouseleave', () => {
      rain.setMouse(-999, -999);
    });
  });

  // Handle theme toggle
  document.addEventListener('contrastchange', (e) => {
    rain.setColor(e.detail.light ? '#09090b' : '#60a5fa');
    rain.bgAlpha = e.detail.light ? 0.08 : 0.04;
  });

  // Resize
  window.addEventListener('resize', () => {
    canvas.width  = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    rain.resize();
  });
}

// ═══════════════════════════════════════════════════════════════════
// HERO TITLE — SPLIT TEXT + GLITCH
// ═══════════════════════════════════════════════════════════════════

function initHeroTitle() {
  const words = $$('.s-hero__title__word');
  if (!words.length) return;

  words.forEach(word => {
    const text = word.textContent;
    word.textContent = '';
    word.setAttribute('aria-label', text);

    text.split('').forEach(letter => {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.display = 'inline-block';
      span.style.overflow = 'hidden';
      span.style.position = 'relative';

      const inner = document.createElement('span');
      inner.className = 'char__inner';
      inner.textContent = letter;
      inner.style.display = 'inline-block';
      inner.style.transform = 'translateY(-100%)';
      inner.style.transition = 'transform 1.2s cubic-bezier(0.16,1,0.3,1)';

      span.appendChild(inner);
      word.appendChild(span);
    });
  });

  // Animate in on intro event
  document.addEventListener('intro', () => {
    const chars = $$('.char__inner');
    chars.forEach((c, i) => {
      setTimeout(() => {
        c.style.transform = 'translateY(0)';
      }, i * 40);
    });

    // Start glitch after reveal
    setTimeout(startCharGlitch, 2500);
  });
}

function startCharGlitch() {
  const chars = $$('.char__inner');
  if (!chars.length) return;

  setInterval(() => {
    if (Math.random() > 0.88) return;
    const char = chars[randInt(0, chars.length - 1)];
    if (!char || char.dataset.glitching) return;

    char.dataset.glitching = '1';
    const randSym = '!@#$%^&*<>?/\\|0123456789ABCDEF'.charAt(randInt(0, 30));
    const orig = char.textContent;

    char.style.color = 'var(--color-primary)';
    char.textContent = randSym;

    setTimeout(() => {
      char.textContent = orig;
      char.style.color = '';
      delete char.dataset.glitching;
    }, 160);
  }, 600);
}

// ═══════════════════════════════════════════════════════════════════
// HEADER CONSOLE TYPEWRITER
// ═══════════════════════════════════════════════════════════════════

const CONSOLE_MESSAGES = [
  '[ INITIALIZING BREACH SEQUENCE... ]',
  'scanning for open ports...',
  'nmap -sV -O target.local',
  'found 3 open ports. patience, hacker.',
  'running gobuster... probably.',
  'chmod 777 everything (jk don\'t do this)',
  'sudo make me a portfolio',
  '[ ACCESS GRANTED ]',
  'writing clean code is a security measure.',
  'git commit -m "it works, don\'t touch"',
  'searching for flags...',
  'cat /etc/passwd... just kidding.',
  'this is fine. everything is fine.',
  'hydra -l admin -P rockyou.txt...',
  '[ RAVEN ONLINE ]',
  'man, even my console has impostor syndrome.',
  'python exploit.py && pray',
  '> _ who am i? m4verick, obviously.',
  'metasploit: the "ctrl-z of hacking"',
  'ssh m4verick@raven -p 22 -i id_rsa',
  'whoami && cat /root/flag.txt',
  'found flag: SG{p0rtf0l10_h4ck3d}',
  '> _ sudo -i # living dangerously',
  'nmap done. 3 open. 65532 filtered.',
  'john --wordlist=rockyou.txt hash.txt',
  'burpsuite intercepting traffic...',
  'nc -lvnp 4444 # waiting for shell',
  'msfvenom -p python/meterpreter...',
  'building something from Punjab, India.',
  'certutil -hashfile portfolio.html MD5',
  'strings binary | grep -i "flag"',
];

function initConsole() {
  const el = $('.js-console-text');
  if (!el) return;

  let pool = [...CONSOLE_MESSAGES].sort(() => Math.random() - 0.5);
  let poolIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let currentMsg = '';
  let timeout;

  function type() {
    if (poolIdx >= pool.length) {
      pool = [...CONSOLE_MESSAGES].sort(() => Math.random() - 0.5);
      poolIdx = 0;
    }
    currentMsg = pool[poolIdx];

    if (!isDeleting && charIdx <= currentMsg.length) {
      el.textContent = currentMsg.slice(0, charIdx);
      const ch = currentMsg[charIdx];
      const delay = ch === ' ' || ch === ',' ? 80 : ch === '.' ? 250 : 25;
      charIdx++;
      timeout = setTimeout(type, delay);
    } else if (!isDeleting && charIdx > currentMsg.length) {
      isDeleting = true;
      timeout = setTimeout(type, 2200);
    } else if (isDeleting && charIdx > 0) {
      charIdx--;
      el.textContent = currentMsg.slice(0, charIdx);
      timeout = setTimeout(type, 14);
    } else {
      isDeleting = false;
      charIdx = 0;
      poolIdx++;
      timeout = setTimeout(type, 400);
    }
  }

  // Start after intro
  document.addEventListener('intro', () => {
    setTimeout(type, 500);
  });
}

// ═══════════════════════════════════════════════════════════════════
// HEADER NAV — Smooth Scroll
// ═══════════════════════════════════════════════════════════════════

function initNavLinks() {
  $$('.js-nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetId = link.dataset.target;
      const target = document.getElementById(targetId);
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// THEME TOGGLE (Contrast)
// ═══════════════════════════════════════════════════════════════════

function initThemeToggle() {
  const btn  = $('.js-contrast');
  const mask = $('.js-contrast-mask');
  if (!btn || !mask) return;

  let isAnimating = false;

  btn.addEventListener('click', () => {
    if (isAnimating) return;
    isAnimating = true;

    // Wipe mask in
    gsap.to(mask, {
      x: '0%',
      duration: 0.5,
      ease: 'power3.inOut',
      onComplete: () => {
        // Toggle theme
        contrastActive = !contrastActive;
        document.documentElement.classList.toggle('theme-contrasted', !contrastActive);

        // Dispatch event for canvas components
        document.dispatchEvent(new CustomEvent('contrastchange', {
          detail: { light: !contrastActive }
        }));

        // Wipe out
        gsap.to(mask, {
          x: '-100%',
          duration: 0.5,
          ease: 'power3.inOut',
          onComplete: () => {
            isAnimating = false;
            gsap.set(mask, { x: '100%' }); // reset for next toggle
          }
        });
      }
    });
  });

  // Initial position off-screen right
  gsap.set(mask, { x: '100%' });
}

// ═══════════════════════════════════════════════════════════════════
// INTERSECTION OBSERVER — Reveal Animations
// ═══════════════════════════════════════════════════════════════════

function initIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Don't unobserve — let it stay visible
      }
    });
  }, { threshold: 0.15 });

  // Observe stats, projects, experience entries, certs, skill tiles
  $$('[data-js-stat], .js-project, .js-entry, .js-cert, .s-skills .s__tile, .s-coding-stats .s__tile').forEach(el => {
    observer.observe(el);
  });
}

// ═══════════════════════════════════════════════════════════════════
// ABOUT SECTION — Perspective Grid
// ═══════════════════════════════════════════════════════════════════

function initAboutGrid() {
  const svg  = $('.s-about__grid');
  const path = svg && svg.querySelector('path');
  if (!path) return;

  function buildGrid() {
    const w = svg.clientWidth || safeWidth;
    const h = svg.clientHeight || 400;

    let d = '';

    // Vertical perspective lines (converging to center from top)
    const vLines = 14;
    const cx = w / 2;
    for (let i = 0; i <= vLines; i++) {
      const t  = i / vLines;
      const x0 = t * w;
      const x1 = lerp(x0, cx, 0.6);
      d += `M ${x0} ${h} L ${x1} 0 `;
    }

    // Horizontal lines (evenly spaced)
    const hLines = 6;
    for (let i = 0; i <= hLines; i++) {
      const y = (i / hLines) * h;
      d += `M 0 ${y} L ${w} ${y} `;
    }

    path.setAttribute('d', d);
  }

  buildGrid();
  window.addEventListener('resize', buildGrid);
}

// ═══════════════════════════════════════════════════════════════════
// CTA WAVE GRID CANVAS
// ═══════════════════════════════════════════════════════════════════

function initCtaCanvas() {
  const canvas = $('.js-cta-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, cols, rows;
  const COLS = 20, ROWS = 12;
  let pts = [];
  let mouse = { x: -9999, y: -9999 };
  let animId;

  function init() {
    W = canvas.parentElement.offsetWidth;
    H = canvas.parentElement.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
    pts = [];
    const gapX = W / (COLS - 1);
    const gapY = H / (ROWS - 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        pts.push({
          ox: c * gapX,
          oy: r * gapY,
          x:  c * gapX,
          y:  r * gapY,
          vx: 0, vy: 0,
        });
      }
    }
  }

  function tick() {
    animId = requestAnimationFrame(tick);
    ctx.clearRect(0, 0, W, H);

    // Update points
    pts.forEach(p => {
      const dx  = mouse.x - p.x;
      const dy  = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rep  = 80;

      if (dist < rep) {
        const force = (rep - dist) / rep;
        p.vx -= (dx / dist) * force * 2;
        p.vy -= (dy / dist) * force * 2;
      }

      // Spring back to origin
      p.vx += (p.ox - p.x) * 0.08;
      p.vy += (p.oy - p.y) * 0.08;
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.x  += p.vx;
      p.y  += p.vy;
    });

    // Draw grid
    ctx.strokeStyle = 'rgba(96,165,250,0.12)';
    ctx.lineWidth   = 0.75;

    // Horizontal lines
    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath();
      for (let c = 0; c < COLS; c++) {
        const p = pts[r * COLS + c];
        if (c === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    // Vertical lines
    for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      for (let r = 0; r < ROWS; r++) {
        const p = pts[r * COLS + c];
        if (r === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  init();
  tick();

  const section = canvas.closest('section');
  if (section) {
    section.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    section.addEventListener('mouseleave', () => {
      mouse = { x: -9999, y: -9999 };
    });
  }

  window.addEventListener('resize', init);
}

// ═══════════════════════════════════════════════════════════════════
// CODING STATS — Vscreen Modal
// ═══════════════════════════════════════════════════════════════════

const PLATFORM_CONFIG = {
  github: {
    url:     'github.com/m4verick0304',
    extLink: 'https://github.com/m4verick0304',
    label:   'm4verick0304 — GitHub',
  },
  tryhackme: {
    url:     'tryhackme.com/p/m4vE.rick',
    extLink: 'https://tryhackme.com/p/m4vE.rick',
    label:   'm4vE.rick — TryHackMe',
  },
  leetcode: {
    url:     'leetcode.com/u/shubhamgupta03',
    extLink: 'https://leetcode.com/u/shubhamgupta03/',
    label:   'shubhamgupta03 — LeetCode',
  },
};

const THM_DATA = {
  rank:        'Top 10%',
  level:       'Hacker',
  rooms:       '25+',
  badges:      5,
  points:      '5,000+',
  streak:      '10 days',
  badges_list: ['Networking', 'Linux', 'Crypto', 'Web Hacking', 'OSINT'],
};

function buildGitHubContent(data) {
  const repos    = data ? data.public_repos : '--';
  const followers= data ? data.followers    : '--';
  const following= data ? data.following    : '--';
  const name     = data ? (data.name || 'm4verick0304') : 'm4verick0304';
  const bio      = data ? (data.bio || 'Cybersecurity Developer · RAVEN\'34') : 'Cybersecurity Developer · RAVEN\'34';
  const avatar   = 'https://github.com/m4verick0304.png';

  return `
    <div class="vscreen-platform">
      <div class="vscreen-profile">
        <img src="${avatar}" alt="${name}" onerror="this.style.display='none'">
        <div class="vscreen-profile__info">
          <div class="vscreen-profile__name">${name}</div>
          <div class="vscreen-profile__handle">@m4verick0304 · ${bio}</div>
        </div>
      </div>
      <div class="vscreen-stats">
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${repos}</div>
          <div class="vscreen-stat__label">Public Repos</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${followers}</div>
          <div class="vscreen-stat__label">Followers</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${following}</div>
          <div class="vscreen-stat__label">Following</div>
        </div>
      </div>
      <div style="margin-bottom:1rem">
        <div class="vscreen-progress__label">GitHub Contribution Chart</div>
        <img src="https://ghchart.rshah.org/60a5fa/m4verick0304" alt="GitHub contributions"
          style="width:100%;border-radius:6px;background:rgba(96,165,250,0.05);padding:0.5rem"
          onerror="this.alt='Contribution chart unavailable';this.style.opacity='0.3'" />
      </div>
      <a href="https://github.com/m4verick0304" target="_blank" rel="noopener noreferrer"
         style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.65rem 1.25rem;background:var(--color-primary);color:var(--color-secondary);font:700 11px/1 var(--font-mono);letter-spacing:0.06em;text-transform:uppercase;border-radius:4px">
        View GitHub Profile →
      </a>
    </div>
  `;
}

function buildTHMContent() {
  return `
    <div class="vscreen-platform">
      <h3><span>🎯</span> TryHackMe — m4vE.rick</h3>
      <div class="vscreen-stats">
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${THM_DATA.rank}</div>
          <div class="vscreen-stat__label">Global Rank</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${THM_DATA.rooms}</div>
          <div class="vscreen-stat__label">Rooms Completed</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${THM_DATA.points}</div>
          <div class="vscreen-stat__label">Total Points</div>
        </div>
      </div>
      <div class="vscreen-stats">
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${THM_DATA.level}</div>
          <div class="vscreen-stat__label">Level</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${THM_DATA.badges}</div>
          <div class="vscreen-stat__label">Badges</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">${THM_DATA.streak}</div>
          <div class="vscreen-stat__label">Streak</div>
        </div>
      </div>
      <div style="margin-bottom:1.5rem">
        <div class="vscreen-progress__label" style="margin-bottom:0.75rem">Skill Badges</div>
        <div class="vscreen-badges">
          ${THM_DATA.badges_list.map(b => `<span class="vscreen-badge">${b}</span>`).join('')}
        </div>
      </div>
      <div class="vscreen-progress">
        <div class="vscreen-progress__label">Top 10% Progress</div>
        <div class="vscreen-progress__bar">
          <div class="vscreen-progress__fill" id="thm-prog-fill" style="width:0%"></div>
        </div>
      </div>
      <div style="margin-top:1.5rem">
        <a href="https://tryhackme.com/p/m4vE.rick" target="_blank" rel="noopener noreferrer"
           style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.65rem 1.25rem;background:var(--color-primary);color:var(--color-secondary);font:700 11px/1 var(--font-mono);letter-spacing:0.06em;text-transform:uppercase;border-radius:4px">
          View TryHackMe Profile →
        </a>
      </div>
    </div>
  `;
}

function buildLCContent(data) {
  const solved = data ? (data.solvedProblem || data.totalSolved || '--') : '--';
  const easy   = data ? (data.easySolved   || '--') : '--';
  const medium = data ? (data.mediumSolved || '--') : '--';
  const hard   = data ? (data.hardSolved   || '--') : '--';

  const total  = 3000; // approximate LeetCode total
  const pct    = typeof solved === 'number' ? Math.round((solved / total) * 100) : 0;

  return `
    <div class="vscreen-platform">
      <h3><span>⚡</span> LeetCode — shubhamgupta03</h3>
      <div class="vscreen-stats">
        <div class="vscreen-stat">
          <div class="vscreen-stat__val" id="lc-solved">${solved}</div>
          <div class="vscreen-stat__label">Problems Solved</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val" style="color:#34d399" id="lc-easy">${easy}</div>
          <div class="vscreen-stat__label">Easy</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val" style="color:#fbbf24" id="lc-med">${medium}</div>
          <div class="vscreen-stat__label">Medium</div>
        </div>
      </div>
      <div class="vscreen-stats">
        <div class="vscreen-stat">
          <div class="vscreen-stat__val" style="color:#f87171" id="lc-hard">${hard}</div>
          <div class="vscreen-stat__label">Hard</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">#6</div>
          <div class="vscreen-stat__label">Virtual Contest Rank</div>
        </div>
        <div class="vscreen-stat">
          <div class="vscreen-stat__val">1.95M</div>
          <div class="vscreen-stat__label">Overall Rank</div>
        </div>
      </div>
      <div class="vscreen-progress" style="margin-bottom:1rem">
        <div class="vscreen-progress__label">Progress toward top 50%</div>
        <div class="vscreen-progress__bar">
          <div class="vscreen-progress__fill" id="lc-prog-fill" style="width:0%"></div>
        </div>
        <div style="font:400 9px/1 var(--font-mono);color:var(--color-white);opacity:0.35;margin-top:0.4rem">${pct}% solved</div>
      </div>
      <div style="background:rgba(96,165,250,0.06);border:1px solid rgba(96,165,250,0.15);border-radius:8px;padding:1rem;margin-bottom:1.25rem;font:400 11px/1.6 var(--font-mono);color:var(--color-white);opacity:0.6">
        Note: Virtual Contest Rank #6 is from a Weekly Contest session in virtual mode.<br>
        Overall global rank: 1,954,335
      </div>
      <a href="https://leetcode.com/u/shubhamgupta03/" target="_blank" rel="noopener noreferrer"
         style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.65rem 1.25rem;background:var(--color-primary);color:var(--color-secondary);font:700 11px/1 var(--font-mono);letter-spacing:0.06em;text-transform:uppercase;border-radius:4px">
        View LeetCode Profile →
      </a>
    </div>
  `;
}

function animatePlatformContent(platform) {
  requestAnimationFrame(() => {
    if (platform === 'tryhackme') {
      const fill = document.getElementById('thm-prog-fill');
      if (fill) setTimeout(() => { fill.style.width = '90%'; }, 200);
    }
    if (platform === 'leetcode') {
      const fill = document.getElementById('lc-prog-fill');
      if (fill) setTimeout(() => { fill.style.width = '35%'; }, 200);
    }
  });
}

function initCodingStats() {
  const tiles      = $$('.js-stat-tile');
  const vscreen    = $('.js-vscreen');
  const backdrop   = $('.js-backdrop');
  const urlEl      = $('.js-url');
  const extLink    = $('.js-ext-link');
  const closeBtn   = $('.js-vscreen-close');
  const content    = $('.js-vscreen-content');

  if (!vscreen) return;

  function openVscreen(platform) {
    const cfg  = PLATFORM_CONFIG[platform];
    if (!cfg) return;

    // Set URL bar + external link
    if (urlEl)  urlEl.textContent = cfg.url;
    if (extLink) extLink.href = cfg.extLink;

    // Set content (loading state first)
    content.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;font:400 12px/1 var(--font-mono);color:var(--color-primary);opacity:0.5">[ LOADING... ]</div>`;

    // Show modal
    vscreen.removeAttribute('hidden');
    backdrop.classList.add('active');

    gsap.fromTo(vscreen,
      { opacity: 0, scale: 0.92, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power3.out',
        onComplete: () => loadPlatformContent(platform),
      }
    );
  }

  function loadPlatformContent(platform) {
    if (platform === 'github') {
      cachedFetch('gh_m4verick0304', 'https://api.github.com/users/m4verick0304')
        .then(data => {
          content.innerHTML = buildGitHubContent(data);
          animatePlatformContent(platform);
        })
        .catch(() => {
          content.innerHTML = buildGitHubContent(null);
        });
    } else if (platform === 'tryhackme') {
      content.innerHTML = buildTHMContent();
      animatePlatformContent(platform);
    } else if (platform === 'leetcode') {
      cachedFetch('lc_shubhamgupta03', 'https://alfa-leetcode-api.onrender.com/shubhamgupta03/solved')
        .then(data => {
          content.innerHTML = buildLCContent(data);
          animatePlatformContent(platform);
        })
        .catch(() => {
          content.innerHTML = buildLCContent(null);
          animatePlatformContent(platform);
        });
    }
  }

  function closeVscreen() {
    gsap.to(vscreen, {
      opacity: 0, scale: 0.92, y: 20, duration: 0.25, ease: 'power3.in',
      onComplete: () => {
        vscreen.setAttribute('hidden', '');
        backdrop.classList.remove('active');
        content.innerHTML = '';
      }
    });
  }

  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      openVscreen(tile.dataset.platform);
    });
    tile.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openVscreen(tile.dataset.platform);
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeVscreen);
    closeBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter') closeVscreen();
    });
  }
  backdrop.addEventListener('click', closeVscreen);

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !vscreen.hasAttribute('hidden')) closeVscreen();
  });
}

// ═══════════════════════════════════════════════════════════════════
// CUSTOM SCROLLBAR
// ═══════════════════════════════════════════════════════════════════

function initScrollbar() {
  const scrollbar = $('.js-scrollbar');
  const thumb     = $('.js-scrollbar-thumb');
  if (!scrollbar || !thumb) return;

  let isDragging = false;
  let startY     = 0;
  let startTop   = 0;

  function updateThumb() {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) { scrollbar.style.display = 'none'; return; }
    scrollbar.style.display = '';

    const sp   = window.scrollY / maxScroll;
    const th   = Math.max(40, (window.innerHeight / document.body.scrollHeight) * window.innerHeight);
    const maxT = window.innerHeight - th;

    thumb.style.height = th + 'px';
    thumb.style.top    = sp * maxT + 'px';
  }

  thumb.addEventListener('mousedown', e => {
    isDragging = true;
    startY     = e.clientY;
    startTop   = parseFloat(thumb.style.top) || 0;
    thumb.classList.add('is-dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dy      = e.clientY - startY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const th      = parseFloat(thumb.style.height) || 60;
    const maxT    = window.innerHeight - th;
    const newTop  = clamp(startTop + dy, 0, maxT);
    const sp      = newTop / maxT;

    window.scrollTo({ top: sp * maxScroll });
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    thumb.classList.remove('is-dragging');
  });

  window.addEventListener('scroll', updateThumb, { passive: true });
  window.addEventListener('resize', updateThumb);
  updateThumb();
}

// ═══════════════════════════════════════════════════════════════════
// SCROLL PARALLAX — About + Skills
// ═══════════════════════════════════════════════════════════════════

function initScrollParallax() {
  const sections = [
    { el: $('.js-about-inner'),  speed: 0.1 },
    { el: $('.js-skills-inner'), speed: 0.08 },
  ];

  window.addEventListener('scroll', () => {
    sections.forEach(({ el, speed }) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cy   = window.innerHeight / 2;
      const off  = (rect.top + rect.height / 2 - cy) * speed;
      el.style.transform = `translateY(${off}px)`;
    });
  }, { passive: true });
}

// ═══════════════════════════════════════════════════════════════════
// SCROLL-TRIGGERED SECTION ANIMATIONS (ScrollTrigger via GSAP)
// ═══════════════════════════════════════════════════════════════════

function initScrollAnimations() {
  if (!window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // Projects ghost title
  const letters = $$('.js-letter');
  if (letters.length) {
    const ghostLetters = ['P', 'R', 'O', 'J', 'S'];
    let idx = 0;
    setInterval(() => {
      letters.forEach((l, i) => {
        l.textContent = ghostLetters[(i + idx) % ghostLetters.length];
      });
      idx++;
    }, 800);
  }
}

// ═══════════════════════════════════════════════════════════════════
// FAVICON SVG (inject inline)
// ═══════════════════════════════════════════════════════════════════

function createFaviconSVG() {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280"><rect width="280" height="280" fill="#09090b"/><path d="M0 280V0h39.75v16.8h19.9V0h39.75v16.8h19.9V0H160v280h-39.75V40H100.4V280H60.65V40H39.75V280H0Z" fill="#60a5fa"/><path d="M200 0v168h-28V280h39.75V207.2H280V0h-39.75v167.2H239.75V0H200Z" fill="#60a5fa"/></svg>`;
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.setAttribute('href', url);
}

// ═══════════════════════════════════════════════════════════════════
// HEADER REVEAL ON INTRO
// ═══════════════════════════════════════════════════════════════════

function initHeaderReveal() {
  const head = $('.site-head');
  if (!head) return;

  gsap.set(head, { y: '-100%', opacity: 0 });

  document.addEventListener('intro', () => {
    gsap.to(head, {
      y: '0%',
      opacity: 1,
      duration: 1.2,
      ease: 'expo.out',
      delay: 0.3,
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// HANDLE RESIZE
// ═══════════════════════════════════════════════════════════════════

function initResize() {
  let debounce;
  window.addEventListener('resize', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      safeWidth  = window.innerWidth;
      safeHeight = window.innerHeight;
    }, 200);
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXPERIENCE SECTION — Animate entries on hover
// ═══════════════════════════════════════════════════════════════════

function initExperienceHover() {
  $$('.s__entry').forEach(entry => {
    entry.addEventListener('mouseenter', () => {
      gsap.to(entry, {
        x: 8,
        duration: 0.3,
        ease: 'power2.out',
      });
    });
    entry.addEventListener('mouseleave', () => {
      gsap.to(entry, {
        x: 0,
        duration: 0.5,
        ease: 'expo.out',
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
// PROJECTS SECTION — Stagger delay (JS override so all cards animate)
// ═══════════════════════════════════════════════════════════════════

function initProjectStagger() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el  = entry.target;
        const idx = parseInt(el.dataset.index || '0', 10);
        setTimeout(() => el.classList.add('visible'), idx * 120);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.1 });

  $$('.js-project').forEach(el => obs.observe(el));
}

// ═══════════════════════════════════════════════════════════════════
// STATS SECTION — stagger delay for coding-stats tiles
// ═══════════════════════════════════════════════════════════════════

function initStatsTileStagger() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const tiles = $$('.s-coding-stats .s__tile');
        tiles.forEach((t, i) => {
          setTimeout(() => t.classList.add('visible'), i * 100);
        });
        obs.disconnect();
      }
    });
  }, { threshold: 0.1 });

  const section = $('.s-coding-stats');
  if (section) obs.observe(section);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN INIT
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // OS detection for font offset
  const ua = navigator.userAgent.toLowerCase();
  const isWin    = ua.includes('windows');
  const isAndroid = ua.includes('android');
  const isFF     = ua.includes('firefox');
  if (isWin || isAndroid) document.documentElement.classList.add('is-win');
  if (isFF) document.documentElement.classList.add('is-ff');

  // Init all systems
  createFaviconSVG();
  initResize();
  initSeparators();
  initHeroMatrix();
  initHeroTitle();
  initHeaderReveal();
  initConsole();
  initNavLinks();
  initThemeToggle();
  initAboutGrid();
  initProjectStagger();
  initIntersectionObserver();
  initExperienceHover();
  initCodingStats();
  initStatsTileStagger();
  initCtaCanvas();
  initScrollParallax();
  initScrollAnimations();
  initScrollbar();

  // Start intro
  initIntro();

  // Add scanlines to hero stats visibility (after intro)
  document.addEventListener('intro', () => {
    // Reveal hero stats after short delay
    const stats = $('.s-hero__stats');
    if (stats) setTimeout(() => stats.classList.add('visible'), 800);
  });

});

// ═══════════════════════════════════════════════════════════════════
// SMOOTH SCROLL POLYFILL (fallback without Lenis)
// ═══════════════════════════════════════════════════════════════════

// Track scroll for any components that need it
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
}, { passive: true });
