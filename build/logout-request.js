import { ApiRequest } from 'rich-agent';
export class LogoutRequest extends ApiRequest {
    constructor(apiEndpoint) {
        super(apiEndpoint + '/logout', 'POST');
    }
}
