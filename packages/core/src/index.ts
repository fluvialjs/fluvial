import {
    createSecureServer,
    createServer,
    Http2SecureServer,
    Http2Server,
    Http2ServerRequest,
    Http2ServerResponse,
} from 'node:http2';
import { readFileSync } from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Request, wrapRequest } from './request.js';
import { Response, wrapResponse } from './response.js';
import { Router, routerPrototype, __InternalRouter } from './router.js';
export * from './middleware/index.js';

export const NEXT = 'next';
export const NEXT_ROUTE = 'route';

export function fluvial(options: ApplicationOptions = {}) {
    let appInSettingStage = true;
    const app = new Proxy<__InternalApplication>(Object.create(applicationPrototype), {
        apply(target, thisArg, argumentsArray) {
            target.mainHandler.apply(thisArg, argumentsArray);
        },
        get(target, property) {
            if (property == 'apply') {
                return target.mainHandler.apply.bind(target.mainHandler);
            }
            
            return Reflect.get(target, property);
        },
        set(target, property: keyof __InternalApplication, value, receiver) {
            if ((property != 'server' && !appInSettingStage) || (property == 'server' && target.server)) {
                return false;
            }
            
            target[property] = value;
            return true;
        },
    });
    
    app.routes = [];
    app.mainHandler = Application;
    app.invokedOptions = options;
    
    if (options?.server) {
        app.server = options.server;
        app.server.on('request', Application);
    }
    
    appInSettingStage = false;
    
    return app as Application;
    
    async function Application(rawRequest: Http2ServerRequest | IncomingMessage, rawResponse: Http2ServerResponse | ServerResponse) {
        const req = wrapRequest(rawRequest);
        const res = wrapResponse(rawResponse);
        
        Object.defineProperty(req, 'response', res);
        Object.defineProperty(res, 'request', req);
        
        try {
            const result = await app.handleRequest(req.path, '/', req, res);
            
            if (result == 'next' && !res.responseSent) {
                res.status(404);
                res.send('Cannot ' + req.method + ' ' + req.path);
            }
        }
        catch (e) {
            await defaultErrorHandler(e, req, res);
        }
    }
}

async function defaultErrorHandler(err: unknown, req: Request, res: Response) {
    console.error('fluvial caught an an unhandled error.  It\'s heavily suggested you handle the errors yourself.');
    console.error(err);
    
    if (!res.responseSent) {
        res.status(500);
        res.send(`An unknown error occurred while trying to process the request`);
        
        console.error('fluvial sent a generic 500 error.');
    }
    else {
        console.warn('It seems like a response was sent to the client already.  Make sure whatever error you encountered didn\'t cause any problems with further processing.');
    }
}

const applicationPrototype = Object.create(routerPrototype, {
    component: {
        get() {
            return 'application';
        },
    },
    listen: {
        get() {
            return function listen(this: __InternalApplication, port: number | string, callback?: () => void) {
                if (isNaN(port as number)) {
                    throw TypeError(`the provided port (${port}) was not a valid number`);
                }
                
                if (!this.server) {
                    if (!this.invokedOptions.ssl) {
                        this.server = createServer(this.mainHandler);
                    }
                    else if (
                        this.invokedOptions.ssl &&
                        (
                            (
                                (
                                    this.invokedOptions.ssl.certificatePath || this.invokedOptions.ssl.certificate
                                ) &&
                                (
                                    this.invokedOptions.ssl.key || this.invokedOptions.ssl.keyPath
                                )
                            ) ||
                            (
                                (
                                    this.invokedOptions.ssl.pfx || this.invokedOptions.ssl.pfxPath
                                ) &&
                                this.invokedOptions.ssl.passphrase
                            )
                        )
                    ) {
                        if (this.invokedOptions.ssl.pfx || this.invokedOptions.ssl.pfxPath) {
                            this.server = createSecureServer({
                                allowHTTP1: true,
                                pfx: this.invokedOptions.ssl.pfx || readFileSync(this.invokedOptions.ssl.pfxPath),
                                passphrase: this.invokedOptions.ssl.passphrase,
                            });
                        }
                        // .pem-formatted cert/key
                        else {
                            this.server = createSecureServer({
                                allowHTTP1: true,
                                cert: this.invokedOptions.ssl.certificate ||
                                    readFileSync(this.invokedOptions.ssl.certificatePath),
                                key: this.invokedOptions.ssl.key ||
                                    readFileSync(this.invokedOptions.ssl.keyPath),
                            }, this.mainHandler);
                        }
                    }
                    else if (this.invokedOptions.ssl) {
                        throw TypeError(`options provided are requesting that the server is spun up with SSL options, but the required options of certificate and key are not provided`);
                    }
                    else {
                        throw Error('An unknown error occurred; please review the creation of the application');
                    }
                }
                
                if (this.server.listening) {
                    // no need to try to listen again
                    console.warn('Attempted to make a server listen when the server is already listening');
                    return;
                }
                
                this.server.listen(port, callback);
            };
        },
    },
});

interface ApplicationOptions {
    server?: Http2Server | Http2SecureServer;
    // /**
    //  * @todo implement websocket connections (not strictly an HTTP/2-related connection)
    //  */
    // ws?: ApplicationWebsocketOptions;
    ssl?: ApplicationSslOptions;
}

interface ApplicationWebsocketOptions {
    /**
     * a separate implementation than the stock one, which means that you might need to do more things
     * manually if the provided implementation isn't cleanly supported
     * @todo do something more with this...
     */
    implementation?: unknown;
}

interface ApplicationSslOptions {
    certificatePath?: string;
    certificate?: string | Buffer;
    keyPath?: string;
    key?: string | Buffer;
    caCertificatePath?: string;
    caCertificate?: string | Buffer;
    pfx?: string | Buffer;
    pfxPath?: string;
    passphrase?: string;
}

interface __InternalApplication extends Application, __InternalRouter {
    server: Http2Server | Http2SecureServer;
    mainHandler(req: Http2ServerRequest, res: Http2ServerResponse): void;
    invokedOptions: ApplicationOptions;
}

/** Similar to Express.Application */
export interface Application extends Router {
    listen(port: number, callback?: () => void): void;
}

export {
    Router,
    Request,
    Response,
};
