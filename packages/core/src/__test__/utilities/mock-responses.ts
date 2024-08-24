import { IncomingMessage, ServerResponse } from 'node:http';
import { Http2ServerResponse, ServerHttp2Stream } from 'node:http2';


export function createHttp2Response(onWrite?: (data: Buffer) => void) {
    const headers = {};
    let headersSent = false;
    let resolve: (value?: any) => void = null!;
    let reject: (reason?: any) => void = null!;
    let finishedObj = {
        promise: new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        }),
    };
    const state = {};
    const listeners: Record<string, ((...args: any[]) => void)[]> = {};
    const responseStream = new Proxy({
        setHeader(name: string, value: string) {
            headers[name] = value;
        },
        getHeader(name: string) {
            return headers[name];
        },
        eventNames() {
            return [];
        },
        respond(providedHeaders: Record<string, string>) {
            if (headersSent) return;
            
            write(Buffer.from([
                `HTTP/2`,
                ...Object.entries({ ...headers, ...providedHeaders })
                    .map(([ name, value ]) => `${name}: ${value}`),
                '',
                '',
            ].join('\r\n')));
            headersSent = true;
        },
        write,
        end(chunk?: any) {
            write(chunk);
            write(Buffer.from('\r\n\r\n'));
            resolve();
            
            for (const listener of (listeners.close || [])) {
                listener.call(responseStream);
            }
            
            Object.defineProperty(response, 'writableFinished', { value: true });
        },
        emit(type: string, ...args: any[]) {
            response.emit(type, ...args);
        },
        _writableState: { writable: true },
        get headersSent() {
            return headersSent;
        },
        on(type: string, listener: (...args: any[]) => void) {
            if (!(type in listeners)) {
                listeners[type] = [];
            }
            
            listeners[type].push(listener);
        },
        removeListener(type: string, listener?: (...args: any[]) => void) {
            
        },
        get finished() {
            return response.writableFinished;
        },
    }, {
        get(target, key) {
            if (typeof key == 'symbol' && key.description == 'nodejs.webstream.isClosedPromise') {
                return finishedObj;
            }
            
            if (typeof key == 'symbol' && key.description == 'response') {
                return responseStream;
            }
            
            if (typeof key == 'symbol' && key.description == 'state') {
                return state;
            }
            
            if (key == 'stream') {
                return responseStream;
            }
            
            return target[key];
        },
        set(target, key, value) {
            target[key] = value;
            
            return true;
        },
    });
    
    const response = new Http2ServerResponse(responseStream as unknown as ServerHttp2Stream);
    
    Object.defineProperty(response, '_writableState', { get() { return responseStream._writableState; } });
    
    return response;
    
    function write(chunk?: any) {
        if (typeof chunk == 'string') {
            chunk = Buffer.from(chunk, 'utf-8');
        }
        
        if (Buffer.isBuffer(chunk)) {
            onWrite?.(chunk);
        }
    }
}

export function createHttp1Response(onWrite?: (data: Buffer) => void) {
    const headers = {};
    let headersSent = false;
    let resolve: (value?: any) => void = null;
    let reject: (reason?: any) => void = null;
    let finishedObj = {
        promise: new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        }),
    };
    const message = new Proxy({
        setHeader(name: string, value: string) {
            headers[name] = value;
        },
        getHeader(name: string) {
            return headers[name];
        },
        eventNames() {
            return [];
        },
        writeHead(status: number, providedHeaders: Record<string, string>) {
            write(Buffer.from([
                `HTTP/1.1 ${status}`,
                ...Object.entries({ ...headers, ...providedHeaders })
                    .map(([ name, value ]) => `${name}: ${value}`),
                '',
                '',
            ].join('\r\n')));
        },
        write,
        end(chunk?: any) {
            write(chunk);
            if (chunk) {
                write(Buffer.from('\r\n\r\n'));
            }
            resolve();
            message.finished = true;
        },
        finished: false,
        getWriter() {},
        abort() {},
        get headersSent() { return headersSent },
    }, {
        get(target, key) {
            if (typeof key == 'symbol' && key.description == 'nodejs.webstream.isClosedPromise') {
                return finishedObj;
            }
            
            return target[key];
        },
        set(target, key, value) {
            target[key] = value;
            
            return true;
        },
    });
    
    return message as unknown as ServerResponse<IncomingMessage>;
    
    function write(chunk?: any) {
        if (typeof chunk == 'string') {
            chunk = Buffer.from(chunk, 'utf-8');
        }
        
        if (Buffer.isBuffer(chunk)) {
            onWrite?.(chunk);
        }
    }
}
