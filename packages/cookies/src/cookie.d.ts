import { CookieCollection } from './cookie-collection.js';
import 'fluvial';

export type SupportedCookieValues = boolean | number | string;
export type SupportedCookieInit = SupportedCookieValues | Partial<Cookie>;

/**
 * A representation of a cookie document, used for both requests and responses
 * 
 * When it originates from a request, it will only include `name` and `value`, as the configuration is not sent in requests and should only be used in a read-only manner.
 */
export interface Cookie {
	/** The name of the cookie */
	name: string;
	/** The value of the cookie; it can be any primitive when being assigned, but if the cookie was parsed, it will be a string */
	value: SupportedCookieValues;
	/** The domain for which the cookie should be used; subdomains are included */
	domain?: string;
	/** Whether the cookie is visible to the JavaScript of the page or not */
	httpOnly?: boolean;
	/** Whether the cookie should be sent only over https or not */
	secure?: boolean;
	/**
	 * If the cookie should be sent to only the same site that set the cookie
	 * 
	 * Possible values are:
	 * - `Strict` (which means it will only be sent within the same site which matches the origin where this cookie was set)
	 * - `Lax` (which is more lenient on what scenarios it is used; some browsers use this as the default if not set)
	 * - `None` (which means it may be sent for every request on the site, even to domains not matching the request where this cookie was set)
	 */
	sameSite?: 'Lax' | 'Strict' | 'None';
	/** This is the number of seconds for which this cookie should live; if set to zero, that means it should expire the cookie immediately; if this is set and `expires`, this takes precedence */
	maxAge?: number;
	/** The date and time at which the cookie should expire */
	expires?: Date;
	/** The path which should match in order for the cookie to be sent; it is not safe from being read by the JavaScript on the page */
	path?: string;
	/** Whether the cookie should be partitioned or not; for further understanding search for "partitioned cookie" or "CHIPS" */
	partitioned?: boolean;
}

declare global {
	namespace Fluvial {
		interface BaseRequest {
			/** cookies as parsed from the request headers; all values on each cookie will be strings and no configuration will be filled out as only names and values are provided on requests */
			cookies?: CookieCollection;
		}
		
		interface BaseResponse {
			/** these cookies are new ones put into the response headers as `Set-Cookie` headers */
			cookies?: CookieCollection;
		}
	}
}
