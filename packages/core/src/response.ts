import { randomUUID } from 'node:crypto';
import { ServerResponse } from 'node:http';
import { Http2ServerResponse, constants } from 'node:http2';
import { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { Request } from './request.js';

declare global {
    namespace Fluvial {
        interface BaseResponse extends Writable {
            readonly request: Request;
            readonly rawResponse: Http2ServerResponse | ServerResponse;
            /** assigning to properties of this object will set the associated header; deleting the property or assigning `undefined` to a property will unset it */
            readonly headers: Record<string, string | string[] | undefined>;
            readonly httpVersion: '1.1' | '2.0';
            
            /** getter for if a response has already been sent and the response is closed */
            readonly responseSent: boolean;
            /** getter for the current status code */
            status(): number;
            /** setter for a new status code */
            status(statusCode: number): this;
            
            /** getter for the current eventSource value (default: false) */
            asEventSource(): boolean;
            /** setter for the eventSource value */
            asEventSource(bool: boolean): this;
            
            // response-sending methods
            
            /** DEFAULT MODE ONLY: the simplest way to respond with or without data */
            send(data?: any): Promise<this>;
            
            /** ideal for object data to be consumed in a browser */
            json(data: object): Promise<this>;
            
            /** EVENT STREAM MODE ONLY: when the response is set as an event stream, this sends the event; errors otherwise */
            sendEvent(data?: object | string): this;
            
            /** ideal for needing to respond with files */
            stream(stream: Readable): this;
            // TODO: XML format
            // TODO: urlencoded format (like forms)
        }

        interface __InternalResponse extends Fluvial.BaseResponse {
            request: Request;
        }
        
        interface Http1Response extends BaseResponse {
            readonly httpVersion: '1.1';
            readonly rawResponse: ServerResponse;
        }
        
        interface Http2Response extends BaseResponse {
            readonly httpVersion: '2.0';
            readonly rawResponse: Http2ServerResponse;
        }
    }
}

export class FluvialResponse extends Writable {
    get httpVersion() {
        return this.request.httpVersion;
    }
    
    get component() {
        return 'response';
    }
    
    get responseSent() {
        return this.httpVersion == '1.1' ?
            this.rawResponse.headersSent :
            (this.rawResponse as Http2ServerResponse).stream.headersSent;
    }
    
    headers = new Proxy<Record<string, string | string[]>>({}, {
        get: (target, property) => {
            if (typeof property == 'symbol') {
                return (target as { [key: symbol]: any })[property];
            }
            return target[property.toLowerCase()];
        },
        set: (target, property: string, newValue: string) => {
            const lowerProperty = property.toLowerCase();
            if (!newValue && this.rawResponse.hasHeader(lowerProperty)) {
                this.rawResponse.removeHeader(lowerProperty);
                delete target[lowerProperty];
            }
            else if (newValue) {
                this.rawResponse.setHeader(lowerProperty, newValue);
                target[lowerProperty] = this.rawResponse.getHeader(lowerProperty) as string;
            }
            return true;
        },
        ownKeys: (target) => {
            return Object.keys(target);
        },
        has: (target, p: string) => {
            return this.rawResponse.hasHeader(p) ?? p.toLowerCase() in target;
        },
        deleteProperty: (target, p: string) => {
            const lowerProperty = p.toLowerCase();
            if (this.rawResponse.hasHeader(lowerProperty)) {
                this.rawResponse.removeHeader(lowerProperty);
            }
            return delete target[lowerProperty];
        },
    });
    readonly rawResponse: Http2ServerResponse | ServerResponse;
    
    #req: Request;
    
    get request() {
        return this.#req;
    }
    
    set request(value) {
        if (!this.#req) {
            this.#req = value;
        }
    }
    
    #status = 200;
    #eventSource = false;
    
    constructor(rawResponse: Http2ServerResponse | ServerResponse) {
        super();
        
        this.rawResponse = rawResponse;
    }
    
    status(statusCode: number): this;
    status(): number;
    status(statusCode?: number) {
        if (!statusCode) {
            return this.#status;
        }
        
        if (this.rawResponse.headersSent) {
            throw TypeError('An attempt to set the status code failed because the response headers have already been sent');
        }
        
        this.rawResponse.statusCode = statusCode;
        this.#status = statusCode;
        
        return this;
    }
    
    asEventSource(value: boolean): this;
    asEventSource(): boolean;
    asEventSource(value?: boolean): boolean | this {
        if (value == undefined) {
            return this.#eventSource;
        }
        
        if (value) {
            this.#eventSourceId = randomUUID();
            
            // "connection" is only necessary for http/1.x responses and is ignored with a warning by Node for http/2 responses
            if (this.httpVersion == '1.1') {
                this.headers['connection'] = 'keep-alive';
            }
            this.headers['content-type'] = 'text/event-stream';
            this.headers['cache-control'] = 'no-cache';
        }
        else if (this.#eventSourceId) {
            if (this.headers['connection'] == 'keep-alive') {
                this.headers['connection'] = undefined;
            }
            if (this.headers['content-type'] == 'text/event-stream') {
                this.headers['content-type'] = undefined;
            }
            
            this.#eventSourceId = null;
        }
        
        this.#eventSource = value;
        
        return this;
    }
    
    #eventSourceId: string;
    
    _write(data: string | Buffer, encoding: BufferEncoding = 'utf-8') {
        return this.rawResponse.write(data, encoding);
    }
    
    end(data?: string | Buffer | (() => void)) {
        if (this.#eventSource) {
            throw TypeError('An attempt to close the response stream failed because the response is set up to be an event source and only clients are allowed to close such streams');
        }
        
        // all overloads of writable.end will work here...
        this.rawResponse.end(data as string);
        
        return this;
    }
    
    send(data?: string | object | Readable) {
        if (this.#eventSource) {
            throw TypeError('An attempt to send a singular response failed because the response is set up to be an event source; use sendEvent instead');
        }
        
        if (this.responseSent) {
            throw TypeError('An attempt to send a response failed because the response stream is closed');
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
        
        return this.#send(data as string);
    }
    
    sendEvent(event: string | object) {
        if (!this.#eventSource) {
            throw TypeError('An attempt to send an event failed because this response is not set up to be an event source; must use the asEventSource() setter first');
        }
        
        if (this.rawResponse.headersSent && this.rawResponse.closed) {
            throw TypeError('An attempt to send an event failed because the stream is currently closed');
        }
        
        if (!this.rawResponse.headersSent) {
            if (this.httpVersion == '1.1') {
                this.rawResponse.writeHead(this.#status, {
                    ...this.headers
                });
            }
            else {
                (this.rawResponse as Http2ServerResponse).stream.respond({
                    [constants.HTTP2_HEADER_STATUS]: this.#status,
                    ...this.headers,
                });
            }
        }
        
        const preparedData = typeof event == 'string' ? event : JSON.stringify(event);
        
        this.rawResponse.write(
            'id: ' + this.#eventSourceId + '\n' +
            'data: ' + preparedData + '\n\n',
        );
        
        return this;
    }
    
    json(data?: object) {
        if (data && typeof data != 'object') {
            throw TypeError('An attempt to send a response as JSON failed as the response was not an object or array');
        }
        
        let stringifiedData: string;
        
        if (data) {
            stringifiedData = JSON.stringify(data);
        }
        
        return this.#send(stringifiedData);
    }
    
    stream(sourceStream: Readable) {
        if (this.responseSent) {
            throw TypeError('attempted to send another response though the response stream is closed');
        }
        
        if (this.httpVersion == '1.1') {
            (this.rawResponse as ServerResponse).writeHead(this.#status);
        }
        else {
            (this.rawResponse as Http2ServerResponse).stream.respond({
                ...this.headers,
                [constants.HTTP2_HEADER_STATUS]: this.#status,
            });
        }
        
        sourceStream.pipe(this.rawResponse);
        
        return this;
    }
    
    async #send(data?: string) {
        if (this.httpVersion == '1.1') {
            (this.rawResponse as ServerResponse).writeHead(this.#status, { ...this.headers });
        }
        else {
            (this.rawResponse as Http2ServerResponse).stream.respond({
                ...this.headers,
                [constants.HTTP2_HEADER_STATUS]: this.#status,
            });
        }
        
        if (data) {
            this.write(Buffer.from(data));
        }
        
        this.end();
        
        await finished(this.rawResponse);
        
        return this;
    }
};

export type Response = Fluvial.Http1Response | Fluvial.Http2Response;
