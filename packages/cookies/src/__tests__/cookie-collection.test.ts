import { describe, test } from 'node:test';
import { AssertionError, equal } from 'node:assert';
import { create, fromObject, fromHeaderValue, fromEntries } from '../cookie-collection.js';

describe('Cookie Collection', () => {
	describe('create through any means', () => {
		test('`create()` creates an empty cookie collection object', () => {
			const cookies = create();
			
			equal(typeof cookies, 'object');
			equal(typeof cookies.has, 'function');
			equal(typeof cookies.get, 'function');
			equal(typeof cookies.add, 'function');
			equal(typeof cookies.remove, 'function');
			equal(typeof cookies.entries, 'function');
			equal(typeof cookies.keys, 'function');
			equal(typeof cookies.values, 'function');
			equal(typeof cookies.length, 'number');
			equal(cookies.length, 0);
		});
		
		test('`fromObject()` creates a cookie collection from an object with either strings or Cookie-like objects as values', () => {
			const cookies = fromObject({
				foo: 'bar',
				baz: { value: 'quux', secure: true },
			});
			
			equal(cookies.length, 2);
			equal(cookies.has('foo'), true, `expected cookie with name "foo" to be present`);
			equal(cookies.get('foo')?.value, 'bar');
			equal(cookies.get('foo').secure, undefined);
			equal(cookies.has('baz'), true, `expected cookie with name "baz" to be present`);
			equal(cookies.get('baz')?.value, 'quux');
			equal(cookies.get('baz').secure, true);
			equal(cookies.has('blah'), false, `expected cookie to not have the name "blah" to be present`);
		});
		
		test('`fromHeaderValue()` creates a cookie collection from a cookie header string', () => {
			const cookies = fromHeaderValue('foo=bar; baz=quux');
			
			equal(cookies.length, 2);
			equal(cookies.get('foo')?.value, 'bar');
			equal(cookies.get('baz')?.value, 'quux');
		});
		
		test('`fromEntries()` creates a cookie collection from an array of entries of any of key-value pairs (where the value is either a relevant value or a Cookie-like object) or a Cookie object', () => {
			const cookies = fromEntries([
				[ 'foo', 'bar' ],
				[ 'baz', { value: 'quux', secure: true } ],
				{ name: 'blah', value: 'yo', sameSite: 'Strict' },
			]);
			
			equal(cookies.length, 3);
			equal(cookies.get('foo')?.value, 'bar');
			equal(cookies.get('foo').secure, undefined);
			equal(cookies.get('baz')?.value, 'quux');
			equal(cookies.get('baz').secure, true);
			equal(cookies.get('blah')?.value, 'yo');
			equal(cookies.get('blah').sameSite, 'Strict');
		});
	});
	
	describe('manipulate values in the collection', () => {
		test('`add` inserts a new cookie in one of each supported way', () => {
			let cookies = create();
			
			// primitives
			cookies.add('foo', 'blah');
			cookies.add('bar', true);
			cookies.add('baz', 42);
			
			equal(cookies.length, 3);
			equal(cookies.get('foo')?.value, 'blah');
			equal(cookies.get('bar')?.value, true);
			equal(cookies.get('baz')?.value, 42);
			
			cookies = create();
			
			// objects
			cookies.add({ name: 'qux', value: 'blah', secure: true });
			cookies.add({ name: 'quux', value: 'blah', httpOnly: true });
			cookies.add({ name: 'corge', value: 'blah', sameSite: 'Strict' });
			
			equal(cookies.length, 3);
			equal(cookies.get('qux')?.value, 'blah');
			equal(cookies.get('qux')?.secure, true);
			equal(cookies.get('quux')?.value, 'blah');
			equal(cookies.get('quux')?.httpOnly, true);
			equal(cookies.get('corge')?.value, 'blah');
			equal(cookies.get('corge')?.sameSite, 'Strict');
		});
		
		test('`remove` removes the specified cookie', () => {
			const cookies = create();
			
			cookies.add('foo', 'bar');
			cookies.add('baz', 'quux');
			
			equal(cookies.length, 2);
			
			cookies.remove('foo');
			
			equal(cookies.length, 1);
			equal(cookies.get('foo'), undefined);
			equal(cookies.get('baz')?.value, 'quux');
		});
	});
	
	describe('iteration through each method works as expected', () => {
		test('`keys()` results in an iterator that goes through each cookie', () => {
			const cookies = create();
			cookies.add('foo', 'bar');
			cookies.add('baz', 'quux');
			
			let total = 0;
			
			for (const key of cookies.keys()) {
				total++;
				
				if (![ 'foo', 'baz' ].includes(key)) {
					throw new AssertionError({
						message: `Unknown key "${key}" found while iterating through the cookie collection`,
						expected: [ 'foo', 'baz' ],
						actual: key,
						operator: '==',
					});
				}
			}
			
			equal(total, 2);
		});
		
		test('`values()` results in an iterator that goes through each cookie', () => {
			const cookies = create();
			cookies.add('foo', 'bar');
			cookies.add('baz', 'quux');
			
			let total = 0;
			
			for (const value of cookies.values()) {
				total++;
				
				if (![ 'bar', 'quux' ].includes(value.value as string)) {
					throw new AssertionError({
						message: `Unknown value "${value.value}" found while iterating through the cookie collection`,
						expected: [ 'bar', 'quux' ],
						actual: value.value,
						operator: '==',
					});
				}
			}
			
			equal(total, 2);
		});
		
		test('`entries()` results in an iterator that goes through each cookie', () => {
			const cookies = create();
			cookies.add({
				name: 'foo',
				value: 'bar',
				partitioned: true,
			});
			cookies.add({
				name: 'baz',
				value: 'quux',
				path: '/api',
			});
			
			let total = 0;
			
			for (const [key, cookie] of cookies.entries()) {
				total++;
				
				if (key == 'foo') {
					equal(cookie.value, 'bar', `entry with key of "${key}" doesn't have the expected value of "bar"; instead found "${cookie.value}"`);
					equal(cookie.partitioned, true);
				}
				else if (key == 'baz') {
					equal(cookie.value, 'quux', `entry with key of "${key}" doesn't have the expected value of "quux"; instead found "${cookie.value}"`);
					equal(cookie.path, '/api');
				}
			}
			
			equal(total, 2);
		});
		
		test('iterating over the collection with a for...of loop will result in each of the cookies added to the collection', () => {
			const cookies = create();
			cookies.add({
				name: 'foo',
				value: 'bar',
				partitioned: true,
			});
			cookies.add({
				name: 'baz',
				value: 'quux',
				path: '/api',
			});
			
			let total = 0;
			
			for (const cookie of cookies) {
				total++;
				
				if (cookie.name == 'foo') {
					equal(cookie.value, 'bar', `entry with the name of "${cookie.name}" doesn't have the expected value of "bar"; instead found "${cookie.value}"`);
					equal(cookie.partitioned, true);
				}
				else if (cookie.name == 'baz') {
					equal(cookie.value, 'quux', `entry with the name of "${cookie.name}" doesn't have the expected value of "quux"; instead found "${cookie.value}"`);
					equal(cookie.path, '/api');
				}
			}
			
			equal(total, 2);
		});
	});
	
	describe('stringify', () => {
		test('stringifies cookie collection as cookie header', () => {
			const cookies = create();
			cookies.add({ name: 'foo', value: 'bar', secure: true });
			cookies.add({ name: 'baz', value: 'qux', maxAge: 1000 });
			
			const result = cookies.toString('cookie-header').split(/; ?/);
			
			equal(result.length, 2);
			
			for (const pair of result) {
				if (pair.startsWith('foo')) {
					equal(pair, 'foo=bar');
				}
				else {
					equal(pair, 'baz=qux');
				}
			}
		});
		
		test('stringifies cookie collection as set-cookie', () => {
			const firstCookies = create();
			firstCookies.add({
				name: 'foo',
				value: 'bar',
				secure: true,
				httpOnly: true,
				partitioned: true,
				domain: 'example.com',
			});
			firstCookies.add({
				name: 'baz',
				value: 'qux',
				maxAge: 3500,
				// this is done as a UTC date because stringifying the cookies put it as GMT/UTC instead of local time, so this is to ensure consistent tests
				expires: new Date(Date.UTC(2025, 0, 1)),
				sameSite: 'Strict',
				path: '/api',
			});
			
			const result = firstCookies.toString('set-cookie');
			const expectedCookies = result.split('\r\n')
				.filter(Boolean)
				.map(cookieLine =>
					cookieLine.slice(cookieLine.indexOf(': ') + 2)
						.split('; ')
						.map(segment => segment.includes('=') ?
							[ segment.slice(0, segment.indexOf('=')), segment.slice(segment.indexOf('=') + 1) ] :
							[ segment ]));
			
			equal(expectedCookies.length, 2);
			
			// this was at first separated by assumed order, but since it is not guaranteed that keys and values are in the same order as added, it is going to be better to just iterate through
			for (const cookiePairs of expectedCookies) {
				let name = cookiePairs[0][0];
				for (const [ key, value ] of cookiePairs) {
					if (name == 'foo') {
						switch (key) {
							case 'foo': equal(value, 'bar'); break;
							case 'Secure':
							case 'HttpOnly':
							case 'Partitioned':
								equal(value, null);
								break;
							case 'Domain': equal(value, 'example.com'); break;
							
							default:
								throw new AssertionError({
									message: `Encountered an unexpected key-value pair for the cookie "${name}": ${key}=${value}`,
									expected: [ 'foo', 'Secure', 'HttpOnly', 'Partitioned', 'Domain' ],
									actual: value,
									operator: '==',
								});
						}
					}
					else if (name == 'bar') {
						switch (key) {
							case 'baz': equal(value, 'quux'); break;
							case 'Max-Age': equal(value, '3500'); break;
							case 'Expires': equal(value, 'Wed, 01 Jan 2025 00:00:00 GMT'); break;
							case 'SameSite': equal(value, 'Strict'); break;
							case 'Path': equal(value, '/api'); break;
							
							default:
								throw new AssertionError({
									message: `Encountered an unexpected key-value pair for the cookie "${name}": ${key}=${value}`,
									expected: [ 'baz', 'Max-Age', 'Expires', 'SameSite', 'Path' ],
									actual: value,
									operator: '==',
								});
						}
					}
				}
				
				if (name == 'foo' && !['foo', 'Secure', 'HttpOnly', 'Partitioned', 'Domain'].every((k) => cookiePairs.some(([ k2 ]) => k == k2))) {
					throw new AssertionError({
						message: `Cookie "${name}" is missing one or more expected key-value pairs`,
						expected: [ 'foo', 'Secure', 'HttpOnly', 'Partitioned', 'Domain' ],
						actual: cookiePairs.map(([ k ]) => k),
						operator: '==',
					});
				}
				
				if (name == 'baz' && !['baz', 'Max-Age', 'Expires', 'SameSite', 'Path'].every((k) => cookiePairs.some(([ k2 ]) => k == k2))) {
					throw new AssertionError({
						message: `Cookie "${name}" is missing one or more expected key-value pairs`,
						expected: [ 'baz', 'Max-Age', 'Expires', 'SameSite', 'Path' ],
						actual: cookiePairs.map(([ k ]) => k),
						operator: '==',
					});
				}
			}
		});
	});
});
