const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // App & In-app Browser Launching
  openInApp: (data) => ipcRenderer.invoke('open-in-app', data),
  closeInApp: () => ipcRenderer.invoke('close-in-app'),
  launchExternalApp: (target) => ipcRenderer.invoke('launch-external-app', target),
  pickExecutable: () => ipcRenderer.invoke('pick-executable'),
  
  // Navigation for in-app view
  inAppGoBack: () => ipcRenderer.invoke('inapp-go-back'),
  inAppGoForward: () => ipcRenderer.invoke('inapp-go-forward'),
  inAppReload: () => ipcRenderer.invoke('inapp-reload'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),

  // System controls (Sleep, Shutdown, Restart, Volume)
  systemAction: (action) => ipcRenderer.invoke('system-action', action),
  onVolumeChange: (callback) => ipcRenderer.on('volume-osd-update', (event, data) => callback(data)),
  
  // Virtual Keyboard / In-app text typing
  typeTextInApp: (text) => ipcRenderer.invoke('type-text-inapp', text),
  sendKeyInApp: (key) => ipcRenderer.invoke('send-key-inapp', key),
  setKeyboardState: (isOpen) => ipcRenderer.invoke('set-keyboard-state', isOpen),
  
  // Storage
  getAppData: () => ipcRenderer.invoke('get-app-data'),
  saveAppData: (data) => ipcRenderer.invoke('save-app-data', data),
  trackWatchHistory: (item) => ipcRenderer.invoke('track-watch-history', item),
  removeContinueWatchingItem: (id) => ipcRenderer.invoke('remove-cw-item', id),
  clearAllContinueWatching: () => ipcRenderer.invoke('clear-all-cw'),
  onWatchHistoryUpdated: (callback) => ipcRenderer.on('watch-history-updated', (event, list) => callback(list))
});
