export function areRegexesEquivalent(regex1: RegExp, regex2: RegExp) {
    return regex1 == regex2 ||
        (regex1.source == regex2.source &&
            regex1.flags.length == regex2.flags.length &&
            Array.from(regex1.flags).every(f => regex2.flags.includes(f)));
}
