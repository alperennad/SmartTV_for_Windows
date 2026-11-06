const { app, BrowserWindow, WebContentsView, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;
let webView = null; // Embedded browser view for in-app apps (Netflix, YouTube, Spotify, etc.)

const DATA_FILE = path.join(app.getPath('userData'), 'mytv_config.json');

const DEFAULT_CONFIG = {
  apps: [
    { id: 'youtube', title: 'YouTube', icon: 'youtube', type: 'url', target: 'https://www.youtube.com/tv', color: '#FF0000', badge: 'YouTube' },
    { id: 'netflix', title: 'Netflix', icon: 'netflix', type: 'url', target: 'https://www.netflix.com', color: '#E50914', badge: 'NETFLIX' },
    { id: 'dmax', title: 'DMAX Canlı', icon: 'dmax', type: 'url', target: 'https://www.dmax.com.tr/canli-izle', color: '#ff5500', badge: 'DMAX CANLI' },
    { id: 'tlc', title: 'TLC Canlı', icon: 'tlc', type: 'url', target: 'https://www.tlctv.com.tr/canli-izle', color: '#e60050', badge: 'TLC CANLI' },
    { id: 'spotify', title: 'Spotify', icon: 'spotify', type: 'url', target: 'https://open.spotify.com', color: '#1DB954', badge: 'Spotify' },
    { id: 'steam', title: 'Steam', icon: 'steam', type: 'cmd', target: 'steam://open/bigpicture', color: '#1b2838', badge: 'Steam' },
    { id: 'chrome', title: 'Google', icon: 'chrome', type: 'url', target: 'https://www.google.com', color: '#4285F4', badge: 'Google' },
    { id: 'twitch', title: 'Twitch', icon: 'twitch', type: 'url', target: 'https://www.twitch.tv', color: '#9146FF', badge: 'Twitch' },
    { id: 'disney', title: 'Disney+', icon: 'disney', type: 'url', target: 'https://www.disneyplus.com', color: '#0063e5', badge: 'Disney+' },
    { id: 'prime', title: 'Prime Video', icon: 'prime', type: 'url', target: 'https://www.primevideo.com', color: '#00A8E1', badge: 'Prime Video' }
  ],
  continueWatching: [
    {
      id: 'cw-1',
      title: 'Breaking Bad',
      progress: 'S2 B5 • 22 dk kaldı',
      percent: 65,
      image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      badge: 'Breaking Bad',
      badgeColor: '#1e392a',
      target: 'https://www.netflix.com'
    },
    {
      id: 'cw-2',
      title: 'The Last of Us',
      progress: 'S1 B3 • 41 dk kaldı',
      percent: 45,
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      badge: 'HBO ORIGINAL',
      badgeColor: '#2b1b54',
      target: 'https://www.hbomax.com'
    },
    {
      id: 'cw-3',
      title: 'Dune: Part Two',
      progress: '2 sa 9 dk kaldı',
      percent: 30,
      image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
      badge: 'DUNE',
      badgeColor: '#7c3f1d',
      target: 'https://www.primevideo.com'
    },
    {
      id: 'cw-4',
      title: 'Interstellar',
      progress: '1 sa 28 dk kaldı',
      percent: 55,
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      badge: 'INTERSTELLAR',
      badgeColor: '#0f2027',
      target: 'https://www.netflix.com'
    }
  ],
  heroBanners: [
    {
      id: 'stranger-things',
      provider: 'NETFLIX',
      title: 'STRANGER THINGS',
      description: 'Hawkins\'te doğaüstü olaylar geri dönüyor. Arkadaşlık, gizem ve başka bir boyut...',
      badge: 'Yeni Sezon',
      target: 'https://www.netflix.com',
      bgImage: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=1600&auto=format&fit=crop&q=80'
    },
    {
      id: 'cyberpunk',
      provider: 'GAMING',
      title: 'CYBERPUNK 2077',
      description: 'Night City\'nin neon ışıklı tehlikeli sokaklarında güç ve hayatta kalma mücadelesi.',
      badge: 'Big Picture',
      target: 'steam://rungameid/1091500',
      bgImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80'
    },
    {
      id: 'spotify-relax',
      provider: 'SPOTIFY',
      title: 'AKŞAM DİNLENME MODU',
      description: 'Günün yorgunluğunu atmak için en sevilen akustik ve lo-fi çalma listeleri.',
      badge: 'Müzik & Podcast',
      target: 'https://open.spotify.com',
      bgImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&auto=format&fit=crop&q=80'
    }
  ],
  settings: {
    airMouseSensitivity: 'normal',
    soundEffects: true,
    autoStartWithWindows: false,
    theme: 'tv-dark'
  }
};

function loadStoredConfig() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);

      // Auto-migrate: ensure default apps (like DMAX, TLC) exist if missing
      if (parsed && Array.isArray(parsed.apps)) {
        let changed = false;
        DEFAULT_CONFIG.apps.forEach(defaultApp => {
          if (!parsed.apps.some(a => a.id === defaultApp.id)) {
            parsed.apps.push(defaultApp);
            changed = true;
          }
        });
        if (changed) {
          saveStoredConfig(parsed);
        }
      }

      return parsed;
    }
  } catch (err) {
    console.error('Config load failed:', err);
  }
  return DEFAULT_CONFIG;
}

function saveStoredConfig(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Config save failed:', err);
    return false;
  }
}

let isVirtualKeyboardOpen = false;

function updateWebViewBounds() {
  if (webView && mainWindow) {
    const [width, height] = mainWindow.getSize();
    // Leave 58px at the top for our sleek in-app TV control bar (Back, Reload, Home, Close)
    const topBarHeight = 58;
    const bottomBarHeight = isVirtualKeyboardOpen ? 310 : 0;
    webView.setBounds({
      x: 0,
      y: topBarHeight,
      width: width,
      height: Math.max(100, height - topBarHeight - bottomBarHeight)
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#0a0d14',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('resize', () => {
    updateWebViewBounds();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let progressMonitorTimer = null;

function detectAppKey(url, title = '') {
  const lowerUrl = (url || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  if (lowerUrl.includes('youtube') || lowerTitle.includes('youtube')) return 'youtube';
  if (lowerUrl.includes('netflix') || lowerTitle.includes('netflix')) return 'netflix';
  if (lowerUrl.includes('spotify') || lowerTitle.includes('spotify')) return 'spotify';
  if (lowerUrl.includes('twitch') || lowerTitle.includes('twitch')) return 'twitch';
  if (lowerUrl.includes('primevideo') || lowerTitle.includes('prime')) return 'prime';
  if (lowerUrl.includes('disneyplus') || lowerTitle.includes('disney')) return 'disney';
  if (lowerUrl.includes('hbomax') || lowerTitle.includes('hbo')) return 'hbo';
  return 'general';
}

function recordWatchHistory(item) {
  if (!item || !item.target) return;
  const config = loadStoredConfig();
  if (!config.continueWatching) config.continueWatching = [];

  const appKey = item.appKey || detectAppKey(item.target, item.badge || item.title);

  // Filter out ANY previous entry from the same app (Keep strictly 1 entry per app!)
  config.continueWatching = config.continueWatching.filter(
    (cw) => cw.appKey !== appKey && cw.target !== item.target
  );

  const newEntry = {
    id: 'cw-' + appKey,
    appKey: appKey,
    title: item.title || 'İzlenen İçerik',
    progress: item.progress || 'Kaldığınız yerden devam edin',
    percent: typeof item.percent === 'number' ? Math.round(item.percent) : 25,
    image: item.image || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
    badge: item.badge || appKey.toUpperCase(),
    badgeColor: item.badgeColor || (appKey === 'youtube' ? '#FF0000' : appKey === 'netflix' ? '#E50914' : appKey === 'spotify' ? '#1DB954' : '#00a4ef'),
    target: item.target,
    lastWatched: Date.now()
  };

  config.continueWatching.unshift(newEntry);

  saveStoredConfig(config);
  if (mainWindow) {
    mainWindow.webContents.send('watch-history-updated', config.continueWatching);
  }
}

// Media metadata inspection inside YouTube, Netflix, etc.
async function inspectMediaMetadata() {
  if (!webView || !webView.webContents) return;
  try {
    const currentUrl = webView.webContents.getURL();
    if (!currentUrl || currentUrl.startsWith('about:') || currentUrl.includes('login') || currentUrl.includes('auth')) {
      return;
    }

    const script = `
      (() => {
        try {
          const url = window.location.href;
          const video = document.querySelector('video');
          let duration = video && !isNaN(video.duration) && video.duration > 0 ? video.duration : 0;
          let currentTime = video && !isNaN(video.currentTime) ? video.currentTime : 0;
          let percent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
          let remainingSeconds = duration > 0 ? Math.max(0, duration - currentTime) : 0;

          let progressText = '';
          if (remainingSeconds > 0) {
            const mins = Math.floor(remainingSeconds / 60);
            const hours = Math.floor(mins / 60);
            const remMins = mins % 60;
            if (hours > 0) {
              progressText = hours + ' sa ' + remMins + ' dk kaldı';
            } else {
              progressText = mins + ' dk kaldı';
            }
          }

          let title = '';
          let image = '';
          let badge = '';

          // 1. YouTube
          if (url.includes('youtube.com')) {
            badge = 'YOUTUBE';
            // Video ID for high-res thumbnail
            let vId = '';
            if (url.includes('v=')) {
              vId = new URLSearchParams(window.location.search).get('v');
            } else if (url.includes('/tv#/watch?v=')) {
              vId = url.split('v=')[1]?.split('&')[0];
            }
            if (vId) {
              image = 'https://i.ytimg.com/vi/' + vId + '/hqdefault.jpg';
            }

            const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata, yt-formatted-string.ytd-watch-metadata, .ytp-title-link, title');
            if (titleEl) {
              title = (titleEl.innerText || titleEl.textContent || '').replace(' - YouTube', '').trim();
            }
          }
          // 2. Netflix
          else if (url.includes('netflix.com')) {
            badge = 'NETFLIX';
            const episodeEl = document.querySelector('[data-uia="video-title"], .video-title');
            if (episodeEl) {
              title = episodeEl.innerText || episodeEl.textContent || '';
            }
            if (!title) {
              const docTitle = document.title || '';
              title = docTitle.replace(/ - Netflix$/i, '').trim();
            }
          }
          // 3. Spotify
          else if (url.includes('spotify.com')) {
            badge = 'SPOTIFY';
            const trackEl = document.querySelector('[data-testid="now-playing-widget"] [data-testid="context-item-info-title"], .now-playing [data-testid="now-playing-title"]');
            const artistEl = document.querySelector('[data-testid="now-playing-widget"] [data-testid="context-item-info-subtitles"]');
            if (trackEl) {
              title = (trackEl.innerText || '') + (artistEl ? ' • ' + artistEl.innerText : '');
            }
            const imgEl = document.querySelector('[data-testid="now-playing-widget"] img');
            if (imgEl && imgEl.src) image = imgEl.src;
          }
          // 4. Fallback Generic Media
          else {
            title = (document.title || '').trim();
          }

          return {
            title: title || (document.title || '').replace(/ - .*$/, '').trim(),
            url: url,
            percent: percent,
            progressText: progressText,
            image: image,
            badge: badge,
            isPlaying: video ? !video.paused : false
          };
        } catch (e) {
          return null;
        }
      })()
    `;

    const data = await webView.webContents.executeJavaScript(script, true);
    if (data && data.title && data.title !== 'YouTube' && data.title !== 'Netflix' && data.title !== 'Spotify' && !data.title.includes('Yükleniyor')) {
      const appKey = detectAppKey(data.url, data.badge);
      recordWatchHistory({
        appKey: appKey,
        title: data.title,
        target: data.url,
        badge: data.badge || appKey.toUpperCase(),
        progress: data.progressText || 'İzlemeye devam et',
        percent: data.percent > 0 ? data.percent : 30,
        image: data.image || undefined
      });
    }
  } catch (err) {
    // Suppressed when page navigates
  }
}

// In-App Browser Integration
ipcMain.handle('open-in-app', async (event, { url, title }) => {
  if (!mainWindow || !url) return false;

  // If local executable or special protocol like steam://, launch externally
  if (url.startsWith('steam://') || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    exec(`start "" "${url}"`, (error) => {
      if (error) console.error('Launch external:', error);
    });
    return { type: 'external' };
  }

  // Record this session in continue watching
  recordWatchHistory({
    title: title || 'Yayın',
    target: url,
    badge: title ? title.toUpperCase() : 'MEDYA',
    progress: 'Son açılan yayın',
    percent: 15
  });

  // Create WebContentsView inside the MyTV window
  if (!webView) {
    webView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        plugins: true,
        partition: 'persist:mytv_session' // Keeps user logged in to Netflix, Spotify, YouTube!
      }
    });

    // Provide standard modern TV/desktop user-agent so services won't block Electron
    webView.webContents.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // Watch for title/page updates to auto-capture movie/episode names from Netflix/YouTube
    webView.webContents.on('page-title-updated', (evt, pageTitle) => {
      const currentUrl = webView.webContents.getURL();
      if (!currentUrl || currentUrl.startsWith('about:')) return;

      // Clean titles (e.g. "Breaking Bad - Netflix", "Dune - YouTube")
      let cleanTitle = pageTitle.replace(/ - Netflix$/i, '').replace(/ - YouTube$/i, '').replace(/ - Spotify.*$/i, '').trim();
      if (cleanTitle && cleanTitle !== 'Netflix' && cleanTitle !== 'YouTube' && cleanTitle !== 'Spotify' && !cleanTitle.includes('Loading')) {
        let badge = 'NETFLIX';
        if (currentUrl.includes('youtube')) badge = 'YOUTUBE';
        else if (currentUrl.includes('spotify')) badge = 'SPOTIFY';
        else if (currentUrl.includes('twitch')) badge = 'TWITCH';

        recordWatchHistory({
          title: cleanTitle,
          target: currentUrl,
          badge: badge,
          progress: 'İzlemeye devam et',
          percent: 45
        });
      }
    });

    // Prevent popups from breaking outside the window
    webView.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
      webView.webContents.loadURL(popupUrl);
      return { action: 'deny' };
    });

    // Inject Leanback TV Spatial Navigation & Clean Theater Mode whenever page loads or updates
    const navScriptPath = path.join(__dirname, 'src', 'spatial_nav.js');
    const theaterScriptPath = path.join(__dirname, 'src', 'clean_theater.js');

    const injectScripts = () => {
      try {
        if (fs.existsSync(navScriptPath)) {
          const scriptContent = fs.readFileSync(navScriptPath, 'utf8');
          webView.webContents.executeJavaScript(scriptContent, true).catch(() => {});
        }
        if (fs.existsSync(theaterScriptPath)) {
          const theaterContent = fs.readFileSync(theaterScriptPath, 'utf8');
          webView.webContents.executeJavaScript(theaterContent, true).catch(() => {});
        }
      } catch (e) {}
    };

    webView.webContents.on('did-finish-load', injectScripts);
    webView.webContents.on('did-navigate-in-page', injectScripts);
  }

  mainWindow.contentView.addChildView(webView);
  updateWebViewBounds();
  await webView.webContents.loadURL(url);

  // Start periodic inspection while video is playing
  if (progressMonitorTimer) clearInterval(progressMonitorTimer);
  progressMonitorTimer = setInterval(() => {
    inspectMediaMetadata();
  }, 4000);

  return { type: 'in-app' };
});

ipcMain.handle('close-in-app', () => {
  if (progressMonitorTimer) {
    clearInterval(progressMonitorTimer);
    progressMonitorTimer = null;
  }
  if (webView && mainWindow) {
    // Run final metadata check right before closing
    inspectMediaMetadata().catch(() => {});
    mainWindow.contentView.removeChildView(webView);
    // Load blank or keep cached for quick return
    webView.webContents.loadURL('about:blank');
  }
  return true;
});

ipcMain.handle('inapp-go-back', () => {
  if (webView && webView.webContents.canGoBack()) {
    webView.webContents.goBack();
  }
});

ipcMain.handle('inapp-go-forward', () => {
  if (webView && webView.webContents.canGoForward()) {
    webView.webContents.goForward();
  }
});

ipcMain.handle('inapp-reload', () => {
  if (webView) {
    webView.webContents.reload();
  }
});

ipcMain.handle('launch-external-app', async (event, target) => {
  if (!target) return false;
  try {
    exec(`start "" "${target}"`, (error) => {
      if (error) console.error('Failed to start application:', error);
    });
    return true;
  } catch (err) {
    console.error('Launch error:', err);
    return false;
  }
});

ipcMain.handle('pick-executable', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Uygulama veya Kısayol Seçin (.exe, .lnk)',
    filters: [
      { name: 'Uygulamalar ve Kısayollar', extensions: ['exe', 'lnk', 'url'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('track-watch-history', (event, item) => {
  recordWatchHistory(item);
  return true;
});

ipcMain.handle('remove-cw-item', (event, id) => {
  const config = loadStoredConfig();
  if (config.continueWatching) {
    config.continueWatching = config.continueWatching.filter(cw => cw.id !== id);
    saveStoredConfig(config);
    if (mainWindow) {
      mainWindow.webContents.send('watch-history-updated', config.continueWatching);
    }
  }
  return true;
});

ipcMain.handle('clear-all-cw', () => {
  const config = loadStoredConfig();
  config.continueWatching = [];
  saveStoredConfig(config);
  if (mainWindow) {
    mainWindow.webContents.send('watch-history-updated', config.continueWatching);
  }
  return true;
});

ipcMain.handle('get-app-data', async () => {
  return loadStoredConfig();
});

ipcMain.handle('save-app-data', async (event, data) => {
  return saveStoredConfig(data);
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    const isFull = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFull);
    setTimeout(updateWebViewBounds, 100);
    return !isFull;
  }
  return false;
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

let currentVolumeLevel = 50;
let isMuted = false;

ipcMain.handle('set-keyboard-state', (event, isOpen) => {
  isVirtualKeyboardOpen = !!isOpen;
  updateWebViewBounds();
  return true;
});

ipcMain.handle('type-text-inapp', async (event, text) => {
  if (webView && webView.webContents) {
    webView.webContents.insertText(text);
  }
  return true;
});

ipcMain.handle('send-key-inapp', async (event, key) => {
  if (webView && webView.webContents) {
    if (key === 'Backspace') {
      webView.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Backspace' });
      webView.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Backspace' });
    } else if (key === 'Enter') {
      webView.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
      webView.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
    }
  }
  return true;
});

ipcMain.handle('system-action', async (event, action) => {
  switch (action) {
    case 'shutdown':
      exec('shutdown /s /t 0');
      break;
    case 'restart':
      exec('shutdown /r /t 0');
      break;
    case 'sleep':
      exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
      break;
    case 'volume_mute':
      isMuted = !isMuted;
      exec('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"');
      if (mainWindow) {
        mainWindow.webContents.send('volume-osd-update', { volume: currentVolumeLevel, muted: isMuted });
      }
      break;
    case 'volume_up':
      isMuted = false;
      currentVolumeLevel = Math.min(100, currentVolumeLevel + 4);
      exec('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"');
      if (mainWindow) {
        mainWindow.webContents.send('volume-osd-update', { volume: currentVolumeLevel, muted: false });
      }
      break;
    case 'volume_down':
      isMuted = false;
      currentVolumeLevel = Math.max(0, currentVolumeLevel - 4);
      exec('powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"');
      if (mainWindow) {
        mainWindow.webContents.send('volume-osd-update', { volume: currentVolumeLevel, muted: false });
      }
      break;
  }
  return true;
});
