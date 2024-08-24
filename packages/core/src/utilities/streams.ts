import type { Stream } from "node:stream";

/**
 * This is similar in theory to the `finished` function you can import from `node:stream`.  However, some
 * notable differences include immediately resolving the Promise on detection that the stream has ended
 * or is in the "cleanup" stage.
 */
export function streamFinished(sourceStream: Stream) {
    return new Promise<void>((resolve, reject) => {
        if ('finished' in sourceStream && sourceStream.finished) {
            resolve();
        }
        
        sourceStream.on('close', resolve);
        sourceStream.on('finish', resolve);
        sourceStream.on('end', resolve);
        
        sourceStream.on('error', reject);
    });
}
