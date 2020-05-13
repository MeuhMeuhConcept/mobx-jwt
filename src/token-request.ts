import { ApiRequest } from 'rich-agent'
import * as jwt from 'jsonwebtoken'

export class TokenRequest extends ApiRequest {
    protected _apiPublicKey: string

    constructor (apiEndpoint: string, apiPublicKey: string) {
        super(apiEndpoint + '/login_check', 'POST')

        this._apiPublicKey = apiPublicKey
    }

    transformResponseData (data: string): boolean {
        try {
            const jsonData = JSON.parse(this._responseData)

            try {
                const decoded = jwt.verify(jsonData.token, this._apiPublicKey)
                if (decoded) {
                    this._responseData = {
                        token: jsonData.token,
                        decoded: decoded
                    }
                }
            } catch (error) {
                this._responseTextStatus = (error as jwt.JsonWebTokenError).message
                return false
            }

        } catch (e) {
            this._responseTextStatus = 'json_parse_error'
            return false
        }
        return true
    }

    transformErrorResponseData (data: string): boolean {
        try {
            this._responseData = JSON.parse(this._responseData)
        } catch (e) {
            this._responseTextStatus = 'json_parse_error'
            return false
        }

        return true
    }
}
