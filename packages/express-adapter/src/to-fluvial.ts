import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { Request as FluvialRequest, Response as FluvialResponse } from 'fluvial';

export function toFluvial(preparedMiddleware: (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => void): (req: FluvialRequest, res: FluvialResponse) => Promise<'next' | 'route' | void>;
export function toFluvial(preparedErrorMiddleware: (err: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction) => void): (err: any, req: FluvialRequest, res: FluvialResponse) => Promise<'next' | 'route' | void>;
export function toFluvial(preparedMiddleware: ExpressRouteMiddleware) {
    // this is an error handler
    if (preparedMiddleware.length == 4) {
        return (err: any, req: FluvialRequest, res: FluvialResponse) => new Promise<'next' | 'route' | void>(async (resolve, reject) => {
            const { req: request, res: response, nextFunction } = wrapForFluvial(req, res, resolve, reject);
            
            try {
                preparedMiddleware(err, request as any, response as any, nextFunction);
            }
            catch (e) {
                reject(e);
            }
        });
    }
    
    return (req: FluvialRequest, res: FluvialResponse) => new Promise<'next' | 'route' | void>(async (resolve, reject) => {
        const { req: request, res: response, nextFunction } = wrapForFluvial(req, res, resolve, reject);
        
        try {
            preparedMiddleware(request as any, response as any, nextFunction);
        }
        catch (e) {
            reject(e);
        }
    });
}

function wrapForFluvial(
    req: FluvialRequest,
    res: FluvialResponse,
    resolve: (value: 'next' | 'route' | void) => void,
    reject: (err?: any) => void,
) {
    const proxiedMethods = {
        req: {},
        res: {},
        rawRequest: {},
        rawResponse: {},
    };
    return {
        req: new Proxy(req, {
            get(target, property, receiver) {
                if (property == 'body') {
                    return target.payload || {};
                }
                if (property == 'url' || property == 'originalUrl') {
                    return target.path;
                }
                
                if (property in target) {
                    if (property in proxiedMethods.req) {
                        return proxiedMethods.req[property];
                    }
                    
                    // the intent is not to continue the request
                    if (property == 'end' || property == 'send' || property == 'json') {
                        return proxiedMethods.req[property] = new Proxy(target[property], {
                            get(fnTarget, prop, receiver) {
                                return fnTarget[prop];
                            },
                            set(fnTarget, prop, val, receiver) {
                                fnTarget[prop] = val;
                                
                                return true;
                            },
                            apply(fnTarget, thisArg, argArray) {
                                resolve();
                                return fnTarget.apply(target, argArray);
                            },
                        });
                    }
                    
                    if (typeof target[property] == 'function') {
                        return target[property].bind(target);
                    }
                    
                    return target[property];
                }
                
                if (property in target.rawRequest) {
                    if (property in proxiedMethods.rawRequest) {
                        return proxiedMethods.rawRequest[property];
                    }
                    
                    // the intent is not to continue the request
                    if (property == 'end' || property == 'send' || property == 'json') {
                        return proxiedMethods.rawRequest[property] = new Proxy(target[property], {
                            get(fnTarget, prop, receiver) {
                                return fnTarget[prop];
                            },
                            set(fnTarget, prop, val, receiver) {
                                fnTarget[prop] = val;
                                
                                return true;
                            },
                            apply(fnTarget, thisArg, argArray) {
                                resolve();
                                return fnTarget.apply(target, argArray);
                            },
                        });
                    }
                    
                    if (typeof target.rawRequest[property] == 'function') {
                        return target.rawRequest[property].bind(target.rawRequest);
                    }
                    
                    return target.rawRequest[property];
                }
            },
            set(target, property, value, receiver) {
                if (property == 'body') {
                    // @ts-expect-error
                    target.payload = value;
                }
                
                target[property] = value;
                target.rawRequest[property] = value;
                
                return true;
            },
            has(target, property) {
                return property in target || property in target.rawRequest;
            },
            ownKeys(target) {
                return Array.from(new Set([
                    ...Object.keys(target),
                    ...Object.keys(target.rawRequest),
                ]));
            },
        }),
        res: new Proxy<ExpressResponse & FluvialResponse>(res as FluvialResponse & ExpressResponse, {
            get(target, property, receiver) {
                if (property in target) {
                    if (property in proxiedMethods.res) {
                        return proxiedMethods.res[property];
                    }
                    
                    // the intent is not to continue the request
                    if (property == 'end' || property == 'send' || property == 'json') {
                        return proxiedMethods.res[property] = new Proxy(target[property], {
                            get(fnTarget, prop, receiver) {
                                return fnTarget[prop];
                            },
                            set(fnTarget, prop, val, receiver) {
                                fnTarget[prop] = val;
                                
                                return true;
                            },
                            apply(fnTarget, thisArg, argArray) {
                                resolve();
                                return fnTarget.apply(target, argArray);
                            },
                        });
                    }
                    
                    if (typeof target[property] == 'function') {
                        return target[property].bind(target);
                    }
                    
                    return target[property];
                }
                
                if (property in target.rawResponse) {
                    if (property in proxiedMethods.rawResponse) {
                        return proxiedMethods.rawResponse[property];
                    }
                    
                    // the intent is not to continue the request
                    if (property == 'end' || property == 'send' || property == 'json') {
                        return proxiedMethods.rawResponse[property] = new Proxy(target.rawResponse[property], {
                            get(fnTarget, prop, receiver) {
                                return fnTarget[prop];
                            },
                            set(fnTarget, prop, val, receiver) {
                                fnTarget[prop] = val;
                                
                                return true;
                            },
                            apply(fnTarget, thisArg, argArray) {
                                resolve();
                                return fnTarget.apply(target, argArray);
                            },
                        });
                    }
                    
                    if (typeof target.rawResponse[property] == 'function') {
                        return target.rawResponse[property].bind(target.rawResponse);
                    }
                    
                    return target.rawResponse[property];
                }
                
                console.log('Response:', property);
            },
            set(target, property, value, receiver) {
                target[property] = value;
                target.rawResponse[property] = value;
                
                return true;
            },
            has(target, property) {
                return property in target || property in target.rawResponse;
            },
            ownKeys(target) {
                return Array.from(new Set([
                    ...Object.keys(target),
                    ...Object.keys(target.rawResponse),
                ]));
            },
        }),
        nextFunction(err?: any) {
            if (err == 'route') {
                resolve('route');
            }
            else if (err) {
                reject(err);
            }
            else {
                resolve('next');
            }
        },
    };
}

interface ExpressRouteMiddleware {
    (req: ExpressRequest, res: ExpressResponse, next?: NextFunction): void,
    (err: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction): void;
}
