import { describe, test, expect } from 'vitest';
import { mimeTypeAccepted } from '../mime-types.js';

describe('mimeTypeAccepted', () => {
    test('any mime type will be accepted if the accept is set to "*/*"', () => {
        expect(mimeTypeAccepted('application/json', '*/*')).toBe(true);
        expect(mimeTypeAccepted('text/html', '*/*')).toBe(true);
        expect(mimeTypeAccepted('foo/bar', '*/*')).toBe(true);
    });
    
    test('any mime type will be accepted only if it\'s listed in the accept', () => {
        const accept = 'application/json,text/html,text/css';
        
        expect(mimeTypeAccepted('application/json', accept)).toBe(true);
        expect(mimeTypeAccepted('text/html', accept)).toBe(true);
        expect(mimeTypeAccepted('text/css', accept)).toBe(true);
        expect(mimeTypeAccepted('text/plain', accept)).toBe(false);
        expect(mimeTypeAccepted('application/xml+html', accept)).toBe(false);
    });
});
