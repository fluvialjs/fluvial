import { afterEach, describe, test } from 'node:test';
import { equal } from 'node:assert';
import { promisify } from 'node:util';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Router as FluvialRouter, deserializeJsonPayload } from 'fluvial';
import { FluvialRequest, type Request } from 'fluvial/dist/request.js';
import { FluvialResponse, type Response } from 'fluvial/dist/response.js';
import { createHttp2Request } from 'fluvial/src/__test__/utilities/mock-requests.js';
import { createHttp2Response } from 'fluvial/src/__test__/utilities/mock-responses.js';
import type { __InternalRouter } from 'fluvial/dist/router';
import { toFluvial } from '../to-fluvial.js';

describe('`cors` middleware', () => {
    test('default middleware works as expected when converted from Express to Fluvial', async () => {
        const middleware = cors();
        
        const preparedMiddleware = toFluvial(middleware);
        
        const testRouter = FluvialRouter() as __InternalRouter;
        
        testRouter.use(preparedMiddleware);
        
        const req = new FluvialRequest(createHttp2Request('/', 'GET')) as Request;
        const res = new FluvialResponse(createHttp2Response()) as unknown as Response;
        
        const result = await testRouter.handleRequest('/', '', req, res);
        
        equal(result, 'next');
    });
    
    test('an options request will result in stopping the request flow', async () => {
        const middleware = cors();
        
        const preparedMiddleware = toFluvial(middleware);
        
        const testRouter = FluvialRouter() as __InternalRouter;
        
        testRouter.use(preparedMiddleware);
        
        const req = new FluvialRequest(createHttp2Request('/', 'OPTIONS')) as Request;
        const res = new FluvialResponse(createHttp2Response()) as unknown as Response;
        
        const result = await testRouter.handleRequest('/', '', req, res);
        
        equal(result, null);
    });
});

describe('`helmet` middleware', () => {
    test('default middleware works as expected', async () => {
        const middleware = helmet();
        
        const preparedMiddleware = toFluvial(middleware);
        
        const testRouter = FluvialRouter() as __InternalRouter;
        
        testRouter.use(preparedMiddleware);
        
        const req = new FluvialRequest(createHttp2Request('/', 'GET')) as Request;
        const res = new FluvialResponse(createHttp2Response()) as unknown as Response;
        
        const result = await testRouter.handleRequest('/', '', req, res);
        
        equal(result, 'next');
    });
});

describe('`express-session` middleware', () => {
    test('default middleware works as expected', async () => {
        const middleware = session({
            secret: 's',
            saveUninitialized: false,
            resave: false,
        });
        
        const preparedMiddleware = toFluvial(middleware);
        
        const testRouter = FluvialRouter() as __InternalRouter;
        
        testRouter.use(preparedMiddleware);
        
        const req = new FluvialRequest(createHttp2Request('/', 'GET')) as Request;
        const res = new FluvialResponse(createHttp2Response()) as unknown as Response;
        
        const result = await testRouter.handleRequest('/', '', req, res);
        
        equal(result, 'next');
    });
});

describe('`passport`/`passport-local` middleware', () => {
    afterEach(() => {
        passport.unuse('local');
    });
    
    test('default middleware works as expected', async () => {
        // set up strategy
        passport.use('local', new LocalStrategy({ session: false }, async (username, password, done) => {
            done(null, { id: 1 });
        }));
        
        // authenticate middleware
        const middleware = passport.authenticate('local', { session: false });
        
        const preparedMiddleware = toFluvial(middleware);
        
        const testRouter = FluvialRouter() as __InternalRouter;
        
        // deserializing the raw payload provided to the createHttp2Request
        testRouter.use(deserializeJsonPayload());
        testRouter.use(toFluvial(session({
            secret: 'something',
            resave: false,
            saveUninitialized: false,
        })));
        testRouter.use(preparedMiddleware);
        
        const req = new FluvialRequest(createHttp2Request(
            '/',
            'GET',
            [ 'content-type: application/json' ],
            '{"username":"foo","password":"bar"}',
            // JSON.stringify({ username: 'foo', password: 'bar' }),
        )) as Request;
        const res = new FluvialResponse(createHttp2Response()) as unknown as Response;
        
        const result = await testRouter.handleRequest('/', '', req, res);
        
        equal(result, 'next');
        // @ts-expect-error because passport's typings modify Express's typings, not Fluvial's typings
        equal(req.user?.id, 1);
        
        // @ts-expect-error
        equal(req.logOut instanceof Function, true);
        // @ts-expect-error
        await promisify(req.logOut.bind(req) as Express.Request['logOut'])({ session: false });
        
        // @ts-expect-error
        equal(Boolean(req.user), false);
        
        // @ts-expect-error
        equal(req.logIn instanceof Function, true);
        // @ts-expect-error
        await promisify(req.logIn.bind(req) as Express.Request['logIn'])({ id: 2 }, { session: false });
        
        // @ts-expect-error
        equal(req.user?.id, 2);
    });
    
    test('passing an incomplete or empty request payload stops the request cycle', async () => {
        // set up strategy
        passport.use('local', new LocalStrategy({ session: false }, async (username, password, done) => {
            done(null, { id: 1 });
        }));
        
        // authenticate middleware
        const middleware = passport.authenticate('local', { session: false });
        
        const preparedMiddleware = toFluvial(middleware);
        
        const testRouter = FluvialRouter() as __InternalRouter;
        
        // deserializing the raw payload provided to the createHttp2Request
        testRouter.use(deserializeJsonPayload());
        testRouter.use(toFluvial(session({
            secret: 'something',
            resave: false,
            saveUninitialized: false,
        })));
        testRouter.use(preparedMiddleware);
        
        const req = new FluvialRequest(createHttp2Request(
            '/',
            'GET',
            [ 'content-type: application/json' ],
            '{}',
        )) as Request;
        const res = new FluvialResponse(createHttp2Response()) as unknown as Response;
        
        const result = await testRouter.handleRequest('/', '', req, res);
        
        equal(result, null);
    });
});
