import {
    type PathString,
    type PathMatcher,
    type ParamsDictionary,
    getRouteParams,
    getQueryParams,
} from './path-matching.js';
import type { Request } from './request.js';
import type { Response } from './response.js';

export function Router(): Router {
    const router = Object.create(routerPrototype) as __InternalRouter;
    router.routes = [];
    return router;
}

export const routerPrototype = {
    get component() {
        return 'router';
    },
    
    get(this: __InternalRouter, path: PathMatcher, ...handlers: RequestHandler[]) {
        this.__addRoute('GET', path, ...handlers);
        
        return this as Router;
    },
    post(this: __InternalRouter, path: PathMatcher, ...handlers: RequestHandler[]) {
        this.__addRoute('POST', path, ...handlers);
        
        return this as Router;
    },
    put(this: __InternalRouter, path: PathMatcher, ...handlers: RequestHandler[]) {
        this.__addRoute('PUT', path, ...handlers);
        
        return this as Router;
    },
    patch(this: __InternalRouter, path: PathMatcher, ...handlers: RequestHandler[]) {
        this.__addRoute('PATCH', path, ...handlers);
        
        return this as Router;
    },
    delete(this: __InternalRouter, path: PathMatcher, ...handlers: RequestHandler[]) {
        this.__addRoute('DELETE', path, ...handlers);
        
        return this as Router;
    },
    options(this: __InternalRouter, path: PathMatcher, ...handlers: RequestHandler[]) {
        this.__addRoute('OPTIONS', path, ...handlers);
        
        return this as Router;
    },
    head(this: __InternalRouter, path: PathMatcher, ...handlers: RequestHandler[]) {
        this.__addRoute('HEAD', path, ...handlers);
        
        return this as Router;
    },
    all(this: __InternalRouter, path: PathMatcher, ...handlers: RequestHandler[]) {
        this.__addRoute('ALL', path, ...handlers);
        
        return this as Router;
    },
    route(this: __InternalRouter, path: PathMatcher) {
        const route = Object.create(routePrototype) as __InternalRoute;
        // this is meant for you to do stuff to the route itself; no handler is registered up front
        route.handlers = [];
        route.pathMatcher = path;
        
        return this.__addRoute(null, path) as Route;
    },
    use(this: __InternalRouter, pathOrHandler: PathMatcher | RequestHandler | Router, ...handlers: (RequestHandler | Router)[]) {
        if (typeof pathOrHandler == 'function' || (typeof pathOrHandler == 'object' && !(pathOrHandler instanceof RegExp))) {
            handlers.unshift(pathOrHandler as RequestHandler);
            pathOrHandler = '/**';
        }
        
        this.__addRoute('ALL', pathOrHandler, ...handlers);
        
        return this as Router;
    },
    catch(this: __InternalRouter, pathOrHandler: PathMatcher | ErrorHandler, ...handlers: ErrorHandler[]) {
        if (typeof pathOrHandler == 'function') {
            handlers.unshift(pathOrHandler);
            pathOrHandler = '/**';
        }
        
        this.__addRoute('ERROR', pathOrHandler, ...handlers)
    },
    
    /**
     * @returns This resolves to either nothing if this request is complete or `'next'` if you wish to push the request along to the next handler in the pipeline
     */
    async handleRequest(this: __InternalRouter, path: PathString, req: Request, res: Response): Promise<void | 'next'> {
        // by default, if there doesn't happen to be any handlers that work with this request, it should direct it to the next handler found
        let latestResult: void | 'next' = 'next';
        const routerState: __RouterState = {
            error: null,
            path,
            req,
        };
        
        for (const route of this.__getMatchingRoute(routerState)) {
            try {
                const remainingPath = removeMatchedPathPortion(path, route.pathMatcher);
                latestResult = await route.handleRequest(remainingPath, req, res, routerState.error);
                
                if (routerState.error) {
                    // consider the error handled and resolve as if not errored
                    routerState.error = null;
                }
                if (!latestResult) break;
            }
            catch(err) {
                routerState.error = err;
                
                if (latestResult) {
                    latestResult = null;
                }
            }
        }
        
        if (routerState.error) {
            throw routerState.error;
        }
        
        return latestResult;
    },
    
    __getMatchingRoute: function *__getMatchingRoute(this: __InternalRouter, state) {
        for (const route of this.routes) {
            if (state.end) {
                // `return`ing inside of a genrator function just completes it; no value is passed back
                return;
            }
            const params = getRouteParams(state.path, route.pathMatcher);
            
            if (params) {
                // TODO: put this at the beginning of the request cycle; doing it each time doesn't make sense...
                const query = getQueryParams(state.path);
                Object.assign(state.req.params, params);
                Object.assign(state.req.query, query);
                
                yield route;
            }
        }
    } as __InternalRouter['__getMatchingRoute'],
    
    __addRoute(this: __InternalRouter, method: HandlerHttpMethods | null, path: PathMatcher, ...handlers: (RequestHandler | ErrorHandler | Router)[]) {
        const route = Object.create(routePrototype) as __InternalRoute;
        
        route.pathMatcher = path ?? '/**';
        route.handlers = [];
        
        if (method) {
            route.handlers.push([ method, ...handlers ]);
        }
        
        this.routes.push(route);
        
        return route;
    },
};

const routePrototype = {
    get component() {
        return 'route';
    },
    
    /**
     * @returns This resolves to either nothing if this request is complete or `'next'` if you wish to push the request along to the next handler in the pipeline
     */
    async handleRequest(this: __InternalRoute, remainingPath: PathString, req: Request, res: Response, err?: unknown): Promise<void | 'next' | 'route'> {
        // by default, if there doesn't happen to be any handlers that work with this request, it should direct it to the next handler found
        let latestResult: void | 'next' | 'route' = 'next';
        const handlerState: __RouteHandlerState = {
            error: err,
            req,
        };
        
        for (const handlers of this.__getMatchingHandlers(handlerState)) {
            for (const handler of handlers) {
                if (handlerState.end) {
                    break;
                }
                try {
                    if (typeof handler == 'function') {
                        if (handlerState.error) {
                            latestResult = await (handler as ErrorHandler)(handlerState.error, req, res);
                        }
                        else {
                            latestResult = await (handler as RequestHandler)(req, res);
                        }
                    }
                    else {
                        latestResult = await handler.handleRequest(remainingPath, req, res, handlerState.error);
                    }
                    
                    if (latestResult != 'next') {
                        handlerState.end = true;
                        
                        if (handlerState.error) {
                            handlerState.error = null;
                        }
                        // continue to complete the generator since we won't be needing it anymore;
                        // may not be necessary if the generator just goes out of scope
                        continue;
                    }
                }
                catch(err) {
                    handlerState.error = err;
                    
                    if (latestResult) {
                        latestResult = null;
                    }
                    
                    // stop current chain; delegate to next `catch` handler
                    break;
                }
            }
                
            if (latestResult == 'route') {
                latestResult = 'next';
            }
            else if (latestResult != 'next') {
                latestResult = undefined;
            }
        }
        
        if (handlerState.error) {
            throw handlerState.error;
        }
        
        return latestResult;
    },
    
    __getMatchingHandlers: function *__getMatchingHandlers(this: __InternalRoute, state) {
        for (const [ method, ...handlers ] of this.handlers) {
            if (state.end) {
                // `return`ing inside of a genrator function just completes it; no value is passed back
                return;
            }
            if (
                (state.error && method == 'ERROR') ||
                (!state.error && (method == 'ALL' || method == state.req.method))
            ) {
                yield handlers;
            }
        }
    } as __InternalRoute['__getMatchingHandlers'],
};

function removeMatchedPathPortion(currentPath: PathString, matcher: PathMatcher): PathString {
    if (matcher instanceof RegExp) {
        const [ matched ] = matcher.exec(currentPath);
        
        // TODO: figure out how to handle that case...
        throw TypeError(`presented with a problem: current implementation doesn't support RegEx path matchers reducing the remaining path...  For now, the matched path portion was "${matched}"`);
    }
    else if (Array.isArray(matcher)) {
        for (const pathMatcher of matcher) {
            if (getRouteParams(currentPath, pathMatcher)) {
                return removeMatchedPathPortion(currentPath, pathMatcher);
            }
        }
    }
    else {
        const pathPortions = currentPath.split('/').filter(Boolean);
        const matcherPortions = matcher.split('/').filter(Boolean);
        const params = getRouteParams(currentPath, matcher) as ParamsDictionary;
        let pathLength = 0;
        
        for (let i = 0; i < matcherPortions.length; i++) {
            const pathPortion = pathPortions[i];
            const matcherPortion = matcherPortions[i];
            if (matcherPortion.startsWith(':')) {
                const unprefixedPortion = matcherPortion.slice(1);
                pathLength += 1 + params[unprefixedPortion].length;
            }
            else if (matcherPortion == pathPortion) {
                pathLength += 1 + matcherPortion.length;
            }
            else {
                // the matching portion has reached its limit
                break;
            }
        }
        
        return currentPath.slice(pathLength) as PathString;
    }
}

/** @protected exported type; should not be imported outside of this package */
export interface __InternalRouter extends Router {
    handleRequest(remainingPath: PathString, req: Request, res: Response, err?: unknown): Promise<void | 'next'>;
    __getMatchingRoute(state: __RouterState): Generator<__InternalRoute>;
    routes: __InternalRoute[];
    __addRoute(method: HandlerHttpMethods | null, path: PathMatcher, ...handlers: (RequestHandler | ErrorHandler | Router)[]): __InternalRoute;
}

export interface Router {
    component: 'router';
    get(path: PathMatcher, ...handlers: RequestHandler[]): this;
    post(path: PathMatcher, ...handlers: RequestHandler[]): this;
    put(path: PathMatcher, ...handlers: RequestHandler[]): this;
    patch(path: PathMatcher, ...handlers: RequestHandler[]): this;
    delete(path: PathMatcher, ...handlers: RequestHandler[]): this;
    options(path: PathMatcher, ...handlers: RequestHandler[]): this;
    head(path: PathMatcher, ...handlers: RequestHandler[]): this;
    all(path: PathMatcher, ...handlers: RequestHandler[]): this;
    use(path: PathMatcher, ...handlers: (RequestHandler | Router)[]): this;
    use(...handlers: (RequestHandler | Router)[]): this;
    route(path: PathMatcher): Route;
    catch(path: PathMatcher, ...handlers: ErrorHandler[]): this;
    catch(...handlers: ErrorHandler[]): this;
}

/** @protected exported type; should not be imported outside of this package */
export interface __InternalRoute extends Route {
    handleRequest(remainingPath: string, req: Request, res: Response, err?: unknown): Promise<void | 'next'>;
    __getMatchingHandlers(this: __InternalRoute, state: __RouteHandlerState): Generator<(RequestHandler | ErrorHandler | __InternalRouter)[]>;
    handlers: [ method: HandlerHttpMethods, ...handlers: (RequestHandler | ErrorHandler | Router)[] ][];
    pathMatcher: PathMatcher;
}

type HandlerHttpMethods = SupportedHttpMethods | 'ALL' | 'ERROR';

interface __RouterState {
    error?: unknown;
    path: PathString;
    req: Request;
    end?: boolean;
}

interface __RouteHandlerState {
    error?: unknown;
    req: Request;
    end?: boolean;
}

interface Route {
    component: 'route';
    get(...handlers: RequestHandler[]): this;
    post(...handlers: RequestHandler[]): this;
    put(...handlers: RequestHandler[]): this;
    patch(...handlers: RequestHandler[]): this;
    delete(...handlers: RequestHandler[]): this;
    options(...handlers: RequestHandler[]): this;
    head(...handlers: RequestHandler[]): this;
    all(...handlers: RequestHandler[]): this;
    catch(...handlers: ErrorHandler[]): this;
}

/**
 * A regular route handler or middleware function
 */
interface RequestHandler {
    (req: Request, res: Response): void | 'next' | 'route' | Promise<void | 'next' | 'route'>;
}

/**
 * An error route handler or middleware function.  Three parameters are required; any less and it's considered a regular route handler
 */
interface ErrorHandler<ErrorType = unknown> {
    (err: ErrorType, req: Request, res: Response): void | 'next' | Promise<void | 'next'>;
}

export type SupportedHttpMethods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';


