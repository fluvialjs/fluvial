import type { Request } from '../request.js';
import type { Response } from '../response.js';

export function preparePlainTextPayload({ encoding = 'utf-8' }: DeserializePlainTextPayloadOptions = {}) {
    return async (req: Request, res: Response) => {
        let data = '';
        
        try {
            for await (const chunk of req.rawRequest) {
                data += (chunk as Buffer).toString(encoding);
            }
        }
        catch (err) {
            console.error('error attempting to decode payload as raw text', err);
            throw Error('Unable to read payload as text');
        }
        
        Object.defineProperty(req, 'payload', { get() { return data; } });
        
        return 'next' as const;
    };
}

interface DeserializePlainTextPayloadOptions {
    encoding?: BufferEncoding;
}
