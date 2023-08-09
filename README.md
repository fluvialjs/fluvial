# Fluvial

A simple http/2-enabled server framework with an API similar to [Express](https://expressjs.com/)

## Introduction

Fluvial was born from an attempt to understand and use http/2 for static file sharing and wanting a similar request lifecycle as Express for other such requests.  It's as much a learning project as a project that attempts to be production-ready.  If you're familiar with Express, much of the API might seem familiar to you.  However, there are a few key differences you may notice and it will be mentioned below.

Fluvial is compatible with both http/1.x and http/2.  The type of the raw request/response will depend on which http version you're using.

As of the writing of this document, this project is in alpha mode and will need many tweaks and adjustments to make it even more robust and complete prior to a full version (v1).  Feel free to make an issue discussing your need.

These are the current aims of this project:

1. Simple and straightforward API, borrowing ergonomics from language features and other similar libraries
2. Very few dependencies (only when virtually unavoidable)
3. Not too bulky, but not as lean or terse as possible
4. Some helpful tools (such as payload handling) for handling most content
5. Http/1.1-compatibility (which is helped greatly by Node)
6. Eventual Http/3 compatibility once that's more mainstream and Node supports it

## Quick Start

Install fluvial:

```
npm install fluvial
```

And inside your main file:

```js
import { fluvial } from 'fluvial';

// create the main app
const app = fluvial();

// register a route
app.get('/anything', (req, res) => {
    res.send('a response via http/2');
});

// listen to the port of your choice
app.listen(8090, () => {
    console.log('server up and running on port 8090');
});
```

And then you should be good to send a request to the `/anything` route and it will respond with the message you added in the route handler.

As http/2 is preferable over HTTPS (and if the client for your API is a browser), you might need to generate an SSL certificate.  Though there are much better tutorials out there for generating these, you can generate some quickly that can run with:

```sh
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes
```

There is an extended example below in the "Comparisons with Express" section.

## API Documentation

The documentation here is simplified for the scope of the readme.  Type annotations are included which may help with the documentation while developing your application.

### `fluvial(options)`

Call this to create a Fluvial application

Arguments:

- `options`: An optional object with the following optional properties
  - `server`: An already-created `Http2Server` or `Http2SecureServer` as you can get from `http2.createServer` or `http2.createSecureServer` (this might be needed if you have other libraries that handle the raw `Http2Server` instance and also need to provide the same instance to Fluvial)
  - `ssl`: An object to set up and configure a `Http2SecureServer`'s SSL with the following properties
    - `certificate` (the raw string/`Buffer` of the certificate) or `certificatePath` (the path to the certificate file), and
    - `key` (the raw string/`Buffer` of the key) or `keyPath` (the path to the key file)

Return value:
- A fluvial `Application`, which is an object whose properties and methods are described below

### `Application`

The main entrypoint and listener that contains the underlying `Http2Server` instance.  It is itself a `Router` and has all properties and methods as can be found on a router plus those mentioned here:

#### `application.component`

A property that reports the string of `'application'` (for possible use in identifying this Fluvial object)

#### `application.listen(port, cb?)`

A method used to start the server in the case that the server itself wasn't started previously

### `Router()`

A function to create a router for the application.  It is the main way to split up your Fluvial application and a way to register and manage routes.

Each of the following HTTP methods/verbs are available as methods on each router instance.

- `get`
- `post`
- `patch`
- `put`
- `delete`
- `options`
- `head`

Each router method have the same arguments but the handlers provided to them will only be called if the HTTP method and at least one of the provided paths match the requested path.  For example, registering a `get` request handler would look like:

```ts
router.get('/path-matcher', (req, res) => {
    // handle the GET request to /path-matcher
});
```

The arguments for each of these methods are as follows:

- `pathMatcher`: a `string`, `string[]`, or `RegExp` describing a request path it should match, e.g.:
  - `'/some-path'` or `'/some-path-with/:id'`
  - `['/one-path', '/another-path-with/:id']`
  - `/\/a-path|another-path|foo\/described-by\/(?<named>param)/`
- one or more `handler`s which are functions with:
  - `Request` and `Response` objects as arguments, and
  - returning:
    - the `NEXT` constant (which is just the plain value of `'next'`), which tells fluvial to move on to the next matching request handler
    - the `NEXT_ROUTE` constant (which is just the plain value of `'route'`), which tells fluvial to skip any other handlers inside of this specific 
    - nothing or any other value--the result is ignored if it's not one of the other two values
    - a `Promise` that resolves to any of the above values

There are a few other methods that have special meanings and can either be likewise constrained to specific path(s) or be used without any paths.

- `all`, for handling any kind of HTTP method
- `use`, for registering other routers and middleware regardless of the HTTP method, and
- `catch`, for catching any errors that are thrown in any of the handlers prior to being registered

There is one last method on a router that can be used which might be easier if preferred:

- `route(pathMatcher)` which returns a `Route`

A `Route` has all the same methods as a `Router` with two differences:

- `use` and `route` don't exist, and
- the methods that are there don't take any `pathMatcher` argument and only handlers

An example of a `Route` is as follows:

```ts
router.route('/users/:id')
    .get(async (req, res) => {
        // handle a get request
    })
    .patch(requiresAuth(), async (req, res) => {
        // handle a patch request
    });
```

### `Request` object

- `method`: `'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'`  
  the HTTP method used in the request
- `path`: `string`  
  the path to which the request was sent
- `headers`: `{ [key: string]: string }`  
  the http headers on this request
- `payload`: `any`  
  the payload of the request (the equivalent of Express's `'body'`)
- `rawRequest`: `http2.Http2ServerRequest | http.IncomingMessage`  
  the underlying request as provided to and wrapped by fluvial; when the request was made via http/2, it will be an `Http2ServerRequest`, whereas if the request is done via http/1.x, it will be an `IncomingMessage`
- `params`: `{ [key: string]: string }`  
  the path parameters found in the path of the request (e.g., `/users/:id` matches the path `/users/3` and the `params` on the request would be `{ id: '3' }`)
- `query`: `{ [key: string]: string }`  
  the query parameters found in the path of the request (e.g., `/users?limit=10` would result in the `query` to be `{ limit: '10' }`)
- `hash`: `string`  
  the "hash" section of the requested URI (e.g. `/users#someHash` would be `someHash`)
- `httpVersion`: `'2.0' | '1.1'`  
  either `'2.0'` or `'1.1'` depending under which version the request was made
- `response`: `Response`  
  the `Response` object related to this `Request`

### `Response` objects

> **Response Modes:**  
> There are two "modes" used for `Response`s:  Default and event stream.  The "default" mode allows only one response to be sent with the headers.  The "event stream" mode, however, prepares the connection to persist until the client asks for it to close and allows you to send multiple events.  The available properties change based on which mode is active.  Below will specify which of the properties apply to which mode; any property that doesn't specify this is available on both.

- `status`: one of `status(code: number): void` or `status(): number` (read-only)  
  a getter or setter for the status code that will be sent to the client; passing an argument into this method will set the current status code and return nothing whereas calling it without an argument, it will return the currently-set status code
- `httpVersion`: `'2.0' | '1.1'` (read-only)  
  the http version that is used for this response
- `headers`: `{ [key: string]: string | string[] }`  
  a way to manage headers to be sent back to the client
- `responseSent`: `boolean` (read-only)  
  a way to check if the response was sent to help prevent errors when code wants to send a response
- `asEventSource`: one of `asEventSource(value: boolean): void` or `asEventSource(): boolean` (read-only)
  a getter or setter to change this mode from default to event stream or vice versa
- `send(data?: any): void` (default mode only)  
  a way to finish the request, sending the status code, headers, and any payload passed as an argument to the method; if an object is passed to `send`, it will automatically serialize it into JSON
- `json(data: object): void` (default mode only)  
  serializes and sends the given data (which must be an object)
- `write(data: string | Buffer): void`  
  pass-through access to the underlying response stream's `write` method
- `end(data?: string | Buffer): void` (default mode only)  
  pass-through access to the underlying response stream's `end` method
- `sendEvent(data?: object | string): void` (event stream mode only)  
  a way to send data as part of an event source; will respond with the necessary headers with the first event and can be used multiple times, each time passing a message to a subscribed client
- `stream(stream: Readable): void`  
  a way to send a streamed response back to the client; usable in both default and event stream modes; fluvial will not transform the stream chunks to be formatted better, with particular note about event stream mode, as if the data isn't formatted properly when sending messages to the client, those messages won't make their way through to the client

### Request Handlers & Middleware

Functions provided to any of the `Router`'s methods meant to handle requests from a client can return (or resolve) a few different values that will signal to fluvial what it should do next with the request:

- returning or resolving the returned Promise with `'next'` (or using the built-in constant `NEXT`), which will tell fluvial to continue to the next-matching handler
- returning or resolving the returned Promise with `'route'` (or using the built-in constant `NEXT_ROUTE`), which will tell fluvial to skip any other functions registered at the same time as the current handler (such as the first function passed to a `router.get` call returning `'route'` will skip the second, third, etc., functions passed in at the same time) and pass the request on to the next-matching route
- throwing an error or rejecting the returned Promise to signal an error was encountered and to stop further processing and pass it to the next matching `.catch` handler
- returning/resolving any other value or not returning/resolving anything which fluvial will assume means that the handler is done handling the function and can stop passing the request along

## Comparisons with Express

If you are familiar with the back-end framework of [Express](https://expressjs.com/), you will find many aspects of this framework familiar, but there are some very key differences, too.  Below you'll find an Express application and the same thing inside of Fluvial.

In Express:

```js
// import the default export from `express`, which is the `express` application factory function
import express from 'express';

// create the express application
const app = express();

// a simple middleware function
app.use((req, res, next) => {
    // ... that logs minimal data about the request and the time it was received
    console.log(`${Date.time()}: ${req.method} to ${req.url}`);
    
    // ... and then passes the request on to the next handler
    next();
});

// built-in middleware to read JSON request payloads and put them onto `req.body`
app.use(express.json());

// registering a handler for a `GET` request to `/users`
app.get('/users', (req, res, next) => {
    // get the current users, and
    Users.find()
        .then((users) => {
            // set the status code for the response
            res.status(200);
            res.send(users);
        })
        // catch any error, and ...
        .catch((err) => {
            // ... send it to an error handler
            next(err);
        });
});

// registering an error handler for the route above
app.use((err, req, res, next) => {
    if (err.message.includes('not found')) {
        res.status(404);
        res.send('Not found');
        return;
    }
    
    if (err.message.includes('unauthorized')) {
        res.status(401);
        res.send('Not authorized');
        return;
    }
    
    // ... etc.
});

// start the app listening
app.listen(3000, () => {
    console.log('listening to port 3000');
});
```

And in Fluvial:

```ts
// import the named export of `fluvial` (and the signal keyword `NEXT`)
import { fluvial, NEXT } from 'fluvial';
// import the JSON middleware function
import { deserializeJsonPayload } from 'fluvial/middleware';

// create the fluvial application
const app = fluvial();

// a simple middleware function
app.use((req, res) => {
    // ... that logs minimal data about the request and the time it was received
    console.log(`${Date.time()}: ${req.method} to ${req.path}`);
    
    // ... and then passes the request on to the next handler
    return NEXT;
});

// use the deserialize JSON payload function
app.use(deserializeJsonPayload());

// registering a handler for a `GET` request to `/users`
app.get('/users', async (req, res) => {
    // get the current users, and
    const users = await Users.find();
    
    // send the users as the payload in the response
    res.send(users);
    
    // ... but no need to catch here.  Instead, ...
});

// register a catch handler
app.catch((err, req, res) => {
    // ... and any errors from above will trickle in here
    if (err.message.includes('not found')) {
        res.status(404);
        res.send('Not found');
        return;
    }
    
    if (err.message.includes('unauthorized')) {
        res.status(401);
        res.send('Not authorized');
        return;
    }
    
    // ... etc.
});

// start the app listening
app.listen(3000, () => {
    console.log('listening to port 300');
});
```
