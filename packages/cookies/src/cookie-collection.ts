import { Cookie, SupportedCookieInit, SupportedCookieValues } from './cookie.js';
import { parse } from './parse.js';

/**
 * Creates an empty CookieCollection
 */
export function create() {
	return Object.create(CookieCollectionProto) as CookieCollection;
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

const CookieCollectionProto = {
	has(this: CookieCollection, name: string) {
		return Boolean(this[name]);
	},
	add(this: CookieCollection, cookie: Cookie | string, value?: SupportedCookieValues) {
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
		
		this[cookie.name] = cookie;
	},
	get(this: CookieCollection, name: string) {
		return this[name];
	},
	remove(this: CookieCollection, name: string) {
		delete this[name];
	},
	values(this: CookieCollection) {
		return (Object.values(this) as Cookie[]).values();
	},
	entries(this: CookieCollection) {
		return (Object.entries(this) as [key: string, cookie: Cookie][]).values();
	},
	keys(this:  CookieCollection) {
		return (Object.keys(this) as string[]).values();
	},
	[Symbol.iterator](this: CookieCollection) {
		return (Object.values(this) as Cookie[]).values();
	},
	constructor: function CookieCollection() {
		throw new TypeError('This constructor is not callable or "n');
	},
	toString(this: CookieCollection, as?: 'cookie-header' | 'set-cookie') {
		if (!as) {
			return `[object ${this.contructor.name}]`;
		}
		
		let result = '';
		
		for (const cookie of this) {
			if (as == 'cookie-header') {
				if (result) {
					result += ';';
				}
				
				result += `${cookie.name}=${cookie.value}`;
			}
			else {
				result += `Set-Cookie: ${cookie.name}=${cookie.value}`;

				for (const [ key, value ] of Object.entries(cookie)) {
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
				
				result += '\r\n';
			}
		}
		
		return result;
	},
	get length() {
		return Object.keys(this).length;
	},
} as CookieCollectionPrototype;

for (const [ key, value ] of Object.entries(CookieCollectionProto)) {
	let getter = () => value;
	
	if (key == 'length') {
		getter = function(this: CookieCollection) {
			return Object.keys(this).length;
		};
	}
	
	Reflect.defineProperty(CookieCollectionProto, key, {
		get: getter,
		enumerable: false,
		configurable: false,
	});
}

interface CookieCollectionPrototype {
	has(name: string): boolean;
	add(cookie: Cookie): void;
	add(key: string, value: SupportedCookieValues): void;
	get(name: string): Cookie | undefined;
	remove(name: string): void;
	values(): Iterable<Cookie>;
	entries(): Iterable<[ string, Cookie ]>;
	keys(): Iterable<string>;
	[Symbol.iterator](): Iterator<Cookie>;
	readonly length: number;
	constructor: () => void;
	toString(as?: 'cookie-header' | 'set-cookie'): string;
}

export type CookieCollection = CookieCollectionPrototype & {
	[key: string]: Cookie;
};
