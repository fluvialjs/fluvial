import { createHash } from 'crypto';
import type { Request, Response } from 'fluvial';

declare global {
    namespace Fluvial {
        export interface BaseResponse {
            /**
             * Adds a nonce value to the CSP headers for the directive specified
             * @param directiveName the camelCase or kebab-case name of the directive you wish to modify
             * @param nonceValue a unique value used for identifying a script or a style tag; should not include the `nonce-` prefix
             */
            addNonceToCsp(directiveName: string, nonceValue: string): BaseResponse;
            /**
             * Adds a SHA256 value to the CSP headers for a given file
             * @param directiveName the camelCase or kebab-case name of the directive you wish to modify
             * @param rawBytes the raw file object (as a Buffer) that will have the SHA256 hash generated and appended to the CSP directive
             */
            addSha256ToCsp(directiveName: string, rawBytes: Buffer): BaseResponse;
            /**
             * Adds a SHA256 value to the CSP headers with the provided hash
             * @param directiveName the camelCase or kebab-case name of the directive you wish to modify
             * @param hash the pre-generated SHA256 hash; should not include the `sha256-` prefix
             */
            addSha256ToCsp(directiveName: string, hash: string): BaseResponse;
            /**
             * Adds a SHA384 value to the CSP headers for a given file
             * @param directiveName the camelCase or kebab-case name of the directive you wish to modify
             * @param rawBytes the raw file object (as a Buffer) that will have the SHA384 hash generated and appended to the CSP directive
             */
            addSha384ToCsp(directiveName: string, rawBytes: Buffer): BaseResponse;
            /**
             * Adds a SHA384 value to the CSP headers with the provided hash
             * @param directiveName the camelCase or kebab-case name of the directive you wish to modify
             * @param hash the pre-generated SHA384 hash; should not include the `sha384-` prefix
             */
            addSha384ToCsp(directiveName: string, hash: string): BaseResponse;
            /**
             * Adds a SHA512 value to the CSP headers for a given file
             * @param directiveName the camelCase or kebab-case name of the directive you wish to modify
             * @param rawBytes the raw file object (as a Buffer) that will have the SHA512 hash generated and appended to the CSP directive
             */
            addSha512ToCsp(directiveName: string, rawBytes: Buffer): BaseResponse;
            /**
             * Adds a SHA512 value to the CSP headers with the provided hash
             * @param directiveName the camelCase or kebab-case name of the directive you wish to modify
             * @param hash the pre-generated SHA512 hash; should not include the `sha512-` prefix
             */
            addSha512ToCsp(directiveName: string, hash: string): BaseResponse;
        }
    }
}

export function csp(options: CspOptions = { directives: DEFAULT_DIRECTIVES }) {
    let { directives, reportOnly } = options;
    
    if (!directives) {
        directives = DEFAULT_DIRECTIVES;
    }
    
    const assembledCspHeaderValue = validateAndAssembleDirectives(directives);
    
    const cspHeaderName = reportOnly ?
        'content-security-policy-report-only' :
        'content-security-policy';
    
    if (reportOnly && !assembledCspHeaderValue.includes('report-to')) {
        console.warn('The CSP middleware was configured to only report, but the `report-to` directive was not specified; this can be an expensive operation with no benefit until the `report-to` directive specifies a group as found in the `Report-To` header');
    }
    
    return (req: Request, res: Response) => {
        addCspModifiersToResponse(res, directives as Directives, cspHeaderName);
        
        res.headers[cspHeaderName] = assembledCspHeaderValue;
        
        return 'next' as const;
    };
}

function toKebabCase(key: string) {
    return key.replace(/[A-Z]/g, (match: string) => '-' + match.toLowerCase());
}

function validateAndAssembleDirectives(directives: ReadonlyDirectives) {
    const directiveStrings = [];
    
    for (const [ directiveName, values ] of Object.entries(directives)) {
        if (!values) {
            continue;
        }
        
        const normalizedName = toKebabCase(directiveName);
        
        if (!isDirectiveNameRecognized(normalizedName)) {
            throw Error(`Unknown directive type of ${directiveName} (resulted in ${normalizedName} when converted)`, { cause: { directiveName, normalizedName } });
        }
        
        try {
            validateDirectiveValues(values);
        
            directiveStrings.push(normalizedName + ' ' + values.join(' '));
        }
        catch (error) {
            if (typeof error == 'string') {
                console.warn(
                    `The value of ${error} provided for ${normalizedName} was invalid`,
                    { directiveName, normalizedName, value: error },
                );
            }
            else {
                throw Error(`The directive ${directiveName} was configured with an unexpected value; review the error's cause to troubleshoot your configuration`, { cause: error });
            }
        }
    }
    
    return directiveStrings.join('; ');
}

function isDirectiveNameRecognized(directiveName: string) {
    return [
        FETCH_DIRECTIVE_NAMES,
        DOCUMENT_DIRECTIVE_NAMES,
        NAVIGATION_DIRECTIVE_NAMES,
        REPORTING_DIRECTIVE_NAMES,
        OTHER_DIRECTIVE_NAMES,
    ].some((list) => (list as unknown as string[]).includes(directiveName));
}

function validateDirectiveValues(values: readonly string[]) {
    for (const value of values) {
        let result = ([
            SAFE_KEYWORD_VALUES,
            UNSAFE_KEYWORD_VALUES,
            HOST_VALUE_PATTERN,
            SCHEME_VALUE_PATTERN,
            OTHER_VALUE_PREFIX_PATTERNS,
        ] as (string[] | RegExp | RegExp[])[]).some((constraintOrList) => {
            if (Array.isArray(constraintOrList)) {
                return constraintOrList.some((item: string | RegExp) => {
                    if (typeof item == 'string') {
                        return item == value;
                    }
                    
                    return item.test(value);
                });
            }
            else {
                return constraintOrList.test(value);
            }
        });
        
        if (!result) {
            throw value;
        }
    }
}

function addCspModifiersToResponse(response: Response, directives: Directives, headerName: string) {
    response.addNonceToCsp = (directiveName, nonce) => {
        if (typeof nonce != 'string') {
            throw Error('Unable to add non-string nonce to the CSP headers', { cause: { value: nonce } });
        }
        
        updateResponseDirectives(response, directiveName, `nonce-${nonce}`, headerName, directives);
        
        return response;
    };
    
    response.addSha256ToCsp = (directiveName: string, hashOrRaw: string | Buffer) => {
        if (typeof hashOrRaw != 'string' && !Buffer.isBuffer(hashOrRaw)) {
            throw Error('Attempted to create a SHA256 hash with an unrecognized value', { cause: { value: hashOrRaw } });
        }
        
        if (Buffer.isBuffer(hashOrRaw)) {
            const hash = createHash('sha256');
            
            hash.update(hashOrRaw);
            
            hashOrRaw = hash.digest().toString('base64');
        }
        
        updateResponseDirectives(response, directiveName, `sha256-${hashOrRaw}`, headerName, directives);
        
        return response;
    };
    
    response.addSha384ToCsp = (directiveName: string, hashOrRaw: string | Buffer) => {
        if (typeof hashOrRaw != 'string' && !Buffer.isBuffer(hashOrRaw)) {
            throw Error('Attempted to create a SHA384 hash with an unrecognized value', { cause: { value: hashOrRaw } });
        }
        
        if (Buffer.isBuffer(hashOrRaw)) {
            const hash = createHash('sha384');
            
            hash.update(hashOrRaw);
            
            hashOrRaw = hash.digest().toString('base64');
        }
        
        updateResponseDirectives(response, directiveName, `sha384-${hashOrRaw}`, headerName, directives);
        
        return response;
    };
    
    response.addSha512ToCsp = (directiveName: string, hashOrRaw: string | Buffer) => {
        if (typeof hashOrRaw != 'string' && !Buffer.isBuffer(hashOrRaw)) {
            throw Error('Attempted to create a SHA512 hash with an unrecognized value', { cause: { value: hashOrRaw } });
        }
        
        if (Buffer.isBuffer(hashOrRaw)) {
            const hash = createHash('sha512');
            
            hash.update(hashOrRaw);
            
            hashOrRaw = hash.digest().toString('base64');
        }
        
        updateResponseDirectives(response, directiveName, `sha512-${hashOrRaw}`, headerName, directives);
        
        return response;
    };
}

function updateResponseDirectives(response: Response, directiveName: string, valueToAdd: string, cspHeaderName: string, directives: Directives) {
    const foundDirectiveName = directiveName in directives ?
        // avoids a bit of overhead on each request with this check
        directiveName :
        Object.keys(directives).find(k => toKebabCase(k) == toKebabCase(directiveName));
    
    if (!foundDirectiveName) {
        directives[directiveName] = [];
    }
    else if (foundDirectiveName != directiveName) {
        directiveName = foundDirectiveName;
    }
    
    directives[directiveName].push(valueToAdd);
    
    response.headers[cspHeaderName] = validateAndAssembleDirectives(directives);
}

const DEFAULT_DIRECTIVES = {
    defaultSrc: ['\'self\''],
    baseUri: ['\'self\''],
    fontSrc: ['\'self\'', 'https:', 'data:'],
    formAction: ['\'self\''],
    frameAncestors: ['\'self\''],
    imgSrc: ['\'self\'', 'data:'],
    objectSrc: ['\'none\''],
    scriptSrc: ['\'self\''],
    scriptSrcAttr: ['\'none\''],
    styleSrc: ['\'self\'', 'https:', '\'unsafe-inline\''],
    upgradeInsecureRequests: [],
} as const;

// --- VALIDATION CONSTANTS --- //
// #region directive names
const FETCH_DIRECTIVE_NAMES = [
    // !recommend use `frame-src` and `worker-src` instead
    'child-src',
    'connect-src',
    'default-src',
    'font-src',
    'frame-src',
    'img-src',
    'manifest-src',
    'media-src',
    // !recommend always use "none" as the value
    'object-src',
    // !deprecated !nonstandard
    'prefetch-src',
    'script-src',
    'script-src-elem',
    'script-src-attr',
    'style-src',
    'style-src-elem',
    'style-src-attr',
    'worker-src',
] as const;

const DOCUMENT_DIRECTIVE_NAMES = [
    'base-uri',
    'sandbox',
] as const;

const NAVIGATION_DIRECTIVE_NAMES = [
    'form-action',
    'frame-ancestors',
    // !experimental
    'navigate-to',
] as const;

const REPORTING_DIRECTIVE_NAMES = [
    // !deprecated but replacement isn't fully supported yet; use along with "report-to"
    'report-uri',
    // !recommend doesn't work unless in conjunction with the "Report-To" header, which specifies endpoints for reporting CSP violations to
    'report-to',
] as const;

const OTHER_DIRECTIVE_NAMES = [
    // !experimental
    'require-trusted-types-for',
    // !experimental
    'trusted-types',
    'upgrade-insecure-requests',
] as const;
// #endregion directive names

// #region values
const SAFE_KEYWORD_VALUES = [
    "'none'",
    "'self'",
    "'strict-dynamic'",
    "'report-sample'",
] as const;

const UNSAFE_KEYWORD_VALUES = [
    "'unsafe-inline'",
    "'unsafe-eval'",
    "'unsafe-hashes'",
    // !experimental
    "'unsafe-allow-redirects'",
] as const;

const HOST_VALUE_PATTERN = /^(?:([a-z]+:)\/\/)?(?:([^.\s]+|\*)\.)?([a-z0-9](?:[a-z0-9\-]*?[a-z0-9])?\.[a-z]{2,})(?::([0-9]{1,5}))?(\/[^\s]+)?$/i;

const SCHEME_VALUE_PATTERN = /^[a-z]+:$/;

const OTHER_VALUE_PREFIX_PATTERNS = [
    /** a "nonce" (or unique tag) for an inline script or style that marks its contents as safe; each inline script used must have its own, unique nonce value */
    /^nonce-/,
    /** the SHA* hash for an inline script or style tag's contents */
    /^sha(256|384|512)-/,
] as [ nonce: RegExp, shaHash: RegExp ];
// #endregion values

export interface CspOptions {
    directives?: ReadonlyDirectives;
    reportOnly?: boolean;
}

interface Directives {
    [directiveName: string]: string[] | null;
}

interface ReadonlyDirectives {
    [directiveName: string]: readonly string[] | null;
}
