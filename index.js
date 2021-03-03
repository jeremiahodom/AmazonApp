const {app, BrowserWindow, ipcMain} = require('electron')
const AmazonLogin = require('./modules/amazon-login');
const AmazonView = require('./modules/amazon-view');
import { autoUpdater } from "electron-updater"

function createWindow() {
    autoUpdater.checkForUpdatesAndNotify();
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.loadURL('https://amz-tool.web.app/')
}

app.whenReady().then(createWindow)

ipcMain.on('message', (event, data) => {
    switch (data.event) {
        case 'login-account': {
            new AmazonLogin(data.data, event.sender);
            break;
        }
        case "view-account": {
            new AmazonView(data.data, event.sender);
        }
    }
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
});
