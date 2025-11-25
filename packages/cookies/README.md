# @fluvial/cookies

This package allows for the management of cookies in your application.  It is not copied from any existing implementations, though the `req-`/`res.cookies` location is based on the express cookies package.

It can technically be used just for the `CookieCollection` functionality directly if you wish, but the intent is to use the `cookie` middleware function for your routers.

## Example usage:

```ts
import { cookies } from '@fluvial/cookies';

const app = app.fluvial();

app.use(cookies());
```

If you wish to use this in an express application and using the `@fluvial/express-adapter` package, you need to specify the `expressMode` option to ensure it works:

```ts
import { cookies } from '@fluvial/cookies';
import { toExpress } from '@fluvial/express-adapter';

const app = express();

app.use(toExpress(cookies({ expressMode: true })));
```
