import type { Request, Response } from 'fluvial';

export function cors(options?: CorsOptions) {
    return (req: Request, res: Response): 'next' | void => {
        const requestOrigin = req.headers.origin ?? 'not provided';
        const matchedOrigin = (!options?.allowedOrigins || options.allowedOrigins.includes('*')) ?
            '*' :
            options?.allowedOrigins?.find(o => o == requestOrigin);
        
        res.headers['Access-Control-Allow-Origin'] = matchedOrigin ?? undefined;
        res.headers['Access-Control-Allow-Credentials'] = typeof options?.credentialsAllowed == 'boolean' ? String(options.credentialsAllowed) : 'true';
        res.headers['Access-Control-Allow-Methods'] = options?.allowedMethods?.join(',') ?? 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD';
        res.headers['Access-Control-Allow-Headers'] = options?.allowedHeaders?.join(',') ?? req.headers['access-control-request-headers'];
        res.headers['Access-Control-Max-Age'] = options?.maxAge ? String(options.maxAge) : undefined;
        res.headers['Access-Control-Expose-Headers'] = options?.exposedHeaders?.join(',');
        
        if (
            (req.method == 'OPTIONS' && !options?.continuePreflight) ||
            ((!matchedOrigin ||
             (req.method != 'OPTIONS' && !res.headers['Access-Control-Allow-Methods']!.includes(req.method))) &&
                !options?.continueOnFailure)
        ) {
            if (req.method == 'OPTIONS') {
                res.status(options?.preflightStatusCode ?? 204);
            }
            else if (!res.headers['Access-Control-Allow-Methods']!.includes(req.method)) {
                res.status(options?.failureStatusCode ?? 405);
            }
            else {
                res.status(options?.failureStatusCode ?? 406);
            }
            
            res.headers['Content-Length'] = '0';
            res.send();
            return;
        }
        
        return 'next' as const;
    };
}

export interface CorsOptions {
    continuePreflight?: boolean;
    continueOnFailure?: boolean;
    preflightStatusCode?: number;
    failureStatusCode?: number;
    allowedOrigins?: string[];
    credentialsAllowed?: boolean;
    allowedMethods?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD')[];
    allowedHeaders?: string[];
    maxAge?: number;
    exposedHeaders?: string[];
}
