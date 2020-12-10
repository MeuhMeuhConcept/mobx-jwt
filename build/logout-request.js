"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rich_agent_1 = require("rich-agent");
class LogoutRequest extends rich_agent_1.ApiRequest {
    constructor(apiEndpoint) {
        super(apiEndpoint + '/logout', 'POST');
    }
}
exports.LogoutRequest = LogoutRequest;
