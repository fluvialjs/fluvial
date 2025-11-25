import { describe, test } from 'node:test';
import { deepEqual, equal } from 'node:assert';
import { parse } from '../parse.js';

describe('parse (cookies)', () => {
	test('should parse a cookie string into an object', () => {
		const cookieString = 'name=value; name2=value2';
		const expected = {
			name: {
				name: 'name',
				value: 'value',
			},
			name2: {
				name: 'name2',
				value: 'value2'
			},
		};
		deepEqual(parse(cookieString), expected);
	});
});
