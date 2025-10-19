import { create, fromHeaderValue } from './cookie-collection.js';
import type { Request, Response } from 'fluvial';

export function cookieInitMiddleware(options: CookieInitMiddlewareOptions = {}) {
	return async (req: Request, res: Response) => {
		if (req.headers.cookie) {
			req.cookies = fromHeaderValue(req.headers.cookie);
		}
		else {
			req.cookies = create();
		}
		
		if (!res.cookies) {
			res.cookies = create();
		}
	};
}

export interface CookieInitMiddlewareOptions {
	
}
