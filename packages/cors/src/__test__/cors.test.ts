import assert from 'node:assert';
import type { Request, Response } from 'fluvial';
import { describe, test, expect } from 'vitest';
import { cors } from '../index.js';

describe('cors', () => {
    test('does not require options to be provided', () => {
        const middleware = cors();
        
        let reportedStatusCode = -1;
        let responseSent = false;
        let responsePayload = null;
        
        // mock req/res
        const req = {
            method: 'GET',
            headers: {
                origin: 'foo.com',
            },
        } as Request;
        const res = {
            headers: {},
            status(value: number) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            }
        } as Response;
        
        const result = middleware(req, res);
        
        expect(res.headers['Access-Control-Allow-Origin']).toEqual('*');
        expect(result).toEqual('next');
        expect(reportedStatusCode).toEqual(-1);
        expect(responseSent).toEqual(false);
        expect(responsePayload).toBe(null);
    });
    
    test('given an \'OPTIONS\' request, it will by default not signal to go to the next handler', () => {
        const middleware = cors();
        
        let reportedStatusCode = -1;
        let responseSent = false;
        let responsePayload = null;
        
        const req = {
            method: 'OPTIONS',
            headers: {
                origin: 'foo.com',
            },
        } as Request;
        const res = {
            headers: {},
            status(value: number) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            },
        } as Response;
        
        const result = middleware(req, res);
        
        expect(result).toEqual(undefined);
        expect(reportedStatusCode).toEqual(204);
        expect('Content-Length' in res.headers).toEqual(true);
        expect(res.headers['Content-Length']).toEqual('0');
        expect(responseSent).toEqual(true);
        expect(responsePayload).toEqual(undefined);
    });
    
    test('given an \'OPTIONS\' request, it will signal to go to the next handler if configured to do so', () => {
        const middleware = cors({
            continuePreflight: true,
        });
        
        let reportedStatusCode = -1;
        let responseSent = false;
        let responsePayload = null;
        
        const req = {
            method: 'OPTIONS',
            headers: {
                origin: 'foo.com',
            },
        } as Request;
        const res = {
            headers: {},
            status(value: number) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            },
        } as Response;
        
        const result = middleware(req, res);
        
        expect(result).toEqual('next');
        expect(reportedStatusCode).toEqual(-1);
        expect(responseSent).toEqual(false);
        expect(responsePayload).toBe(null);
    });
    
    test('given an invalid origin, it will not continue the request', () => {
        const middleware = cors({
            allowedOrigins: [
                'bar.com',
            ],
        });
        
        let reportedStatusCode = -1;
        let responseSent = false;
        let responsePayload = null;
        
        const req = {
            method: 'GET',
            headers: {
                origin: 'foo.com',
            },
        } as Request;
        const res = {
            headers: {},
            status(value: number) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            }
        } as Response;
        
        const result = middleware(req, res);
        
        expect(result).toEqual(undefined);
        expect(responseSent).toEqual(true);
        expect(reportedStatusCode).toEqual(406);
        expect(responsePayload).toEqual(undefined);
    });
    
    test('given an incorrect origin and an option to pass on failure, it will signal to continue to the next handler', () => {
        const middleware = cors({
            allowedOrigins: [ 'bar.com' ],
            continueOnFailure: true,
        });
        
        let reportedStatusCode = -1;
        let responseSent = false;
        let responsePayload = null;
        
        const req = {
            method: 'GET',
            headers: {
                origin: 'foo.com',
            },
        } as Request;
        const res = {
            headers: {},
            status(value: number) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            },
        } as Response;
        
        const result = middleware(req, res);
        
        expect(result).toEqual('next');
        expect(reportedStatusCode).toEqual(-1);
        expect(responseSent).toEqual(false);
        expect(responsePayload).toBe(null);
    });
    
    test('given specific methods and an incorrect request method, it will fail the request', () => {
        const middleware = cors({
            allowedMethods: [ 'GET' ],
        });
        
        let reportedStatusCode = -1;
        let responseSent = false;
        let responsePayload = null;
        
        const req = {
            method: 'DELETE',
            headers: {
                origin: 'foo.com',
            },
        } as Request;
        const res = {
            headers: {},
            status(value: number) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            },
        } as Response;
        
        const result = middleware(req, res);
        
        expect(result).toEqual(undefined);
        expect(reportedStatusCode).toEqual(405);
        expect(responseSent).toEqual(true);
        expect(responsePayload).toBe(undefined);
    });
});
