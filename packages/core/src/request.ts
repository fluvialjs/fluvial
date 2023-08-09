import { IncomingMessage } from 'node:http';
import { constants, Http2ServerRequest, IncomingHttpHeaders } from 'node:http2';
import { Readable } from 'node:stream';
import { URL } from 'node:url';
import { ParamsDictionary, PathString, QueryDictionary } from './path-matching.js';
import { Response } from './response.js';
import { SupportedHttpMethods } from './router.js';

declare global {
    namespace Fluvial {
        export interface BaseRequest extends Readable {
            readonly response: Response;
            readonly path: PathString;
            readonly method: SupportedHttpMethods;
            readonly headers: Readonly<IncomingHttpHeaders>;
            readonly payload: any;
            readonly rawRequest: Http2ServerRequest | IncomingMessage;
            readonly params: Readonly<ParamsDictionary>;
            readonly query: Readonly<QueryDictionary>;
            readonly hash: string;
            readonly httpVersion: '1.1' | '2.0';
        }
        
        export interface __InternalRequest extends BaseRequest {
            response: Response;
        }
        
        interface Http1Request extends BaseRequest {
            readonly rawRequest: IncomingMessage;
            readonly httpVersion: '1.1';
        }
        
        interface Http2Request extends BaseRequest {
            readonly rawRequest: Http2ServerRequest;
            readonly httpVersion: '2.0';
        }
        
        export type Request = Http1Request | Http2Request;
    }
}

export class FluvialRequest extends Readable implements Fluvial.BaseRequest {
    get _parsedOriginalUrl() {
        return new URL(this.#url.href);
    }
    
    set _parsedOriginalUrl(value) {/* noop */}
    
    get params() {
        return this.#params;
    }
    
    get path() {
        return this.#url.pathname as `/${string}`;
    }
    
    get query() {
        return this.#query;
    }
    
    get httpVersion() {
        return this.rawRequest.httpVersion as '1.1' | '2.0';
    }
    
    get headers() {
        return this.#headers;
    }
    
    get method() {
        return this.rawRequest.method as SupportedHttpMethods;
    }
    
    get hash() {
        return this.#url.hash;
    }
    
    set response(value) {
        if (!this.#response) {
            this.#response = value;
        }
    }
    
    get response() {
        return this.#response;
    }
    
    get payload() {
        return this.#payload;
    }
    
    #params = {};
    #url: URL;
    #query: Readonly<Record<string, string>>;
    #headers: Readonly<Record<string, string>>;
    #response: Response;
    #payload: any;
    
    constructor(public rawRequest: IncomingMessage | Http2ServerRequest) {
        super();
        
        const rawPath = rawRequest.httpVersion == '1.1' ?
            rawRequest.url :
            rawRequest.headers[constants.HTTP2_HEADER_PATH];
        
        this.#url = new URL(`http://foo.com${rawPath}`);
        this.#query = Object.freeze(Object.fromEntries(this.#url.searchParams.entries()));
        this.#headers = Object.freeze(Object.assign({}, rawRequest.headers as Record<string, string>));
    }
    
    async *#read() {
        try {
            for await (const chunk of this.rawRequest) {
                yield chunk as Buffer;
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    
    #readIterator: AsyncGenerator<Buffer>;
    #readBuffer: Buffer;
    
    async _read() {
        if (!this.#readIterator) {
            this.#readIterator = this.#read();
        }
        
        if (this.#readBuffer && this.push(this.#readBuffer)) {
            this.#readBuffer = null;
            return;
        }
        try {
            const result = await this.#readIterator.next();
            
            if (!result.value) {
                this.push(null);
                return;
            }
            
            const pushed = this.push(result.value);
            
            if (!pushed) {
                this.#readBuffer = result.value;
            }
        }
        catch (e) {
            console.error(e);
        }
        
    }
}

export type Request = Fluvial.Request;
