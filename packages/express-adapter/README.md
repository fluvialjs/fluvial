# @fluvial/express-adapter

At the onset of Fluvial, the goal was to make the framework as compatible with Express ideals as possible.  As development continued, some of the ergonomics of Express were not great and as such, the architecture changed slightly.  It will still sorta feel Express-like in general, but it was enough of a change that your favorite middleware won't work when plopped directly into a Fluvial application.  Now you'd have to write a shim or adapter to use it.

BUT WAIT!  Do not become disheartened by this fact--this package will solve those issues.  Whereas you'd have to write an adapter for your favorite Express middleware or completely rewrite the middleware from the ground up emulating that middleware, you can use the functions from this package to cater to your needs.

All of this amazingness has flooded your mind with happiness, but you must be asking another question, too:

> What about the other direction?  Can I take a Fluvial middleware and use it in an Express application?

It's your lucky day!  This package also gives you the ability to adapt your favorite Fluvial middleware to work in Express applications.

If you are not familiar with Fluvial, you can check it out at https://npmjs.com/package/fluvial.

# Basic usage

For cases when you want to adapt an Express middleware (in this case, [`cors`](https://npmjs.com/package/cors)) for Fluvial:

```ts
// in your router or application file
import { toFluvial } from '@fluvial/express-adapter';
import cors from 'cors';

router.use(toFluvial(cors()));
```

Or the other way around, adapting a Fluvial middleware (in this case, [`@fluvial/csp`](https://npmjs.com/package/@fluvial/csp)) for Express:

```ts
// in your router or application file
import { toExpress } from '@fluvial/express-adapter';
import { csp } from '@fluvial/csp';

router.use(toExpress(csp()));
```

# API

All that this provides are two functions:

- `toFluvial`, for Express-compatible middleware to work in a Fluvial application
- `toExpress`, for Fluvial-compatible middleware to work in an Express application

Both functions only take one argument, that of the middleware that you want to adapt to the usage of the other framework.  It returns a middleware wrapper that will invoke the middleware you provided to it that works with the application in which you'd use it.

# Found a bug or incompatibility?

File an issue!  Author a pull request with the fix and add a test that shows that it works.  The test suite covers some of the common middlewares already, so some of the simple use cases have been covered and tested.
