import { describe, test } from 'node:test';
import { equal } from 'node:assert';
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
        };
        const res = {
            headers: {},
            status(value) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            }
        };
        const result = middleware(req, res);
        equal(res.headers['Access-Control-Allow-Origin'], '*');
        equal(result, 'next');
        equal(reportedStatusCode, -1);
        equal(responseSent, false);
        equal(responsePayload, null);
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
        };
        const res = {
            headers: {},
            status(value) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            },
        };
        const result = middleware(req, res);
        equal(result, undefined);
        equal(reportedStatusCode, 204);
        equal('Content-Length' in res.headers, true);
        equal(res.headers['Content-Length'], '0');
        equal(responseSent, true);
        equal(responsePayload, undefined);
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
        };
        const res = {
            headers: {},
            status(value) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            },
        };
        const result = middleware(req, res);
        equal(result, 'next');
        equal(reportedStatusCode, -1);
        equal(responseSent, false);
        equal(responsePayload, null);
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
        };
        const res = {
            headers: {},
            status(value) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            }
        };
        const result = middleware(req, res);
        equal(result, undefined);
        equal(responseSent, true);
        equal(reportedStatusCode, 406);
        equal(responsePayload, undefined);
    });
    test('given an incorrect origin and an option to pass on failure, it will signal to continue to the next handler', () => {
        const middleware = cors({
            allowedOrigins: ['bar.com'],
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
        };
        const res = {
            headers: {},
            status(value) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            },
        };
        const result = middleware(req, res);
        equal(result, 'next');
        equal(reportedStatusCode, -1);
        equal(responseSent, false);
        equal(responsePayload, null);
    });
    test('given specific methods and an incorrect request method, it will fail the request', () => {
        const middleware = cors({
            allowedMethods: ['GET'],
        });
        let reportedStatusCode = -1;
        let responseSent = false;
        let responsePayload = null;
        const req = {
            method: 'DELETE',
            headers: {
                origin: 'foo.com',
            },
        };
        const res = {
            headers: {},
            status(value) {
                reportedStatusCode = value;
            },
            send(payload) {
                responseSent = true;
                responsePayload = payload;
            },
        };
        const result = middleware(req, res);
        equal(result, undefined);
        equal(reportedStatusCode, 405);
        equal(responseSent, true);
        equal(responsePayload, undefined);
    });
});
//# sourceMappingURL=cors.test.js.map