const {app, BrowserWindow, ipcMain} = require('electron')
const AmazonLogin = require('./modules/amazon-login');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.loadURL('http://localhost:4201/')
}

app.whenReady().then(createWindow)

ipcMain.on('message', (event, data) => {
    console.log(data);
    switch (data.event) {
        case 'login-account': {
            new AmazonLogin(data.data, event.sender);
            break;
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
