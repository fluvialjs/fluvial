import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { createWriteStream, createReadStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { Readable, Writable } from 'node:stream';
import { join, sep } from 'node:path';
import type { Request } from '../request.js';
import type { Response } from '../response.js';
import { getUrlencodedPathSegments, resolveObjectFromKeyPath } from './x-www-form-urlencoded.js';

export function deserializeFormDataPayload(options?: DeserializeFormDataOptions) {
    let { tempDir = tmpdir() + sep + randomUUID() } = options || {};
    
    if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
    }
    
    process.on('beforeExit', () => {
        try {
            rmSync(tempDir, { recursive: true, force: true, retryDelay: 50 });
        }
        catch {}
    });
    
    console.log('temp dir', tempDir);
    
    return async (req: Request, res: Response) => {
        if (req.headers['content-type']?.includes('multipart/form-data')) {
            let data = '';
            
            const files: TempFileMap = {};
            
            const formBoundary = getBoundary(req.headers['content-type']);
            const formBoundaryBuffer = Buffer.from(formBoundary);
            let currentFileId: string;
            let currentWriteFileStream: Writable;
            
            for await (const chunk of req.rawRequest as { [Symbol.asyncIterator](): AsyncIterableIterator<Buffer> }) {
                if (currentFileId && chunk.includes(formBoundaryBuffer)) {
                    currentFileId = null;
                    currentWriteFileStream.end();
                }
                else if (currentFileId) {
                    currentWriteFileStream.write(chunk);
                }
                
                if (!currentFileId) {
                    data += chunk.toString('utf-8');
                }
                
                if (!currentFileId && data.endsWith('\r\n\r\n') && !req.rawRequest.complete) {
                    currentFileId = randomUUID();
                    const filePath = join(tempDir, currentFileId);
                    currentWriteFileStream = createWriteStream(filePath);
                    // saved to the dataset to reference the file in the file map
                    data += currentFileId + '\r\n';
                    
                    files[currentFileId] = {
                        tempFilePath: filePath,
                        read: () => createReadStream(filePath),
                    };
                }
            }
            
            try {
                const deserializedPayload = parse(data, getBoundary(req.headers['content-type']), files);
                Object.defineProperty(req, 'payload',  { get() { return deserializedPayload; } });
            }
            catch (e) {
                console.error('fluvial.deserializeFormData:  Failed to deserialize the payload as Form Data');
                console.error(e);
                
                throw e;
            }
        }
        
        return 'next' as const;
    };
}

function getBoundary(contentTypeHeader: string) {
    return contentTypeHeader.split(/;\s?/g)
        .map(p => p.split('='))
        .filter(([ key ]) => key == 'boundary')
        [0][1];
}

function parse(current: string, boundary: string, files: TempFileMap) {
    const result = {};
    
    let nextIsValue = false;
    let valueDescribesFile = false;
    let subheaders = false;
    let targets: readonly [targetObject: {} | (string | {})[], targetKey: string | number];
    let fileDescriptor: {
        filename: string;
        tempPath?: string;
        read?: () => Readable;
    };
    
    for (const line of current.split(/\r\n/g)) {
        if (line.includes(boundary)) {
            subheaders = true;
        }
        
        if (!line && subheaders) {
            subheaders = false;
            nextIsValue = true;
        }
        
        if (!line || line.includes(boundary)) {
            continue;
        }
        
        if (subheaders) {
            const [ subheaderName, ...sections ] = line.split(/;\s?/g);
            for (const section of sections) {
                const [ key, value ] = section.split('=');
                
                if (key == 'name') {
                    const fieldName = JSON.parse(value);
                    const segments = getUrlencodedPathSegments(fieldName);
                    targets = resolveObjectFromKeyPath(result, segments);
                }
                if (key == 'filename') {
                    valueDescribesFile = true;
                    fileDescriptor = {
                        filename: JSON.parse(value),
                    };
                }
            }
        }
        
        // the field value
        if (line && nextIsValue) {
            nextIsValue = false;
            
            if (valueDescribesFile) {
                targets[0][targets[1]] = {
                    ...fileDescriptor,
                    ...files[line],
                };
                valueDescribesFile = false;
            }
            else {
                targets[0][targets[1]] = line;
            }
        }
    }
    
    return result;
}

interface DeserializeFormDataOptions {
    tempDir?: string;
}

interface TempFileMap {
    [id: string]: {
        tempFilePath: string;
        read: () => Readable;
    };
}
