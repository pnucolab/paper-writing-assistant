/**
 * UUID generation function with fallback for debugging environments
 */
export function generateUUID(): string {
	// Use native crypto.randomUUID() if available (modern browsers/Node.js)
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	
	// Fallback for debugging/development environments
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		const r = Math.random() * 16 | 0;
		const v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}