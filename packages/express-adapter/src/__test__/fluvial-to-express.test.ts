import { describe, test, expect } from 'vitest';
import { __InternalRouter } from 'fluvial/dist/router.js';
import { cors } from '@fluvial/cors';
import { csp } from '@fluvial/csp';
import { toExpress } from '../to-express.js';
import { Router } from 'express';
import { createExpressRequest, createExpressResponse } from './utilities/express-mocks.js';

describe('`@fluvial/cors` middleware', () => {
    test('the default middleware works as intended', async () => {
        const middleware = cors();
        
        const preparedMiddleware = toExpress(middleware);
        
        const testRouter = Router();
        
        testRouter.use(preparedMiddleware);
        
        const req = createExpressRequest('/', 'GET');
        const res = createExpressResponse();
        
        let nextCalled = false;
        
        function next(err: any) {
            nextCalled = true;
            
            if (err && err != 'route') {
                reject(err);
            }
            else {
                resolve(err);
            }
        }
        
        let errored = false;
        
        let resolve: (data: any | void) => void;
        let reject: (err: any | void) => void;
        
        const promise = new Promise((rslv, rjct) => {
            resolve = rslv;
            reject = rjct;
        });
        
        let result: any;
        
        try {
            testRouter(req, res, next);
            
            result = await promise;
        }
        catch (e) {
            errored = true;
            result = e;
        }
        
        expect(nextCalled).toBeTruthy();
        expect(errored).toBeFalsy();
        expect(result).toBeFalsy();
        
        expect(res.headersSent).toBeFalsy();
        // only checking for one of the headers should be enough
        expect(res.getHeaders()).toContain({
            'access-control-allow-origin': '*'
        });
    });
    
    test('the request should not pass on with an options request', async () => {
        const middleware = cors();
        
        const preparedMiddleware = toExpress(middleware);
        
        const testRouter = Router();
        
        testRouter.use(preparedMiddleware);
        
        const req = createExpressRequest('/', 'OPTIONS');
        const res = createExpressResponse();
        
        let nextCalled = false;
        
        function next(err: any) {
            nextCalled = true;
            
            if (err && err != 'route') {
                reject(err);
            }
            else {
                resolve(err);
            }
        }
        
        let errored = false;
        
        let resolve: (data?: any) => void;
        let reject: (err?: any) => void;
        
        const promise = new Promise((rslv, rjct) => {
            resolve = rslv;
            reject = rjct;
        });
        
        res.on('finish', () => {
            resolve();
        });
        res.on('error', (err) => {
            reject(err);
        });
        
        let result: any;
        
        try {
            testRouter(req, res, next);
            
            result = await promise;
        }
        catch (e) {
            errored = true;
            result = e;
        }
        
        expect(nextCalled).toBeFalsy();
        expect(errored).toBeFalsy();
        expect(result).toBeFalsy();
        
        // only thing that should be true was sending the request
        expect(res.headersSent).toBeTruthy();
        // only checking for one of the headers should be enough
        expect(res.getHeaders()).toContain({
            'access-control-allow-origin': '*'
        });
    });
});

describe('`@fluvial/csp` middleware', () => {
    test('default options work fine', async () => {
        const middleware = csp();
        
        const preparedMiddleware = toExpress(middleware);
        
        const testRouter = Router();
        
        testRouter.use(preparedMiddleware);
        
        const req = createExpressRequest('/', 'GET');
        const res = createExpressResponse();
        
        let nextCalled = false;
        
        function next(err: any) {
            nextCalled = true;
            
            if (err && err != 'route') {
                reject(err);
            }
            else {
                resolve(err);
            }
        }
        
        let errored = false;
        
        let resolve: (data: any | void) => void;
        let reject: (err: any | void) => void;
        
        const promise = new Promise((rslv, rjct) => {
            resolve = rslv;
            reject = rjct;
        });
        
        let result: any;
        
        try {
            testRouter(req, res, next);
            
            result = await promise;
        }
        catch (e) {
            errored = true;
            result = e;
        }
        
        expect(nextCalled).toBeTruthy();
        expect(errored).toBeFalsy();
        expect(result).toBeFalsy();
        
        expect(res.headersSent).toBeFalsy();
        // only checking for one of the headers should be enough
        expect('content-security-policy' in res.getHeaders()).toBeTruthy();
    });
    
    test('the header will be set correctly when configured', async () => {
        const middleware = csp({
            reportOnly: true,
        });
        
        const preparedMiddleware = toExpress(middleware);
        
        const testRouter = Router();
        
        testRouter.use(preparedMiddleware);
        
        const req = createExpressRequest('/', 'GET');
        const res = createExpressResponse();
        
        let nextCalled = false;
        
        function next(err: any) {
            nextCalled = true;
            
            if (err && err != 'route') {
                reject(err);
            }
            else {
                resolve(err);
            }
        }
        
        let errored = false;
        
        let resolve: (data: any | void) => void;
        let reject: (err: any | void) => void;
        
        const promise = new Promise((rslv, rjct) => {
            resolve = rslv;
            reject = rjct;
        });
        
        let result: any;
        
        try {
            testRouter(req, res, next);
            
            result = await promise;
        }
        catch (e) {
            errored = true;
            result = e;
        }
        
        expect(nextCalled).toBeTruthy();
        expect(errored).toBeFalsy();
        expect(result).toBeFalsy();
        
        expect(res.headersSent).toBeFalsy();
        // only checking for one of the headers should be enough
        expect('content-security-policy-report-only' in res.getHeaders()).toBeTruthy();
    });
});
