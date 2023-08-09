import { Request } from '../request.js';
import { Response } from '../response.js';

export function deserializeUrlencodedPayload(/* options?: DeserializeUrlencodedOptions */) {
    return async (req: Request, res: Response) => {
        if (req.headers['content-type'].includes('x-www-form-urlencoded')) {
            let data = '';
            
            for await (const chunk of req.rawRequest) {
                data += (chunk as Buffer).toString('utf-8');
            }
            
            try {
                const deserializedPayload = parse(data);
                Object.defineProperty(req, 'payload',  { get() { return deserializedPayload; } });
            }
            catch (e) {
                console.error('fluvial.deserializeUrlencodedPayload:  Failed to deserialize as JSON the payload provided in this request');
                console.error(e);
                
                throw e;
            }
        }
        
        return 'next' as const;
    };
}

function parse(rawPayload: string) {
    return rawPayload.split('&')
        .map(rawField => {
            const [ key, value ] = rawField.split('=');
            
            return [ decodeURIComponent(key), decodeURIComponent(value) ];
        })
        .reduce((agg, [ key, value ]) => {
            const keySegments = getUrlencodedPathSegments(key);
            const [ targetObject, targetKey ] = resolveObjectFromKeyPath(agg, keySegments);
            
            targetObject[targetKey] = value;
            
            return agg;
        }, {});
}

export function getUrlencodedPathSegments(rawKey: string, recursed?: true): (string | number)[] {
    let [ mainMatch, mainKey, subKey, remaining ] = (rawKey.match(/([^\[\]]+)(?:\[([^\]]*)\](.*))?/i) ?? []) as [ string, string, string | number | undefined, string ];
    
    if (mainMatch) {
        if (subKey == undefined) {
            return [ mainKey ];
        }
        
        const prefix = [];
        
        if (!recursed) {
            prefix.push(mainKey);
        }
        
        if (!subKey || Number(subKey) < 0) {
            subKey = -1;
        }
        else if (!isNaN(+subKey)) {
            subKey = +subKey;
        }
        return [
            ...prefix,
            subKey,
            ...(remaining ? getUrlencodedPathSegments(`${subKey}${remaining}`, true) : []),
        ];
    }
    else {
        return [];
    }
}

export function resolveObjectFromKeyPath(rootObject: {} | (string | {})[], keyPath: (string | number)[]) {
    let currentObj = rootObject;
    
    for (let i = 0; i < keyPath.length; i++) {
        let currentKey = keyPath[i];
        const nextKey = keyPath[i + 1];
        
        if (currentKey == -1) {
            currentKey = Array.isArray(currentObj) ? currentObj.length - 1 : (Object.keys(currentObj).reverse()[0] || 0);
        }
        
        if (currentKey === -1) {
            currentKey++;
        }
        
        if (!(currentKey in currentObj)) {
            if (typeof nextKey == 'number') {
                currentObj[currentKey] = [];
            }
            else if (typeof nextKey == 'string') {
                currentObj[currentKey] = {};
            }
        }
        
        if (nextKey == undefined) {
            return [ currentObj, currentKey ] as const;
        }
        else {
            currentObj = currentObj[currentKey];
        }
    }
    
    // in theory, this should never be the case since the code above should return from the loop on the last iteration
    return null;
}

interface DeserializeUrlencodedOptions {
    
}
