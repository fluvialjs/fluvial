import { IncomingMessage, IncomingHttpHeaders } from 'node:http';
import { Http2ServerRequest } from 'node:http2';
import { Readable } from 'node:stream';


export function createHttp2Request(
    path: string,
    method: string,
    semiRawHeaders: string[] = [],
    payloadValue: string | string[] = null,
) {
    semiRawHeaders.push(`:path: ${path}`);
    semiRawHeaders.push(`:method: ${method}`);
    semiRawHeaders.push(`:scheme: http`);
    
    const rawHeaders = semiRawHeaders.flatMap((h) => [
        h.slice(0, h.indexOf(':', Number(h.startsWith(':')))),
        h.slice(h.indexOf(':', Number(h.startsWith(':'))) + 2),
    ]);
    
    const splitHeaders = semiRawHeaders
        .map(h => [
            h.slice(
                0,
                h.indexOf(':', Number(h.startsWith(':'))),
            ),
            h.slice(h.indexOf(':', Number(h.startsWith(':'))) + 2),
        ]);
    
    let readableValue = (payloadValue == null || Array.isArray(payloadValue)) ?
        payloadValue as string[] :
        [ payloadValue ];
    
    const request: Http2ServerRequest = new Readable({
        read() {
            if (!readableValue?.length) {
                readableValue = null;
            }
            
            if (!readableValue) {
                this.push(null);
                return;
            }
            
            this.push(Buffer.from(readableValue.shift()));
        },
    }) as Http2ServerRequest;
    
    // @ts-ignore
    request.httpVersion = '2.0';
    // @ts-ignore
    request.headers = splitHeaders.reduce((h, [k, v]) => ({...h, [k]: v}), {});
    // @ts-ignore
    request.path = '';
    // @ts-ignore
    request.rawHeaders = rawHeaders;
    // @ts-ignore
    request.method = method;
    
    return request;
}

export function createHttp1Request(path: string, method: string, semiRawHeaders: string[] = [], payloadValue: string | string[] = null) {
    const rawHeaders = semiRawHeaders.flatMap((h) => [
        h.slice(0, h.indexOf(':')),
        h.slice(h.indexOf(':') + 2),
    ]);
    
    const splitHeaders = semiRawHeaders
        .map(h => [
            h.slice(0, h.indexOf(':')),
            h.slice(h.indexOf(':') + 2),
        ]);
    
    let readableValue = (!payloadValue || Array.isArray(payloadValue)) ?
        payloadValue as string[] :
        [ payloadValue ];
    
    const message = new Readable({
        read() {
            if (!readableValue?.length) {
                readableValue = null;
            }
            
            if (!readableValue) {
                this.push(null);
                return;
            }
            
            this.push(Buffer.from(readableValue.shift()));
        },
    }) as IncomingMessage;
    
    // manually initialize things...
    message.url = path;
    message.method = method;
    message.headers = Object.fromEntries(splitHeaders) as IncomingHttpHeaders;
    message.rawHeaders = rawHeaders;
    message.httpVersion = '1.1';
    message.httpVersionMajor = 1;
    message.httpVersionMinor = 1;
    
    return message;
}
