/**
 * KINGS BILLIARDS & DOMINO — LANDING PAGE INTERACTION SCRIPT
 * Features:
 * - Canvas Particle Embers Engine
 * - Smooth Scroll & Navbar Shadow
 * - Game Category Filtering
 * - Interactive FAQ Accordion
 * - High-speed Download Progress Modal & Direct APK Trigger
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. CANVAS PARTICLE EMBERS ENGINE (CASINO GOLD BOKEH)
  // =========================================================================
  const canvas = document.getElementById('particles-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const maxParticles = window.innerWidth < 768 ? 20 : 45;

    class Particle {
      constructor() {
        this.reset(true);
      }
      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + 15;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -(0.4 + Math.random() * 0.9);
        this.size = 1 + Math.random() * 2.2;
        this.life = 0;
        this.maxLife = 100 + Math.random() * 120;
        this.maxAlpha = 0.25 + Math.random() * 0.45;
        this.color = Math.random() > 0.4 ? '255, 215, 0' : '192, 132, 252';
      }
      update() {
        this.life++;
        this.x += this.vx;
        this.y += this.vy;

        const half = this.maxLife / 2;
        if (this.life < half) {
          this.alpha = (this.life / half) * this.maxAlpha;
        } else {
          this.alpha = (1 - (this.life - half) / half) * this.maxAlpha;
        }

        if (this.life >= this.maxLife || this.y < -20) {
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.shadowColor = `rgba(${this.color}, 0.8)`;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  // =========================================================================
  // 2. NAVBAR SCROLL EFFECT & MOBILE MENU TOGGLE
  // =========================================================================
  const navbar = document.getElementById('navbar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      mobileMenuBtn.classList.toggle('active');
    });

    // Close mobile menu on clicking any nav link
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        mobileMenuBtn.classList.remove('active');
      });
    });
  }

  // Active Link Highlighting with IntersectionObserver
  const sections = document.querySelectorAll('section[id]');
  const observerOptions = {
    root: null,
    rootMargin: '-30% 0px -60% 0px',
    threshold: 0
  };

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(sec => navObserver.observe(sec));

  // =========================================================================
  // 3. GAME CATEGORY FILTER TABS
  // =========================================================================
  const tabButtons = document.querySelectorAll('.game-tab-btn');
  const gameCards = document.querySelectorAll('.game-card');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      gameCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.style.display = 'flex';
          card.style.animation = 'fadeInCard 0.35s ease forwards';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // =========================================================================
  // 4. INTERACTIVE FAQ ACCORDION
  // =========================================================================
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      // Close all others
      faqItems.forEach(i => i.classList.remove('active'));
      // Toggle current
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // =========================================================================
  // 5. DOWNLOAD PROGRESS MODAL & DIRECT APK TRIGGER
  // =========================================================================
  const downloadModal = document.getElementById('downloadModal');
  const dmCloseBtn = document.getElementById('dmCloseBtn');
  const dmProgressFill = document.getElementById('dmProgressFill');
  const dmStatusText = document.getElementById('dmStatusText');
  const dmPercentText = document.getElementById('dmPercentText');
  const downloadTriggers = document.querySelectorAll('.btn-primary-download, .btn-secondary-download, .btn-nav-download');

  const APK_FILE_URL = 'assets/kings-billiards-v2.79.apk';
  const APK_FILE_NAME = 'Kings-Billiards-v2.79.apk';

  function triggerDirectDownload() {
    const a = document.createElement('a');
    a.href = APK_FILE_URL;
    a.download = APK_FILE_NAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function runDownloadSimulation() {
    if (!downloadModal) return;
    downloadModal.classList.add('open');

    let progress = 0;
    dmProgressFill.style.width = '0%';
    dmPercentText.textContent = '0%';
    dmStatusText.textContent = 'Menghubungkan ke Server Cloud VIP...';

    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 18) + 12;

      if (progress > 30 && progress <= 65) {
        dmStatusText.textContent = 'Memverifikasi Integritas File & Antivirus...';
      } else if (progress > 65 && progress < 100) {
        dmStatusText.textContent = 'Menyiapkan Jalur Unduhan Kecepatan Tinggi...';
      }

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        dmStatusText.textContent = '✅ Berhasil! File APK sedang diunduh ke HP Anda...';
        dmPercentText.textContent = '100%';
        dmProgressFill.style.width = '100%';

        // Trigger real file download
        setTimeout(() => {
          triggerDirectDownload();
        }, 400);

        // Auto close after 4 seconds
        setTimeout(() => {
          downloadModal.classList.remove('open');
        }, 4500);
      }

      dmProgressFill.style.width = `${progress}%`;
      dmPercentText.textContent = `${progress}%`;
    }, 140);
  }

  downloadTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // If it's a link to #download-zone, let it scroll
      if (btn.getAttribute('href') === '#download-zone') return;

      e.preventDefault();
      runDownloadSimulation();
    });
  });

  if (dmCloseBtn && downloadModal) {
    dmCloseBtn.addEventListener('click', () => {
      downloadModal.classList.remove('open');
    });

    downloadModal.addEventListener('click', (e) => {
      if (e.target === downloadModal) {
        downloadModal.classList.remove('open');
      }
    });
  }

});

// Inline keyframe helper
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeInCard {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleSheet);
