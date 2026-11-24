// Havoc City for macOS. The game lives on the website, so every launch plays the newest version (the website keeps
// an offline copy too). If the site can't be reached and nothing is saved yet, the copy built into the app runs instead.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const SITE = process.env.HAVOC_SITE || 'https://gooberguy811-del.github.io/havoc-city/';
const LOCAL = path.join(__dirname, 'game', 'index.html');
const siteOrigin = new URL(SITE).origin;

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 500,
    title: 'Havoc City', backgroundColor: '#0b0d11', show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false }
  });
  let local = false, loaded = false;
  const useLocal = () => { if (local) return; local = true; win.loadFile(LOCAL); };
  const wc = win.webContents;
  wc.on('did-fail-load', (e, code, desc, url, isMain) => { if (isMain && code !== -3) useLocal(); });   // -3: a navigation that was replaced, not a failure
  wc.on('did-navigate', (e, url, status) => { if (!local && status >= 400) useLocal(); });             // the site isn't up (yet)
  wc.on('did-finish-load', () => { loaded = true; });
  setTimeout(() => { if (!loaded) useLocal(); }, 20000);                                                // a very slow connection
  win.once('ready-to-show', () => win.show());
  win.loadURL(SITE);
  // links (sound credits) open in the real browser; the game itself only ever navigates within the site
  wc.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  wc.on('will-navigate', (e, url) => {
    if (url.startsWith('file://') || url.startsWith(siteOrigin)) return;
    e.preventDefault(); if (/^https:\/\//.test(url)) shell.openExternal(url);
  });
  // the web version asks "leave page?" mid-game; an app should just close when you quit
  wc.on('will-prevent-unload', e => e.preventDefault());
  win.on('closed', () => { win = null; });
}

app.setAboutPanelOptions({ applicationName: 'Havoc City', applicationVersion: app.getVersion(), credits: 'Updates itself from ' + SITE + '\nSound effects: CC0 recordings from freesound.org (full list in Settings).' });

Menu.setApplicationMenu(Menu.buildFromTemplate([
  { role: 'appMenu' },
  { role: 'editMenu' },   // copy / paste in the chat box
  { label: 'View', submenu: [{ role: 'togglefullscreen' }, { type: 'separator' }, { role: 'reload', label: 'Restart Game (gets the latest version)' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
  { role: 'windowMenu' },
  { role: 'help', submenu: [{ label: 'Open Havoc City website', click: () => shell.openExternal(SITE) }] }
]));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (!win) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
