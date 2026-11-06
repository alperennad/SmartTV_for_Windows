/* ==========================================================================
   MYTV APPLICATION LOGIC - TV NAVIGATION, AIR MOUSE & IN-APP BROWSER
   ========================================================================== */

(function () {
  // App State
  let configData = null;
  let currentHeroIndex = 0;
  let heroInterval = null;
  let pendingPowerAction = null;
  let soundEnabled = true;
  let laserEnabled = true;
  let isInAppViewOpen = false;

  // Audio Context for Clean TV Navigation Sounds
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playTvBeep(type) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'focus') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === 'select') {
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {
      // Audio fallback
    }
  }

  // DOM Elements
  const airCursor = document.getElementById('air-cursor');
  const liveTimeEl = document.getElementById('live-time');
  const liveDateEl = document.getElementById('live-date');
  const backdropImgEl = document.getElementById('backdrop-img');
  const mainTvContainer = document.getElementById('main-tv-container');

  // In-App Navigation Bar Elements
  const inAppTopBar = document.getElementById('inapp-top-bar');
  const inAppAppTitle = document.getElementById('inapp-app-title');
  const btnInAppBack = document.getElementById('btn-inapp-back');
  const btnInAppReload = document.getElementById('btn-inapp-reload');
  const btnInAppHome = document.getElementById('btn-inapp-home');

  // Hero Elements
  const heroProviderEl = document.getElementById('hero-provider');
  const heroTitleEl = document.getElementById('hero-title');
  const heroDescEl = document.getElementById('hero-desc');
  const heroPlayBtn = document.getElementById('hero-play-btn');
  const heroDetailsBtn = document.getElementById('hero-details-btn');
  const heroDotsEl = document.getElementById('hero-dots');

  // Containers
  const appsContainer = document.getElementById('apps-container');
  const continueContainer = document.getElementById('continue-container');
  const allAppsContainer = document.getElementById('all-apps-container');

  // Modals
  const addAppModal = document.getElementById('add-app-modal');
  const powerConfirmModal = document.getElementById('power-confirm-modal');
  const btnCloseModal = document.getElementById('modal-close-btn');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnSaveApp = document.getElementById('btn-save-app');
  const btnBrowseExe = document.getElementById('btn-browse-exe');
  const newAppTitle = document.getElementById('new-app-title');
  const newAppTarget = document.getElementById('new-app-target');
  const newAppExePath = document.getElementById('new-app-exe-path');
  const urlInputGroup = document.getElementById('url-input-group');
  const filePickerGroup = document.getElementById('file-picker-group');

  // Power
  const btnQuickPower = document.getElementById('btn-quick-power');
  const powerModalTitle = document.getElementById('power-modal-title');
  const powerModalDesc = document.getElementById('power-modal-desc');
  const btnPowerConfirm = document.getElementById('btn-power-confirm');
  const btnPowerCancel = document.getElementById('btn-power-cancel');

  // Settings
  const settingLaser = document.getElementById('setting-laser');
  const settingSound = document.getElementById('setting-sound');
  const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');

  // ==========================================================================
  // CLOCK & DATE ENGINE
  // ==========================================================================
  function updateLiveClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    liveTimeEl.textContent = `${hours}:${minutes}`;

    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dayNum = now.getDate();
    liveDateEl.textContent = `${dayNum} ${monthName} ${dayName}`;
  }
  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  // ==========================================================================
  // AIR MOUSE SMOOTH CURSOR & HOVER ENGINE
  // ==========================================================================
  let mouseTimer = null;
  window.addEventListener('mousemove', (e) => {
    if (!laserEnabled) return;
    airCursor.style.left = `${e.clientX}px`;
    airCursor.style.top = `${e.clientY}px`;
    airCursor.classList.add('active');

    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => {
      airCursor.classList.remove('active');
    }, 3500);
  });

  document.addEventListener('mouseover', (e) => {
    const focusable = e.target.closest('.focusable, .app-card, .cw-card, .nav-btn, .hero-btn, .game-launcher-card, .media-banner-card, .power-btn, .inapp-btn, button');
    if (focusable) {
      airCursor.classList.add('hovering');
      playTvBeep('focus');
    } else {
      airCursor.classList.remove('hovering');
    }
  });

  // ==========================================================================
  // IN-APP LAUNCHER (Opens Netflix, YouTube, Spotify inside MyTV!)
  // ==========================================================================
  async function launchContent(target, title = 'Uygulama') {
    playTvBeep('select');
    if (!target) return;

    if (target.startsWith('http://') || target.startsWith('https://')) {
      // Open in-app WebContentsView
      isInAppViewOpen = true;
      inAppAppTitle.textContent = title;
      inAppTopBar.classList.remove('hidden');
      stopHeroAutoSlide();

      await window.api.openInApp({ url: target, title });
    } else {
      // Local program / Steam executable
      await window.api.launchExternalApp(target);
    }
  }

  async function closeInAppView() {
    playTvBeep('select');
    isInAppViewOpen = false;
    inAppTopBar.classList.add('hidden');
    await window.api.closeInApp();
    startHeroAutoSlide();
  }

  btnInAppHome.addEventListener('click', closeInAppView);
  btnInAppBack.addEventListener('click', () => {
    playTvBeep('select');
    window.api.inAppGoBack();
  });
  btnInAppReload.addEventListener('click', () => {
    playTvBeep('select');
    window.api.inAppReload();
  });

  // ==========================================================================
  // NAVIGATION TABS SWITCHER
  // ==========================================================================
  const navButtons = document.querySelectorAll('.nav-btn');
  const views = {
    home: document.getElementById('view-home'),
    livetv: document.getElementById('view-livetv'),
    apps: document.getElementById('view-apps'),
    games: document.getElementById('view-games'),
    media: document.getElementById('view-media'),
    settings: document.getElementById('view-settings')
  };

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
      playTvBeep('select');
    });
  });

  function switchTab(tabName) {
    navButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabName));
    Object.keys(views).forEach(key => {
      if (views[key]) {
        views[key].classList.toggle('active', key === tabName);
      }
    });

    if (tabName !== 'home') {
      stopHeroAutoSlide();
    } else {
      startHeroAutoSlide();
    }

    if (tabName === 'livetv') {
      onLiveTvTabOpened();
    } else {
      onLiveTvTabClosed();
    }
  }

  // ==========================================================================
  // HERO SHOWCASE SLIDER
  // ==========================================================================
  function renderHero(index) {
    if (!configData || !configData.heroBanners || !configData.heroBanners[index]) return;
    const item = configData.heroBanners[index];
    currentHeroIndex = index;

    heroProviderEl.textContent = item.provider;
    heroTitleEl.textContent = item.title;
    heroDescEl.textContent = item.description;
    backdropImgEl.style.backgroundImage = `url('${item.bgImage}')`;

    heroPlayBtn.onclick = () => {
      launchContent(item.target, item.title);
    };

    const dots = heroDotsEl.querySelectorAll('.dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === index);
      dot.onclick = () => {
        renderHero(idx);
        restartHeroTimer();
      };
    });
  }

  function startHeroAutoSlide() {
    stopHeroAutoSlide();
    heroInterval = setInterval(() => {
      if (configData && configData.heroBanners && !isInAppViewOpen) {
        let nextIndex = (currentHeroIndex + 1) % configData.heroBanners.length;
        renderHero(nextIndex);
      }
    }, 8000);
  }

  function stopHeroAutoSlide() {
    if (heroInterval) clearInterval(heroInterval);
  }

  function restartHeroTimer() {
    stopHeroAutoSlide();
    startHeroAutoSlide();
  }

  // ==========================================================================
  // APPS & ROW RENDERING
  // ==========================================================================
  const SVG_ICONS = {
    youtube: `<svg viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    netflix: `<svg viewBox="0 0 24 24" fill="#E50914"><path d="M5.398 0v24h3.692V11.23l6.574 12.77H19.5V0h-3.692v12.77L9.234 0H5.398z"/></svg>`,
    spotify: `<svg viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.318c-.218.357-.68.47-1.037.253-2.846-1.74-6.43-2.134-10.65-1.17-.408.093-.812-.162-.905-.57-.093-.408.162-.812.57-.905 4.62-1.055 8.577-.611 11.769 1.345.358.217.47.68.253 1.037zm1.467-3.262c-.275.448-.863.59-1.312.315-3.258-2.003-8.225-2.585-12.08-1.414-.504.153-1.038-.135-1.191-.64-.153-.505.135-1.04.64-1.192 4.41-1.338 9.887-.693 13.628 1.61.45.275.59.863.315 1.312zm.126-3.398C15.19 8.36 8.75 8.148 5.097 9.257c-.604.184-1.248-.163-1.432-.767-.184-.604.163-1.248.767-1.432 4.218-1.281 11.341-1.034 15.82 1.625.543.322.723 1.026.401 1.57-.322.542-1.026.723-1.57.401z"/></svg>`,
    steam: `<svg viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 2a10 10 0 0 0-10 10c0 4.7 3.25 8.65 7.64 9.69l3.12-4.52a2.97 2.97 0 0 1-.76-.17l-3.3 1.38A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 3.73-2.56 6.87-6.04 7.76l-2.76-4.01a2.99 2.99 0 0 1 1.8-2.75 3 3 0 1 0-4.04 3.74l-2.6 3.77A9.97 9.97 0 0 0 12 22a10 10 0 0 0 0-20z"/></svg>`,
    chrome: `<svg viewBox="0 0 24 24" fill="#4285F4"><path d="M12 0C8.21 0 4.83 1.76 2.63 4.51L7.54 13A6 6 0 0 1 12 6h9.54A12.012 12.012 0 0 0 12 0zm-8.8 6.55A11.967 11.967 0 0 0 0 12c0 6.06 4.49 11.08 10.32 11.89L13.9 15.5A6.002 6.002 0 0 1 6 12c0-.98.24-1.9.66-2.71L3.2 6.55zM12 18a6 6 0 0 1-5.2-3H2.07A11.99 11.99 0 0 0 12 24c5.78 0 10.6-4.09 11.75-9.5H16.4A6.002 6.002 0 0 1 12 18z"/></svg>`,
    twitch: `<svg viewBox="0 0 24 24" fill="#9146FF"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>`,
    dmax: `<svg viewBox="0 0 24 24" fill="#ff5500"><path d="M2 4h7.5c4.7 0 8.5 3.6 8.5 8s-3.8 8-8.5 8H2V4zm4 4v8h3.5c2.5 0 4.5-1.8 4.5-4s-2-4-4.5-4H6zm14.5 1h2.5l-2.2 3 2.2 3h-2.5l-1.3-1.8-1.2 1.8h-2.5l2.2-3-2.2-3h2.5l1.2 1.8 1.3-1.8z"/></svg>`,
    tlc: `<svg viewBox="0 0 24 24" fill="#e60050"><path d="M1 5h8v4H6v10H2V9H1V5zm9 0h4v10h5v4h-9V5zm10 0h4v14h-4V5z"/></svg>`,
    generic: `<svg viewBox="0 0 24 24" fill="#cbd5e1"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>`
  };

  function renderApps() {
    if (!configData || !configData.apps) return;
    appsContainer.innerHTML = '';
    allAppsContainer.innerHTML = '';

    configData.apps.forEach((app, index) => {
      const card = document.createElement('div');
      card.className = `app-card focusable ${app.icon || ''}`;
      card.tabIndex = 0;
      if (index === 0) card.classList.add('custom-active');

      const iconSvg = SVG_ICONS[app.icon] || SVG_ICONS.generic;
      card.innerHTML = `
        <div class="app-icon">${iconSvg}</div>
        <span class="app-label">${app.title}</span>
      `;

      card.addEventListener('click', () => {
        launchContent(app.target, app.title);
      });

      appsContainer.appendChild(card);

      const fullCard = card.cloneNode(true);
      fullCard.addEventListener('click', () => {
        launchContent(app.target, app.title);
      });
      allAppsContainer.appendChild(fullCard);
    });

    const addCard = document.createElement('div');
    addCard.className = 'app-card add-card focusable';
    addCard.tabIndex = 0;
    addCard.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      <span class="app-label">Uygulama Ekle</span>
    `;
    addCard.addEventListener('click', () => {
      playTvBeep('select');
      openAddAppModal();
    });
    appsContainer.appendChild(addCard);
  }

  // ==========================================================================
  // CONTINUE WATCHING RENDERING
  // ==========================================================================
  function renderContinueWatching() {
    if (!configData) return;
    continueContainer.innerHTML = '';

    const list = configData.continueWatching || [];
    if (list.length === 0) {
      continueContainer.innerHTML = '<div class="cw-empty-state">Henüz izleme geçmişi yok. Bir dizi veya video izlediğinizde burada otomatik görünecektir.</div>';
      return;
    }

    list.forEach((cw) => {
      const card = document.createElement('div');
      card.className = 'cw-card focusable';
      card.tabIndex = 0;

      card.innerHTML = `
        <div class="cw-img-box">
          <img src="${cw.image}" alt="${cw.title}" loading="lazy">
        </div>
        <div class="cw-overlay">
          <div class="cw-card-header">
            <div class="cw-badge-logo">${cw.badge}</div>
            <button class="cw-delete-btn" title="Geçmişten Kaldır" tabindex="-1">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="cw-bottom">
            <span class="cw-progress-text">${cw.title} • ${cw.progress}</span>
            <div class="cw-progress-bar-bg">
              <div class="cw-progress-fill" style="width: ${cw.percent}%"></div>
            </div>
          </div>
        </div>
      `;

      // Delete single item
      const delBtn = card.querySelector('.cw-delete-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playTvBeep('select');
        if (window.api.removeContinueWatchingItem) {
          window.api.removeContinueWatchingItem(cw.id);
        }
      });

      card.addEventListener('click', () => {
        launchContent(cw.target, cw.title);
      });

      continueContainer.appendChild(card);
    });
  }

  // Clear all history button
  const btnClearHistory = document.getElementById('btn-clear-history');
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      playTvBeep('select');
      if (window.api.clearAllContinueWatching) {
        window.api.clearAllContinueWatching();
      }
    });
  }

  // Games and Media links
  document.querySelectorAll('.game-launcher-card, .media-banner-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-target');
      const title = card.getAttribute('data-title') || card.querySelector('h3, .media-title')?.textContent || 'Medya';
      launchContent(target, title);
    });
  });

  // ==========================================================================
  // MODAL MANAGEMENT
  // ==========================================================================
  function openAddAppModal() {
    newAppTitle.value = '';
    newAppTarget.value = '';
    newAppExePath.value = '';
    addAppModal.classList.add('active');
  }

  function closeAddAppModal() {
    addAppModal.classList.remove('active');
  }

  btnCloseModal.onclick = closeAddAppModal;
  btnCancelModal.onclick = closeAddAppModal;

  const appTypeRadios = document.querySelectorAll('input[name="app-type"]');
  appTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'cmd') {
        urlInputGroup.classList.add('hidden');
        filePickerGroup.classList.remove('hidden');
      } else {
        urlInputGroup.classList.remove('hidden');
        filePickerGroup.classList.add('hidden');
      }
    });
  });

  btnBrowseExe.addEventListener('click', async () => {
    const selectedFile = await window.api.pickExecutable();
    if (selectedFile) {
      newAppExePath.value = selectedFile;
      if (!newAppTitle.value) {
        const filename = selectedFile.split('\\').pop().replace(/\.[^/.]+$/, "");
        newAppTitle.value = filename.charAt(0).toUpperCase() + filename.slice(1);
      }
    }
  });

  let selectedColor = '#3b82f6';
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      selectedColor = swatch.getAttribute('data-color');
    });
  });

  btnSaveApp.addEventListener('click', async () => {
    const title = newAppTitle.value.trim();
    const type = document.querySelector('input[name="app-type"]:checked').value;
    const target = type === 'cmd' ? newAppExePath.value.trim() : newAppTarget.value.trim();

    if (!title || !target) {
      alert('Lütfen uygulama adı ve hedef adres/dosya yolunu girin.');
      return;
    }

    const newApp = {
      id: 'app-' + Date.now(),
      title: title,
      icon: 'generic',
      type: type,
      target: target,
      color: selectedColor
    };

    configData.apps.push(newApp);
    await window.api.saveAppData(configData);
    renderApps();
    closeAddAppModal();
  });

  // ==========================================================================
  // POWER MANAGEMENT MODAL
  // ==========================================================================
  function confirmPowerAction(action, title, desc) {
    pendingPowerAction = action;
    powerModalTitle.textContent = title;
    powerModalDesc.textContent = desc;
    powerConfirmModal.classList.add('active');
  }

  btnPowerCancel.onclick = () => {
    powerConfirmModal.classList.remove('active');
    pendingPowerAction = null;
  };

  btnPowerConfirm.onclick = () => {
    if (pendingPowerAction) {
      window.api.systemAction(pendingPowerAction);
    }
    powerConfirmModal.classList.remove('active');
  };

  btnQuickPower.onclick = () => {
    playTvBeep('select');
    window.api.closeWindow();
  };

  document.querySelectorAll('.power-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-action');
      if (act === 'shutdown') {
        confirmPowerAction('shutdown', 'Bilgisayarı Kapat', 'Windows kapatılacak. Emin misiniz?');
      } else if (act === 'restart') {
        confirmPowerAction('restart', 'Yeniden Başlat', 'Bilgisayarınız yeniden başlatılacak. Emin misiniz?');
      } else if (act === 'sleep') {
        confirmPowerAction('sleep', 'Uyku Modu', 'Bilgisayar uyku moduna alınacak. Devam edilsin mi?');
      }
    });
  });

  // ==========================================================================
  // SETTINGS CONTROLS
  // ==========================================================================
  btnToggleFullscreen.onclick = async () => {
    playTvBeep('select');
    await window.api.toggleFullscreen();
  };

  settingSound.onchange = (e) => {
    soundEnabled = e.target.checked;
  };

  settingLaser.onchange = (e) => {
    laserEnabled = e.target.checked;
    airCursor.style.display = laserEnabled ? 'block' : 'none';
  };

  // ==========================================================================
  // CANLI TV (SMART TV HLS PLAYER & EPG & CHANNELS ENGINE)
  // ==========================================================================
  let channelsList = [];
  let currentChannelIndex = 0;
  let activeCategory = 'all';
  let hlsInstance = null;
  let osdTimer = null;
  let isTvPlaying = false;

  const liveTvVideo = document.getElementById('livetv-video');
  const liveTvChannelsContainer = document.getElementById('livetv-channels-list');
  const liveTvCategoriesContainer = document.getElementById('livetv-categories');
  const liveTvLoading = document.getElementById('livetv-loading');
  const liveTvLoadingText = document.getElementById('livetv-loading-text');
  const liveTvOsd = document.getElementById('livetv-osd');
  const osdNumEl = document.getElementById('osd-num');
  const osdLogoEl = document.getElementById('osd-logo');
  const osdTitleEl = document.getElementById('osd-title');
  const osdDescEl = document.getElementById('osd-desc');
  const playerCurrentNameEl = document.getElementById('player-current-name');
  const btnTvPlayPause = document.getElementById('btn-tv-playpause');
  const iconTvPlay = document.getElementById('icon-tv-play');
  const iconTvPause = document.getElementById('icon-tv-pause');
  const btnTvPrev = document.getElementById('btn-tv-prev');
  const btnTvNext = document.getElementById('btn-tv-next');
  const btnTvMute = document.getElementById('btn-tv-mute');
  const btnTvFullscreen = document.getElementById('btn-tv-fullscreen');
  const liveTvVideoWrapper = document.getElementById('livetv-video-wrapper');

  async function loadChannelsData() {
    try {
      const resp = await fetch('channels.json');
      channelsList = await resp.json();
      renderChannelsSidebar();
    } catch (err) {
      console.error('Kanal listesi yüklenemedi:', err);
    }
  }

  function renderChannelsSidebar() {
    if (!liveTvChannelsContainer) return;
    liveTvChannelsContainer.innerHTML = '';

    const filtered = channelsList.filter(ch => {
      if (activeCategory === 'all') return true;
      return ch.category === activeCategory;
    });

    filtered.forEach((ch, idx) => {
      const globalIdx = channelsList.findIndex(item => item.id === ch.id);
      const isCurrent = globalIdx === currentChannelIndex;

      const card = document.createElement('div');
      card.className = `livetv-ch-card focusable ${isCurrent ? 'active-playing' : ''}`;
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-channel-idx', globalIdx);

      card.innerHTML = `
        <span class="ch-num-badge">${String(ch.number).padStart(2, '0')}</span>
        <div class="ch-logo-wrap">
          <img src="${ch.logo}" alt="${ch.name}" onerror="this.src='https://placehold.co/80x80/1e293b/ffffff?text=TV'">
        </div>
        <div class="ch-info-box">
          <span class="ch-name-text">${ch.name}</span>
          <span class="ch-meta-text">${ch.category} • HD Canlı</span>
        </div>
        ${isCurrent ? `
          <div class="ch-playing-indicator">
            <span></span><span></span><span></span>
          </div>
        ` : ''}
      `;

      card.addEventListener('click', () => {
        playChannel(globalIdx);
      });

      liveTvChannelsContainer.appendChild(card);
    });
  }

  function playChannel(index) {
    if (!channelsList || channelsList.length === 0) return;
    if (index < 0) index = channelsList.length - 1;
    if (index >= channelsList.length) index = 0;

    currentChannelIndex = index;
    const ch = channelsList[index];

    playTvBeep('select');

    // If channel is configured as an in-app web stream (e.g. DMAX / TLC)
    if (ch.type === 'web' || ch.url.startsWith('http://') && ch.url.includes('.com.tr') || ch.url.includes('dmax.com.tr') || ch.url.includes('tlctv.com.tr')) {
      if (liveTvVideo && !liveTvVideo.paused) {
        liveTvVideo.pause();
      }
      launchContent(ch.url, `${ch.name} Canlı Yayın`);
      return;
    }

    // Update UI highlights
    renderChannelsSidebar();

    // Show Loading
    if (liveTvLoading) {
      liveTvLoadingText.textContent = `${ch.name} Bağlanıyor...`;
      liveTvLoading.classList.remove('hidden');
    }

    // Show Smart TV OSD banner
    showChannelOSD(ch);

    if (playerCurrentNameEl) {
      playerCurrentNameEl.textContent = `${ch.name} HD`;
    }

    // Setup HLS Stream
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (window.Hls && Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });

      hlsInstance.loadSource(ch.url);
      hlsInstance.attachMedia(liveTvVideo);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        liveTvVideo.play().then(() => {
          isTvPlaying = true;
          updatePlayPauseIcon();
          if (liveTvLoading) liveTvLoading.classList.add('hidden');
        }).catch(() => {
          if (liveTvLoading) liveTvLoading.classList.add('hidden');
        });
      });

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance.recoverMediaError();
              break;
            default:
              if (liveTvLoading) {
                liveTvLoadingText.textContent = 'Yayın geçici olarak kullanılamıyor.';
              }
              break;
          }
        }
      });
    } else if (liveTvVideo.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari / Apple HLS
      liveTvVideo.src = ch.url;
      liveTvVideo.addEventListener('loadedmetadata', () => {
        liveTvVideo.play();
        isTvPlaying = true;
        updatePlayPauseIcon();
        if (liveTvLoading) liveTvLoading.classList.add('hidden');
      });
    }
  }

  function showChannelOSD(ch) {
    if (!liveTvOsd) return;
    osdNumEl.textContent = String(ch.number).padStart(2, '0');
    osdLogoEl.src = ch.logo;
    osdTitleEl.textContent = `${ch.name} HD`;
    osdDescEl.textContent = ch.desc || `${ch.category} kategorisinde 24 saat kesintisiz canlı yayın`;

    liveTvOsd.classList.remove('hidden');
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => {
      liveTvOsd.classList.add('hidden');
    }, 4500);
  }

  function updatePlayPauseIcon() {
    if (iconTvPlay && iconTvPause) {
      if (isTvPlaying) {
        iconTvPlay.classList.add('hidden');
        iconTvPause.classList.remove('hidden');
      } else {
        iconTvPlay.classList.remove('hidden');
        iconTvPause.classList.add('hidden');
      }
    }
  }

  function toggleLiveTvPlayPause() {
    if (!liveTvVideo) return;
    if (liveTvVideo.paused) {
      liveTvVideo.play();
      isTvPlaying = true;
    } else {
      liveTvVideo.pause();
      isTvPlaying = false;
    }
    updatePlayPauseIcon();
    playTvBeep('select');
  }

  function onLiveTvTabOpened() {
    if (!channelsList || channelsList.length === 0) {
      loadChannelsData().then(() => {
        playChannel(currentChannelIndex);
      });
    } else {
      if (liveTvVideo && liveTvVideo.paused) {
        liveTvVideo.play();
        isTvPlaying = true;
        updatePlayPauseIcon();
      }
    }
  }

  function onLiveTvTabClosed() {
    if (liveTvVideo && !liveTvVideo.paused) {
      liveTvVideo.pause();
      isTvPlaying = false;
      updatePlayPauseIcon();
    }
  }

  let numpadInputBuffer = '';
  let numpadInputTimer = null;

  function handleNumpadChannelInput(digit) {
    numpadInputBuffer += digit;
    playTvBeep('focus');

    // Show temporary numpad OSD
    if (liveTvOsd) {
      osdNumEl.textContent = numpadInputBuffer.padStart(2, '0');
      osdTitleEl.textContent = `Kanal ${numpadInputBuffer}...`;
      osdDescEl.textContent = 'Kanal numarası tuşlandı, bekleniyor...';
      liveTvOsd.classList.remove('hidden');
    }

    clearTimeout(numpadInputTimer);
    numpadInputTimer = setTimeout(() => {
      const chNum = parseInt(numpadInputBuffer, 10);
      numpadInputBuffer = '';
      const targetIdx = channelsList.findIndex(c => c.number === chNum);
      if (targetIdx !== -1) {
        playChannel(targetIdx);
      } else {
        if (liveTvOsd) {
          osdDescEl.textContent = `Kanal ${chNum} bulunamadı.`;
          setTimeout(() => liveTvOsd.classList.add('hidden'), 1500);
        }
      }
    }, 1200);
  }

  // Category filter clicks
  if (liveTvCategoriesContainer) {
    const catButtons = liveTvCategoriesContainer.querySelectorAll('.livetv-cat-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-cat');
        renderChannelsSidebar();
        playTvBeep('select');
      });
    });
  }

  // Player control buttons
  if (btnTvPlayPause) btnTvPlayPause.onclick = toggleLiveTvPlayPause;
  if (btnTvPrev) btnTvPrev.onclick = () => playChannel(currentChannelIndex - 1);
  if (btnTvNext) btnTvNext.onclick = () => playChannel(currentChannelIndex + 1);
  if (btnTvMute) {
    btnTvMute.onclick = () => {
      if (liveTvVideo) {
        liveTvVideo.muted = !liveTvVideo.muted;
        playTvBeep('select');
      }
    };
  }
  if (btnTvFullscreen) {
    btnTvFullscreen.onclick = () => {
      if (!document.fullscreenElement) {
        liveTvVideoWrapper.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      playTvBeep('select');
    };
  }

  loadChannelsData();

  // ==========================================================================
  // VOLUME OSD ENGINE
  // ==========================================================================
  const volumeOsd = document.getElementById('volume-osd');
  const volValueEl = document.getElementById('vol-value');
  const volBarFill = document.getElementById('vol-bar-fill');
  const volIconEl = document.getElementById('vol-icon');
  let volumeOsdTimer = null;

  function showVolumeOSD(vol, isMuted = false) {
    if (!volumeOsd) return;
    volValueEl.textContent = isMuted ? 'SESSİZ' : `${vol}%`;
    volBarFill.style.width = isMuted ? '0%' : `${vol}%`;

    if (isMuted) {
      volIconEl.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    } else {
      volIconEl.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
    }

    volumeOsd.classList.remove('hidden');
    clearTimeout(volumeOsdTimer);
    volumeOsdTimer = setTimeout(() => {
      volumeOsd.classList.add('hidden');
    }, 2200);
  }

  if (window.api.onVolumeChange) {
    window.api.onVolumeChange((data) => {
      showVolumeOSD(data.volume, data.muted);
    });
  }

  // ==========================================================================
  // ON-SCREEN TV VIRTUAL KEYBOARD ENGINE
  // ==========================================================================
  const virtualKeyboard = document.getElementById('virtual-keyboard');
  const vkPreviewInput = document.getElementById('vk-preview-input');
  const btnVkClear = document.getElementById('btn-vk-clear');
  const btnVkSearch = document.getElementById('btn-vk-search');
  const btnVkClose = document.getElementById('btn-vk-close');
  const vkKeysContainer = document.getElementById('vk-keys-container');
  const btnInAppKeyboard = document.getElementById('btn-inapp-keyboard');

  const VK_LAYOUT = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Sil']
  ];

  let isVkOpen = false;
  let vkCurrentFocus = null;

  function buildVirtualKeyboard() {
    if (!vkKeysContainer) return;
    vkKeysContainer.innerHTML = '';

    VK_LAYOUT.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'vk-row';

      row.forEach(char => {
        const keyBtn = document.createElement('button');
        keyBtn.className = 'vk-key focusable';
        keyBtn.textContent = char;
        keyBtn.tabIndex = 0;

        if (char === 'Sil') {
          keyBtn.classList.add('wide-key');
        }

        keyBtn.addEventListener('click', () => {
          handleVkKeyPress(char);
        });

        rowEl.appendChild(keyBtn);
      });

      vkKeysContainer.appendChild(rowEl);
    });

    // Add spacebar row
    const spaceRow = document.createElement('div');
    spaceRow.className = 'vk-row';
    const spaceBtn = document.createElement('button');
    spaceBtn.className = 'vk-key space-key focusable';
    spaceBtn.textContent = 'Boşluk (Space)';
    spaceBtn.tabIndex = 0;
    spaceBtn.addEventListener('click', () => {
      handleVkKeyPress(' ');
    });
    spaceRow.appendChild(spaceBtn);
    vkKeysContainer.appendChild(spaceRow);
  }

  function handleVkKeyPress(char) {
    playTvBeep('select');
    if (char === 'Sil') {
      vkPreviewInput.value = vkPreviewInput.value.slice(0, -1);
      if (isInAppViewOpen && window.api.sendKeyInApp) {
        window.api.sendKeyInApp('Backspace');
      }
    } else {
      vkPreviewInput.value += char;
      if (isInAppViewOpen && window.api.typeTextInApp) {
        window.api.typeTextInApp(char);
      }
    }
  }

  function openVirtualKeyboard() {
    isVkOpen = true;
    virtualKeyboard.classList.remove('hidden');
    if (window.api.setKeyboardState) {
      window.api.setKeyboardState(true);
    }
    playTvBeep('select');
    // Focus first key
    setTimeout(() => {
      const firstKey = vkKeysContainer.querySelector('.vk-key');
      if (firstKey) firstKey.focus();
    }, 100);
  }

  function closeVirtualKeyboard() {
    isVkOpen = false;
    virtualKeyboard.classList.add('hidden');
    if (window.api.setKeyboardState) {
      window.api.setKeyboardState(false);
    }
    playTvBeep('select');
  }

  function submitVirtualKeyboard() {
    playTvBeep('select');
    if (isInAppViewOpen && window.api.sendKeyInApp) {
      window.api.sendKeyInApp('Enter');
    }
    closeVirtualKeyboard();
  }

  if (btnVkClear) {
    btnVkClear.onclick = () => {
      vkPreviewInput.value = '';
      playTvBeep('select');
    };
  }

  if (btnVkClose) btnVkClose.onclick = closeVirtualKeyboard;
  if (btnVkSearch) btnVkSearch.onclick = submitVirtualKeyboard;
  if (btnInAppKeyboard) {
    btnInAppKeyboard.onclick = () => {
      if (isVkOpen) closeVirtualKeyboard();
      else openVirtualKeyboard();
    };
  }

  buildVirtualKeyboard();

  // ==========================================================================
  // REMOTE CONTROLLER & KEYBOARD D-PAD NAVIGATION
  // ==========================================================================
  window.addEventListener('keydown', (e) => {
    // Intercept volume keys or shortcuts (+, -)
    if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
      window.api.systemAction('volume_up');
      return;
    } else if (e.key === 'AudioVolumeDown' || e.key === 'VolumeDown') {
      window.api.systemAction('volume_down');
      return;
    } else if (e.key === 'AudioVolumeMute' || e.key === 'VolumeMute') {
      window.api.systemAction('volume_mute');
      return;
    }

    // Channel Zap Shortcuts with 'PageUp' / 'PageDown' or 'p' / 'n'
    if (views.livetv && views.livetv.classList.contains('active')) {
      // Direct numeric channel selection (0-9)
      if (/^[0-9]$/.test(e.key) && !isVkOpen && (!document.activeElement || !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName))) {
        e.preventDefault();
        handleNumpadChannelInput(e.key);
        return;
      }

      if (e.key === 'PageUp' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        playChannel(currentChannelIndex - 1);
        return;
      } else if (e.key === 'PageDown' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        playChannel(currentChannelIndex + 1);
        return;
      } else if (e.key === 'f' || e.key === 'F') {
        if (!isVkOpen) {
          e.preventDefault();
          if (btnTvFullscreen) btnTvFullscreen.click();
          return;
        }
      } else if (e.key === ' ') {
        if (!isVkOpen && document.activeElement && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          toggleLiveTvPlayPause();
          return;
        }
      }
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      handleDpadNavigation(e.key);
    } else if (e.key === 'Enter') {
      if (isVkOpen) {
        const active = document.activeElement;
        if (active && active.classList.contains('vk-key')) {
          active.click();
        }
      } else if (!isInAppViewOpen) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.classList.contains('focusable') || activeEl.classList.contains('nav-btn') || activeEl.tagName === 'BUTTON')) {
          e.preventDefault();
          playTvBeep('select');
          activeEl.click();
        }
      }
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      if (isVkOpen) {
        closeVirtualKeyboard();
      } else if (isInAppViewOpen) {
        closeInAppView();
      } else if (addAppModal.classList.contains('active')) {
        closeAddAppModal();
      } else if (powerConfirmModal.classList.contains('active')) {
        powerConfirmModal.classList.remove('active');
      } else {
        switchTab('home');
      }
    } else if (e.key === 'F11') {
      window.api.toggleFullscreen();
    }
  });

  function handleDpadNavigation(direction) {
    if (isInAppViewOpen) return; // Allow native controls inside webview

    const activeEl = document.activeElement;

    // Special behavior for Top Nav Bar: When on a tab button and pressing Right or Left, immediately navigate & switch tab!
    if (activeEl && activeEl.classList.contains('nav-btn')) {
      const tabList = Array.from(document.querySelectorAll('.nav-btn'));
      const currentIndex = tabList.indexOf(activeEl);

      if (direction === 'ArrowRight' && currentIndex !== -1 && currentIndex < tabList.length - 1) {
        const nextTabBtn = tabList[currentIndex + 1];
        nextTabBtn.focus();
        switchTab(nextTabBtn.getAttribute('data-tab'));
        playTvBeep('focus');
        return;
      } else if (direction === 'ArrowLeft' && currentIndex !== -1 && currentIndex > 0) {
        const prevTabBtn = tabList[currentIndex - 1];
        prevTabBtn.focus();
        switchTab(prevTabBtn.getAttribute('data-tab'));
        playTvBeep('focus');
        return;
      }
    }

    const focusables = Array.from(document.querySelectorAll(
      '.nav-btn, .hero-btn, .app-card, .cw-card, .game-launcher-card, .media-banner-card, .power-btn, .settings-btn'
    )).filter(el => el.offsetParent !== null);

    if (!focusables.includes(activeEl)) {
      if (focusables.length > 0) focusables[0].focus();
      return;
    }

    const currentRect = activeEl.getBoundingClientRect();
    let bestCandidate = null;
    let minDistance = Infinity;

    focusables.forEach(candidate => {
      if (candidate === activeEl) return;
      const rect = candidate.getBoundingClientRect();

      let isCandidate = false;
      let dist = 0;

      if (direction === 'ArrowRight' && rect.left >= currentRect.right - 10) {
        dist = Math.hypot(rect.left - currentRect.right, rect.top - currentRect.top);
        isCandidate = true;
      } else if (direction === 'ArrowLeft' && rect.right <= currentRect.left + 10) {
        dist = Math.hypot(currentRect.left - rect.right, rect.top - currentRect.top);
        isCandidate = true;
      } else if (direction === 'ArrowDown' && rect.top >= currentRect.bottom - 10) {
        dist = Math.hypot(rect.left - currentRect.left, rect.top - currentRect.bottom);
        isCandidate = true;
      } else if (direction === 'ArrowUp' && rect.bottom <= currentRect.top + 10) {
        dist = Math.hypot(rect.left - currentRect.left, currentRect.top - rect.bottom);
        isCandidate = true;
      }

      if (isCandidate && dist < minDistance) {
        minDistance = dist;
        bestCandidate = candidate;
      }
    });

    if (bestCandidate) {
      bestCandidate.focus();
      playTvBeep('focus');
      // If we jumped into a nav button via arrow keys, also switch to that tab directly
      if (bestCandidate.classList.contains('nav-btn')) {
        switchTab(bestCandidate.getAttribute('data-tab'));
      }
      bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  async function initializeApp() {
    try {
      configData = await window.api.getAppData();
      renderHero(0);
      startHeroAutoSlide();
      renderApps();
      renderContinueWatching();

      // Listen for real-time watch history updates from background browser
      if (window.api.onWatchHistoryUpdated) {
        window.api.onWatchHistoryUpdated((updatedList) => {
          if (configData) {
            configData.continueWatching = updatedList;
            renderContinueWatching();
          }
        });
      }
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  initializeApp();
})();
