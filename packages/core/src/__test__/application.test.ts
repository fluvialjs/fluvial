import { describe, test } from 'node:test';
import { equal } from 'node:assert';
import { __InternalApplication, fluvial } from '../index.js';
import { createHttp2Request } from './utilities/mock-requests.js';
import { createHttp2Response } from './utilities/mock-responses.js';

describe('fluvial application', () => {
    test('creating an application with no options works', () => {
        const app = fluvial();
        
        equal(Boolean(app), true);
    });
    
    test('providing an application with a raw request and a raw response will result in the request/response lifecycle to trigger as appropriate', async () => {
        const app = fluvial();
        
        const req = createHttp2Request('/', 'GET');
        const res = createHttp2Response();
        
        await app(req, res);
    });
    
    test('registering routes on the application work just like in the routers and are called when handling the appropriate request', async () => {
        const app = fluvial() as __InternalApplication;
        
        let getReached = false;
        let postReached = false;
        let catchReached = false;
        
        app.get('/', (req, res) => {
            if (req.query.error) {
                throw {};
            }
            getReached = true;
        });
        app.post('/', (req, res) => {
            postReached = true;
        });
        app.catch((err, req, res) => {
            catchReached = true;
        });
        
        equal(app.routes.length, 3);
        
        await app(createHttp2Request('/', 'GET'), createHttp2Response());
        await app(createHttp2Request('/', 'POST'), createHttp2Response());
        await app(createHttp2Request('/?error=true', 'GET'), createHttp2Response());
        
        equal(getReached, true);
        equal(postReached, true);
        equal(catchReached, true);
    });
});
