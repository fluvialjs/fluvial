import { describe, test, expect } from 'vitest';
import { getRouteParams } from '../path-matching.js';

describe('path-matching', () => {
    test('"/" path matches the pattern "/"', () => {
        const params = getRouteParams('/', '/');
        
        expect(params).toEqual({});
    });
    
    test('"/123" path matches the pattern "/:id" and has the param of "id: 123"', () => {
        const params = getRouteParams('/123', '/:id');
        
        expect(params).toEqual({ id: '123' });
    });
    
    test('"/foo/123" path matches the pattern including "[/foo/:id, /bar/:id]"', () => {
        const params = getRouteParams('/foo/123', [ '/foo/:id', '/bar/:id' ]);
        
        expect(params).toEqual({ id: '123' });
    });
    
    test('"/bar/123" path matches the pattern including "[/foo/:id, /bar/:id]"', () => {
        const params = getRouteParams('/bar/123', [ '/foo/:id', '/bar/:id' ]);
        
        expect(params).toEqual({ id: '123' });
    });
    
    test('"/baz/123" path does not match the pattern including "[/foo/:id, /bar/:id]"', () => {
        const params = getRouteParams('/baz/123', [ '/foo/:id', '/bar/:id' ]);
        
        expect(params).toBeFalsy();
    });
    
    test('"/foo/123/bar/456" path matches the pattern "/foo/:id/bar/:otherId"', () => {
        const params = getRouteParams('/foo/123/bar/456', '/foo/:id/bar/:otherId');
        
        expect(params).toEqual({ id: '123', otherId: '456' });
    });
    
    test('"/foo" path matches the regex /\\/foo/', () => {
        const params = getRouteParams('/foo', /\/foo/);
        
        expect(params).toEqual({});
    });
    
    test('"/foo/123" path matches the regex /\\/foo\\/(\\d+)/', () => {
        const params = getRouteParams('/foo/123', /\/foo\/(\d+)/);
        
        expect(params).toEqual({ 1: '123' });
    });
    
    test('"/foo/123" path matches the regex with capture group /\\/foo\\/(?<id>\d+)', () => {
        const params = getRouteParams('/foo/123', /\/foo\/(?<id>\d+)/);
        
        expect(params).toEqual({ 1: '123', id: '123' });
    });
    
    test('"/foo" path does not match the regex /\\/foo\\/(\\d+)/', () => {
        const params = getRouteParams('/foo', /\/foo\/(\d+)/);
        
        expect(params).toBeFalsy();
    });
    
    test('"/foo/123" path does not match the regex /\\/foo$/', () => {
        const params = getRouteParams('/foo/123', /\/foo$/);
        
        expect(params).toBeFalsy();
    });
});
