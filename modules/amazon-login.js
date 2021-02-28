const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const otplib = require('otplib');

module.exports = class AmazonLogin {
    constructor(props, sender) {
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) old-airport-include/1.0.0 Chrome Electron/7.1.7 Safari/537.36';
        this.data = props;
        this.win = new BrowserWindow({
            width: 800,
            height: 600,
            show: true,
        });
        this.sender = sender;
        this.webContent = this.win.webContents;
        this.session = this.win.webContents.session;
        this.session.setUserAgent(this.userAgent);
        this.openPage();
        //this.setCookies();
        this.registerEvents();
    }

    setCookies() {
        if (this.data.cookies && this.data.cookies.account) {
            const cookies = this.data.cookies.account;
            console.log(cookies);
            cookies.map(cookie => {
                cookie.url = `https://sellercentral.amazon.com`;
                delete cookie.domain;
                delete cookie.expirationDate;
                delete cookie.sameSite;
                this.session.cookies.set(cookie).then().catch(err => {
                    console.log(err);
                });
            });
        }
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
                            }, parseInt(Math.random() * 5) * 1000);
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
                const checkCaptcha = await this.webContent.executeJavaScript(`
                    new Promise((resolve)=>{
                         try {
                            resolve(!!document.querySelector('#auth-captcha-image-container'));
                        } catch (e) {
                            console.error(e);
                            resolve(false)
                        }
                    });
                `);
                const checkErrorMessage = await this.webContent.executeJavaScript(`
                    new Promise((resolve)=>{
                         try {
                            if(!!document.querySelector('#auth-error-message-box')){
                                const title=document.querySelector("#auth-error-message-box > div > h4").innerText;
                                const message=document.querySelector("#auth-error-message-box > div > .a-alert-content").innerText;
                                resolve({title,message});
                            }else{
                                if(!!document.querySelector('#auth-warning-message-box')){
                                    const title=document.querySelector("#auth-warning-message-box > div > h4").innerText;
                                    const message=document.querySelector("#auth-warning-message-box > div > .a-alert-content").innerText;
                                    resolve({title,message});
                                }else{
                                    resolve(false);
                                }
                            }
                            
                        } catch (e) {
                            console.error(e);
                            resolve(false)
                        }
                    });
                `);

                if (!checkErrorMessage && !checkCaptcha) {
                    this.webContent.executeJavaScript(`
                    async function sleepClient() {
                        return await new Promise(resolve => {
                            setTimeout(() => {
                                resolve(true);
                            }, parseInt(Math.random() * 5) * 1000);
                        });
                    }

                    async function run() {
                        console.log('Step email...');
                        document.querySelector('#ap_email')?(document.querySelector('#ap_email').value = '${this.data.email}'):null;
                        await sleepClient();
                        console.log('Step pass...');
                        document.querySelector('#ap_password').value = '${this.data.password}';
                        await sleepClient();
                        document.querySelector("input[type=checkbox]").click();
                        await sleepClient();
                        document.querySelector("#signInSubmit").click();
                    }

                    run();
                `);
                } else {
                    if (checkErrorMessage) {
                        dialog.showMessageBox({
                            title: checkErrorMessage.title,
                            type: 'warning',
                            message: checkErrorMessage.message
                        });
                    }
                    if (checkCaptcha) {
                        this.webContent.executeJavaScript(`
                            try {
                                document.querySelector(".a-button-text").innerText='Xác nhận';
                                document.querySelector('#ap_email').value = '${this.data.email}';
                                document.querySelector('#ap_password').value = '${this.data.password}';
                                document.querySelector(".auth-disable-button-on-submit .a-button-text").innerText='Xác nhận';
                                document.querySelector('label[for="auth-captcha-guess"').innerText='Nhập mã xác minh';
                                document.querySelector('#auth-captcha-refresh-link').innerText='Đổi hình ảnh khác';
                                document.querySelector('title').innerText='Xác minh hình ảnh';
                                document.querySelector(".auth-disable-button-on-submit").addEventListener('click',()=>{
                                    document.querySelector(".auth-disable-button-on-submit").setAttribute('data-clicked','1');
                                });
                            } catch (e) {
                            }
                        `);
                        this.webContent.insertCSS(`
                            #auth-error-message-box,#image-captcha-section h4, label[for='ap_password'], label[for='ap_email'], #auth-switch-captcha-to-audio, .a-link-nav-icon, #auth-warning-message-box, .a-spacing-small, label, #ap_email, #ap_password, #auth-fpp-link-bottom, #legalTextRow, #authportal-main-section > div:nth-child(2) > div > div > form > div > div > div > div.a-section.a-spacing-extra-large > div.a-section.a-text-center, #auth-signin-cancel-link, .a-size-mini {
                              display: none !important;
                            }
                            body {
                              overflow: hidden !important;
                            }
                            .a-button-primary {
                              background: #4CAF50 !important;
                              border: none !important;
                              height: 44px !important;
                              line-height: 44px !important;
                              display: flex !important;
                              align-items: center !important;
                              justify-content: center !important;
                            }
                            
                            .a-button-primary span, .a-button-primary .a-button-inner {
                              color: white !important;
                              font-size: 16px !important;
                              border: none !important;
                              box-shadow: none !important;
                              background: none !important;
                            }
                            
                            .a-button-primary > span {
                              border: none !important;
                              box-shadow: none !important;
                              background: none !important;
                            }
                            
                            .auth-workflow .auth-pagelet-container, .auth-workflow .auth-pagelet-container div {
                              width: auto !important;
                              border: none !important;
                            }
                        `);
                        this.win.setSize(400, 400);
                        this.win.focus();
                        this.win.show();
                        const onSubmit = await this.webContent.executeJavaScript(`
                            new Promise((resolve)=>{
                                try {
                                   setInterval(()=>{
                                        const value = document.querySelector(".auth-disable-button-on-submit").getAttribute('data-clicked');
                                        if(!!value){
                                            resolve(true)
                                        }
                                   },500);
                                } catch (e) {
                                    resolve(true)
                                }
                            });
                        `);
                        if (onSubmit) {
                            this.win.setSize(800, 600);
                            this.win.hide();
                        }
                    }
                }
            }
            // Xác nhận new otp
            if (this.webContent.getURL().indexOf('/ap/mfa/new-otp') > 0) {
                this.webContent.executeJavaScript(`
                    document.querySelector('#auth-send-code').click();
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
