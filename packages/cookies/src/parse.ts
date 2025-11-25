export function parse(cookieHeader: string) {
	const segments = cookieHeader.split(";");
	
	const items: Record<string, { name: string, value: string }> = {};
	
	for (const segment of segments) {
		const [name, value] = segment.split("=").map(s => s.trim());
		if (name && value) {
			items[name] = { name, value };
		}
	}
	
	return items;
}
