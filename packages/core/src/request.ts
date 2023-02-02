import { IncomingMessage } from 'node:http';
import { constants, Http2ServerRequest, IncomingHttpHeaders } from 'node:http2';
import { ParamsDictionary, PathString, QueryDictionary } from './path-matching.js';
import { Response } from './response.js';
import { SupportedHttpMethods } from './router.js';

export function wrapRequest(rawRequest: Http2ServerRequest | IncomingMessage) {
    const req = Object.create(requestPrototype) as __InternalRequest;
    
    const rawPath = rawRequest.httpVersion == '1.1' ?
        rawRequest.url :
        rawRequest.headers[constants.HTTP2_HEADER_PATH];
    
    const url = new URL(`http://foo.com${rawPath}`);
    
    Object.defineProperty(req, 'rawRequest', { get() { return rawRequest; } });
    Object.defineProperty(req, 'path', { get() { return url.pathname; } });
    
    // this gets filled later through path matching
    const params = {};
    const query = Object.freeze(Object.fromEntries(url.searchParams.entries()));
    const headers = Object.freeze(Object.assign({}, rawRequest.headers));
    const rawHeaders = Object.freeze(rawRequest.rawHeaders.slice());
    
    Object.defineProperty(req, 'params', { get() { return params; } });
    Object.defineProperty(req, 'query', { get() { return query; } });
    Object.defineProperty(req, 'httpVersion', { get() { return rawRequest.httpVersion; } });
    Object.defineProperty(req, 'headers', { get() { return headers; } });
    Object.defineProperty(req, 'method', { get() { return rawRequest.method; } });
    Object.defineProperty(req, 'hash', { get() { return url.hash; } });
    Object.defineProperty(req, 'rawHeaders', { get() { rawHeaders; } });
    
    return req as Request;
}

// if there are any methods that work best from the prototype, it should be added here
const requestPrototype = {};

interface __InternalRequest extends BaseRequest {
    
}

interface BaseRequest {
    readonly response: Response;
    readonly path: PathString;
    readonly method: SupportedHttpMethods;
    readonly headers: Readonly<IncomingHttpHeaders>;
    readonly rawHeaders: Readonly<string[]>;
    readonly payload: any;
    readonly rawRequest: Http2ServerRequest | IncomingMessage;
    readonly params: Readonly<ParamsDictionary>;
    readonly query: Readonly<QueryDictionary>;
    readonly hash: string;
    readonly httpVersion: '1.1' | '2.0';
}

interface Http1Request extends BaseRequest {
    readonly rawRequest: IncomingMessage;
}

interface Http2Request extends BaseRequest {
    readonly rawRequest: Http2ServerRequest;
}

type Request = Http1Request | Http2Request;

export type {
    Request,
};
