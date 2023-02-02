import type { NextFunction } from 'express';

export function expressShim(originalMiddleware: (errOrReq: any, reqOrRes: any, resOrNext: any, maybeNext: NextFunction) => void) {
    // error-handling middleware
    if (originalMiddleware.length > 3) {
        
    }
    // regular middleware
    else {
        
    }
}
