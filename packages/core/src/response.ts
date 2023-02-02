import { ServerResponse } from 'node:http';
import { Http2ServerResponse, constants } from 'node:http2';
import { Readable } from 'node:stream';
import { Request } from './request';

export function wrapResponse(rawResponse: Http2ServerResponse | ServerResponse) {
    const res = Object.create(responsePrototype) as __InternalResponse;
    const headers = new Proxy<Record<string, string | string[]>>({}, {
        get(target, property) {
            return rawResponse.getHeader(property as string);
        },
        set(target, property, newValue) {
            rawResponse.setHeader(property as string, newValue as string);
            target[property as string] = newValue;
            return true;
        },
        ownKeys(target) {
            return rawResponse.getHeaderNames();
        },
        has(target, p) {
            return rawResponse.hasHeader(p as string);
        },
        deleteProperty(target, p) {
            if (rawResponse.hasHeader(p as string)) {
                rawResponse.removeHeader(p as string);
            }
            
            return true;
        },
    });
    
    Object.defineProperty(res, 'httpVersion', { get() { return rawResponse.req.httpVersion; } });
    Object.defineProperty(res, 'rawResponse', {
        get() {
            return rawResponse;
        },
    });
    Object.defineProperty(res, 'headers', {
        get() {
            return headers;
        },
        enumerable: true,
    });
    res._status = 200;
    
    return res as Response;
}

const responsePrototype = {
    get component() {
        return 'response';
    },
    
    get responseSent() {
        const self = this as __InternalResponse;
        return self.httpVersion == '1.1' ?
            self.rawResponse.headersSent :
            (self.rawResponse as Http2ServerResponse).stream.headersSent;
    },
    
    status(this: __InternalResponse, statusCode?: number) {
        if (!statusCode) {
            return this._status;
        }
        
        this._status = statusCode;
    },
    
    write(this: __InternalResponse, data: string | Buffer) {
        this.rawResponse.write(data);
    },
    
    end(this: __InternalResponse, data?: string | Buffer) {
        this.rawResponse.end(data);
    },
    
    send(this: __InternalResponse, data?: string | object | Readable) {
        if (this.responseSent) {
            throw TypeError('attempted to send another response though the response stream is closed');
        }
        
        if (data instanceof Readable) {
            this.stream(data);
            return;
        }
        else if (data && typeof data == 'object') {
            this.json(data);
            return;
        }
        else if (data && !this.headers['content-type']) {
            this.headers['content-type'] = 'text/plain';
        }
        
        if (this.httpVersion == '1.1') {
            (this.rawResponse as ServerResponse).writeHead(this._status);
        }
        else {
            (this.rawResponse as Http2ServerResponse).stream.respond({
                ...this.headers,
                [constants.HTTP2_HEADER_STATUS]: this._status,
            });
        }
        
        if (data) {
            this.rawResponse.write(Buffer.from(data as string));
        }
        
        this.rawResponse.end();
    },
    
    json(this: __InternalResponse, data?: object) {
        if (this.responseSent) {
            throw TypeError('attempted to send another response though the response stream is closed');
        }
        
        if (data && typeof data != 'object') {
            throw TypeError('An attempt to send a response as JSON failed as the response was not an object or array');
        }
        
        if (data) {
            data = Buffer.from(JSON.stringify(data));
        }
        
        if (this.httpVersion == '1.1') {
            (this.rawResponse as ServerResponse).writeHead(this._status);
        }
        else {
            (this.rawResponse as Http2ServerResponse).stream.respond({
                ...this.headers,
                [constants.HTTP2_HEADER_STATUS]: this._status,
            });
        }
        
        if (data) {
            this.rawResponse.write(data as Buffer);
        }
        
        this.rawResponse.end();
    },
    
    async stream(this: __InternalResponse, sourceStream: Readable) {
        if (this.responseSent) {
            throw TypeError('attempted to send another response though the response stream is closed');
        }
        
        if (this.httpVersion == '1.1') {
            (this.rawResponse as ServerResponse).writeHead(this._status);
        }
        else {
            (this.rawResponse as Http2ServerResponse).stream.respond({
                ...this.headers,
                [constants.HTTP2_HEADER_STATUS]: this._status,
            });
        }
        
        sourceStream.pipe(this.rawResponse);
    },
};

interface __InternalResponse extends BaseResponse {
    _status: number;
}

interface BaseResponse {
    readonly request: Request;
    readonly rawResponse: Http2ServerResponse | ServerResponse;
    readonly headers: Record<string, string | string[]>;
    readonly httpVersion: '1.1' | '2.0';
    
    /** getter for if a response has already been sent and the response is closed */
    readonly responseSent: boolean;
    /** getter for the current status code */
    status(): number;
    /** setter for a new status code */
    status(statusCode: number): void;
    
    // response-sending methods
    /** pass-thru for http2Stream.write */
    write(data: string | Buffer): void;
    /** pass-thru for http2Stream.end */
    end(data?: string | Buffer): void;
    
    /** the simplest way to respond with or without data */
    send(data?: any): void;
    
    /** ideal for object data to be consumed in a browser */
    json(data: object): void;
    
    /** ideal for needing to respond with files */
    stream(stream: Readable, options?: SendStreamOptions): Promise<void>;
    // TODO: XML format
    // TODO: urlencoded format (like forms)
}

interface Http1Response extends BaseResponse {
    httpVersion: '1.1';
    readonly rawResponse: ServerResponse;
}

interface Http2Response extends BaseResponse {
    httpVersion: '2.0';
    readonly rawResponse: Http2ServerResponse;
}

type Response = Http1Response | Http2Response;

interface SendStreamOptions {
    noCache: boolean;
}

export type {
    Response,
};
