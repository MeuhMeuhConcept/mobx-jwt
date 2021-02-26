"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mobx_1 = require("mobx");
const token_request_1 = require("./token-request");
const refresh_token_request_1 = require("./refresh-token-request");
const logout_request_1 = require("./logout-request");
const jwt = __importStar(require("jsonwebtoken"));
const universal_cookie_1 = __importDefault(require("universal-cookie"));
class Store {
    constructor(options) {
        this.status = 'waiting';
        this.token = '';
        this._notifyLogout = true;
        this._apiEndpoint = options.endpoint;
        this._apiPublicKey = options.publicKey;
        this.informations = this.createInformations();
        this._request = new token_request_1.TokenRequest(options.endpoint, options.publicKey);
        this._request.onStatusChange(mobx_1.action((status) => {
            this.status = status;
        }));
        this._refreshToken = new refresh_token_request_1.RefreshTokenRequest(options.endpoint, options.publicKey);
        this._requestLogout = new logout_request_1.LogoutRequest(options.endpoint);
        this._cookies = new universal_cookie_1.default();
        this._notifyLogout = options.notifyLogout === undefined || options.notifyLogout === true;
        this._cookieOptionsDomain = options.cookieOptions && options.cookieOptions.domain ? options.cookieOptions.domain : '';
        this.loadTokenFromCookie();
        this.loadTokenFromUrl();
    }
    get endpoint() {
        return this._apiEndpoint;
    }
    get authorizationToken() {
        return this.token;
    }
    get authorizationPrefix() {
        return 'Bearer';
    }
    onAuthorizationError(responseStatus, responseTextStatus) {
        if (responseStatus === 401) {
            this.eraseCredentials();
        }
    }
    get connected() {
        return this.token !== '';
    }
    login(username, password, rememberMe = false) {
        if (this.status === 'pending') {
            return new Promise((resolve, reject) => {
                reject();
            });
        }
        return this._request.send(this.buildLoginData(username, password, rememberMe))
            .then((response) => {
            this.updateToken(this._request.responseData.token, this._request.responseData.decoded, true, rememberMe);
            return response;
        });
    }
    logout() {
        return new Promise((resolve, reject) => {
            if (this._notifyLogout) {
                this._requestLogout.addAuthorization(this.token);
                this._requestLogout.send()
                    .then(() => {
                    this.eraseCredentials();
                    resolve();
                })
                    .catch((response) => {
                    if (response.status === 401) {
                        this.eraseCredentials();
                        resolve();
                    }
                    else {
                        reject();
                    }
                });
            }
            else {
                this.eraseCredentials();
                resolve();
            }
        });
    }
    forceLogout() {
        this.eraseCredentials();
    }
    eraseCredentials() {
        this.token = '';
        this.informations = this.createInformations();
        this.deleteTokenCookie();
    }
    buildLoginData(username, password, rememberMe = false) {
        return {
            username: username,
            password: password,
            rememberMe: rememberMe
        };
    }
    loadTokenFromCookie() {
        const token = this._cookies.get('api-token');
        if (token) {
            try {
                const decoded = jwt.verify(token, this._apiPublicKey);
                if (decoded) {
                    this.token = token;
                    this.informations = Object.assign(this.informations, decoded);
                    this.refreshTokenIfItNeed();
                }
            }
            catch (error) {
                // do nothing
            }
        }
    }
    saveTokenInCookie() {
        if (this.token) {
            const options = {
                path: '/',
            };
            if (this._cookieOptionsDomain) {
                options.domain = this._cookieOptionsDomain;
            }
            options.maxAge = this.informations.exp - this.informations.iat;
            this._cookies.set('api-token', this.token, options);
        }
    }
    deleteTokenCookie() {
        const options = {
            path: '/',
        };
        if (this._cookieOptionsDomain) {
            options.domain = this._cookieOptionsDomain;
        }
        this._cookies.set('api-token', null, options);
        this._cookies.remove('api-token', options);
    }
    refreshTokenIfItNeed() {
        if (!this.tokenHasToBeRefreshed()) {
            return;
        }
        this._refreshToken.addAuthorization(this.token);
        this._refreshToken.send().then((response) => {
            this.updateToken(response.data.token, response.data.decoded);
        }).catch((response) => {
            // do nothing
        });
    }
    updateToken(token, decoded, andSave = true, rememberMe = false) {
        this.token = token;
        this.informations = Object.assign(this.informations, decoded);
        if (andSave) {
            this.saveTokenInCookie();
        }
    }
    tokenHasToBeRefreshed() {
        if (!this.token) {
            return false;
        }
        const now = Math.floor((new Date()).getTime() / 1000);
        const limit = this.informations.iat + (this.informations.exp - this.informations.iat) / 2;
        return now > limit;
    }
    loadTokenFromUrl() {
        const regex = new RegExp('[\\?&]token=([^&#]*)');
        const results = regex.exec(location.search);
        if (results !== null) {
            const token = decodeURIComponent(results[1].replace(/\+/g, ' '));
            if (token) {
                try {
                    const decoded = jwt.verify(token, this._apiPublicKey);
                    if (decoded) {
                        this.token = token;
                        this.informations = Object.assign(this.informations, decoded);
                        this.refreshTokenIfItNeed();
                    }
                }
                catch (error) {
                    // do nothing
                }
            }
        }
    }
}
__decorate([
    mobx_1.observable
], Store.prototype, "status", void 0);
__decorate([
    mobx_1.observable
], Store.prototype, "token", void 0);
__decorate([
    mobx_1.observable
], Store.prototype, "informations", void 0);
__decorate([
    mobx_1.computed
], Store.prototype, "connected", null);
__decorate([
    mobx_1.action
], Store.prototype, "login", null);
__decorate([
    mobx_1.action
], Store.prototype, "logout", null);
__decorate([
    mobx_1.action
], Store.prototype, "eraseCredentials", null);
__decorate([
    mobx_1.action
], Store.prototype, "updateToken", null);
exports.Store = Store;
