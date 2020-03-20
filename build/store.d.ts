import { TokenRequest } from './token-request';
import { RefreshTokenRequest } from './refresh-token-request';
import { Request } from 'rich-agent';
import Cookies from 'universal-cookie';
export interface Options {
    endpoint: string;
    publicKey: string;
}
export interface Informations {
    iat: number;
    exp: number;
    username: string;
}
export declare abstract class Store<T extends Informations> {
    protected _apiEndpoint: string;
    protected _apiPublicKey: string;
    protected _request: TokenRequest;
    token: string;
    informations: T;
    protected _cookies: Cookies;
    protected _refreshToken: RefreshTokenRequest;
    constructor(options: Options);
    protected abstract createInformations(): T;
    get connected(): boolean;
    get loadingStatus(): Request.Status;
    login(username: string, password: string, rememberMe?: boolean): void;
    logout(): void;
    protected loadTokenFromCookie(): void;
    protected saveTokenInCookie(longlife?: boolean): void;
    protected deleteTokenCookie(): void;
    protected refreshTokenIfItNeed(): void;
    protected updateToken(token: string, decoded: Informations, andSave?: boolean): void;
    protected tokenHasToBeRefreshed(): boolean;
    protected loadTokenFromUrl(): void;
}