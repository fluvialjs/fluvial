import { CookieCollection, create, fromHeaderValue } from './cookie-collection.js';
import type { Request, Response } from 'fluvial';

/** This is the middleware function to add the `cookies` property to both the request and response objects.  The `cookies` property is a `CookieCollection` object, also available from this module */
export function cookies(options: CookieInitMiddlewareOptions = {}) {
	return async (req: Request, res: Response) => {
		if (req.headers.cookie) {
			req.cookies = fromHeaderValue(req.headers.cookie);
		}
		else if (!options.populateIncomingOnlyIfFound) {
			req.cookies = create();
		}
		
		if (!res.cookies && !options.incomingOnly) {
			res.cookies = create();
		}
		
		if (!options.incomingOnly) {
			if (options.expressMode) {
				// this is needed because express.js does not have a `beforeSend` hook like Fluvial responses do
				// I didn't want the `CookieCollection` to update the headers on a response, as that shouldn't be
				// its concern, so I added an `onChange` hook instead
				res.cookies.onChange(() => {
					// The `res` cast to `any` below is needed because it is actually an Express response object, not a Fluvial one
					if (res.cookies.length == 0) {
						(res as any).setHeader('set-cookie', undefined);
						return;
					}
					
					(res as any).setHeader('set-cookie', Array.from(res.cookies).map(c => c.toString('set-cookie')).join(', '));
				});
			}
			else {
				res.beforeSend(() => {
					for (const cookie of res.cookies) {
						res.rawResponse.appendHeader('set-cookie', cookie.toString('set-cookie'));
					}
				});
			}
		}
		
		return 'next' as const;
	};
}

declare global {
	namespace Fluvial {
		interface BaseRequest {
			cookies?: CookieCollection;
		}
		interface BaseResponse {
			cookies?: CookieCollection;
		}
	}
}

export interface CookieInitMiddlewareOptions {
	/** This skips creating the `cookies` object on the response */
	incomingOnly?: boolean;
	/** This only creates a `cookies` object on the request if a cookie header is found */
	populateIncomingOnlyIfFound?: boolean;
	/** This enables compatibility with express.js servers, as they do not allow for the `beforeSend` behavior like Fluvial responses do; as such, this updates the `set-cookie` header(s) every time a change to the cookie collection is made instead of once, right before it's sent */
	expressMode?: boolean;
}
