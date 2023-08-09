import { IncomingMessage, ServerResponse } from 'http';
import { ServerHttp2Stream, Http2ServerResponse } from 'http2';
import { Socket } from 'net';
import { Writable } from 'stream';


export function createHttp2Response(onWrite?: (data: Buffer) => void) {
    const responseStream = new Writable({
        write(data) {
            onWrite?.(data);
        },
    }) as ServerHttp2Stream;
    const response = new Http2ServerResponse(responseStream);
    
    responseStream.respond = (headers) => {
        // @ts-ignore
        responseStream.headersSent = true;
        onWrite?.(
            Buffer.concat([
                Buffer.from(
                    Object.entries(headers)
                        .map(([ key, value ]) => `${key} ${value}`)
                        .join('\r\n'),
                ),
                Buffer.from('\r\n\r\n'),
            ]),
        );
    };
    
    return response;
}

export function createHttp1Response(onWrite?: (data: Buffer) => void) {
    const fakeSocket = new Writable({
        write(chunk: Buffer) {
            onWrite?.(chunk);
            // if this is not set to false, then the buffered chunks
            // won't be written
            (this as any)._writableState.writing = false;
        },
        autoDestroy: false,
    }) as Socket;
    const message = new ServerResponse({} as IncomingMessage);
    // @ts-ignore
    fakeSocket._httpMessage = message;
    Object.defineProperty(message, 'socket', {
        get: () => fakeSocket,
    });
    
    return message;
}
