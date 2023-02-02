import { IncomingMessage } from 'node:http';
import { Http2ServerRequest } from 'node:http2';
import { Request } from '../request.js';
import { Response } from '../response.js';

export function prepareStreamPayload() {
    return async (req: Request, res: Response) => {
        Object.defineProperty(req, 'payload', {
            get() {
                return req.rawRequest.httpVersion == '1.1' ?
                    (req.rawRequest as IncomingMessage) :
                    (req.rawRequest as Http2ServerRequest).stream;
            },
        });
        
        return 'next' as const;
    };
}
