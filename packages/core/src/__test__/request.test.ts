import { IncomingHttpHeaders, IncomingMessage } from 'http';
import { Http2ServerRequest, ServerHttp2Stream } from 'http2';
import { Socket } from 'net';
import { Readable } from 'stream';
import { describe, test, expect } from 'vitest';
import { wrapRequest } from '../request.js';

describe('wrapRequest', () => {
    test('http/2 requests break apart the path appropriately', () => {
        const path = '/users/3';
        const hash = '#someHash';
        
        const req = wrapRequest(createHttp2Request(
            `${path}?foo=bar&baz=quux${hash}`,
            'GET',
            [
                'content-type: application/json',
            ],
        ));
        
        expect(req.path).toBe(path);
        expect(req.query).toEqual({ foo: 'bar', baz: 'quux' });
        expect(req.hash).toBe(hash);
    });
    
    test('http/1.x requests break apart the path appropriately', () => {
        const path = '/users/3';
        const hash = '#someHash';
        
        const req = wrapRequest(createHttp1Request(
            `${path}?foo=bar&baz=quux${hash}`,
            'GET',
            [
                'content-type: application/json',
            ],
        ));
        
        expect(req.path).toBe(path);
        expect(req.query).toEqual({ foo: 'bar', baz: 'quux' });
        expect(req.hash).toBe(hash);
    });
    
    test('request metadata (other than what\'s absolutely necessary) is immutable', () => {
        const req = wrapRequest(createHttp2Request(
            `/users/3`,
            'GET',
            [
                'accept: application/json',
            ],
        ));
        
        let headersWereAltered = false;
        
        try {
            // @ts-ignore
            req.headers.accept = 'text/plain';
            headersWereAltered = true;
        }
        catch {}
        expect(headersWereAltered).toBe(false);
        
        try {
            // @ts-ignore
            req.headers = { accept: 'text/plain', 'content-type': 'application/json' };
            headersWereAltered = true;
        }
        catch {}
        expect(headersWereAltered).toBe(false);
        
        
        let queryWasAltered = false;
        
        try {
            // @ts-ignore
            req.query.foo = 'bar';
            queryWasAltered = true;
        }
        catch {}
        expect(queryWasAltered).toBe(false);
        
        try {
            // @ts-ignore
            req.query = { foo: 'bar' };
            queryWasAltered = true;
        }
        catch {}
        expect(queryWasAltered).toBe(false);
        
        
        let methodWasAltered = false;
        
        try {
            // @ts-ignore
            req.method = 'POST';
            methodWasAltered = true;
        }
        catch {}
        expect(methodWasAltered).toBe(false);
        
        
        let httpVersionWasAltered = false;
        
        try {
            // @ts-ignore
            req.httpVersion = '1.1';
            httpVersionWasAltered = true;
        }
        catch {}
        expect(httpVersionWasAltered).toBe(false);
        
        
        let pathWasAltered = false;
        
        try {
            // @ts-ignore
            req.path = '/foo/2';
            pathWasAltered = true;
        }
        catch {}
        expect(pathWasAltered).toBe(false);
        
        // expect()
    });
});

function createHttp2Request(path: string, method: string, semiRawHeaders: string[] = []) {
    semiRawHeaders.push(`:path: ${path}`);
    semiRawHeaders.push(`:method: ${method}`);
    semiRawHeaders.push(`:scheme: http`);
    
    const rawHeaders = semiRawHeaders.flatMap((h) => [
        h.slice(0, h.indexOf(':', Number(h.startsWith(':')))),
        h.slice(h.indexOf(':', Number(h.startsWith(':'))) + 2),
    ]);
    
    const splitHeaders = semiRawHeaders
        .map(h => [
            h.slice(
                0,
                h.indexOf(':', Number(h.startsWith(':'))),
            ),
            h.slice(h.indexOf(':', Number(h.startsWith(':'))) + 2),
        ]);
    
    return new Http2ServerRequest(
        new Readable() as ServerHttp2Stream,
        Object.fromEntries(splitHeaders) as IncomingHttpHeaders,
        {},
        rawHeaders,
    );
}

function createHttp1Request(path: string, method: string, semiRawHeaders: string[] = []) {
    const rawHeaders = semiRawHeaders.flatMap((h) => [
        h.slice(0, h.indexOf(':')),
        h.slice(h.indexOf(':') + 2),
    ]);
    
    const splitHeaders = semiRawHeaders
        .map(h => [
            h.slice(
                0,
                h.indexOf(':'),
            ),
            h.slice(h.indexOf(':') + 2),
        ]);
    
    const message = new IncomingMessage(new Readable({
        read() {
            this.push(Buffer.from([
                `HTTP/1.1 ${method} ${path}`,
                ...semiRawHeaders,
            ].join('\r\n')));
            this.destroy();
        },
    }) as Socket);
    
    // manually initialize things...
    message.url = path;
    message.method = method;
    message.headers = Object.fromEntries(splitHeaders) as IncomingHttpHeaders;
    message.rawHeaders = rawHeaders;
    message.httpVersion = '1.1';
    message.httpVersionMajor = 1;
    message.httpVersionMinor = 1;
    
    return message;
}
