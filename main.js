const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, globalShortcut, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFile } = require('child_process');

// ── Win32 FFI (Windows only) ────────────────────────────────────────────────
let keybd_event, VkKeyScanA;
if (process.platform === 'win32') {
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    keybd_event = user32.func('void __stdcall keybd_event(uint8_t bVk, uint8_t bScan, uint32_t dwFlags, uintptr_t dwExtraInfo)');
    VkKeyScanA = user32.func('int16_t __stdcall VkKeyScanA(int ch)');
  } catch (e) {
    console.warn('koffi not available – macro sending disabled', e.message);
  }
}

// ── Globals ─────────────────────────────────────────────────────────────────
let tray, overlay;
let overlayReady = false;
let spawnQueued = false;
let detectorProcess = null;
let pendingRequests = [];

const VK_RETURN  = 0x0D;
const KEYUP      = 0x0002;

// ── Button Detector Process ─────────────────────────────────────────────────
function initButtonDetector() {
  if (process.platform !== 'win32') return;
  const exePath = path.join(__dirname, 'bin', 'ButtonDetector.exe');
  if (!fs.existsSync(exePath)) return;

  try {
    detectorProcess = spawn(exePath, [], {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });

    let buffer = '';
    detectorProcess.stdout.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'READY') continue;
        const res = pendingRequests.shift();
        if (!res) continue;

        if (trimmed.startsWith('FOUND ')) {
          const parts = trimmed.split(' ');
          res({
            found: true,
            x: parseFloat(parts[1]),
            y: parseFloat(parts[2]),
            width: parseFloat(parts[3]),
            height: parseFloat(parts[4]),
            name: parts[5] || 'button',
          });
        } else {
          res({ found: false });
        }
      }
    });

    detectorProcess.on('error', () => { detectorProcess = null; });
    detectorProcess.on('exit', () => { detectorProcess = null; });
  } catch (e) {
    console.warn('Failed to start ButtonDetector process:', e.message);
  }
}

function findNearestButton(x, y) {
  return new Promise(resolve => {
    if (!detectorProcess || !detectorProcess.stdin.writable) {
      return resolve({ found: false });
    }

    const timer = setTimeout(() => {
      const idx = pendingRequests.indexOf(resolve);
      if (idx !== -1) pendingRequests.splice(idx, 1);
      resolve({ found: false });
    }, 80);

    pendingRequests.push(result => {
      clearTimeout(timer);
      resolve(result);
    });

    try {
      detectorProcess.stdin.write(`${x} ${y}\n`);
    } catch {
      resolve({ found: false });
    }
  });
}

// ── Tray Icon with DPI Scaling ──────────────────────────────────────────────
function getTrayIcon() {
  const iconDir = path.join(__dirname, 'icon');
  const icoPath = path.join(iconDir, 'icon.ico');
  const pngPath = path.join(iconDir, 'Template.png');

  let img = null;
  if (process.platform === 'win32' && fs.existsSync(icoPath)) {
    img = nativeImage.createFromPath(icoPath);
  }
  if (!img || img.isEmpty()) {
    if (fs.existsSync(pngPath)) {
      img = nativeImage.createFromPath(pngPath);
    }
  }

  if (img && !img.isEmpty()) {
    // Windows Tray requires 16x16 / 32x32 size, otherwise Windows hides or corrupts it
    return img.resize({ width: 24, height: 24 });
  }

  return nativeImage.createEmpty();
}

// ── Overlay Window ──────────────────────────────────────────────────────────
function createOverlay() {
  const { bounds } = screen.getPrimaryDisplay();
  overlay = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  overlay.setAlwaysOnTop(true, 'status');
  overlayReady = false;
  overlay.loadFile('overlay.html');

  overlay.webContents.on('did-finish-load', () => {
    overlayReady = true;
    if (spawnQueued && overlay && overlay.isVisible()) {
      spawnQueued = false;
      overlay.webContents.send('spawn-whip');
    }
  });

  overlay.on('closed', () => {
    overlay = null;
    overlayReady = false;
    spawnQueued = false;
  });
}

function showWhip() {
  if (!overlay) createOverlay();
  overlay.showInactive();
  if (overlayReady) {
    overlay.webContents.send('spawn-whip');
  } else {
    spawnQueued = true;
  }
}

function toggleOverlay() {
  if (overlay && overlay.isVisible()) {
    overlay.webContents.send('drop-whip');
    return;
  }
  showWhip();
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.handle('find-nearest-button', async (event, coords) => {
  if (!coords || typeof coords.x !== 'number') return { found: false };
  return await findNearestButton(coords.x, coords.y);
});

ipcMain.on('whip-crack', (event, target) => {
  try {
    sendMacro(target);
  } catch (err) {
    console.warn('sendMacro failed:', err?.message || err);
  }
});

ipcMain.on('hide-overlay', () => {
  if (overlay) overlay.hide();
});

// ── Macro Execution ─────────────────────────────────────────────────────────
function sendMacro(target) {
  const phrases = [
    'FASTER',
    'GO FASTER',
    'Faster CLANKER',
    'Work FASTER',
    'Speed it up clanker',
  ];
  const chosen = phrases[Math.floor(Math.random() * phrases.length)];

  if (process.platform === 'win32') {
    sendMacroWindows(chosen);
  } else if (process.platform === 'darwin') {
    sendMacroMac(chosen);
  } else if (process.platform === 'linux') {
    sendMacroLinux(chosen);
  }
}

function sendMacroWindows(text) {
  if (!keybd_event || !VkKeyScanA) return;
  const tapKey = vk => {
    keybd_event(vk, 0, 0, 0);
    keybd_event(vk, 0, KEYUP, 0);
  };
  const tapChar = ch => {
    const packed = VkKeyScanA(ch.charCodeAt(0));
    if (packed === -1) return;
    const vk = packed & 0xff;
    const shiftState = (packed >> 8) & 0xff;
    if (shiftState & 1) keybd_event(0x10, 0, 0, 0); // Shift down
    tapKey(vk);
    if (shiftState & 1) keybd_event(0x10, 0, KEYUP, 0); // Shift up
  };

  for (const ch of text) tapChar(ch);
  keybd_event(VK_RETURN, 0, 0, 0);
  keybd_event(VK_RETURN, 0, KEYUP, 0);
}

function sendMacroMac(text) {
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const typeScript = [
    'tell application "System Events"',
    `  keystroke "${escaped}"`,
    '  key code 36',
    'end tell'
  ].join('\n');
  execFile('osascript', ['-e', typeScript], () => {});
}

function sendMacroLinux(text) {
  execFile('xdotool', ['type', '--delay', '1', '--clearmodifiers', '--', text, 'key', 'Return'], () => {});
}

// ── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  initButtonDetector();

  const trayIcon = getTrayIcon();
  tray = new Tray(trayIcon);
  tray.setToolTip('OpenWhip (Left-Click to whip buttons, Right-Click to dismiss, Ctrl+Shift+W to toggle)');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Spawn Whip (Ctrl+Shift+W)', click: showWhip },
      { type: 'separator' },
      { label: 'Quit', click: () => {
        if (detectorProcess) {
          try { detectorProcess.stdin.write('EXIT\n'); } catch {}
          detectorProcess.kill();
        }
        app.quit();
      }},
    ])
  );
  tray.on('click', toggleOverlay);

  // Register Global Shortcuts so the user doesn't have to search for the tray icon!
  try {
    globalShortcut.register('CommandOrControl+Shift+W', toggleOverlay);
    globalShortcut.register('Alt+W', toggleOverlay);
  } catch (e) {
    console.warn('Failed to register global hotkey:', e);
  }

  // Auto-spawn the whip immediately on launch so it appears on screen right away!
  createOverlay();
  setTimeout(() => {
    showWhip();
  }, 300);

  // Show balloon / notification on Windows to show where OpenWhip is
  try {
    if (process.platform === 'win32' && tray) {
      tray.displayBalloon({
        title: 'OpenWhip is Active! ⚡',
        content: 'Whip spawned on screen!\n• Left-Click: Whip nearest button\n• Right-Click: Dismiss\n• Shortcut: Ctrl+Shift+W or Alt+W',
      });
    }
  } catch {}
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (detectorProcess) {
    try { detectorProcess.stdin.write('EXIT\n'); } catch {}
    detectorProcess.kill();
  }
});

app.on('window-all-closed', e => e.preventDefault());
