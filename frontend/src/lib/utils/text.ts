/**
 * Convert a string to kebab-case
 * Examples:
 * - "AI Ethics Research" -> "ai-ethics-research"
 * - "Climate Study 2024" -> "climate-study-2024"
 * - "My_Project Name!" -> "my-project-name"
 */
export function toKebabCase(str: string): string {
	return str
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
		.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Check if a string is a valid kebab-case identifier
 */
export function isValidKebabCase(str: string): boolean {
	return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}