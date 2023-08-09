# @fluvial/csp

`Content-Security-Policy` (often shortened to "csp") is a header that can be set to help restrict the sources of content used on a website.  It can help restrict where JavaScript, CSS, images, and other assets can originate, which is necessary to mitigate many attack vectors that focus on injecting something into your website without your knowledge.  A more full overview of CSP can be found on MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP.

This middleware is written based on the CSP portion of the [`helmet`](https://npmjs.com/package/helmet) package.  It isn't a straight-across port, but it keeps to the defaults that `helmet` provides.  It also adds many helpful methods to the `Response` object that can dynamically include SHA256+ hashes and nonces to the CSP header, which makes it easier for compilation tools and server-side rendering solutions to tap into it.

# Basic usage

```ts
// e.g., in a main application file
import { csp } from '@fluvial/csp';

app.use(csp());
```

# API documentation:

## `csp(options?: CspOptions)`

Arguments:
- options (optional) - `CspOptions`, which is an object with the following properties:
  - `directives` (optional) - an object whose keys are either `camelCase` or `kebab-case` csp directives and whose values are an array of strings that are different permitted sources
  - `reportOnly` (optional) - `boolean` for if CSP infractions should be sent in a report to a URL specified in the `Report-To` header (see example here: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-to)

Returns a Fluvial function that adds the CSP header as configured when provided to a Router or Application.

## `Response` methods added

### `res.addNonceToCsp(directiveName: string, nonceValue: string): Response`

Adds a nonce to the specified directive and updates the header.  A "nonce" is an unguessable, unique value that can be used to identify a script as being okay to load.  The value should be generated per request (never the same between requests) so that the nonce cannot be copied and used in the stead of the real script by malicious code running on your website.

Arguments:
- `directiveName` - `string` name of the directive you wish to update (e.g., `'defaultSrc'` or `'default-src'`)
- `nonceValue` - `string` value that is the nonce you wish to use

Returns the same `Response` object that it was called on, which can be useful for chaining.

### `res.addSha256ToCsp(directiveName: string, hashOrBytes: string | Buffer): Response`

Adds a SHA256 hash to the specified directive.

Arguments:
- `directiveName` - `string`
- One of
  - `hash` - `string` containing the pre-generated SHA256 hash
  - `rawBytes` - `Buffer` containing the file's contents for which it will generate the hash

Returns the same `Response` object that it was called on, which can be useful for chaining.

### `res.addSha384ToCsp(directiveName: string, hashOrBytes: string | Buffer): Response`

Adds a SHA384 hash to the specified directive.

Arguments:
- `directiveName` - `string`
- One of
  - `hash` - `string` containing the pre-generated SHA384 hash
  - `rawBytes` - `Buffer` containing the file's contents for which it will generate the hash

Returns the same `Response` object that it was called on, which can be useful for chaining.

### `res.addSha512ToCsp(directiveName: string, hashOrBytes: string | Buffer): Response`

Adds a SHA512 hash to the specified directive.

Arguments:
- `directiveName` - `string`
- One of
  - `hash` - `string` containing the pre-generated SHA512 hash
  - `rawBytes` - `Buffer` containing the file's contents for which it will generate the hash

Returns the same `Response` object that it was called on, which can be useful for chaining.

# Contributing

See something you want this middleware to do?  Find a bug?  Feel free to open an issue or a PR with the fix or feature you want to add.
