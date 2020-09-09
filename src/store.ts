import { action, observable, computed, when } from 'mobx'
import { TokenRequest } from './token-request'
import { RefreshTokenRequest } from './refresh-token-request'
import { LogoutRequest } from './logout-request'
import { Request, Response } from 'rich-agent'
import * as jwt from 'jsonwebtoken'
import Cookies, { CookieSetOptions } from 'universal-cookie'

export interface Options {
    endpoint: string,
    publicKey: string,
    notifyLogout?: boolean
}

export interface Informations {
    iat: number
    exp: number
    username: string
}

export abstract class Store<T extends Informations> implements Request.AuthorizationService{
    protected _apiEndpoint: string
    protected _apiPublicKey: string
    protected _request: TokenRequest
    @observable status: Request.Status = 'waiting'
    @observable token: string = ''
    @observable informations: T
    protected _cookies: Cookies
    protected _refreshToken: RefreshTokenRequest
    protected _requestLogout: LogoutRequest
    protected _notifyLogout: boolean = true

    constructor (options: Options) {
        this._apiEndpoint = options.endpoint
        this._apiPublicKey = options.publicKey

        this.informations = this.createInformations()

        this._request = new TokenRequest(options.endpoint, options.publicKey)
        this._request.onStatusChange(action((status: Request.Status) => {
            this.status = status
        }))

        this._refreshToken = new RefreshTokenRequest(options.endpoint, options.publicKey)
        this._requestLogout = new LogoutRequest(options.endpoint)

        this._cookies = new Cookies()

        this._notifyLogout = options.notifyLogout === undefined || options.notifyLogout === true

        this.loadTokenFromCookie()

        this.loadTokenFromUrl()
    }

    protected abstract createInformations(): T

    public get endpoint (): string {
        return this._apiEndpoint
    }

    public get authorizationToken (): string {
        return this.token
    }

    public get authorizationPrefix (): string {
        return 'Bearer'
    }

    public onAuthorizationError (responseStatus: any | null, responseTextStatus: any | null): void {
        if( responseStatus === 401) {
            this.eraseCredentials()
        }
    }

    @computed
    public get connected (): boolean {
        return this.token !== ''
    }

    @action
    public login (username: string, password: string, rememberMe: boolean = false): Promise<any> {
        if (this.status === 'pending') {
            return new Promise((resolve, reject) => {
                reject()
            })
        }

        return this._request.send(this.buildLoginData(username, password, rememberMe))
        .then((response: Response.Response) => {
            this.updateToken(this._request.responseData.token, this._request.responseData.decoded, true, rememberMe)
            return response
        })
    }

    @action
    public logout (): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this._notifyLogout) {
                this._requestLogout.addAuthorization(this.token)
                this._requestLogout.send()
                    .then(() => {
                        this.eraseCredentials()

                        resolve()
                    })
                    .catch((response: Response.Response) => {
                        if (response.status === 401) {
                            this.eraseCredentials()
                            resolve()
                        } else {
                            reject()
                        }
                    })
            } else {
                this.eraseCredentials()

                resolve()
            }

        })
    }

    public forceLogout () {
        this.eraseCredentials()
    }

    @action
    protected eraseCredentials () {
        this.token = ''
        this.informations = this.createInformations()
        this.deleteTokenCookie()
    }

    protected buildLoginData (username: string, password: string, rememberMe: boolean = false): {} {
        return {
            username: username,
            password: password,
            rememberMe: rememberMe
        }
    }

    protected loadTokenFromCookie () {
        const token = this._cookies.get('api-token')

        if (token) {
            try {
                const decoded = jwt.verify(token, this._apiPublicKey)
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

    protected saveTokenInCookie () {
        if (this.token) {
            const options: CookieSetOptions = {
                path: '/'
            }

            options.maxAge = this.informations.exp - this.informations.iat

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
    protected updateToken (token: string, decoded: Informations, andSave: boolean = true, rememberMe: boolean = false) {
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
            const token = decodeURIComponent(results[1].replace(/\+/g, ' '))

            if (token) {
                try {
                    const decoded = jwt.verify(token, this._apiPublicKey)
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
