import { action, observable, computed, when } from 'mobx'
import { TokenRequest } from './token-request'
import { RefreshTokenRequest } from './refresh-token-request'
import { Request, Response } from 'rich-agent'
import * as jwt from 'jsonwebtoken'
import Cookies, { CookieSetOptions } from 'universal-cookie'

export interface Options {
    endpoint: string,
    publicKey: string
}

export interface Informations {
    iat: number
    exp: number
    username: string
}

export abstract class Store<T extends Informations> {
    protected _apiEndpoint: string
    protected _apiPublicKey: string
    protected _request: TokenRequest
    @observable token: string = ''
    @observable informations: T
    protected _cookies: Cookies
    protected _refreshToken: RefreshTokenRequest

    constructor (options: Options) {
        this._apiEndpoint = options.endpoint
        this._apiPublicKey = options.publicKey

        this.informations = this.createInformations()

        this._request = new TokenRequest(options.endpoint, options.publicKey)
        this._refreshToken = new RefreshTokenRequest(options.endpoint, options.publicKey)

        this._cookies = new Cookies()

        this.loadTokenFromCookie()

        this.loadTokenFromUrl()
    }

    protected abstract createInformations(): T

    @computed
    public get connected (): boolean {
        return this.token !== ''
    }

    @computed
    public get loadingStatus (): Request.Status {
        return this._request.status
    }

    @action
    public login (username: string, password: string, rememberMe: boolean = false) {
        if (this._request.status === 'pending') {
            return
        }

        this._request.send({
            username: username,
            password: password,
            rememberMe: rememberMe
        })

        when(() => this._request.status !== 'pending', () => {
            if (this._request.status === 'done') {
                this.token = this._request.responseData.token
                this.informations = Object.assign(this.informations, this._request.responseData.decoded)
                this.saveTokenInCookie(rememberMe)
            }
        })
    }

    @action
    public logout () {
        this.token = ''
        this.informations = this.createInformations()
        this.deleteTokenCookie()
    }

    protected loadTokenFromCookie () {
        let token = this._cookies.get('api-token')

        if (token) {
            try {
                let decoded = jwt.verify(token, this._apiPublicKey)
                if (decoded) {
                    this.token = token
                    this.informations = Object.assign(this.informations, decoded)
                    this.refreshTokenIfItNeed()
                }
            } catch (error) {
                // do nothing
            }
        }
    }

    protected saveTokenInCookie (longlife: boolean = false) {
        if (this.token) {
            let options: CookieSetOptions = {
                path: '/'
            }

            if (longlife) {
                options.maxAge = 3600 * 24 * 7
            }

            this._cookies.set('api-token', this.token, options)
        }
    }

    protected deleteTokenCookie () {
        this._cookies.remove('api-token')
    }

    protected refreshTokenIfItNeed (): void {
        if (!this.tokenHasToBeRefreshed()) {
            return
        }

        this._refreshToken.addAuthorization(this.token)
        this._refreshToken.send().then((response: Response.Response) => {
            this.updateToken(response.data.token, response.data.decoded)
        }).catch((response: Response | Error) => {
            // do nothing
        })
    }

    @action
    protected updateToken (token: string, decoded: Informations, andSave: boolean = true) {
        this.token = token
        this.informations = Object.assign(this.informations, decoded)

        if (andSave) {
            this.saveTokenInCookie()
        }
    }

    protected tokenHasToBeRefreshed (): boolean {
        if (!this.token) {
            return false
        }

        const now: number = Math.floor((new Date()).getTime() / 1000)
        const limit = this.informations.iat + (this.informations.exp - this.informations.iat) / 2

        return now > limit
    }

    protected loadTokenFromUrl () {
        const regex = new RegExp('[\\?&]token=([^&#]*)')
        const results = regex.exec(location.search)

        if (results !== null) {
            let token = decodeURIComponent(results[1].replace(/\+/g, ' '))

            if (token) {
                try {
                    let decoded = jwt.verify(token, this._apiPublicKey)
                    if (decoded) {
                        this.token = token
                        this.informations = Object.assign(this.informations, decoded)
                        this.refreshTokenIfItNeed()
                    }
                } catch (error) {
                    // do nothing
                }
            }
        }
    }
}
