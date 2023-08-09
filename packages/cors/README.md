# `@fluvial/cors`

Middleware for Cross-Origin-Resource-Sharing (CORS) headers.  CORS explains to the browser what is and is not allowed in HTTP requests.  This includes loading assets (such as JavaScript, CSS, and images) and API calls.  These CORS policies are often provided in response to preflight requests the browser sends prior to 

CORS-related headers include the following:
- `Access-Control-Allow-Origin`, which governs what origins the server will accept
- `Access-Control-Allow-Credentials`, which allows or denies JavaScript to access the credentials-related parts of the response
- `Access-Control-Allow-Methods`, which specifies what HTTP methods are permitted (e.g., GET, POST, etc.)
- `Access-Control-Allow-Headers`, which specifies what headers are permitted
- `Access-Control-Max-Age`, which tells the browser how long the results of preflight requests are cached
- `Access-Control-Expose-Headers`, which tells the browser what headers are permitted to be accessed by JavaScript

More documentation about CORS can be found on MDN:
- CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- CORS glossary and headers: https://developer.mozilla.org/en-US/docs/Glossary/CORS

# Basic usage

```ts
// in a router or application file
import { cors } from '@fluvial/cors';

app.use(cors());
```

# API documentation

## `cors(options?: CorsOptions)`

Allows you to configure the way the CORS middleware behaves and what it includes in its headers.

Arguments:
- `options` (optional) - `CorsOptions`, which includes the following properties:
  - `continuePreflight` (optional) - `boolean`, which indicates if you want the CORS middleware to not short-circuit in the case of a preflight request; default is `false`
  - `continueOnFailure` (optional) - `boolean`, which indicates if requests that fail the CORS checks will continue past the CORS middleware; default is `false`
  - `preflightStatusCode` (optional) - `number`, which is the status code that returned preflight requests should have; default is `204`
  - `failureStatusCode` (optional) - `number`, which is the status code that failed requests are given; default is `405` for invalid/disallowed methods and `406` for anything else
  - `allowedOrigins` (optional) - `string[]`, which contains all of the origins that are allowed; default is `[ '*' ]`
  - `credentialsAllowed` (optional) - `boolean`, which controls the `Access-Control-Allow-Credentials` header; default is `true`
  - `allowedMethods` (optional) - `string[]` containing the methods that are allowed; default includes `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`
  - `allowedHeaders` (optional) - `string[]` specifying the header names allowed; defaults to the headers in the current request
  - `maxAge` (optional) - `number` representing the number of seconds that the CORS options are cached in the request
  - `exposedHeaders` (optional) - `string[]`, which contains the headers that are allowed to be exposed to the code running on the page; defaults to all headers allowed

Returns a middleware function that can be `use`d in an Application or Router.

# Contributing

See something you want this middleware to do?  Find a bug?  Feel free to open an issue or a PR with the fix or feature you want to add.

