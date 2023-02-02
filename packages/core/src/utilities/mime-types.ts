export function mimeTypeAccepted(targetType: string, accept: string) {
    /** assume it will be fine; default is '*\/*' */
    if (!accept) {
        return true;
    }
    
    const [ targetMimeType, targetMimeSubtype ] = targetType.split('/');
    
    return accept.split(',')
        .map(t => {
            const [ type, ...params ] = t.split(';');
            
            const [ mimeType, mimeSubtype ] = type.split('/');
            
            const priority = +params.find(p => p.startsWith('q'))?.split('=', 1)[2] || 1;
            
            return {
                source: type,
                mimeType,
                mimeSubtype,
                priority,
            };
        })
        .sort((ta, tb) => ta.priority - tb.priority)
        .some(t => 
            (t.mimeType == '*' || t.mimeType == targetMimeType) &&
            (t.mimeSubtype == '*' || t.mimeSubtype == targetMimeSubtype));
}
