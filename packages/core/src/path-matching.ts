import { URL } from 'node:url';

export function getRouteParams(path: PathString, pathPattern: PathMatcher, exact?: boolean): ParamsDictionary | false {
    if (pathPattern instanceof RegExp) {
        const match = pathPattern.exec(path);
        
        if (match) {
            const params = {};
            
            for (const [ index, matched ] of match.slice(1).entries()) {
                params[index + 1] = matched;
            }
            
            for (const [ key, value ] of Object.entries(match.groups ?? {})) {
                params[key] = value;
            }
            
            return params;
        }
    }
    else if (Array.isArray(pathPattern)) {
        for (const matcher of pathPattern) {
            const result = getRouteParams(path, matcher, exact);
            
            if (result) {
                return result;
            }
        }
    }
    else {
        // "slice" is used since if the code is doing it right, the first element will always be an empty string
        const pathPortions = path.split('/').slice(1);
        const patternPortions = pathPattern.split('/').slice(1);
        if (patternPortions.length > pathPortions.length) {
            return null;
        }
        if (exact && pathPortions.length > patternPortions.length) {
            return null;
        }
        
        let params: Record<string, string> = {};
        
        for (let i = 0; i < pathPortions.length; i++) {
            const currentPathPortion = pathPortions[i];
            const currentMatchPortion = patternPortions[i];
            
            if (currentMatchPortion == '**') {
                break;
            }
            if (currentMatchPortion?.startsWith(':')) {
                params[currentMatchPortion.slice(1)] = currentPathPortion;
            }
            else if (currentMatchPortion && currentPathPortion != currentMatchPortion) {
                params = null;
                break;
            }
        }
        
        if (params) {
            return params;
        }
    }
    
    return false;
}

export function getQueryParams(path: PathString) {
    const url = new URL('http://localhost:1138' + path);
    const queryDict: QueryDictionary = {};
    
    for (const [ key, value ] of url.searchParams.entries()) {
        if (key in queryDict) {
            if (Array.isArray(queryDict[key])) {
                (queryDict[key] as string[]).push(value);
            }
            else {
                queryDict[key] = [ queryDict[key] as string, value ];
            }
        }
        else {
            queryDict[key] = value;
        }
    }
    
    return queryDict;
}

export interface ParamsDictionary {
    [key: string]: string;
}

export interface QueryDictionary {
    [key: string]: string | string[];
}

export type PathMatcher = PathString | PathString[] | RegExp;

export type PathString = `/${string}`;
