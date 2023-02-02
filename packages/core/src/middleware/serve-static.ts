import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { constants } from 'node:http2';
import { extname, join } from 'node:path';
import mime from 'mime';
import type { Request } from '../request.js';
import type { Response } from '../response.js';
import { mimeTypeAccepted } from '../utilities/mime-types.js';
import { etagMatches, etagNoneMatches } from '../utilities/headers.js';

/** a map between the assetPath (absolute)  */
const etagMap: Record<string, string> = {};

export function serveFiles(rootPath: string, options?: ServeFilesOptions) {
    return async (req: Request, res: Response) => {
        const requestedPath = req.path;
        const assetPath = join(rootPath, requestedPath);
        // proprietary header might be...changed out for something that works better
        const skipCache = options?.noCache || req.headers['refresh-file'] == 'true';
        
        if (!existsSync(assetPath) || (await stat(assetPath)).isDirectory()) {
            return 'next' as const;
        }
        
        await sendFile(req, res, { assetPath, skipCache });
    };
}

export function serveFile(filePath: string, options?: ServeFileOptions) {
    if (!options?.optional && (!filePath || !existsSync(filePath))) {
        throw TypeError(`The file path was either not provided or the provided one doesn't point to a valid file; cannot find "${filePath}"`);
    }
    
    return async (req: Request, res: Response) => {
        // only if a required file mysteriously disappears
        if (!options?.optional && !existsSync(filePath)) {
            res.status(500);
            res.send('Unexpected error occurred');
            return;
        }
        
        if (options?.optional && !existsSync(filePath)) {
            return 'next' as const;
        }
        // proprietary header might be...changed out for something that works better
        const skipCache = options?.noCache || req.headers['refresh-file'] == 'true';
        
        await sendFile(req, res, { assetPath: filePath, skipCache });
    };
}

async function sendFile(req: Request, res: Response, options?: { assetPath: string, skipCache: boolean }) {
    const { assetPath } = options;
    
    const fileStats = await stat(assetPath);
    
    const extension = extname(assetPath).slice(1);
    
    const mimeType = mime.getType(extension);
    
    if (!mimeTypeAccepted(mimeType, req.headers.accept)) {
        res.status(500);
        res.send('Unsupported file type attempted to be sent');
        return;
    }
    
    let [ etag, timestamp ] = etagMap[assetPath]?.split('-') ?? [];
    
    if (!(assetPath in etagMap) || timestamp != String(fileStats.mtime.getTime())) {
        const fileHash = createHash('md5');
        
        // was unable to do this by only reading the file once and not retaining it in memory until after
        // the headers are sent...  as such, just read the file real quick to get the etag
        for await (const chunk of createReadStream(assetPath)) {
            fileHash.update(chunk);
        }
        
        etag = JSON.stringify(fileHash.digest('hex'));
        
        timestamp = `${fileStats.mtime.getTime()}`;
        
        etagMap[assetPath] = etag + '-' + timestamp;
    }
    
    if ('if-match' in req.headers && !etagMatches(etag, req.headers['if-match'])) {
        res.status(404);
        res.send('Not found');
        return;
    }
    
    if ('if-none-match' in req.headers && !etagNoneMatches(etag, req.headers['if-none-match'])) {
        res.status(304);
        res.send();
        return;
    }
    
    res.headers[constants.HTTP2_HEADER_ETAG] = etag;
    // 604800 = 1 week; desirable for production
    // 3600 = 1 hr; desirable for testing the cache on development
    res.headers[constants.HTTP2_HEADER_CACHE_CONTROL] = 'max-age=3600; no-cache';
    res.headers[constants.HTTP2_HEADER_LAST_MODIFIED] = fileStats.mtime.toUTCString();
    res.headers[constants.HTTP2_HEADER_CONTENT_TYPE] = mimeType;
    res.headers[constants.HTTP2_HEADER_CONTENT_LENGTH] = String(fileStats.size);
    
    res.stream(createReadStream(assetPath));
}

interface ServeFilesOptions {
    noCache?: boolean;
    
}

interface ServeFileOptions {
    noCache?: boolean;
    /** force the response mime type when provided; typically will automatically read it */
    mimeType?: string;
    /** skip if the file isn't found */
    optional?: boolean;
}
