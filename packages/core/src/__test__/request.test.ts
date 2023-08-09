import { describe, test, expect } from 'vitest';
import { FluvialRequest } from '../request.js';
import { createHttp2Request, createHttp1Request } from './utilities/mock-requests.js';

describe('Create a Fluvial request object', () => {
    test('http/2 requests break apart the path appropriately', () => {
        const path = '/users/3';
        const hash = '#someHash';
        
        const req = new FluvialRequest(createHttp2Request(
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
        
        const req = new FluvialRequest(createHttp1Request(
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
        const req = new FluvialRequest(createHttp2Request(
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
    
    test('with an http/2 request, the payload can be retreived from the `for await` loop', async () => {
        const originalPayload = [ 'foo', 'bar', 'baz' ];
        
        const req = new FluvialRequest(createHttp2Request(
            '/',
            'POST',
            [],
            originalPayload.slice(),
        ));
        
        const resultPayload = [];
        
        for await (const chunk of req) {
            const result = chunk.toString('utf-8');
            resultPayload.push(result);
        }
        
        expect(resultPayload).toEqual(originalPayload);
    });
    
    test('with an http/1.x request, the payload can be retreived from the `for await` loop', async () => {
        const originalPayload = [ 'foo', 'bar', 'baz' ];
        
        const req = new FluvialRequest(createHttp1Request(
            '/',
            'POST',
            [],
            originalPayload.slice(),
        ));
        
        const resultPayload = [];
        
        for await (const chunk of req) {
            const result = chunk.toString('utf-8');
            resultPayload.push(result);
        }
        
        expect(resultPayload).toEqual(originalPayload);
    });
    
    test('pausing and unpausing results in the right data', async () => {
        const originalPayload = [ 'foo', 'bar', 'baz' ];
        
        const req = new FluvialRequest(createHttp2Request(
            '/',
            'POST',
            [],
            originalPayload.slice(),
        ));
        
        const resultPayload = [];
        
        let pausedOnce = false;
        let currentlyPaused = false;
        let ranWhilePaused = false;
        await new Promise<void>((resolve) => {
            req.on('data', (chunk) => {
                const result = chunk.toString('utf-8');
                resultPayload.push(result);
                
                if (!pausedOnce) {
                    req.pause();
                    pausedOnce = true;
                    currentlyPaused = true;
                    setTimeout(() => {
                        currentlyPaused = false;
                        req.resume();
                    }, 1000);
                }
                else if (currentlyPaused) {
                    ranWhilePaused = true;
                }
            });
            req.on('close', () => {
                resolve();
            });
        });
        
        expect(resultPayload).toEqual([
            originalPayload[0],
            // this happens because it buffers the remainder even when it pauses
            originalPayload.slice(1).join(''),
        ]);
        expect(ranWhilePaused).toBeFalsy();
    });
});
