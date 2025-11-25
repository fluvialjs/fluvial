import { describe, test } from 'node:test';
import { equal, match } from 'node:assert';
import { Readable } from 'node:stream';
import { FluvialResponse } from '../response.js';
import { createHttp1Response, createHttp2Response } from './utilities/mock-responses.js';
import { createHttp2Request } from './utilities/mock-requests.js';
import { FluvialRequest } from '../request.js';

describe('fluvial response basics', () => {
	test('when given a raw http/2 response, it builds correctly', () => {
		const res = new FluvialResponse(createHttp2Response());
		
		equal(Boolean(res), true);
	});
	
	test('when given a raw http/1.1 response, it builds correctly', () => {
		const res = new FluvialResponse(createHttp1Response());
		
		equal(Boolean(res), true);
	});
	
	test('setting a status and getting a status works as intended', () => {
		const res = new FluvialResponse(createHttp2Response());
		
		equal(res.status(), 200);
		equal(res.status(401), res);
		equal(res.status(), 401);
	});
	
	test('setting and getting the eventSource status works as intended', () => {
		const res = new FluvialResponse(createHttp2Response());
		Object.defineProperty(res, 'request', {
			value: new FluvialRequest(createHttp2Request('/', 'GET')),
		});
		
		equal(res.asEventSource(), false);
		equal(res.asEventSource(true), res);
		equal(res.asEventSource(), true);
	});
	
	test('setting headers works as expected', () => {
		const sourceHeaders = {
			['Content-Type']: 'foo',
			Connection: 'keep-alive',
			['CrAzY-wItH-CaPiTaLs']: 'bar',
		};
		
		const res = new FluvialResponse(createHttp2Response());
		
		Object.assign(res.headers, sourceHeaders);
		
		equal(Object.keys(res.headers).length, 3);
		equal(res.headers['crazy-with-capitals'], 'bar');
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
		
		equal(Boolean(chunks.length), true);
		
		const rawPayload = chunks.toString('utf-8');
		
		equal(rawPayload.includes(JSON.stringify(payload)), true);
		match(rawPayload, new RegExp('^:status: ' + targetStatus, 'm'));
		match(rawPayload, /^accept: /m);
		match(rawPayload, /^content-type: /m);
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
		
		equal(rawPayload.includes(JSON.stringify(payload)), true);
		equal(rawPayload.includes(targetStatus.toString()), true);
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
		
		equal(Boolean(chunks.length), true);
		
		const rawPayload = chunks.toString('utf-8');
		
		equal(rawPayload.includes(':status: ' + 200), true);
		equal(rawPayload.includes('content-type: application/octet-stream'), true);
		equal(chunks.includes(payload), true);
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
		
		equal(chunks.includes(payload), true);
		equal(rawPayload.includes(200..toString()), true);
	});
});

describe('response.beforeSend', () => {
	test('adding a `beforeSend` hook to a response should run before the response sends', async () => {
		let hookCalled = false;
		let dataSentBeforeHook = false;
		const res = new FluvialResponse(createHttp2Response(() => {
			if (!hookCalled) {
				dataSentBeforeHook = true;
			}
		}));
		Object.defineProperty(res, 'request', {
			value: new FluvialRequest(createHttp2Request('/', 'GET')),
		});
		
		res.beforeSend(() => {
			hookCalled = true;
		});
		
		await res.send('foo');
		equal(dataSentBeforeHook, false);
		equal(hookCalled, true);
	});
	
	test('when provided with an asynchronous `beforeSend` hook, it should resolve prior to sending', async () => {
		let hookCalled = false;
		let dataSentBeforeHook = false;
		const res = new FluvialResponse(createHttp2Response(() => {
			if (!hookCalled) {
				dataSentBeforeHook = true;
			}
		}));
		Object.defineProperty(res, 'request', {
			value: new FluvialRequest(createHttp2Request('/', 'GET')),
		});
		res.beforeSend(async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			hookCalled = true;
		});
		await res.send('foo');
		equal(dataSentBeforeHook, false);
		equal(hookCalled, true);
	});
	
	test('the `beforeSend` should be called even in the event of a `response.stream` call', async () => {
		let hookCalled = false;
		const res = new FluvialResponse(createHttp2Response());
		Object.defineProperty(res, 'request', {
			value: new FluvialRequest(createHttp2Request('/', 'GET')),
		});
		res.beforeSend(() => {
			hookCalled = true;
		});
		const innerStream = new Readable({
			read() {
				this.push('foo');
				this.push(null);
			}
		});
		await res.stream(innerStream);
		equal(hookCalled, true);
	});
});

describe('response.redirect', () => {
	test('redirecting should set the location header and status code', async () => {
		const res = new FluvialResponse(createHttp2Response());
		Object.defineProperty(res, 'request', {
			value: new FluvialRequest(createHttp2Request('/', 'GET')),
		});
		await res.redirect('https://example.com', 301);
		equal(res.headers['location'], 'https://example.com');
		equal(res.status(), 301);
	});
});
