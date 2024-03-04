import { describe, test, expect } from 'vitest';
import { FluvialResponse } from '../response.js';
import { createHttp1Response, createHttp2Response } from './utilities/mock-responses.js';
import { createHttp2Request } from './utilities/mock-requests.js';
import { FluvialRequest } from '../request.js';


describe('fluvial response basics', () => {
    test('when given a raw http/2 response, it builds correctly', () => {
        const res = new FluvialResponse(createHttp2Response());
        
        expect(res).toBeTruthy();
    });
    
    test('when given a raw http/1.1 response, it builds correctly', () => {
        const res = new FluvialResponse(createHttp1Response());
        
        expect(res).toBeTruthy();
    });
    
    test('setting a status and getting a status works as intended', () => {
        const res = new FluvialResponse(createHttp2Response());
        
        expect(res.status()).toBe(200);
        expect(res.status(401)).toBe(res);
        expect(res.status()).toBe(401);
    });
    
    test('setting and getting the eventSource status works as intended', () => {
        const res = new FluvialResponse(createHttp2Response());
        Object.defineProperty(res, 'request', {
            value: new FluvialRequest(createHttp2Request('/', 'GET')),
        });
        
        expect(res.asEventSource()).toBeFalsy();
        expect(res.asEventSource(true)).toBe(res);
        expect(res.asEventSource()).toBeTruthy();
    });
    
    test('setting headers works as expected', () => {
        const sourceHeaders = {
            ['Content-Type']: 'foo',
            Connection: 'keep-alive',
            ['CrAzY-wItH-CaPiTaLs']: 'bar',
        };
        
        const res = new FluvialResponse(createHttp2Response());
        
        Object.assign(res.headers, sourceHeaders);
        
        expect(Object.keys(res.headers).length).toBe(3);
        expect(res.headers['crazy-with-capitals']).toBe('bar');
    });
});

describe('sending fluvial responses', () => {
    test('sending JSON data formatted for http/2 transport will work as intended', async () => {
        const payload = {
            message: 'foo',
        };
        const targetStatus = 201;
        const headers = {
            'content-type': 'application/json',
            Accept: 'application/json',
        };
        
        let chunks = Buffer.from([]);
        
        const res = new FluvialResponse(createHttp2Response((chunk) => {
            chunks = Buffer.concat([ chunks, chunk ]);
        }));
        
        // @ts-ignore
        res.request = {
            httpVersion: '2.0',
        };
        
        Object.assign(res.headers, headers);
        
        await res.status(targetStatus)
            .send(payload);
        
        expect(chunks.length).toBeTruthy();
        
        const rawPayload = chunks.toString('utf-8');
        
        expect(rawPayload).toContain(JSON.stringify(payload));
        expect(rawPayload).toMatch(new RegExp('^:status: ' + targetStatus, 'm'));
        expect(rawPayload).toMatch(/^accept: /m);
        expect(rawPayload).toMatch(/^content-type: /m);
    });
    
    test('sending JSON data formatted as http/1.1 will work as expected', async () => {
        const payload = {
            message: 'foo',
        };
        const targetStatus = 201;
        const headers = {
            'content-type': 'application/json',
            Accept: 'application/json',
        };
        
        let chunks = Buffer.from([]);
        
        const res = new FluvialResponse(createHttp1Response((chunk) => {
            chunks = Buffer.concat([ chunks, chunk ]);
        }));
        
        // @ts-ignore
        res.request = {
            httpVersion: '1.1',
        };
        
        Object.assign(res.headers, headers);
        
        await res.status(targetStatus)
            .send(payload);
        
        const rawPayload = chunks.toString('utf-8');
        
        expect(rawPayload).toContain(JSON.stringify(payload));
        expect(rawPayload).toContain(targetStatus);
    });
    
    test('sending binary data formatted for http/2 transport will work as intended', async () => {
        const payload = Buffer.from('some sort of binary data');
        
        let chunks = Buffer.from([]);
        
        const res = new FluvialResponse(createHttp2Response((chunk) => {
            chunks = Buffer.concat([ chunks, chunk ]);
        }));
        
        // @ts-ignore
        res.request = {
            httpVersion: '2.0',
        };
        
        await res.send(payload);
        
        expect(chunks.length).toBeTruthy();
        
        const rawPayload = chunks.toString('utf-8');
        
        expect(rawPayload).toContain(':status: ' + 200);
        expect(rawPayload).toContain('content-type: application/octet-stream');
        expect(chunks.includes(payload)).toBeTruthy();
    });
    
    test('sending binary data formatted as http/1.1 will work as expected', async () => {
        const payload = Buffer.from('some sort of binary data');
        
        let chunks = Buffer.from([]);
        
        const res = new FluvialResponse(createHttp1Response((chunk) => {
            chunks = Buffer.concat([ chunks, chunk ]);
        }));
        
        // @ts-ignore
        res.request = {
            httpVersion: '1.1',
        };
        await res.send(payload);
        
        const rawPayload = chunks.toString('utf-8');
        
        expect(chunks.includes(payload)).toBeTruthy();
        expect(rawPayload).toContain(200);
    });
});
