import type { Request } from '../request.js';
import type { Response } from '../response.js';

export function deserializeJsonPayload(options?: DeserializeJsonPayloadOptions) {
    const parse = options?.parse ?? JSON.parse;
    return async (req: Request, res: Response) => {
        if (req.headers['content-type'].includes('json')) {
            let data = '';
            
            for await (const chunk of req.rawRequest) {
                data += (chunk as Buffer).toString('utf-8');
            }
            
            try {
                const deserializedPayload = parse(data);
                Object.defineProperty(req, 'payload',  { get() { return deserializedPayload; } });
            }
            catch (e) {
                console.error('fluvial.deserializeJsonPayload:  Failed to deserialize as JSON the payload provided in this request');
                console.error(e);
                
                throw e;
            }
        }
        
        return 'next' as const;
    };
}

interface DeserializeJsonPayloadOptions {
    /**
     * If you would prefer not to use the default JSON.parse API to parse the given string,
     * specify it here
     * @param data The serialized JSON string
     * @returns The result of parsing the data
     */
    parse?: <ReturnType = object>(data: string) => ReturnType;
}
