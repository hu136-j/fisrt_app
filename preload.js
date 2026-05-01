const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadRecords: () => ipcRenderer.invoke('load-records'),
  saveRecords: (data) => ipcRenderer.invoke('save-records', data),
  loadTags: () => ipcRenderer.invoke('load-tags'),
  saveTags: (tags) => ipcRenderer.invoke('save-tags', tags),
  getRecordsPath: () => ipcRenderer.invoke('get-records-path'),
  exportCSV: (csvContent) => ipcRenderer.invoke('export-csv', csvContent),
  importCSV: () => ipcRenderer.invoke('import-csv')
});
