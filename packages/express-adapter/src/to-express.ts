import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { Router } from 'fluvial';

type FluvialRouteHandler = Parameters<Router['get']>[1];
type FluvialErrorHandler = Parameters<Router['catch']>[1];

export function toExpress(preparedMiddleware: FluvialRouteHandler | FluvialErrorHandler) {
    // this is an error handler
    if (preparedMiddleware.length == 3) {
        return async (err: any, req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
            const { req: request, res: response } = wrapForExpress(req, res);
            
            try {
                const result = await preparedMiddleware(err, request as any, response as any);
                
                if (result == 'next') {
                    next();
                }
                else if (result == 'route') {
                    next('route');
                }
            }
            catch (e) {
                next(e);
            }
        };
    }
    
    return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
        const { req: request, res: response } = wrapForExpress(req, res);
        
        try {
            const result = await (preparedMiddleware as FluvialRouteHandler)(request as any, response as any);
            
            if (result == 'next') {
                next();
            }
            else if (result == 'route') {
                next('route');
            }
        }
        catch (e) {
            next(e);
        }
    };
}

function wrapForExpress(req: ExpressRequest, res: ExpressResponse) {
    const responseHeaders = new Proxy({}, {
        get(target, property: string) {
            return res.getHeader(property) || target[property.toLowerCase()];
        },
        set(target, property: string, value) {
            res.setHeader(property, value);
            target[property.toLowerCase()] = value;
            
            return true;
        },
        ownKeys(target) {
            const headerNames = res.getHeaderNames();
            return headerNames.length ? headerNames : Object.keys(target);
        },
        has(target, property: string) {
            return res.hasHeader(property) ?? property in target;
        },
    });
    
    return {
        req: new Proxy(req, {
            get(target, property) {
                if (property in target) {
                    return target[property];
                }
            },
            set(target, property, value) {
                target[property] = value;
                
                return true;
            },
            has(target, property) {
                return property in target;
            },
            ownKeys(target) {
                return Object.keys(target);
            },
        }),
        res: new Proxy(res, {
            get(target, property) {
                if (property == 'headers') {
                    return responseHeaders;
                }
                
                if (property in target) {
                    return target[property];
                }
            },
            set(target, property, value) {
                target[property] = value;
                
                return true;
            },
            has(target, property) {
                return property in target;
            },
            ownKeys(target) {
                return Object.keys(target);
            },
        }),
    };
}

function getReverseHeaderProxy() {
    
}
