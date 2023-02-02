import { describe, test, expect } from 'vitest';
import { Request } from '../request.js';
import { Response } from '../response.js';
import { Router, __InternalRouter } from '../router.js';

describe('router', () => {
    describe('path matching', () => {
        // NOTE: These tests will only test the path matching abilities once; the underlying path-matching logic is handled in other tests
        test('given a router with a single "get" request registered and a matching path, it will call the "get" handler', async () => {
            const router = Router() as __InternalRouter;
            
            let visited = false;
            
            router.get('/foo', () => {
                visited = true;
            });
            
            const result = await router.handleRequest('/foo', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBeFalsy();
            expect(visited).toBe(true);
        }, 300000);
        
        test('given a router with a single "get" request registered and not a matching path, it will not call the "get" handler', async () => {
            const router = Router() as __InternalRouter;
            
            let visited = false;
            
            router.get('/foo', () => {
                visited = true;
            });
            
            const result = await router.handleRequest('/bar', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBe('next');
            expect(visited).toBe(false);
        });
    });
    
    describe('http method matching', () => {
        test('given a router with a "use" request registered and no path will still be called', async () => {
            const router = Router() as __InternalRouter;
            
            let visited = false;
            
            router.use(() => {
                visited = true;
            });
            
            const result = await router.handleRequest('/foo', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBeFalsy();
            expect(visited).toBe(true);
        });
        
        test('given a router with a "post" handler registered and request with the same path but different method, it will not call the handler', async () => {
            const router = Router() as __InternalRouter;
            
            let visited = false;
            
            router.post('/foo', () => {
                visited = true;
            });
            
            const result = await router.handleRequest('/foo', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBe('next');
            expect(visited).toBe(false);
        });
        
        test('given a router with a "put" handler registered and request with the same path but different method, it will not call the handler', async () => {
            const router = Router() as __InternalRouter;
            
            let visited = false;
            
            router.put('/foo', () => {
                visited = true;
            });
            
            const result = await router.handleRequest('/foo', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBe('next');
            expect(visited).toBe(false);
        });
    });
    
    describe('route piping', () => {
        test('given a router with a handler that returns a "next", it will return "next" even though it visited the registered handler', async () => {
            const router = Router() as __InternalRouter;
            
            let visited = false;
            
            router.get('/foo', async () => {
                visited = true;
                
                return 'next' as const;
            });
            
            const result = await router.handleRequest('/foo', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBe('next');
            expect(visited).toBe(true);
        });
        
        test('given a router with two handlers where the first returns a "next", it will stop at the second handler and go no farther', async () => {
            const router = Router() as __InternalRouter;
            
            let visited = false;
            
            router.get('/foo', async () => {
                visited = true;
                
                return 'next' as const;
            });
            
            const result = await router.handleRequest('/foo', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBe('next');
            expect(visited).toBe(true);
        });
        
        test('given a router with two routes with matching criteria, if the first doesn\'t pass on the request, the second doesn\'t get called', async () => {
            const router = Router() as __InternalRouter;
            
            let secondVisited = false;
            
            router.get('/foo', () => {});
            router.get('/foo', async () => {
                secondVisited = true;
                
                return 'next' as const;
            });
            
            const result = await router.handleRequest('/foo', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBeFalsy();
            expect(secondVisited).toBe(false);
        });
        
        test('given a router with two routes with matching criteria, if the first passes on the request, the second gets called', async () => {
            const router = Router() as __InternalRouter;
            
            let secondVisited = false;
            
            router.get('/foo', async () => 'next' as const);
            router.get('/foo', async () => {
                secondVisited = true;
            });
            
            const result = await router.handleRequest('/foo', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBeFalsy();
            expect(secondVisited).toBe(true);
        });
    });
    
    describe('nested routing', () => {
        test('path reduction with static path matches works for sub-routers', async () => {
            const mainRouter = Router() as __InternalRouter;
            const subRouter = Router();
            
            let subRouterVisited = false;
            
            mainRouter.use('/main', subRouter);
            
            subRouter.get('/sub', () => {
                subRouterVisited = true;
            });
            
            const result = await mainRouter.handleRequest('/main/sub', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBeFalsy();
            expect(subRouterVisited).toBe(true);
        });
        
        test('path reduction with route params works for sub-routers', async () => {
            const mainRouter = Router() as __InternalRouter;
            const subRouter = Router();
            
            let subRouterVisited = false;
            
            const req = { method: 'GET', params: {}, query: {} } as Request;
            
            mainRouter.use('/:id', subRouter);
            
            subRouter.get('/sub', () => {
                subRouterVisited = true;
            });
            
            const result = await mainRouter.handleRequest('/1234/sub', req, {} as Response);
            
            expect(result).toBeFalsy();
            expect(subRouterVisited).toBe(true);
            expect(req.params.id).toBe('1234');
        });
    });
    
    describe('error handling', () => {
        test('an error thrown in a handler will go to the next "catch" handler', async () => {
            const router = Router() as __InternalRouter;
            
            let errorHandlerVisited = false;
            let secondRequestHandlerVisited = false;
            
            router.get('/', () => {
                throw Error('Something went wrong and threw an error in the handler');
            });
            
            router.get('/', () => {
                secondRequestHandlerVisited = true;
            });
            
            router.catch((err) => {
                errorHandlerVisited = true;
            });
            
            const result = await router.handleRequest('/', {
                method: 'GET',
                params: {},
                query: {},
            } as Request, {} as Response);
            
            expect(result).toBeFalsy();
            expect(errorHandlerVisited).toBe(true);
            expect(secondRequestHandlerVisited).toBe(false);
        });
    });
    
    test('the same error caught by the first handler will be passed to the next error handler if a "next" is returned from the first', async () => {
        const router = Router() as __InternalRouter;
        
        let secondErrorHandlerVisited = false;
        let error: Error;
        let sameErrorUsed = false;
        
        router.get('/', () => {
            throw new Error('Something completely unexpected happened and didn\'t handle it properly!');
        });
        
        router.catch((err) => {
            error = err as Error;
            return 'next';
        });
        
        router.catch((err) => {
            secondErrorHandlerVisited = true;
            sameErrorUsed = err == error;
        });
        
        const result = await router.handleRequest('/', {
            method: 'GET',
            params: {},
            query: {},
        } as Request, {} as Response);
        
        expect(result).toBeFalsy();
        expect(secondErrorHandlerVisited).toBe(true);
        expect(sameErrorUsed).toBe(true);
    });
});
