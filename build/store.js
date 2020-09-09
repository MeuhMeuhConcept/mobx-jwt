var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { action, observable, computed } from 'mobx';
import { TokenRequest } from './token-request';
import { RefreshTokenRequest } from './refresh-token-request';
import { LogoutRequest } from './logout-request';
import * as jwt from 'jsonwebtoken';
import Cookies from 'universal-cookie';
export class Store {
    constructor(options) {
        this.status = 'waiting';
        this.token = '';
        this._notifyLogout = true;
        this._apiEndpoint = options.endpoint;
        this._apiPublicKey = options.publicKey;
        this.informations = this.createInformations();
        this._request = new TokenRequest(options.endpoint, options.publicKey);
        this._request.onStatusChange(action((status) => {
            this.status = status;
        }));
        this._refreshToken = new RefreshTokenRequest(options.endpoint, options.publicKey);
        this._requestLogout = new LogoutRequest(options.endpoint);
        this._cookies = new Cookies();
        this._notifyLogout = options.notifyLogout === undefined || options.notifyLogout === true;
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
                path: '/'
            };
            options.maxAge = this.informations.exp - this.informations.iat;
            this._cookies.set('api-token', this.token, options);
        }
    }
    deleteTokenCookie() {
        this._cookies.remove('api-token');
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
    observable
], Store.prototype, "status", void 0);
__decorate([
    observable
], Store.prototype, "token", void 0);
__decorate([
    observable
], Store.prototype, "informations", void 0);
__decorate([
    computed
], Store.prototype, "connected", null);
__decorate([
    action
], Store.prototype, "login", null);
__decorate([
    action
], Store.prototype, "logout", null);
__decorate([
    action
], Store.prototype, "eraseCredentials", null);
__decorate([
    action
], Store.prototype, "updateToken", null);
