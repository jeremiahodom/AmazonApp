const {app, BrowserWindow, ipcMain} = require('electron');
const otplib = require('otplib');

module.exports = class AmazonLogin {
    constructor(props, sender) {
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) old-airport-include/1.0.0 Chrome Electron/7.1.7 Safari/537.36';
        this.data = props;
        this.win = new BrowserWindow({
            width: 800,
            height: 600,
        });
        this.sender = sender;
        this.webContent = this.win.webContents;
        this.session = this.win.webContents.session;
        this.session.setUserAgent(this.userAgent);

        this.openPage();
        this.registerEvents();
    }

    clearAllData() {
        this.session.clearCache();
        this.session.clearStorageData();
        this.session.clearAuthCache();

    }

    registerEvents() {
        let accountCookies = [];
        const campaignData = {
            Canada: null,
            Mexico: null,
            UnitedStates: null,
        };
        this.webContent.addListener('dom-ready', async (event, url) => {
            if (this.webContent.getURL() === 'https://sellercentral.amazon.com/') {
                this.webContent.executeJavaScript(`
                    async function sleepClient() {
                        return await new Promise(resolve => {
                            setTimeout(() => {
                                resolve(true);
                            }, parseInt(Math.random() * 10) * 1000);
                        });
                    }

                    document.querySelectorAll('a').forEach(value => {
                        if (value.innerText.trim() === 'Log in') {
                            sleepClient().then(() => value.click())
                        }
                    });
                `)
            }
            // Nhập login
            if (this.webContent.getURL().indexOf('sellercentral.amazon.com/ap/signin') > 0) {
                this.webContent.executeJavaScript(`
                    async function sleepClient() {
                        return await new Promise(resolve => {
                            setTimeout(() => {
                                resolve(true);
                            }, parseInt(Math.random() * 10) * 1000);
                        });
                    }

                    async function run() {
                        document.querySelector('#ap_email').value = '${this.data.email}';
                        await sleepClient();
                        document.querySelector('#ap_password').value = '${this.data.password}';
                        await sleepClient();
                        document.querySelector("input[type=checkbox]").click();
                        await sleepClient();
                        document.querySelector("#signInSubmit").click();
                    }

                    run();
                `);
            }
            // Xác nhận otp
            if (this.webContent.getURL().indexOf('/ap/mfa') > 0) {
                const code = otplib.authenticator.generate(this.data.secret.split(' ').join(''));
                this.webContent.executeJavaScript(`
                    document.querySelector('#auth-mfa-otpcode').value = '${code}';
                    document.querySelector('#auth-mfa-remember-device').click();
                    document.querySelector('#auth-signin-button').click();
                `);
            }
            // Xác nhận bổ qua phone
            if (this.webContent.getURL().indexOf('ap/accountfixup') > 0) {
                const code = otplib.authenticator.generate(this.data.secret.split(' ').join(''));
                this.webContent.executeJavaScript(`
                    document.querySelector('#ap-account-fixup-phone-skip-link').click();
                `);
            }
            // Hoàn thành
            if (this.webContent.getURL().indexOf('/home') > 0) {
                accountCookies = await this.session.cookies.get({});
                await this.win.loadURL('https://advertising.amazon.com/cm/campaigns', {
                    userAgent: this.userAgent
                });
            }
            // Nhận info thị trường
            if (this.webContent.getURL().indexOf('advertising') > 0 && this.webContent.getURL().indexOf('amazon.com/') > 0) {
                campaignData.UnitedStates = await this.webContent.executeJavaScript(`
                    new Promise((resolve)=>{
                         try {
                            let html = document.querySelector('body').innerHTML;
                            let token = html.substring(html.indexOf('csrfToken: "'), html.length).replace('csrfToken: "', '');
                            let entityId = html.substring(html.indexOf('entityId: "'), html.length).replace('entityId: "', '');
                            token = token.substring(0, token.indexOf('"'));
                            entityId = entityId.substring(0, entityId.indexOf('"'));
                            resolve((entityId.indexOf('ENTITY') >= 0 ? {token, entityId} : null));
                        } catch (e) {
                            resolve(null)
                        }
                    });
                `);
                await this.win.loadURL('https://advertising.amazon.ca/cm/campaigns', {
                    userAgent: this.userAgent
                });
            }
            if (this.webContent.getURL().indexOf('advertising') > 0 && this.webContent.getURL().indexOf('amazon.ca/') > 0) {
                campaignData.Canada = await this.webContent.executeJavaScript(`
                    new Promise((resolve)=>{
                         try {
                            let html = document.querySelector('body').innerHTML;
                            let token = html.substring(html.indexOf('csrfToken: "'), html.length).replace('csrfToken: "', '');
                            let entityId = html.substring(html.indexOf('entityId: "'), html.length).replace('entityId: "', '');
                            token = token.substring(0, token.indexOf('"'));
                            entityId = entityId.substring(0, entityId.indexOf('"'));
                            resolve((entityId.indexOf('ENTITY') >= 0 ? {token, entityId} : null));
                        } catch (e) {
                            resolve(null)
                        }
                    });
                `);
                await this.win.loadURL('https://advertising.amazon.com.mx/cm/campaigns', {
                    userAgent: this.userAgent
                });
            }
            if (this.webContent.getURL().indexOf('advertising') > 0 && this.webContent.getURL().indexOf('amazon.com.mx/') > 0) {
                campaignData.Mexico = await this.webContent.executeJavaScript(`
                    new Promise((resolve)=>{
                         try {
                            let html = document.querySelector('body').innerHTML;
                            let token = html.substring(html.indexOf('csrfToken: "'), html.length).replace('csrfToken: "', '');
                            let entityId = html.substring(html.indexOf('entityId: "'), html.length).replace('entityId: "', '');
                            token = token.substring(0, token.indexOf('"'));
                            entityId = entityId.substring(0, entityId.indexOf('"'));
                            resolve((entityId.indexOf('ENTITY') >= 0 ? {token, entityId} : null));
                        } catch (e) {
                            resolve(null)
                        }
                    });
                `);
                this.sendResult({account: accountCookies, campaign: campaignData});

            }

        });
    }

    sendResult(data) {
        if (this.sender) {
            this.sender.send('message', {
                event: 'result-login',
                data: data
            });
            this.sender = null;
            this.clearAllData();
            this.win.close();
        }
    }

    openPage() {
        this.win.loadURL('https://sellercentral.amazon.com/', {
            userAgent: this.userAgent
        });
    }

    sleep(sec) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve()
            }, sec * 1000)
        });
    }
};
