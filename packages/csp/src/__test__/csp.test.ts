import { createHash, randomBytes } from 'crypto';
import { describe, test, expect } from 'vitest';
import type { Request, Response } from 'fluvial';
import { csp } from '../index.js';

describe('fluvial csp middleware', () => {
    // #region general configuration
    test('no arguments result in defaults being set', async () => {
        const middleware = csp();
        
        const response = {
            headers: {},
        };
        
        middleware({} as Request, response as Response);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
    });
    
    test('passing the reportOnly configuration will use the content-security-policy-report-only header instead of the regular header', () => {
        const middleware = csp({
            reportOnly: true,
        });
        
        const response = {
            headers: {},
        };
        
        middleware({} as Request, response as Response);
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(response.headers['content-security-policy-report-only']).toBeTruthy();
    });
    
    test('the middleware should return the \'next\' value to signal that the request processing continues', () => {
        const middleware = csp();
        
        const result = middleware(null, { headers: {} } as Response);
        
        expect(result).toBe('next');
    });
    // #endregion general configuration
    
    // #region directives
    test('given a single known directive, it will serialize that directive in a way it works', () => {
        const middleware = csp({
            directives: {
                defaultSrc: [ "'none'" ],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware({} as Request, response as Response);
        
        expect(response.headers['content-security-policy']).toEqual('default-src \'none\'');
    });
    
    test('given a known directive that is in kebab case already, it will still work correctly', () => {
        const middleware = csp({
            directives: {
                'default-src': [ "'none'" ],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware({} as Request, response as Response);
        
        expect(response.headers['content-security-policy']).toEqual('default-src \'none\'');
    });
    
    test('given two known directives, it will serialize them separated by a semicolon', () => {
        const middleware = csp({
            directives: {
                defaultSrc: [ "'none'" ],
                scriptSrc: [ "'self'"],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware({} as Request, response as Response);
        
        expect(response.headers['content-security-policy']).toEqual('default-src \'none\'; script-src \'self\'');
    });
    
    test('given an unknown directive, the middleware should throw on setup and notifies of the directive name in the "cause"', () => {
        let error: Error = null;
        
        try {
            csp({
                directives: {
                    foo: [ 'bar' ],
                },
            });
        }
        catch (e) {
            error = e;
        }
        
        expect(error).toBeTruthy();
        expect(error).toBeInstanceOf(Error);
        expect((error.cause as any).directiveName).toBe('foo');
    });
    // #endregion directives
    
    // #region values
    test('when provided with a null (or, really, empty) value for a directive, it will skip that directive', () => {
        const middleware = csp({
            directives: {
                defaultSrc: [ "'none'" ],
                scriptSrc: null,
            }
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        expect(response.headers['content-security-policy']).toContain('default-src');
        expect(response.headers['content-security-policy']).not.toContain('script-src');
    });
    
    test('given a properly-formatted scheme as a value, it will pass all checks and reflects in the csp header', () => {
        const middleware = csp({
            directives: {
                defaultSrc: [ 'https:' ],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware({} as Request, response as Response);
        
        expect(response.headers['content-security-policy']).toBe('default-src https:');
    });
    
    test('given an improperly-formatted scheme, it will not throw but won\'t include it in the headers', () => {
        const middleware = csp({
            directives: {
                defaultSrc: [ 'https' ],
            },
        });
        
        const response = {
            headers: {}
        };
        
        middleware({} as Request, response as Response);
        
        expect(response.headers['content-security-policy']).toBeFalsy();
    });
    
    test('given properly-formatted URLs, it will work successfully with the same number of URLs as it started', () => {
        const urls = [
            '*.example.com',
            'subdomain.example.com',
            'https://example.com',
            'https://example.com:443',
            'example.com/some-path/',
        ];
        
        const middleware = csp({
            directives: {
                defaultSrc: urls,
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware({} as Request, response as Response);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy'].split(' ').slice(1).length).toBe(urls.length);
    });
    
    test('given only improperly-formatted urls, it will not result in any values in the header', () => {
        const middleware = csp({
            directives: {
                defaultSrc: [
                    '*.some?thing',
                    'https//something.com',
                    'https://realdomain.com/❤️',
                    'https://subdomain.realdomain.com/something else',
                    'http://localhost',
                ],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        expect(response.headers['content-security-policy']).toBeFalsy();
    });
    
    test('given a nonce or sha value, it will allow it', () => {
        const sha256 = createHash('sha256');
        const sha384 = createHash('sha384');
        const sha512 = createHash('sha512');
        
        sha256.update(randomBytes(128));
        sha384.update(randomBytes(128));
        sha512.update(randomBytes(128));
        
        const middleware = csp({
            directives: {
                defaultSrc: [
                    'nonce-1234abcdef',
                    'sha256-' + sha256.digest().toString('base64'),
                    'sha384-' + sha384.digest().toString('base64'),
                    'sha512-' + sha512.digest().toString('base64'),
                ],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy'].split(' ').slice(1).length).toBe(4);
    });
    
    test('given a wrong spelling of a nonce prefix or an incorrect sha prefix, it will result in an empty header', () => {
        const middleware = csp({
            directives: {
                defaultSrc: [
                    'nounce-',
                    'nounce256-',
                    'sha534-',
                    'sha-',
                ],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        expect(response.headers['content-security-policy']).toBeFalsy();
    });
    // #endregion values
    
    // #region categorically wrong values
    test('when given a Symbol as a value, it will raise an exception', () => {
        let error: Error;
        
        try {
            csp({
                directives: {
                    defaultSrc: Symbol('blah') as any,
                },
            });
        }
        catch (e) {
            error = e;
        }
        
        expect(error).toBeTruthy();
    });
    
    test('when given an object as a value (that\'s not an array), it will raise an exception', () => {
        let error: Error;
        
        try {
            csp({
                directives: {
                    defaultSrc: {} as any,
                },
            });
        }
        catch (e) {
            error = e;
        }
        
        expect(error).toBeTruthy();
    });
    
    test('when given a function as a value, it will raise an exception', () => {
        let error: Error;
        
        try {
            csp({
                directives: {
                    defaultSrc: (() => {}) as any,
                },
            });
        }
        catch (e) {
            error = e;
        }
        
        expect(error).toBeTruthy();
    });
    
    test('when given a boolean as a value, it will raise an exception', () => {
        let error: Error;
        
        try {
            csp({
                directives: {
                    defaultSrc: true as any,
                },
            });
        }
        catch (e) {
            error = e;
        }
        
        expect(error).toBeTruthy();
    });
    
    test('when given a number as a value, it will raise an exception', () => {
        let error: Error;
        
        try {
            csp({
                directives: {
                    defaultSrc: 2 as any,
                },
            });
        }
        catch (e) {
            error = e;
        }
        
        expect(error).toBeTruthy();
    });
    // #endregion categorically wrong values
    
    // #region adding CSP values to a request
    test('calling the addNonceToCsp method with an empty CSP setup will result in the appropriate addition of that nonce', () => {
        const nonceValue = '1234qwer';
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        
        (response as Response).addNonceToCsp('defaultSrc', nonceValue);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toBe('default-src nonce-' + nonceValue);
    });
    
    test('calling the addNonceToCsp method with a preconfigured CSP directive value will result in appending that nonce to the end of the specified directive', () => {
        const nonceValue = '1234qwer';
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {
                defaultSrc: [ 'https:' ],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        (response as Response).addNonceToCsp('defaultSrc', nonceValue);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toBe('default-src https: nonce-' + nonceValue);
    });
    
    test('calling the addNonceToCsp method with a same directive name cased differently than configuration will still append it to the same directive', () => {
        const nonceValue = '1234qwer';
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {
                defaultSrc: [ 'https:' ],
            },
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        (response as Response).addNonceToCsp('default-src', nonceValue);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toBe('default-src https: nonce-' + nonceValue);
    });
    
    test('calling the addNonceToCsp method with a value other than a string will result in an error', () => {
        const nonceValue = 2;
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addNonceToCsp('defaultSrc', nonceValue as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha256ToCsp method using a Buffer value with a request will add that CSP header', () => {
        const bufferValue = randomBytes(64);
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        
        (response as Response).addSha256ToCsp('defaultSrc', bufferValue);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toContain('default-src sha256-');
    });
    
    test('calling the addSha256ToCsp method using a pre-built SHA256 hash with a request will add that CSP header with no modification of that hash', () => {
        const hash = createHash('sha256');
        
        hash.update(randomBytes(64));
        
        const shaHash = hash.digest().toString('base64');
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        (response as Response).addSha256ToCsp('defaultSrc', shaHash);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toBe('default-src sha256-' + shaHash);
    });
    
    test('calling the addSha256ToCsp method with a number will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha256ToCsp('defaultSrc', 2 as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha256ToCsp method with an object will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha256ToCsp('defaultSrc', new Date() as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha256ToCsp method with a Symbol will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha256ToCsp('defaultSrc', Symbol('something') as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha256ToCsp method with a boolean will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha256ToCsp('defaultSrc', false as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha256ToCsp method with an incorrect array type will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha256ToCsp('defaultSrc', [ 'something' ] as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha384ToCsp method using a Buffer value with a request will add that CSP header', () => {
        const bufferValue = randomBytes(64);
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        
        (response as Response).addSha384ToCsp('defaultSrc', bufferValue);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toContain('default-src sha384-');
    });
    
    test('calling the addSha384ToCsp method using a pre-built SHA384 hash with a request will add that CSP header with no modification of that hash', () => {
        const hash = createHash('sha384');
        
        hash.update(randomBytes(64));
        
        const shaHash = hash.digest().toString('base64');
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        (response as Response).addSha384ToCsp('defaultSrc', shaHash);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toBe('default-src sha384-' + shaHash);
    });
    
    test('calling the addSha384ToCsp method with a number will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha384ToCsp('defaultSrc', 2 as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha384ToCsp method with an object will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha384ToCsp('defaultSrc', new Date() as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha384ToCsp method with a Symbol will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha384ToCsp('defaultSrc', Symbol('something') as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha384ToCsp method with a boolean will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha384ToCsp('defaultSrc', false as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha384ToCsp method with an incorrect array type will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha384ToCsp('defaultSrc', [ 'something' ] as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha512ToCsp method using a Buffer value with a request will add that CSP header', () => {
        const bufferValue = randomBytes(64);
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        
        (response as Response).addSha512ToCsp('defaultSrc', bufferValue);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toContain('default-src sha512-');
    });
    
    test('calling the addSha512ToCsp method using a pre-built SHA512 hash with a request will add that CSP header with no modification of that hash', () => {
        const hash = createHash('sha512');
        
        hash.update(randomBytes(64));
        
        const shaHash = hash.digest().toString('base64');
        
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        (response as Response).addSha512ToCsp('defaultSrc', shaHash);
        
        expect(response.headers['content-security-policy']).toBeTruthy();
        expect(response.headers['content-security-policy']).toBe('default-src sha512-' + shaHash);
    });
    
    test('calling the addSha512ToCsp method with a number will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha512ToCsp('defaultSrc', 2 as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha512ToCsp method with an object will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha512ToCsp('defaultSrc', new Date() as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha512ToCsp method with a Symbol will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha512ToCsp('defaultSrc', Symbol('something') as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha512ToCsp method with a boolean will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha512ToCsp('defaultSrc', false as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    
    test('calling the addSha512ToCsp method with an incorrect array type will result in an error', () => {
        const middleware = csp({
            // empty for purposes of testing
            directives: {},
        });
        
        const response = {
            headers: {},
        };
        
        middleware(null, response as Response);
        
        let error: Error;
        
        try {
            (response as Response).addSha512ToCsp('defaultSrc', [ 'something' ] as any);
        }
        catch (e) {
            error = e;
        }
        
        expect(response.headers['content-security-policy']).toBeFalsy();
        expect(error).toBeTruthy();
    });
    // #endregion adding CSP values to a request
});
