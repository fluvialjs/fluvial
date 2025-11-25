import { describe, test } from 'node:test';
import { equal, notEqual } from 'node:assert';
import { Router, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Request, Response } from 'fluvial';
import { __InternalRouter } from 'fluvial/dist/router.js';
import { CookieCollection, cookies } from '@fluvial/cookies';
import { cors } from '@fluvial/cors';
import { csp } from '@fluvial/csp';
import { toExpress } from '../to-express.js';
import { createExpressRequest, createExpressResponse } from './utilities/express-mocks.js';

describe('`@fluvial/cors` middleware', () => {
	test('the default middleware works as intended', async () => {
		const middleware = cors();
		const result = await executeMiddlewareInRouter(middleware);
		
		equal(result.nextCalled, true);
		equal(result.errored, false);
		equal(result.result, null);
		
		equal(result.response.headersSent, false);
		// only checking for one of the headers should be enough
		equal(result.response.getHeaders()?.['access-control-allow-origin'], '*');
	});
	
	test('the request should not pass on with an options request', async () => {
		const middleware = cors();
		const result = await executeMiddlewareInRouter(middleware, 'OPTIONS');
		
		equal(result.nextCalled, false);
		equal(result.errored, false);
		equal(result.result, null);
		
		// only thing that should be true was sending the request
		equal(result.response.headersSent, true);
		// only checking for one of the headers should be enough
		equal(result.response.getHeaders()?.['access-control-allow-origin'], '*');
	});
});

describe('`@fluvial/csp` middleware', () => {
	test('default options work fine', async () => {
		const middleware = csp();
		const result = await executeMiddlewareInRouter(middleware);
		
		equal(result.nextCalled, true);
		equal(result.errored, false);
		equal(result.result, null);
		
		equal(result.response.headersSent, false);
		// only checking for one of the headers should be enough
		equal('content-security-policy' in result.response.getHeaders(), true);
	});
	
	test('the header will be set correctly when configured', async () => {
		const middleware = csp({
			reportOnly: true,
		});
		const result = await executeMiddlewareInRouter(middleware);
		
		equal(result.nextCalled, true);
		equal(result.errored, false);
		equal(result.result, null);
		
		equal(result.response.headersSent, false);
		// only checking for one of the headers should be enough
		equal('content-security-policy-report-only' in result.response.getHeaders(), true);
	});
});

describe('@fluvial/cookies middleware', () => {
	test('default invocation results in a cookie object on the response', async () => {
		const middleware = cookies({ expressMode: true });
		var result = await executeMiddlewareInRouter(middleware);
		
		equal(result.nextCalled, true);
		equal(result.errored, false, `Error received: ${result.result}`);
		equal(result.result, null);
		
		notEqual(result.response.cookies, null);
		
		result.response.cookies.add('test', 'value');
		
		result.response.send('ok');
		
		// only thing that should be true was sending the request
		equal(result.response.headersSent, true);
		// only checking for one of the headers should be enough
		equal(result.response.getHeaders()?.['set-cookie'], 'test=value');
	});
});


async function executeMiddlewareInRouter(middleware: (req: Request, res: Response) => 'next' | Promise<void | 'next'> | void, reqMethod = 'GET'): Promise<MiddlewareTestHandle> {
	const preparedMiddleware = toExpress(middleware);
	
	const testRouter = Router();
	
	testRouter.use(preparedMiddleware);

	const req = createExpressRequest('/', reqMethod);
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
	
	return {
		request: req,
		response: res,
		nextCalled,
		errored,
		result,
	};
}


interface MiddlewareTestHandle {
	request: ExpressRequest;
	response: ExpressResponse;
	nextCalled: boolean;
	errored: boolean;
	result: any;
}

// add express types to ensure typescript doesn't scream
declare global {
	namespace Express {
		interface Request {
			cookies?: CookieCollection;
		}
		
		interface Response {
			cookies?: CookieCollection;
		}
	}
}
