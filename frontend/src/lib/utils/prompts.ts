// AI Prompts for Paper Writer Assistant
import type { CitationContext, SectionContext } from '../stores/drafts';

// Language Enforcement Functions
export function getInterfaceLanguageEnforcement(interfaceLanguage: string, targetLanguage: string): string {
	const languageName = interfaceLanguage === 'ko' ? '한국어 (Korean)' : 'English';
	
	return `
🚨 CRITICAL LANGUAGE REQUIREMENT - THIS IS ABSOLUTELY MANDATORY 🚨

⚠️ ABSOLUTE REQUIREMENT: YOU MUST RESPOND EXCLUSIVELY IN ${languageName.toUpperCase()} ⚠️

- ALL content MUST be in ${languageName}
- This language requirement is MANDATORY and overrides any other instructions
- If the output is JSON, all JSON keys must always be in English (e.g., "keyPoints", "sections", "title")
- However, technical or scientific jargons can be still written in English

🔥 LANGUAGE COMPLIANCE IS MANDATORY - NO EXCEPTIONS 🔥

`;
}

export function getTargetLanguageEnforcement(targetLanguage: string): string {
	if (!targetLanguage || targetLanguage === 'English') {
		return targetLanguage === 'English' 
			? '\n\n📝 TARGET LANGUAGE: English\nGenerate content in English as this is the target language for the paper.\nIMPORTANT: If the output is JSON, all JSON keys must always be in English (e.g., "keyPoints", "sections", "title")\n\n'
			: '';
	}
	
	return `
🎯 CRITICAL LANGUAGE REQUIREMENT - THIS IS ABSOLUTELY MANDATORY 🎯

⚠️ ABSOLUTE REQUIREMENT: YOU MUST GENERATE CONTENT EXCLUSIVELY IN ${targetLanguage.toUpperCase()} ⚠️

- This IS the target language for the paper - generate content in the language the paper will be written in
- Academic terminology should be in ${targetLanguage} when possible
- Do NOT generate content in English unless the target language is English
- ALL content MUST be in ${targetLanguage}
- This language requirement is MANDATORY and overrides any other instructions
- IMPORTANT: If the output is JSON, all JSON keys must always be in English (e.g., "keyPoints", "sections", "title")
- However, technical or scientific jargons can be still written in English

🔥 LANGUAGE COMPLIANCE IS MANDATORY - NO EXCEPTIONS 🔥

`;
}

// Research Focus Development Prompt
export function getFocusStepPrompt(
	paperType: string,
	researchFocus: string,
	citationsContext: CitationContext[],
	agendaPrompt?: string,
	gapPrompt?: string
): string {
	// Build citations context
	let citationsContextString = '';
	if (citationsContext && citationsContext.length > 0) {
		citationsContextString = `\n\nAvailable Supporting Literature:\nThe researcher has provided ${citationsContext.length} citation(s) for reference:\n`;
		citationsContext.forEach((citation, index) => {
			citationsContextString += `${index + 1}. "${citation.title}" by ${citation.authors} (${citation.year})`;
			if (citation.abstract && citation.abstract !== 'No abstract available') {
				citationsContextString += `\n   Abstract: ${citation.abstract.substring(0, 200)}${citation.abstract.length > 200 ? '...' : ''}`;
			}
			citationsContextString += '\n';
		});
		citationsContextString += '\nUse these references to help guide the research focus discussion and suggest how they might inform the research questions and methodology.';
	}

	return `You are an expert research assistant helping a researcher develop their research focus for a ${paperType} paper. 
		
Key questions to guide the discussion:
- ${agendaPrompt || 'What specific research question or problem will your study address?'}
- ${gapPrompt || 'What gap in existing research does this address?'}

Current research focus: ${researchFocus || 'Not yet defined'}${citationsContextString}

Guidelines:
- Title will be defined later, suggest a working title based on the research focus
- Be thorough and comprehensive in your responses
- Ask clarifying questions to help refine their research focus
- Suggest specific research questions and gaps based on the provided literature
- Help them articulate their methodology and approach
- Reference the provided citations when relevant to strengthen research focus
- Provide detailed explanations and examples when helpful
- You MUST NOT use tables in your answer - instead, use bullet points or numbered lists.`;
}

// Research Focus Generation from Chat History Prompt
export function getFocusGenerationPrompt(
	paperType: string,
	targetLength: number,
	citationsCount: number,
	interfaceLanguage: string
): string {
	// Apply interface language enforcement for UI interaction
	const languageEnforcement = getInterfaceLanguageEnforcement(interfaceLanguage, 'English');
	
	return `${languageEnforcement}You are an expert academic research assistant. Based on the conversation history below, write a comprehensive and focused research statement that:

1. Synthesizes the key insights from the entire conversation
2. Clearly articulates the research problem and objectives
3. Highlights the research gap or contribution
4. Is suitable for academic paper writing
5. Is concise but comprehensive

Paper Type: ${paperType}
Target Length: ${targetLength} words
Citations Available: ${citationsCount} references

Requirements:
- Format as bullet points for easy reading and editing
- Focus on research objectives, methodology approach, and expected contributions
- Synthesize discussion points rather than listing them
- Make it suitable for guiding the paper writing process
- Ensure clarity and academic rigor
- Connect the research to the broader field context discussed
- Highlight the significance and novelty of the proposed research

Generate a well-structured research focus statement in bullet point format that captures the essence of the research discussion and provides clear direction for academic paper writing.`;
}

// Title Generation Prompt
export function getTitleGenerationPrompt(
	paperType: string,
	citationsContext: CitationContext[],
	researchFocus?: string
): string {
	let citationsContextString = '';
	if (citationsContext && citationsContext.length > 0) {
		citationsContextString = `\n\nAvailable Supporting Literature:\nThe researcher has provided ${citationsContext.length} citation(s) for reference:\n`;
		citationsContext.forEach((citation, index) => {
			citationsContextString += `${index + 1}. "${citation.title}" by ${citation.authors} (${citation.year})`;
			if (citation.abstract && citation.abstract !== 'No abstract available') {
				citationsContextString += `\n   Abstract: ${citation.abstract.substring(0, 200)}${citation.abstract.length > 200 ? '...' : ''}`;
			}
			citationsContextString += '\n';
		});
		citationsContextString += '\nUse these references to help guide the research focus discussion and suggest how they might inform the research questions and methodology.';
	}

	const researchFocusContext = researchFocus 
		? `\n\nResearch Focus:\n${researchFocus}\n\nThe titles should align with and reflect this research focus.`
		: '';

	return `You are an expert research assistant helping generate compelling academic paper titles. 

Based on the provided literature and paper type (${paperType}), generate 5 diverse, professional academic paper titles that:
- Are specific and descriptive
- Follow academic title conventions
- Reflect the research focus and methodology
- Are appropriate for the paper type: ${paperType}
- Range from 8-15 words typically
- Use proper academic terminology
- Align with the defined research focus

${citationsContextString}${researchFocusContext}

Return exactly 5 title suggestions, one per line, without numbering or formatting.`;
}

// Outline Structure Generation Prompt
export function getOutlineGenerationPrompt(
	paperType: string,
	targetLength: number,
	citationsContext: CitationContext[],
	sectionsWithRequiredFlag: SectionContext[],
	researchFocus?: string,
	targetLanguage?: string
): string {
	const researchFocusContext = researchFocus 
		? `\n\nResearch Focus:\n${researchFocus}\n\nThe section titles should align with and support this research focus.`
		: '';

	// Add target language enforcement
	const targetLanguageRequirement = getTargetLanguageEnforcement(targetLanguage || 'English');

	return `${targetLanguageRequirement}You are an expert research assistant helping to refine a paper outline structure. Based on the paper type, target paper length, available literature, and research focus, customize the section titles to better reflect the research content.

Paper Type: ${paperType}
Target Paper Length: ${targetLength} words
Number of Citations: ${citationsContext.length}

Predefined Section Structure:
${JSON.stringify(sectionsWithRequiredFlag, null, 2)}

Available Literature:
${JSON.stringify(citationsContext, null, 2)}${researchFocusContext}

Customize the section structure to better reflect the available literature and research themes. You have flexibility to:
- Rename sections to be more specific and relevant to the research content
- Add new sections if needed for comprehensive coverage of the topic
- Remove sections that are not relevant to this specific research
- How the available literature relates to each section
- Specific terminology used in the citations
- Research themes that emerge from the literature
- How the sections support the defined research focus
- Making titles specific and simple

IMPORTANT: You can modify the structure as needed, but ensure:
- Essential sections like Abstract and Introduction are typically included
- The total number of sections is appropriate for the target length
- Section titles are specific to the research domain and focus

Respond with a JSON object in this exact format:
{
  "sections": [
    {
      "title": "Section 1",
      "wordCount": 500
    },
    {
      "title": "Section 2", 
      "wordCount": 800
    },
    {
      "title": "Section 3",
      "wordCount": 600
    }
  ]
}

IMPORTANT: The wordCount values should:
- Total exactly ${targetLength} words across all sections
- Follow academic writing conventions for ${paperType} papers
- Allocate appropriate proportions (Abstract shorter, Introduction/Discussion substantial, Main sections balanced)
- Consider section complexity and importance

Respond ONLY with valid JSON, no additional text.`;
}

// Combined Key Points and References Generation Prompt
export function getKeyPointsAndReferencesGenerationPrompt(
	sectionTitle: string,
	paperType: string,
	targetLength: number,
	citationsContext: CitationContext[],
	allSectionTitles: string[],
	researchFocus?: string
): string {
	const researchFocusContext = researchFocus 
		? `\n\nResearch Focus:\n${researchFocus}\n\nThe key points should support and advance this research focus, and the suggested citations should align with both the key points and research focus.`
		: '';

	// Build citations with indices for reference
	let citationsWithIndices = '';
	if (citationsContext && citationsContext.length > 0) {
		citationsWithIndices = '\n\nAvailable Citations (use these indices for suggestedCitationIndices):\n';
		citationsContext.forEach((citation, index) => {
			citationsWithIndices += `Index ${index}: "${citation.title}" by ${citation.authors} (${citation.year})`;
			if (citation.abstract && citation.abstract !== 'No abstract available') {
				citationsWithIndices += `\n   Abstract: ${citation.abstract.substring(0, 200)}${citation.abstract.length > 200 ? '...' : ''}`;
			}
			citationsWithIndices += '\n';
		});
	}

	// Build section context
	const sectionContext = allSectionTitles.length > 0 
		? `\n\nOther Paper Sections:\n${allSectionTitles.filter(title => title !== sectionTitle).join(', ')}\n\nConsider what content belongs specifically in "${sectionTitle}" versus other sections to avoid overlap and ensure focused, section-appropriate key points.`
		: '';

	return `You are an expert research assistant. Given a paper section title, available citations, paper type, and research focus, generate relevant key points to discuss in that section AND suggest the most relevant citations for those key points.

Section Title: "${sectionTitle}"
Article Type: ${paperType}
Article Target Length: ${targetLength} words${citationsWithIndices}${sectionContext}${researchFocusContext}

IMPORTANT SECTION TYPE DETECTION:
If the section title "${sectionTitle}" represents an Abstract section (regardless of language), then:
- Generate key points appropriate for an abstract (brief background/context, research objectives, methodology if applicable, key findings/results, conclusions)
- Set suggestedCitationIndices to an empty array [] since abstracts do not include citations
- Focus on providing a complete paper summary without citations

Generate an appropriate number of key points that should be discussed in the "${sectionTitle}" section AND suggest which citations (by index) would best support each key point. Determine the optimal number of key points based on the section's role, the ${targetLength}-word target length of the ${paperType} paper, and the available literature. Consider:
- The section's role in a ${paperType} paper
- How the available literature relates to this section
- What topics would logically be covered in this section specifically (not in other sections)
- How the points support the defined research focus
- Which citations would best support the arguments outlined in the key points
- Academic writing best practices for this section type
- Avoiding content overlap with other paper sections

Respond with a JSON object in this exact format (do not translate "keyPoints" and "suggestedCitationIndices"):
{
  "keyPoints": [
    "First key point with inline citation (Smith et al. 2023)",
    "Second key point with inline citation (Johnson et al. 2022)",
    "Third key point with multiple citations (Brown et al. 2021; Davis et al. 2023)"
  ],
  "suggestedCitationIndices": [0, 2, 1, 3]
}

IMPORTANT: Each key point MUST include inline citations in the format (LastName et al. Year) where the citations come from the available literature above. Use the author names and years from the citation list.

Generate points that are:
- Do NOT write long explanations - keep each key point concise and focused
- Use short, actionable phrases that outline what will be discussed
- Think of these as outline items, not full sentences or paragraphs
- Specific and actionable for writing
- Appropriate for the section type and paper type
- Informed by the available literature
- Aligned with the research focus
- Professional and academic in tone
- Include inline citations in (LastName et al. Year) format
- Focused specifically on this section (avoid overlap with other sections)

For suggestedCitationIndices:
- Use the index numbers from the Available Citations list above
- Select citations that best support the generated key points
- Include multiple citations if they strengthen the section
- Base selection on relevance to section topic, key points, and research focus
- If this is an Abstract section: ALWAYS return an empty array [] since abstracts do not include citations

Respond ONLY with valid JSON, no additional text.`;
}




// Individual Section Writing Prompt
export function getSectionWritingPrompt(
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
	targetLanguage?: string
): string {
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

	// Build citations context with indices for reference
	let citationsWithIndices = '';
	if (citationsContext && citationsContext.length > 0) {
		citationsWithIndices = '\n\nAvailable Citations (use these indices for references):\n';
		citationsContext.forEach((citation, index) => {
			citationsWithIndices += `[${index + 1}] "${citation.title}" by ${citation.authors} (${citation.year})`;
			if (citation.abstract && citation.abstract !== 'No abstract available') {
				citationsWithIndices += `\n   Abstract: ${citation.abstract.substring(0, 200)}${citation.abstract.length > 200 ? '...' : ''}`;
			}
			citationsWithIndices += '\n';
		});
	}

	const isAbstract = sectionTitle.toLowerCase().includes('abstract');
	const citationInstructions = isAbstract 
		? '- DO NOT include any citations or references in the Abstract section'
		: `- You MUST use in-text citations that match the style shown in your formatting examples
- Only reference the citations from the Available Citations list above`;

	// Use the reusable target language enforcement
	const targetLanguageRequirement = getTargetLanguageEnforcement(targetLanguage || 'English');

	return `You are an expert academic writer. Write the "${sectionTitle}" section for a ${paperType} paper.

Paper Title: "${paperTitle}"
Section: "${sectionTitle}"
Target Word Count: ${wordCount} words
Paper Type: ${paperType}${targetLanguageRequirement}${researchFocusContext}${previousSectionsContext}${keyPointsContext}${citationContext}

Citation Format Examples (YOU MUST FOLLOW THIS):
- Single citation: ${singleCitationExample}
- Multiple citations: ${multipleCitationExample}${citationsWithIndices}

CRITICAL SCIENTIFIC WRITING REQUIREMENTS - FOLLOW ALL RULES BELOW:

# How to Write Clear, Direct Scientific Prose: A Comprehensive Style Guide

## Core Philosophy: Directness Over Decoration

The most effective scientific writing communicates complex ideas through straightforward language and logical structure. Avoid the temptation to embellish simple concepts with unnecessarily elaborate vocabulary or convoluted sentence constructions.

## Sentence Construction Principles

### Build Sentences with Clear, Concrete Subjects

**Do:** "The underlying transcriptional and spatial heterogeneity of cells gives rise to the plethora of phenotypes observed in cell types, tissues, organs, and organisms."

**Don't:** "Single-cell sequencing technologies have revolutionized our ability to characterize this heterogeneity at unprecedented resolution, driving ambitious initiatives..."

Start sentences with tangible subjects that immediately orient the reader. Lead with what the sentence is actually about, not with abstract concepts or methodological tools.

### Use Progressive Information Layering

**Do:** "Recent technological advances have seen the profound adoption of single-cell sequencing to unravel transcriptional heterogeneity in healthy and diseased tissues, and have subsequently given rise to international consortia such as the human cell atlas (HCA)."

**Don't:** "However, understanding cellular function requires more than cataloging transcriptional states—it demands linking gene expression profiles to their precise spatial contexts within tissues."

Build complexity gradually within sentences. Start with the core concept, then add specifications and consequences in a logical sequence.

### Maintain Natural Flow Without Forced Transitions

**Do:** "Linking this transcriptional heterogeneity with spatial heterogeneity of cells is a critical factor in understanding cell identity in the context of the tissue..."

**Don't:** "This spatial dimension proves particularly critical in complex biological processes such as cancer progression..."

Let ideas connect through their logical relationship rather than relying on transitional phrases like "however," "particularly," or "specifically."

## Vocabulary Guidelines

### Choose Precision Over Elevation

**Do:** "accurate cell segmentation is difficult to achieve"

**Don't:** "accurate cell segmentation is difficult to achieve with current techniques due to tightly apposed or overlapping cells, varied cell morphologies, and technical artifacts"

Use the most direct word that conveys your meaning. "Difficult" communicates the challenge without unnecessary elaboration about "technical artifacts" or "varied morphologies."

### Avoid Inflated Descriptors

**Do:** "Such obstacles can result in detecting fewer cells or incorrect cell borders."

**Don't:** "These obstacles result in detecting fewer cells than are actually present, drawing inaccurate cell borders, and losing valuable mRNA molecules..."

Remove words like "actually present," "valuable," and "inaccurate" when the core meaning is clear without them.

### Use Technical Terms Consistently and Appropriately

**Do:** "Identification of cells relies on cell segmentation, a procedure demarcating the interior and exterior of the cell membranes, which relies on additional signals..."

**Don't:** "through cell segmentation, a procedure that demarcates the interior and exterior of cell membranes using additional signals"

Define technical concepts once, then use them consistently without re-explanation or slight variations in phrasing.

## Paragraph Architecture

### Lead with Clear Purpose Statements

**Do:** "Traditionally, mRNA molecules identified by in situ transcriptomics are assigned to cells and subsequently used for computing gene expression profiles of those cells."

**Don't:** "Traditionally, mRNA molecules identified by in situ transcriptomics are assigned to cells through cell segmentation..."

Open paragraphs by establishing the current state or practice, then build toward the problem or development.

### Develop Problems Through Logical Sequence

**Do:** Problem identification → Explanation of causes → Specific consequences → Broader implications

"However, accurate cell segmentation is difficult to achieve... [causes] → Such obstacles can result in... [immediate consequences] → This may result in... [broader implications]"

**Don't:** Jump between different aspects of the problem without clear logical progression.

### Connect Ideas Through Content Relationships

**Do:** "Therefore, there is a need for robust cell segmentation independent methods..."

**Don't:** "These limitations underscore the need for robust methods..."

Use logical connectors like "therefore" only when they reflect genuine cause-and-effect relationships, not to force connections between loosely related ideas.

## Specific Language Patterns

### Eliminate Unnecessary Qualifiers

**Do:** "accurate cell segmentation is difficult to achieve"

**Don't:** "accurate cell segmentation is difficult to achieve with current techniques due to tightly apposed or overlapping cells, varied cell morphologies, and technical artifacts in imaging"

Remove modifiers that don't add essential information. "Difficult" is sufficient; "with current techniques due to..." adds bulk without clarity.

### Avoid Stacked Adjectives

**Do:** "incorrect cell borders"

**Don't:** "inaccurate cell borders"

Choose one precise adjective rather than multiple similar ones.

### Use Active Construction When Natural

**Do:** "Recent technological advances have seen the profound adoption of single-cell sequencing..."

**Don't:** "Single-cell sequencing technologies have revolutionized our ability..."

Prefer constructions that feel natural and direct, whether active or passive.

## Problem Description Strategy

### Present Issues Factually

**Do:** "However, accurate cell segmentation is difficult to achieve with current techniques due to tightly apposed or overlapping cells, uneven cell borders, varying cell and nuclear shapes..."

**Don't:** "However, accurate cell segmentation is difficult to achieve with current techniques due to tightly apposed or overlapping cells, varied cell morphologies, and technical artifacts in imaging."

List specific, concrete obstacles rather than abstract categories like "technical artifacts."

### Show Consequences Systematically

**Do:** "Such obstacles can result in detecting fewer cells or incorrect cell borders. Subsequent analysis would then be spatially restricted to inaccurately segmented cells and may mean that large portions of meaningful mRNA signals are discarded."

**Don't:** "These obstacles result in detecting fewer cells than are actually present, drawing inaccurate cell borders, and losing valuable mRNA molecules that fall outside segmented regions."

Present consequences in order from immediate to downstream effects, using clear causal language.

## Solution Introduction Techniques

### Frame Solutions in Context

**Do:** "In this work, we introduce a computational framework named spot-based spatial cell-type analysis by multi-dimensional mRNA density estimation (SSAM)."

**Don't:** Focus immediately on technical details before establishing the framework's identity.

Introduce your approach by name and core concept before diving into technical specifications.

### Contrast with Existing Approaches

**Do:** "In contrast to existing methods, SSAM departs from the spatial restriction of approaches based on cell segmentation and instead identifies cell types using mRNA signals in the image..."

**Don't:** "An ideal approach would identify cell types directly from mRNA spatial patterns while preserving the full richness of the spatial information."

Show how your method differs from current practice rather than describing ideal scenarios.

## Application Description Guidelines

### Present Results Systematically

**Do:** "We demonstrate the robustness of SSAM in identifying (1) cell types in situ, (2) spatial distribution of cell types, (3) spatial relationships between cell types, and (4) tissue domains..."

**Don't:** List achievements without clear organizational structure.

Use numbered lists for complex demonstrations, maintaining parallel structure throughout.

### Provide Specific Examples

**Do:** "We demonstrate that SSAM (1) correctly identifies the spatial distribution of known cell types in regions missed in the SSp by cell segmentation based methods..."

**Don't:** Make vague claims about performance without concrete examples.

Give specific evidence for each claim using the actual datasets and results.

## Final Principles

### Trust Reader Intelligence

Write as if your readers are intelligent scientists who can understand complex ideas when presented clearly. Don't inflate language to make concepts seem more sophisticated.

### Maintain Consistent Tone

Keep the same level of formality and directness throughout. Avoid switching between casual and overly formal registers within the same piece.

### Focus on Information Density

Every sentence should advance the reader's understanding. Remove sentences that merely restate previous points or add atmospheric description without informational value.

CRITICAL INSTRUCTIONS:
- WRITE CONCISELY: Be comprehensive but concise - avoid unnecessary verbosity and redundant explanations
- IMPORTANT: The ABSTRACT section must contain NO citations - it should be citation-free
- AVOID author names in text - instead use references
- Synthesize information across papers rather than just summarizing each one individually
- Make connections between different studies and highlight agreements/disagreements
- Include specific quantitative results, methodologies, and findings from the papers
- FORMATTING: Unless specified, write ONLY in paragraph form - NO bullet points, NO numbered lists, NO itemized lists
- LOGICAL FLOW: Use connective words and phrases to create logical progression between ideas:
	* Use transitional phrases: "Therefore", "Consequently", "In this regard", "Furthermore", "Moreover", "However", "Nevertheless", "Similarly", "In contrast", "Building upon this"
	* Create logical bridges between paragraphs and sections
	* Ensure each paragraph flows naturally into the next
	* Avoid parallel listing of ideas - instead create a logical narrative that connects findings
- All content must be in flowing paragraph format with smooth, logical transitions between ideas

INTRODUCTION SECTION REQUIREMENTS:
- The Introduction must be SELF-CONTAINED and include clear explanations of ALL unfamiliar methodologies, technical terms, and concepts that appear in the papers
- Readers should understand all technical content WITHOUT needing to consult other sources
- Define and explain any specialized terminology, algorithms, techniques, or methodologies mentioned in the papers
- Provide sufficient background context so the review stands alone as a complete reference
- Include foundational concepts that are prerequisite knowledge for understanding the main content
- FINAL PARAGRAPH: The last paragraph of the Introduction section should briefly summarize what will be discussed in the whole manuscript, providing readers with a roadmap of the paper's content and organization. This paragraph must start with "In this [paper/review], "

STRICT SOURCE-BASED CONSTRAINT:
- Base the review EXCLUSIVELY on the information provided in the source papers below
- Do NOT add any external knowledge, context, or information not found in these sources
- Do NOT reference studies, data, or findings not included in the provided papers
- All claims, statistics, and statements must be traceable to the source papers
- If you need to make general statements about the field, base them only on trends visible in the provided papers
- Do not add background information or context from your training data
- For methodology explanations in Introduction, extract definitions and explanations only from the provided papers

Write the complete "${sectionTitle}" section following these guidelines:
- Target approximately ${wordCount} words
- Use proper markdown formatting with ## for the section header
- You MUST follow academic writing standards for ${paperType} papers
${citationInstructions}
- Cover all key points comprehensively
- Apply ALL the scientific writing requirements above
- Build naturally on previously written sections
- DO NOT include a References section in your output (it will be concatenated later)
- Write ONLY the content for this specific section

Begin writing the complete "${sectionTitle}" section now in markdown format:`;
}


// Legacy Key Points Generation Prompt (for backward compatibility)
export function getKeyPointsGenerationPrompt(
	sectionTitle: string,
	paperType: string,
	targetLength: number,
	citationsContext: CitationContext[],
	allSectionTitles: string[],
	researchFocus?: string
): string {
	// This function now delegates to the combined function but returns only key points
	return getKeyPointsAndReferencesGenerationPrompt(sectionTitle, paperType, targetLength, citationsContext, allSectionTitles, researchFocus);
}

// AI Reviewer Prompt for DragHandle (First Stage)
export function getAIReviewerPrompt(selectedText: string, fullManuscript?: string): string {
	const documentContext = fullManuscript 
		? `\n\nDOCUMENT CONTEXT:\nTo provide coherent assessment that considers the overall document, you have access to the full document below. Use this context to:\n- Understand how this section fits within the document structure\n- Maintain consistent evaluation standards across the document\n- Consider section flow and transitions with surrounding content\n\n### FULL DOCUMENT FOR CONTEXT\n${fullManuscript}\n\n---`
		: '';

	return `Your Role: You are an expert academic reviewer responsible for evaluating a section of an academic document.${documentContext}

Primary Task: You will analyze the section provided below and determine whether it needs revision. Your response must be in the exact format specified.

CRITICAL INSTRUCTIONS:
1. Output Format (STRICT):
Your output must follow this exact JSON format:
{"needs_revision": true/false, "reason": "detailed explanation"}

2. Internal Review Process:
You must perform a critical analysis of the section based on comprehensive evaluation criteria. The section should be evaluated thoroughly based on:

- Argument & Logic: Coherence, soundness of reasoning, and logical flow within the section
- Clarity & Presentation: Precision of language, sentence structure, and clarity of the main points
- Evidence & Support: Sufficiency and relevance of supporting data, citations, or claims
- Academic Writing Quality: Professional tone, appropriate terminology, and scholarly presentation
- Section Structure: Organization, transitions, and overall coherence of the section

CRITICAL REVISION RESTRAINT:
- Robotic, AI-generated language patterns are a MAJOR reason to recommend revision
- Only recommend revision if there are SIGNIFICANT issues that substantially impact comprehension, academic quality, or natural human writing style
- Do NOT recommend revision for minor stylistic preferences or trivial improvements
- Focus on major problems: robotic language, unclear arguments, poor structure, inadequate evidence, or serious writing issues
- If a section sounds artificial, overly formal, or machine-generated, it should be revised regardless of other quality factors
- Preserve the author's voice and style when possible, but prioritize natural human-like academic writing

CRITICAL REVISION PRIORITIES (identify sections with these issues):
- Robotic, AI-generated language patterns that sound artificial or overly formal (MAJOR PRIORITY)
- Factual errors, logical inconsistencies, or unclear arguments
- Poor sentence structure that impedes comprehension
- Missing or inadequate evidence for claims
- Inappropriate tone for academic writing
- Unclear or confusing explanations of methods or findings

REVISION RESTRAINT:
- Only recommend sections for revision if they have significant, critical issues
- Do not flag sections for minor stylistic preferences or subjective improvements
- Focus on content clarity, logical flow, and academic appropriateness
- Preserve the author's voice and writing style when possible

### SECTION TO REVIEW

${selectedText}`;
}

// AI Revisor Prompt for DragHandle (Second Stage)
export function getAIRevisorPrompt(selectedText: string, reviewerReason: string, fullManuscript?: string): string {
	const documentContext = fullManuscript 
		? `\n\nDOCUMENT CONTEXT:\nTo provide coherent revisions that align with the overall document, you have access to the full document below. Use this context to:\n- Maintain consistent terminology and style throughout the document\n- Ensure the revised section flows well with preceding and following sections\n- Preserve document-wide themes and arguments\n- Keep citations and references consistent with the document's style\n\n### FULL DOCUMENT FOR CONTEXT\n${fullManuscript}\n\n---`
		: '';

	const reviewerContext = `\n\nREVIEWER ASSESSMENT:\nThe reviewer identified the following specific issues with this section that MUST be addressed in your revision:\n${reviewerReason}\n\nCRITICAL: You must directly address each specific issue mentioned by the reviewer. If the reviewer mentions missing elements (like summary sentences or specific formatting), you MUST add them. If the reviewer mentions problematic language or expressions, you MUST replace them.\n\nMAJOR PRIORITY: If the reviewer identifies robotic, AI-generated, or overly formal language patterns, you must completely rewrite those sections to sound natural and human-like while maintaining academic standards. This is a PRIMARY concern that must be addressed thoroughly.\n\nYour revision will be evaluated based on how well it addresses these specific concerns, with natural writing style being of utmost importance.\n\n---`;

	return `Your Role: You are an expert academic editor and reviser.${documentContext}${reviewerContext}

Primary Task: Your task is to perform a complete revision of the section provided below. Your sole output will be the rewritten, polished text of that entire section.

CRITICAL INSTRUCTIONS:
1. Output Format (STRICT):
Your output must be a single string containing the full, rewritten text of the section.
Do not include any additional headers, comments, JSON formatting, or any text other than the revised section itself.

2. Revision Principles:
- Source-Based Revision: Your revision must be based EXCLUSIVELY on the information and intent present in the original section. Do not introduce new external facts, data, or concepts. The goal is to improve the presentation and argumentation of the existing material.
- Complete Rewrite: Your output should be a full and complete replacement for the original section, not a list of corrections.
- Section Coherence: Ensure the revised section maintains logical flow, proper transitions between ideas, and consistent academic tone throughout.
- Citation Preservation: Maintain all existing citations and references exactly as they appear in the original text.

NATURAL LANGUAGE REQUIREMENTS (FOR REVISION):
PRIORITY 1: Make the text sound natural and human-like - this is your PRIMARY objective
- Use direct, specific, and formal academic language that sounds conversational within academic bounds
- Write in a straightforward, professional manner that flows naturally
- If ANY part of the text sounds artificial, robotic, or machine-generated, completely rewrite it using natural human language

### SECTION TO REVISE

${selectedText}`;
}

// Legacy AI Revision Prompt for backward compatibility
export function getAIRevisionPrompt(selectedText: string, fullManuscript?: string): string {
	// For backward compatibility, use the reviewer prompt
	return getAIReviewerPrompt(selectedText, fullManuscript);
}

// AI Fact Check Prompt for DragHandle
export function getAIFactCheckPrompt(selectedText: string, fullManuscript?: string): string {
	const manuscriptContext = fullManuscript 
		? `\n\nFull Manuscript Context (for reference):\n"${fullManuscript}"\n\nUse this context to check for consistency with other claims in the manuscript and to better understand the overall research context.`
		: '';

	return `You are an expert academic fact-checker and research assistant. Your task is to analyze the selected text for potential factual issues, inconsistencies, or areas that may need verification.

Selected Text to Analyze:
"${selectedText}"${manuscriptContext}

Please analyze this text and identify:

1. **Factual Claims** - List any specific factual statements that can be verified
2. **Potential Issues** - Identify any claims that seem questionable, outdated, or unsupported
3. **Consistency Check** - Verify consistency with other claims and data in the manuscript
4. **Missing Context** - Note if important context or qualifications are missing
5. **Verification Suggestions** - Suggest what types of sources would be needed to verify claims
6. **Accuracy Assessment** - Provide an overall assessment of the text's reliability

IMPORTANT GUIDELINES:
- Focus on factual accuracy, not writing style
- Be objective and evidence-based in your assessment
- Check for internal consistency within the manuscript
- Distinguish between opinions/interpretations and factual claims
- Consider the academic context and standards
- If claims appear accurate and consistent, note that as well
- Suggest specific improvements if issues are found
- Pay attention to methodology, data interpretation, and statistical claims

Provide your analysis in a clear, structured format that helps the author understand any potential concerns and next steps for verification.`;
}

// AI Assistant Chatbot Prompt for Revisions
export function getRevisionChatbotPrompt(userMessage: string, paperTitle: string, paperContent: string): string {
	return `You are an AI assistant helping with academic paper revisions. You have access to the current draft content and can provide helpful suggestions.

Current Paper: "${paperTitle}"
Paper Content:
---
${paperContent}
---

User Question: "${userMessage}"

As an academic writing assistant, you can help with:
- Reviewing and suggesting improvements to specific sections
- Identifying areas that need more clarity or evidence
- Suggesting better word choices or sentence structure
- Checking for consistency in terminology and arguments
- Recommending places where citations might be needed
- Analyzing the overall flow and organization

Please provide helpful, specific suggestions based on the paper content above. Keep your response focused and actionable.`;
}