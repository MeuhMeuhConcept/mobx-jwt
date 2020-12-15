import { ApiRequest } from 'rich-agent';
export declare class TokenRequest extends ApiRequest {
    protected _apiPublicKey: string;
    constructor(apiEndpoint: string, apiPublicKey: string);
    transformResponseData(data: any): boolean;
    transformErrorResponseData(data: string): boolean;
}
