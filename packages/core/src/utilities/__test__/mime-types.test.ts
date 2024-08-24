import { describe, test } from 'node:test';
import { equal } from 'node:assert';
import { mimeTypeAccepted } from '../mime-types.js';

describe('mimeTypeAccepted', () => {
    test('any mime type will be accepted if the accept is set to "*/*"', () => {
        equal(mimeTypeAccepted('application/json', '*/*'), true);
        equal(mimeTypeAccepted('text/html', '*/*'), true);
        equal(mimeTypeAccepted('foo/bar', '*/*'), true);
    });
    
    test('any mime type will be accepted only if it\'s listed in the accept', () => {
        const accept = 'application/json,text/html,text/css';
        
        equal(mimeTypeAccepted('application/json', accept), true);
        equal(mimeTypeAccepted('text/html', accept), true);
        equal(mimeTypeAccepted('text/css', accept), true);
        equal(mimeTypeAccepted('text/plain', accept), false);
        equal(mimeTypeAccepted('application/xml+html', accept), false);
    });
});
