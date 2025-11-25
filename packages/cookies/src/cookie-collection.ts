import { Cookie, SupportedCookieInit, SupportedCookieValues } from './cookie.js';
import { parse } from './parse.js';

/**
 * Creates an empty CookieCollection
 */
export function create() {
	return new CookieCollection() as CookieCollection;
}

/**
 * Creates a CookieCollection based on a string value from the `Cookie` header
 * @param cookieHeader 
 */
export function fromHeaderValue(cookieHeader: string) {
	return fromObject(parse(cookieHeader));
}

/**
 * Creates a CookieCollection based on an object with keys and values
 * @param obj 
 * @returns 
 */
export function fromObject(obj: { [key: string]: SupportedCookieInit }) {
	return fromEntries(Object.entries(obj));
}

export function fromEntries(entries: ([name: string, value: SupportedCookieInit] | Cookie)[]) {
	const cookies = create();
	
	for (const entry of entries) {
		let cookieObj: Cookie;
		if (Array.isArray(entry)) {
			const [ name, value ] = entry;
			cookieObj = (typeof value == 'object' && value ?
				{ name, ...value } :
				{ name, value }) as Cookie;
		}
		else if (typeof entry == 'object' && 'name' in entry && 'value' in entry) {
			cookieObj = entry;
			
			ensureCookieStringifies(cookieObj);
		}
		
		if (!cookieObj) {
			// TODO: do something better with this than simply logging it out
			console.warn(`Invalid cookie entry:`, entry);
			continue;
		}
		
		cookies.add(cookieObj);
	}
	
	return cookies;
}

export class CookieCollection {
	#onChangeHooks: (() => void)[] = [];
	#cookies: { [key: string]: Cookie } = {};
	
	/** The current length of the collection */
	get length() {
		return Object.keys(this.#cookies).length;
	}
	
	/** Returns a true if the collection contains the cookie with the given name */
	has(name: string) {
		return Boolean(this.#cookies[name]);
	}
	
	/** Adds a cookie-like object to the collection */
	add(cookie: Cookie): void;
	/** Adds a cookie with a given name and the provided value (string, number, or boolean) */
	add(name: string, value: SupportedCookieValues): void;
	add(cookie: Cookie | string, value?: SupportedCookieValues) {
		if (typeof cookie == 'string') {
			cookie = {
				name: cookie,
				value,
			};
		}
		if (!cookie || typeof cookie != 'object' || !cookie.name || !cookie.value) {
			// TODO: replace this with something better
			console.log(`Invalid cookie entry:`, cookie);
			return;
		}
		
		ensureCookieStringifies(cookie);
		
		this.#cookies[cookie.name] = cookie;
		
		for (const hook of this.#onChangeHooks) {
			hook();
		}
	}
	
	/** Returns in a cookie if one is found with the provided name; otherwise, undefined */
	get(name: string) {
		return this.#cookies[name];
	}
	
	/** Deletes a cookie with the given name if it exists; if none is found, it does nothing */
	remove(name: string) {
		const found = name in this.#cookies
		
		delete this.#cookies[name];
		
		if  (found) {
			for (const hook of this.#onChangeHooks) {
				hook();
			}
		}
	}
	
	/** This registers a hook for when a cookie is set or removed.  It was added since the Express adaptation requires the cookie headers set each time there is a mutation or else it won't work */
	onChange(this: CookieCollection, hook: () => void) {
		this.#onChangeHooks.push(hook);
	}
	
	/** Returns the generic object-stringified string or, if specified, a string representative of the collection */
	toString(this: CookieCollection, as?: 'cookie-header' | 'set-cookie') {
		if (!as || ![ 'cookie-header', 'set-cookie' ].includes(as)) {
			return `[object ${CookieCollection.name}]`;
		}
		
		let result = '';
		
		for (const cookie of Object.values(this.#cookies)) {
			if (as == 'cookie-header') {
				if (result) {
					result += ';';
				}
				
				result += cookie.toString('key-value');
			}
			else {
				result += `Set-Cookie: ${cookie.toString('set-cookie')}\r\n`;
			}
		}
		
		return result;
	}
	
	/** Returns an iterable for all cookies in the collection */
	values() {
		return (Object.values(this.#cookies) as Cookie[]).values();
	}
	
	/** Returns an iterable with the key-value pairs of the name itself and the full cookie */
	entries() {
		return (Object.entries(this.#cookies) as [key: string, cookie: Cookie][]).values();
	}
	
	/** Returns an iterable with the name of each cookie in the collection */
	keys() {
		return (Object.keys(this.#cookies) as string[]).values();
	}
	
	[Symbol.iterator]() {
		return (Object.values(this.#cookies) as Cookie[]).values();
	}
	
	static create = create;
	static fromHeaderValue = fromHeaderValue;
	static fromObject = fromObject;
	static fromEntries = fromEntries;
}

const setCookieKeyMap = {
	domain: 'Domain',
	expires: 'Expires',
	path: 'Path',
	secure: 'Secure',
	sameSite: 'SameSite',
	httpOnly: 'HttpOnly',
	partitioned: 'Partitioned',
	maxAge: 'Max-Age',
};
const months = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];
const daysOfWeek = [
	'Sun',
	'Mon',
	'Tue',
	'Wed',
	'Thu',
	'Fri',
	'Sat',
];

/** this ensures that it has the correct `toString` method instead of the default */
function ensureCookieStringifies(cookie: Partial<Cookie>) {
	if (cookie.toString.length != 1) {
		Reflect.defineProperty(cookie, 'toString', {
			enumerable: false,
			configurable: false,
			value: function (this: Cookie, type?: 'set-cookie' | 'key-value') {
				let result = `[object Cookie]`;
				
				if (type) {
					result = `${this.name}=${this.value}`;
				}
				
				if (type === 'set-cookie') {
					for (const [ key, value ] of Object.entries(this)) {
						if (key == 'name' || key == 'value' || !(key in setCookieKeyMap)) continue;
						
						if ((key == 'partitioned' || key == 'httpOnly' || key == 'secure') && !value) {
							continue;
						}
						
						result += `; ${setCookieKeyMap[key]}`;
						
						if (key == 'partitioned' || key == 'httpOnly' || key == 'secure') {
							continue;
						}
						
						result += '=';
						
						if (key == 'expires') {
							const date = value as Date;
							result += `${daysOfWeek[date.getUTCDay()]}, ${String(date.getUTCDate()).padStart(2, '0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')} GMT`;
						}
						else {
							result += value;
						}
					}
				}
				
				return result;
			},
		});
	}
}

export default CookieCollection;
