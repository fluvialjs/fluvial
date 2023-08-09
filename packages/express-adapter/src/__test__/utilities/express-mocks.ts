import type { Request, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import { Readable, Writable } from 'stream';

export function createExpressRequest(
    path: string,
    method: string,
    headers: Record<string, string> = {},
    payload: any = null,
): Request {
    let hasPushed = false;
    let streamable = Array.isArray(payload) && payload.every(e => typeof e == 'string');
    let streamableIndex = 0;
    const readable = new Readable({
        read() {
            if (
                (!streamable && hasPushed) ||
                (streamable && streamableIndex >= payload.length) ||
                payload == null
            ) {
                this.push(null);
            }
            else if (typeof payload == 'string') {
                this.push(payload);
            }
            else if (streamable) {
                this.push(payload[streamableIndex++]);
            }
            else {
                this.push(JSON.stringify(payload), 'utf-8');
            }
            
            if (!hasPushed) {
                hasPushed = true;
            }
        }
    }) as IncomingMessage;
    
    readable.url = path;
    (readable as Request).originalUrl = path;
    readable.headers = headers;
    readable.method = method;
    (readable as Request).params = {};
    (readable as Request).query = {};
    (readable as Request).baseUrl = '/';
    
    return new Proxy(readable as Request, {
        get(target, property) {
            if (typeof target[property] == 'function') {
                return target[property].bind(target);
            }
            
            return target[property];
        },
        set(target, property, value) {
            target[property] = value;
            
            return true;
        },
        has(target, property) {
            return property in target;
        },
    });
}

export function createExpressResponse(onWrite: (chunk: Buffer, encoding: BufferEncoding | 'buffer') => void = () => {}): Response {
    const writable = new Writable({
        write(chunk, encoding, cb) {
            onWrite?.(chunk, encoding);
            if (!writable.headersSent) {
                (writable as any).headersSent = true;
            }
            
            cb();
        },
    }) as ServerResponse;
    
    const headers = {};
    
    (writable as any).headers = headers;
    (writable as any).headersSent = false;
    writable.getHeader = (name) => headers[name.toLowerCase()];
    writable.setHeader = (name, value) => {
        headers[name.toLowerCase()] = value;
        
        return writable;
    };
    writable.getHeaderNames = () => Object.keys(headers);
    writable.hasHeader = (name) => name in headers;
    writable.getHeaders = () => Object.assign({}, headers);
    (writable as Response).status = (code) => {
        writable.statusCode = code;
        
        return writable as Response;
    };
    (writable as Response).send = (body?: any) => {
        if (!body) {
            (writable as any).headersSent = true;
            writable.end();
        }
        else if (typeof body == 'object' && !Buffer.isBuffer(body)) {
            return (writable as Response).json(body);
        }
        else if (typeof body != 'string' && !Buffer.isBuffer(body)) {
            throw Error('body is not of the right type');
        }
        
        if (body) {
            writable.write(body);
        }
        
        return writable as Response;
    };
    (writable as Response).sendStatus = (status) => {
        writable.statusCode = status;
        (writable as any).headersSent = true;
        writable.end();
        return writable as Response;
    };
    (writable as Response).json = (body) => {
        writable.setHeader('content-type', 'application/json');
        
        if (typeof body == 'object' && !Buffer.isBuffer(body)) {
            body = JSON.stringify(body);
        }
        else if (typeof body != 'string' && !Buffer.isBuffer(body)) {
            throw Error('body is not of the right type');
        }
        
        writable.write(body);
        
        return writable as Response;
    };
    
    return new Proxy(writable as Response, {
        get(target, property) {
            if (typeof target[property] == 'function') {
                return target[property].bind(target);
            }
            
            return target[property];
        },
        set(target, property, value) {
            target[property] = value;
            
            return true;
        },
        has(target, property) {
            return property in target;
        },
    });
}
