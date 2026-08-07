const { contextBridge } = require('electron');

// Lets renderer code detect it's running inside the Electron shell, where
// getDisplayMedia() is silently auto-approved with system audio loopback.
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
});
