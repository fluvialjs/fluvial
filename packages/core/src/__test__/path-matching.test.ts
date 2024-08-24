import { describe, test } from 'node:test';
import { equal, deepEqual } from 'node:assert';
import { getRouteParams } from '../path-matching.js';

describe('path-matching', () => {
    test('"/" path matches the pattern "/"', () => {
        const params = getRouteParams('/', '/');
        
        deepEqual(params, {});
    });
    
    test('"/123" path matches the pattern "/:id" and has the param of "id: 123"', () => {
        const params = getRouteParams('/123', '/:id');
        
        deepEqual(params, { id: '123' });
    });
    
    test('"/foo/123" path matches the pattern including "[/foo/:id, /bar/:id]"', () => {
        const params = getRouteParams('/foo/123', [ '/foo/:id', '/bar/:id' ]);
        
        deepEqual(params, { id: '123' });
    });
    
    test('"/bar/123" path matches the pattern including "[/foo/:id, /bar/:id]"', () => {
        const params = getRouteParams('/bar/123', [ '/foo/:id', '/bar/:id' ]);
        
        deepEqual(params, { id: '123' });
    });
    
    test('"/baz/123" path does not match the pattern including "[/foo/:id, /bar/:id]"', () => {
        const params = getRouteParams('/baz/123', [ '/foo/:id', '/bar/:id' ]);
        
        equal(params, false);
    });
    
    test('"/foo/123/bar/456" path matches the pattern "/foo/:id/bar/:otherId"', () => {
        const params = getRouteParams('/foo/123/bar/456', '/foo/:id/bar/:otherId');
        
        deepEqual(params, { id: '123', otherId: '456' });
    });
    
    test('"/foo" path matches the regex /\\/foo/', () => {
        const params = getRouteParams('/foo', /\/foo/);
        
        deepEqual(params, {});
    });
    
    test('"/foo/123" path matches the regex /\\/foo\\/(\\d+)/', () => {
        const params = getRouteParams('/foo/123', /\/foo\/(\d+)/);
        
        deepEqual(params, { 1: '123' });
    });
    
    test('"/foo/123" path matches the regex with capture group /\\/foo\\/(?<id>\d+)', () => {
        const params = getRouteParams('/foo/123', /\/foo\/(?<id>\d+)/);
        
        deepEqual(params, { 1: '123', id: '123' });
    });
    
    test('"/foo" path does not match the regex /\\/foo\\/(\\d+)/', () => {
        const params = getRouteParams('/foo', /\/foo\/(\d+)/);
        
        equal(params, false);
    });
    
    test('"/foo/123" path does not match the regex /\\/foo$/', () => {
        const params = getRouteParams('/foo/123', /\/foo$/);
        
        equal(params, false);
    });
});
