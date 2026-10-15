const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridge', {
  whipCrack: (target) => ipcRenderer.send('whip-crack', target),
  hideOverlay: () => ipcRenderer.send('hide-overlay'),
  findNearestButton: (coords) => ipcRenderer.invoke('find-nearest-button', coords),
  onSpawnWhip: (fn) => ipcRenderer.on('spawn-whip', () => fn()),
  onDropWhip: (fn) => ipcRenderer.on('drop-whip', () => fn()),
});
