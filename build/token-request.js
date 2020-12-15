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
class TokenRequest extends rich_agent_1.ApiRequest {
    constructor(apiEndpoint, apiPublicKey) {
        super(apiEndpoint + '/login_check', 'POST');
        this._apiPublicKey = apiPublicKey;
    }
    transformResponseData(data) {
        if (!super.transformResponseData(data)) {
            return false;
        }
        try {
            const decoded = jwt.verify(this._responseData.token, this._apiPublicKey);
            if (decoded) {
                this._responseData = {
                    token: this._responseData.token,
                    decoded: decoded
                };
            }
        }
        catch (error) {
            this._responseTextStatus = error.message;
            return false;
        }
        return true;
    }
    transformErrorResponseData(data) {
        return super.transformResponseData(data);
    }
}
exports.TokenRequest = TokenRequest;
