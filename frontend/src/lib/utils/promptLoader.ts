// Prompt Template Loader - Loads markdown prompt templates and replaces variables

import type { CitationContext, SectionContext } from '../stores/drafts';

interface PromptCache {
	[key: string]: string;
}

const promptCache: PromptCache = {};

/**
 * Load a prompt template from markdown file
 */
async function loadPromptTemplate(promptId: string): Promise<string> {
	// DEVELOPMENT: Skip cache in dev mode to always load fresh templates
	const isDev = import.meta.env.DEV;

	// Check cache first (skip in dev mode)
	if (!isDev && promptCache[promptId]) {
		return promptCache[promptId];
	}

	// Check localStorage for custom template
	const customTemplates = localStorage.getItem('customPromptTemplates');
	if (customTemplates) {
		const parsed = JSON.parse(customTemplates);
		if (parsed[promptId]) {
			promptCache[promptId] = parsed[promptId];
			return parsed[promptId];
		}
	}

	// Load from file (add cache-busting in dev mode)
	try {
		const url = isDev
			? `/prompts/${promptId}.md?t=${Date.now()}`
			: `/prompts/${promptId}.md`;
		const response = await fetch(url);
		const text = await response.text();

		// Parse markdown file (skip frontmatter)
		const lines = text.split('\n');
		let templateContent = '';
		let inFrontmatter = false;

		for (const line of lines) {
			if (line === '---') {
				if (!inFrontmatter) {
					inFrontmatter = true;
				} else {
					inFrontmatter = false;
				}
				continue;
			}
			if (!inFrontmatter && line !== '---') {
				templateContent += line + '\n';
			}
		}

		const template = templateContent.trim();
		// Only cache in production mode
		if (!isDev) {
			promptCache[promptId] = template;
		}
		return template;
	} catch (error) {
		console.error(`Failed to load prompt template ${promptId}:`, error);
		throw error;
	}
}

/**
 * Replace template variables in format {{variableName}}
 */
function replaceVariables(template: string, variables: Record<string, string>): string {
	let result = template;

	for (const [key, value] of Object.entries(variables)) {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
		result = result.replace(regex, () => value || '');
	}

	return result;
}

/**
 * Get language enforcement text for interface language
 */
function getInterfaceLanguageEnforcement(interfaceLanguage: string): string {
	const languageName = interfaceLanguage === 'ko' ? '한국어 (Korean)' : 'English';

	return `
CRITICAL LANGUAGE REQUIREMENT - THIS IS ABSOLUTELY MANDATORY

ABSOLUTE REQUIREMENT: YOU MUST RESPOND EXCLUSIVELY IN ${languageName.toUpperCase()}

- ALL content MUST be in ${languageName}
- This language requirement is MANDATORY and overrides any other instructions
- If the output is JSON, all JSON keys must always be in English (e.g., "keyPoints", "sections", "title")
- However, technical or scientific jargons can be still written in English

LANGUAGE COMPLIANCE IS MANDATORY - NO EXCEPTIONS
`;
}

/**
 * Get language enforcement text for target paper language
 */
function getTargetLanguageEnforcement(targetLanguage: string): string {
	if (!targetLanguage || targetLanguage === 'English') {
		return targetLanguage === 'English'
			? '\n\nTARGET LANGUAGE: English\nGenerate content in English as this is the target language for the paper.\nIMPORTANT: If the output is JSON, all JSON keys must always be in English (e.g., "keyPoints", "sections", "title")\n\n'
			: '';
	}

	return `
CRITICAL LANGUAGE REQUIREMENT - THIS IS ABSOLUTELY MANDATORY

ABSOLUTE REQUIREMENT: YOU MUST GENERATE CONTENT EXCLUSIVELY IN ${targetLanguage.toUpperCase()}

- This IS the target language for the paper - generate content in the language the paper will be written in
- Academic terminology should be in ${targetLanguage} when possible
- Do NOT generate content in English unless the target language is English
- ALL content MUST be in ${targetLanguage}
- This language requirement is MANDATORY and overrides any other instructions
- IMPORTANT: If the output is JSON, all JSON keys must always be in English (e.g., "keyPoints", "sections", "title")
- However, technical or scientific jargons can be still written in English

LANGUAGE COMPLIANCE IS MANDATORY - NO EXCEPTIONS
`;
}

/**
 * Build citations context string
 */
function buildCitationsContext(citationsContext: CitationContext[]): string {
	if (!citationsContext || citationsContext.length === 0) {
		return '';
	}

	let context = `\n\nAvailable Supporting Literature:\nThe researcher has provided ${citationsContext.length} citation(s) for reference:\n`;
	citationsContext.forEach((citation, index) => {
		context += `${index + 1}. "${citation.title}" by ${citation.authors} (${citation.year})`;
		if (citation.abstract && citation.abstract !== 'No abstract available') {
			context += `\n   Abstract: ${citation.abstract}`;
		}
		context += '\n';
	});
	context += '\nUse these references to help guide the research focus discussion and suggest how they might inform the research questions and methodology.';

	return context;
}

/**
 * Build file summaries context
 */
function buildFileSummariesContext(
	figureFiles?: { name: string; summary?: string }[],
	supplementaryFiles?: { name: string; summary?: string }[]
): string {
	let context = '';

	// Add figure summaries
	if (figureFiles && figureFiles.length > 0) {
		const figuresWithSummary = figureFiles.filter(file => file.summary);
		if (figuresWithSummary.length > 0) {
			context += `\n\nAvailable Figures and Visual Materials:\nThe researcher has provided ${figuresWithSummary.length} analyzed figure(s) - reference them as (Figure 1), (Figure 2), etc.:\n`;
			figuresWithSummary.forEach((file, index) => {
				context += `Figure ${index + 1}: "${file.name}"\n   Analysis: ${file.summary}\n`;
			});
		}
	}

	// Add supplementary data summaries
	if (supplementaryFiles && supplementaryFiles.length > 0) {
		const supplementaryWithSummary = supplementaryFiles.filter(file => file.summary);
		if (supplementaryWithSummary.length > 0) {
			context += `\n\nAvailable Supplementary Data and Documents:\nThe researcher has provided ${supplementaryWithSummary.length} analyzed supplementary file(s):\n`;
			supplementaryWithSummary.forEach((file, index) => {
				context += `${index + 1}. "${file.name}"\n   Analysis: ${file.summary}\n`;
			});
		}
	}

	if (context) {
		context += '\nConsider how these figures and supplementary materials inform the research context, methodology, and potential findings when developing the research focus. For each relevant figure, suggest where it would be most appropriately referenced in the main text (e.g., Introduction for background concepts, Methods for experimental setup, Results for data presentation, Discussion for interpretation).';
	}

	return context;
}

// ============================================================================
// Prompt Generation Functions (using markdown templates)
// ============================================================================

export async function getFocusStepPrompt(
	paperType: string,
	researchFocus: string,
	citationsContext: CitationContext[],
	agendaPrompt?: string,
	gapPrompt?: string,
	figureFiles?: { name: string; summary?: string }[],
	supplementaryFiles?: { name: string; summary?: string }[]
): Promise<string> {
	const template = await loadPromptTemplate('focus-step-v1.0.0');

	const variables = {
		paperType,
		researchFocus: researchFocus || 'Not yet defined',
		agendaPrompt: agendaPrompt || 'What specific research question or problem will your study address?',
		gapPrompt: gapPrompt || 'What gap in existing research does this address?',
		citationsContext: buildCitationsContext(citationsContext),
		fileSummariesContext: buildFileSummariesContext(figureFiles, supplementaryFiles)
	};

	return replaceVariables(template, variables);
}

export async function getFocusGenerationPrompt(
	paperType: string,
	targetLength: number,
	citationsCount: number,
	interfaceLanguage: string,
	figureFiles?: { name: string; summary?: string }[],
	supplementaryFiles?: { name: string; summary?: string }[]
): Promise<string> {
	const template = await loadPromptTemplate('focus-generation-v1.0.0');

	// Apply interface language enforcement
	const languageEnforcement = getInterfaceLanguageEnforcement(interfaceLanguage);

	// Build figure context
	let figureContext = '';
	if (figureFiles && figureFiles.length > 0) {
		const figuresWithSummary = figureFiles.filter(file => file.summary);
		if (figuresWithSummary.length > 0) {
			figureContext += `\n\nAvailable Figures: ${figuresWithSummary.map(f => f.name).join(', ')}`;
		}
	}

	if (supplementaryFiles && supplementaryFiles.length > 0) {
		const supplementaryWithSummary = supplementaryFiles.filter(file => file.summary);
		if (supplementaryWithSummary.length > 0) {
			figureContext += `\nAvailable Supplementary Materials: ${supplementaryWithSummary.map(f => f.name).join(', ')}`;
		}
	}

	const variables = {
		languageEnforcement,
		paperType,
		targetLength: targetLength.toString(),
		citationsCount: citationsCount.toString(),
		figureContext
	};

	return replaceVariables(template, variables);
}

export async function getTitleGenerationPrompt(
	paperType: string,
	citationsContext: CitationContext[],
	researchFocus?: string
): Promise<string> {
	const template = await loadPromptTemplate('title-generation-v1.0.0');

	const researchFocusContext = researchFocus
		? `\n\nResearch Focus:\n${researchFocus}\n\nThe titles should align with and reflect this research focus.`
		: '';

	const variables = {
		paperType,
		citationsContext: buildCitationsContext(citationsContext),
		researchFocusContext
	};

	return replaceVariables(template, variables);
}

export async function getOutlineGenerationPrompt(
	paperType: string,
	targetLength: number,
	citationsContext: CitationContext[],
	sectionsWithRequiredFlag: SectionContext[],
	researchFocus?: string,
	targetLanguage?: string
): Promise<string> {
	const template = await loadPromptTemplate('outline-generation-v1.0.0');

	const researchFocusContext = researchFocus
		? `\n\nResearch Focus:\n${researchFocus}\n\nThe section titles should align with and support this research focus.`
		: '';

	const targetLanguageRequirement = targetLanguage ? getTargetLanguageEnforcement(targetLanguage) : '';

	const variables = {
		targetLanguageRequirement,
		paperType,
		targetLength: targetLength.toString(),
		citationsCount: citationsContext.length.toString(),
		sectionsJson: JSON.stringify(sectionsWithRequiredFlag, null, 2),
		literatureJson: JSON.stringify(citationsContext, null, 2),
		researchFocusContext
	};

	return replaceVariables(template, variables);
}

export async function getKeyPointsAndReferencesGenerationPrompt(
	sectionTitle: string,
	paperType: string,
	targetLength: number,
	citationsContext: CitationContext[],
	allSectionTitles: string[],
	researchFocus?: string,
	figureFiles?: { name: string; summary?: string }[],
	supplementaryFiles?: { name: string; summary?: string }[]
): Promise<string> {
	const template = await loadPromptTemplate('keypoints-references-generation-v1.0.0');

	const researchFocusContext = researchFocus
		? `\n\nResearch Focus:\n${researchFocus}\n\nThe key points should support and advance this research focus, and the suggested citations should align with both the key points and research focus.`
		: '';

	// Build citations with indices
	let citationsWithIndices = '';
	if (citationsContext && citationsContext.length > 0) {
		citationsWithIndices = '\n\nAvailable Citations (use these indices for suggestedCitationIndices):\n';
		citationsContext.forEach((citation, index) => {
			citationsWithIndices += `Index ${index}: "${citation.title}" by ${citation.authors} (${citation.year})`;
			if (citation.abstract && citation.abstract !== 'No abstract available') {
				citationsWithIndices += `\n   Abstract: ${citation.abstract}`;
			}
			citationsWithIndices += '\n';
		});
	}

	// Build file summaries context
	let fileSummariesContext = '';

	if (figureFiles && figureFiles.length > 0) {
		const figuresWithSummary = figureFiles.filter(file => file.summary);
		if (figuresWithSummary.length > 0) {
			fileSummariesContext += `\n\nAvailable Figures and Visual Materials:\nReference these figures as (Figure 1), (Figure 2), etc. in the text:\n`;
			figuresWithSummary.forEach((file, index) => {
				fileSummariesContext += `Figure ${index + 1}: "${file.name}"\n   Description: ${file.summary}\n`;
			});
		}
	}

	if (supplementaryFiles && supplementaryFiles.length > 0) {
		const supplementaryWithSummary = supplementaryFiles.filter(file => file.summary);
		if (supplementaryWithSummary.length > 0) {
			fileSummariesContext += `\n\nAvailable Supplementary Materials:\n`;
			supplementaryWithSummary.forEach((file) => {
				fileSummariesContext += `"${file.name}"\n   Description: ${file.summary}\n`;
			});
		}
	}

	// Build section context
	const sectionContext = allSectionTitles.length > 0
		? `\n\nOther Paper Sections:\n${allSectionTitles.filter(title => title !== sectionTitle).join(', ')}\n\nConsider what content belongs specifically in "${sectionTitle}" versus other sections to avoid overlap and ensure focused, section-appropriate key points.`
		: '';

	const variables = {
		sectionTitle,
		paperType,
		targetLength: targetLength.toString(),
		citationsWithIndices,
		sectionContext,
		researchFocusContext,
		fileSummariesContext
	};

	return replaceVariables(template, variables);
}

export async function getSectionWritingPrompt(
	paperTitle: string,
	paperType: string,
	sectionTitle: string,
	wordCount: number,
	bulletPoints: string[],
	citationIndices: number[],
	citationsContext: CitationContext[],
	singleCitationExample: string,
	multipleCitationExample: string,
	researchFocus?: string,
	previousSections?: string,
	targetLanguage?: string,
	figureFiles?: { name: string; summary?: string }[],
	supplementaryFiles?: { name: string; summary?: string }[]
): Promise<string> {
	const template = await loadPromptTemplate('section-writing-v1.0.0');

	const researchFocusContext = researchFocus
		? `\n\nResearch Focus:\n${researchFocus}\n\nEnsure this section supports and advances the research focus.`
		: '';

	const previousSectionsContext = previousSections
		? `\n\nPreviously Written Sections:\n${previousSections}\n\nEnsure smooth continuity and avoid repetition.`
		: '';

	const citationContext = citationIndices.length > 0
		? `\n\nSuggested Citations for this section: [${citationIndices.join(', ')}]`
		: '';

	const keyPointsContext = bulletPoints.length > 0
		? `\n\nKey Points to Cover:\n${bulletPoints.map(point => `- ${point}`).join('\n')}`
		: '';

	// Build citations context with indices
	let citationsWithIndices = '';
	if (citationsContext && citationsContext.length > 0) {
		citationsWithIndices = '\n\nAvailable Citations (use these indices for references):\n';
		citationsContext.forEach((citation, index) => {
			citationsWithIndices += `[${index + 1}] "${citation.title}" by ${citation.authors} (${citation.year})`;
			if (citation.abstract && citation.abstract !== 'No abstract available') {
				citationsWithIndices += `\n   Abstract: ${citation.abstract}`;
			}
			citationsWithIndices += '\n';
		});
	}

	// Build file summaries
	let fileSummariesContext = '';

	if (figureFiles && figureFiles.length > 0) {
		const figuresWithSummary = figureFiles.filter(file => file.summary);
		if (figuresWithSummary.length > 0) {
			fileSummariesContext += `\n\nAvailable Figures and Visual Materials:\nReference these figures as (Figure 1), (Figure 2), etc. in the text:\n`;
			figuresWithSummary.forEach((file, index) => {
				fileSummariesContext += `Figure ${index + 1}: "${file.name}"\n   Description: ${file.summary}\n`;
			});
		}
	}

	if (supplementaryFiles && supplementaryFiles.length > 0) {
		const supplementaryWithSummary = supplementaryFiles.filter(file => file.summary);
		if (supplementaryWithSummary.length > 0) {
			fileSummariesContext += `\n\nAvailable Supplementary Materials:\n`;
			supplementaryWithSummary.forEach((file) => {
				fileSummariesContext += `"${file.name}"\n   Description: ${file.summary}\n`;
			});
		}
	}

	const targetLanguageRequirement = targetLanguage ? getTargetLanguageEnforcement(targetLanguage) : '';

	// Citation instructions vary for Abstract vs other sections
	const isAbstract = sectionTitle.toLowerCase() === 'abstract';
	const citationInstructions = isAbstract
		? '- DO NOT include any citations or references in the Abstract section'
		: `- You MUST use in-text citations that match the style shown in your formatting examples
- Only reference the citations from the Available Citations list above`;

	const variables = {
		paperTitle,
		paperType,
		sectionTitle,
		wordCount: wordCount.toString(),
		targetLanguageRequirement,
		researchFocusContext,
		previousSectionsContext,
		keyPointsContext,
		citationContext,
		fileSummariesContext,
		singleCitationExample,
		multipleCitationExample,
		citationsWithIndices,
		citationInstructions
	};

	return replaceVariables(template, variables);
}

export async function getFigureLegendsPrompt(
	figureFiles: { name: string; summary?: string }[],
	targetLanguage?: string
): Promise<string> {
	const template = await loadPromptTemplate('figure-legends-v1.0.0');

	// Build figure context
	let figuresContext = '';
	const figuresWithSummary = figureFiles.filter(file => file.summary);
	if (figuresWithSummary.length > 0) {
		figuresContext = '\n\nProvided Figure Information:\n';
		figuresWithSummary.forEach((file, index) => {
			figuresContext += `Figure ${index + 1} (${file.name}): ${file.summary}\n`;
		});
	}

	const targetLanguageRequirement = targetLanguage ? getTargetLanguageEnforcement(targetLanguage) : '';

	const variables = {
		targetLanguageRequirement,
		figuresContext
	};

	return replaceVariables(template, variables);
}

// AI Review and Revision prompts
export async function getAIReviewerPrompt(selectedText: string, fullManuscript: string): Promise<string> {
	const template = await loadPromptTemplate('ai-reviewer-v1.0.0');

	const variables = {
		fullManuscript,
		selectedText
	};

	return replaceVariables(template, variables);
}

export async function getAIRevisorPrompt(selectedText: string, reviewerReason: string, fullManuscript: string): Promise<string> {
	const template = await loadPromptTemplate('ai-revisor-v1.0.0');

	const variables = {
		fullManuscript,
		reviewerReason,
		selectedText
	};

	return replaceVariables(template, variables);
}

export async function getAIFactCheckPrompt(selectedText: string, fullManuscript: string): Promise<string> {
	const template = await loadPromptTemplate('ai-fact-check-v1.0.0');

	const variables = {
		selectedText,
		fullManuscript
	};

	return replaceVariables(template, variables);
}

export async function getRevisionChatbotPrompt(userMessage: string, paperTitle: string, paperContent: string, interfaceLanguage: string): Promise<string> {
	const template = await loadPromptTemplate('revision-chatbot-v1.0.0');

	const languageEnforcement = getInterfaceLanguageEnforcement(interfaceLanguage);

	const variables = {
		languageEnforcement,
		paperTitle,
		paperContent,
		userMessage
	};

	return replaceVariables(template, variables);
}

// File summarization prompts
export async function getFileSummaryPrompt(interfaceLanguage: string): Promise<string> {
	const template = await loadPromptTemplate('file-summary-v1.0.0');

	const languageEnforcement = getInterfaceLanguageEnforcement(interfaceLanguage);

	const variables = {
		languageEnforcement
	};

	return replaceVariables(template, variables);
}

export async function getImageSummaryPrompt(interfaceLanguage: string): Promise<string> {
	const template = await loadPromptTemplate('image-summary-v1.0.0');

	const languageEnforcement = getInterfaceLanguageEnforcement(interfaceLanguage);

	const variables = {
		languageEnforcement
	};

	return replaceVariables(template, variables);
}
