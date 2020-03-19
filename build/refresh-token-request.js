import { ApiRequest } from 'rich-agent';
import * as jwt from 'jsonwebtoken';
export class RefreshTokenRequest extends ApiRequest {
    constructor(apiEndpoint, apiPublicKey) {
        super(apiEndpoint + '/security/refresh', 'POST');
        this._apiPublicKey = apiPublicKey;
    }
    transformResponseData(data) {
        try {
            let jsonData = JSON.parse(this._responseData);
            try {
                let decoded = jwt.verify(jsonData.token, this._apiPublicKey);
                if (decoded) {
                    this._responseData = {
                        token: jsonData.token,
                        decoded: decoded
                    };
                }
            }
            catch (error) {
                this._responseTextStatus = error.message;
                return false;
            }
        }
        catch (e) {
            this._responseTextStatus = 'json_parse_error';
            return false;
        }
        return true;
    }
}
