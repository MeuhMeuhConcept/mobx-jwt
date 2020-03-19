var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { action, observable, computed, when } from 'mobx';
import { TokenRequest } from './token-request';
import { RefreshTokenRequest } from './refresh-token-request';
import * as jwt from 'jsonwebtoken';
import Cookies from 'universal-cookie';
export class Store {
    constructor(options) {
        this.token = '';
        this._apiEndpoint = options.endpoint;
        this._apiPublicKey = options.publicKey;
        this.informations = this.createInformations();
        this._request = new TokenRequest(options.endpoint, options.publicKey);
        this._refreshToken = new RefreshTokenRequest(options.endpoint, options.publicKey);
        this._cookies = new Cookies();
        this.loadTokenFromCookie();
        this.loadTokenFromUrl();
    }
    get connected() {
        return this.token !== '';
    }
    get loadingStatus() {
        return this._request.status;
    }
    login(username, password, rememberMe = false) {
        if (this._request.status === 'pending') {
            return;
        }
        this._request.send({
            username: username,
            password: password,
            rememberMe: rememberMe
        });
        when(() => this._request.status !== 'pending', () => {
            if (this._request.status === 'done') {
                this.token = this._request.responseData.token;
                this.informations = Object.assign(this.informations, this._request.responseData.decoded);
                this.saveTokenInCookie(rememberMe);
            }
        });
    }
    logout() {
        this.token = '';
        this.informations = this.createInformations();
        this.deleteTokenCookie();
    }
    loadTokenFromCookie() {
        let token = this._cookies.get('api-token');
        if (token) {
            try {
                let decoded = jwt.verify(token, this._apiPublicKey);
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
    saveTokenInCookie(longlife = false) {
        if (this.token) {
            let options = {
                path: '/'
            };
            if (longlife) {
                options.maxAge = 3600 * 24 * 7;
            }
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
    updateToken(token, decoded, andSave = true) {
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
            let token = decodeURIComponent(results[1].replace(/\+/g, ' '));
            if (token) {
                try {
                    let decoded = jwt.verify(token, this._apiPublicKey);
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
], Store.prototype, "token", void 0);
__decorate([
    observable
], Store.prototype, "informations", void 0);
__decorate([
    computed
], Store.prototype, "connected", null);
__decorate([
    computed
], Store.prototype, "loadingStatus", null);
__decorate([
    action
], Store.prototype, "login", null);
__decorate([
    action
], Store.prototype, "logout", null);
__decorate([
    action
], Store.prototype, "updateToken", null);