export function etagMatches(etag: string, matches: string) {
    return matches.split(/,\s?/g)
        .some(m => m == '*' || !m.startsWith('W/') && etag == m);
}

export function etagNoneMatches(etag: string, matches: string) {
    return matches.split(/,\s?/g)
        .every(m => m == '*' || etag != m);
}
