import { ApiRequest } from 'rich-agent'

export class LogoutRequest extends ApiRequest {
    constructor (apiEndpoint: string) {
        super(apiEndpoint + '/logout', 'POST')
    }
}
