"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const rich_agent_1 = require("rich-agent");
const jwt = __importStar(require("jsonwebtoken"));
class RefreshTokenRequest extends rich_agent_1.ApiRequest {
    constructor(apiEndpoint, apiPublicKey) {
        super(apiEndpoint + '/security/refresh', 'POST');
        this._apiPublicKey = apiPublicKey;
    }
    transformResponseData(data) {
        try {
            const jsonData = JSON.parse(this._responseData);
            try {
                const decoded = jwt.verify(jsonData.token, this._apiPublicKey);
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
    transformErrorResponseData(data) {
        try {
            this._responseData = JSON.parse(this._responseData);
        }
        catch (e) {
            this._responseTextStatus = 'json_parse_error';
            return false;
        }
        return true;
    }
}
exports.RefreshTokenRequest = RefreshTokenRequest;
