# Fluvial

A simple http/2-enabled server framework with an API similar to [Express](https://expressjs.com/)

## Introduction

Fluvial was born from an attempt to understand and use http/2 for static file sharing and wanting a similar request lifecycle as Express for other such requests.  It's as much a learning project as a project that attempts to be production-ready.  If you're familiar with Express, much of the API might seem familiar to you.  However, there are a few key differences you may notice and it will be mentioned below.

Fluvial is compatible with both http/1.x and http/2.  The type of the raw request/response will depend on which http version you're using.

As of the writing of this document, this project is in alpha mode and will need many tweaks and adjustments to make it even more robust and complete prior to a full version (v1).  Feel free to make an issue discussing your need.

These are the current aims of this project:

1. Simple and straightforward API, borrowing ergonomics from language features and other similar libraries
2. Very few dependencies (only when virtually unavoidable)
3. Not too bulky, but not trying to be as lean or terse as possible
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

There is an extended example below in the "Comparisons with Express" section.

## API Documentation

The documentation here is simplified for the scope of the readme.  Type annotations are included which may help with the documentation while developing your application.

### `fluvial(options)`

Call this to create a Fluvial application

Arguments:

- `options`: An optional object with the following properties
  - `server`: An already-created `Http2Server` or `Http2SecureServer` as you can get from the `http2.createServer` or `http2.createSecureServer` functions (this might be needed if you have other libraries that handle the raw `Http2Server` instance and also need to provide the same instance to Fluvial)
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

### `Request` objects

have the following predefined properties

- `method`: the HTTP method used in the request
- `path`: the path to which the request was sent
- `headers`: the http headers on this request
- `payload`: the payload of the request (similar to Express's `'req.body'` property)
- `rawRequest`: the `Http2ServerRequest` (http/2) or `IncomingMessage` (http/1.x) that this request wraps
- `params`: the path parameters found in the path of the request (e.g., `/users/:id` matches the path `/users/3` and the `params` on the request would be `{ id: '3' }`)
- `query`: the query parameters found in the path of the request (e.g., `/users?limit=10` would result in the `query` to be `{ limit: '10' }`)
- `httpVersion`: either `'2'` or `'1.1'` depending under which version the request was made
- `response`: the `Response` object paired with this `Request`

**NOTE:** It is fine to add custom properties to the `Request` object (e.g., `user` for the user associated with the request).  Any fluvial-provided property is protected and therefore not editable.  However, if you're using TypeScript and wanting to extend the `Request` object, there isn't a great way to do this yet.

### `Response` objects

have the following predefined properties and methods

- `

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
