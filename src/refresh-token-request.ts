import { ApiRequest } from 'rich-agent'
import * as jwt from 'jsonwebtoken'

export class RefreshTokenRequest extends ApiRequest {
    protected _apiPublicKey: string

    constructor (apiEndpoint: string, apiPublicKey: string) {
        super(apiEndpoint + '/security/refresh', 'POST')

        this._apiPublicKey = apiPublicKey
    }

    transformResponseData (data: string): boolean {
        if (!super.transformResponseData(data)) {
            return false
        }
        try {
            const decoded = jwt.verify(this._responseData.token, this._apiPublicKey)
            if (decoded) {
                this._responseData = {
                    token: this._responseData.token,
                    decoded: decoded
                }
            }
        } catch (error) {
            this._responseTextStatus = (error as jwt.JsonWebTokenError).message
            return false
        }

        return true
    }

    transformErrorResponseData (data: string): boolean {
        return super.transformResponseData(data)
    }
}
