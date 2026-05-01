const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function getDataDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
  }
  return path.join(__dirname, 'data');
}

function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getRecordsPath() {
  return path.join(ensureDataDir(), 'records.json');
}

function loadRecords() {
  const filePath = getRecordsPath();
  if (!fs.existsSync(filePath)) {
    return { records: [] };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { records: [] };
  }
}

function saveRecords(data) {
  const filePath = getRecordsPath();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: '桌面时间记录',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ── IPC Handlers ──────────────────────────────────────────

ipcMain.handle('load-records', () => {
  return loadRecords();
});

ipcMain.handle('save-records', (_event, data) => {
  saveRecords(data);
  return true;
});

ipcMain.handle('get-records-path', () => {
  return getRecordsPath();
});

ipcMain.handle('export-csv', async (_event, csvContent) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出CSV文件',
    defaultPath: `时间记录_${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV文件', extensions: ['csv'] }]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, '﻿' + csvContent, 'utf-8');
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

ipcMain.handle('import-csv', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '导入CSV文件',
    filters: [{ name: 'CSV文件', extensions: ['csv'] }],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
      const content = raw.replace(/^﻿/, '');
      return { success: true, content };
    } catch (e) {
      return { success: false, error: '无法读取文件: ' + e.message };
    }
  }
  return { success: false };
});
