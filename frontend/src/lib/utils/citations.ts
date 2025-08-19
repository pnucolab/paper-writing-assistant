import type { Citation } from '../../routes/new-paper/common';

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee';

export interface CitationFormatOptions {
	style: CitationStyle;
	includeDoi: boolean;
}

/**
 * Citation format templates with placeholders
 */
const CITATION_FORMATS = {
	apa: {
		authors: {
			single: '{author}',
			two: '{author1}, & {author2}',
			multiple: '{others}, & {last}'
		},
		template: '{authors} ({year}). {title}. *{journal}*{volume}{issue}, {pages}{doi}.'
	},
	mla: {
		authors: {
			single: '{author}',
			two: '{author1}, and {author2}',
			multiple: '{others}, and {last}'
		},
		template: '{authors} "{title}." *{journal}*{volume}{issue}, {year}, {pages}{doi}.'
	},
	chicago: {
		authors: {
			single: '{author}',
			two: '{author1}, and {author2}',
			multiple: '{others}, and {last}'
		},
		template: '{authors} "{title}." *{journal}*{volume}{issue} ({year}){pages}{doi}.'
	},
	harvard: {
		authors: {
			single: '{author}',
			two: '{author1} and {author2}',
			multiple: '{others} and {last}'
		},
		template: '{authors} ({year}) \'{title}\', *{journal}*{volume}{issue}{pages}{doi}.'
	},
	ieee: {
		authors: {
			single: '{author}',
			two: '{author1} and {author2}',
			multiple: '{others}, and {last}'
		},
		template: '{authors}, "{title}," *{journal}*{volume}{issue}{pages}, {year}{doi}.'
	}
};

/**
 * Format patterns for different citation components
 */
const COMPONENT_FORMATS = {
	apa: {
		volume: ', {value}',
		issue: '({value})',
		pages: ', {value}',
		doi: '. https://doi.org/{value}'
	},
	mla: {
		volume: ', vol. {value}',
		issue: ', no. {value}',
		pages: ', pp. {value}',
		doi: ', doi:{value}'
	},
	chicago: {
		volume: ' {value}',
		issue: ', no. {value}',
		pages: ': {value}',
		doi: '. https://doi.org/{value}'
	},
	harvard: {
		volume: ', {value}',
		issue: '({value})',
		pages: ', pp. {value}',
		doi: '. doi: {value}'
	},
	ieee: {
		volume: ', vol. {value}',
		issue: ', no. {value}',
		pages: ', pp. {value}',
		doi: ', doi: {value}'
	}
};

/**
 * Formats authors according to the specified style
 */
function formatAuthors(authors: string[], style: CitationStyle): string {
	const authorFormats = CITATION_FORMATS[style].authors;
	
	// Handle empty or invalid authors array
	if (!authors || authors.length === 0) {
		return 'Unknown Author';
	}
	
	// Filter out null/undefined authors
	const validAuthors = authors.filter(author => author && author.trim());
	if (validAuthors.length === 0) {
		return 'Unknown Author';
	}
	
	if (validAuthors.length === 1) {
		return authorFormats.single.replace('{author}', validAuthors[0]);
	}
	
	if (validAuthors.length === 2) {
		return authorFormats.two
			.replace('{author1}', validAuthors[0])
			.replace('{author2}', validAuthors[1]);
	}
	
	const lastAuthor = validAuthors[validAuthors.length - 1];
	const otherAuthors = validAuthors.slice(0, -1);
	return authorFormats.multiple
		.replace('{others}', otherAuthors.join(', '))
		.replace('{last}', lastAuthor);
}

/**
 * Formats a component (volume, issue, pages, doi) if it exists
 */
function formatComponent(value: string | undefined, component: keyof typeof COMPONENT_FORMATS.apa, style: CitationStyle): string {
	if (!value) return '';
	return COMPONENT_FORMATS[style][component].replace('{value}', value);
}

/**
 * Formats a single citation according to the specified style
 */
export function formatCitation(citation: Citation, options: CitationFormatOptions): string {
	const { style, includeDoi } = options;
	const authors = Array.isArray(citation.authors) ? citation.authors : citation.authors ? [citation.authors] : ['Unknown Author'];
	
	const template = CITATION_FORMATS[style].template;
	const formattedAuthors = formatAuthors(authors, style);
	
	// Build component strings
	const volume = formatComponent(citation.volume, 'volume', style);
	const issue = formatComponent(citation.issue, 'issue', style);
	const pages = formatComponent(citation.pages, 'pages', style);
	const doi = includeDoi && citation.doi ? formatComponent(citation.doi, 'doi', style) : '';
	
	// Replace all placeholders
	return template
		.replace('{authors}', formattedAuthors)
		.replace('{year}', citation.year?.toString() || 'n.d.')
		.replace('{title}', citation.title || 'Untitled')
		.replace('{journal}', citation.journal || '')
		.replace('{volume}', volume)
		.replace('{issue}', issue)
		.replace('{pages}', pages)
		.replace('{doi}', doi);
}

/**
 * Generates a complete references section with proper formatting
 */
export function generateReferencesSection(
	citations: Citation[],
	style: CitationStyle,
	includeDoi: boolean = true
): string {
	if (!citations || citations.length === 0) {
		return '## References\n\nNo references available.';
	}

	let referencesContent = '## References\n\n';
	
	citations.forEach((citation, index) => {
		const number = index + 1;
		const formattedReference = formatCitation(citation, { style, includeDoi });
		referencesContent += `${number}. ${formattedReference}\n\n`;
	});
	
	return referencesContent.trim();
}