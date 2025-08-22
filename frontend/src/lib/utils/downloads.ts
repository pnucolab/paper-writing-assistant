import { toDocx } from 'mdast2docx';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Citation } from '$lib/stores/drafts';
import { listPlugin } from "@m2d/list";
import { tablePlugin } from '@m2d/table';
import { getUnifiedSettings } from '$lib/stores/settings';

interface DraftData {
	id: string;
	projectTitle: string;
	manuscriptTitle?: string;
	paperType?: string;
	targetLength?: number;
	targetLanguage?: string;
	researchFocus?: string;
	citations?: Citation[];
	paperOutline?: Array<{title: string; bulletPoints: string[]; citationIndices: number[]}>;
	content?: string;
	createdAt: string;
	lastModified: string;
	modelName?: string;
	providerType?: string;
}

/**
 * Download draft content as markdown file
 */
export function downloadMarkdown(content: string, filename: string) {
	const blob = new Blob([content], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${filename}.md`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Download draft content as DOCX file
 */
export async function downloadDocxFile(content: string, filename: string) {
	try {
		// Parse markdown to MDAST
		const mdast = unified().use(remarkParse).parse(content);
		
		// Convert to DOCX
		const docxBlob = await toDocx(mdast, {
			styles: {
				default: {
					document: {
						run: {
							font: 'Arial',
						},
						paragraph: {
							spacing: {
								line: 480, // 200%
							}
						},
					},
					title: {
						run: {
							bold: true,
							size: 24, // 12pt
						}
					},
					heading1: {
						run: {
							bold: true,
							size: 22, // 11pt
						},
						paragraph: {
							spacing: {
								before: 240
							}
						}
					},
					heading2: {
						run: {
							italics: true,
							size: 22, // 10pt
						},
						paragraph: {
							spacing: {
								before: 240
							}
						}
					},
				}
			}
		}, {
			plugins: [listPlugin(), tablePlugin()]
		});
		
		// Download the file
		const url = URL.createObjectURL(docxBlob as Blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${filename}.docx`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Failed to convert to DOCX:', error);
		throw new Error('Failed to generate DOCX file');
	}
}

export async function downloadProjectReport(draftData: DraftData) {
	const reportContent = generateTransparencyReportMarkdown(draftData);
	const filename = `${draftData.projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}_transparency_report`;
	
	try {
		// Parse markdown to MDAST
		const mdast = unified().use(remarkParse).parse(reportContent);
		
		// Convert to DOCX
		const docxBlob = await toDocx(mdast, {
			styles: {
				default: {
					document: {
						run: {
							font: 'Arial',
						},
						paragraph: {
							spacing: {
								line: 480, // 200%
							}
						},
					},
					title: {
						run: {
							bold: true,
							size: 24, // 12pt
						}
					},
					heading1: {
						run: {
							bold: true,
							size: 22, // 11pt
						},
						paragraph: {
							spacing: {
								before: 240
							}
						}
					},
					heading2: {
						run: {
							italics: true,
							size: 22, // 10pt
						},
						paragraph: {
							spacing: {
								before: 240
							}
						}
					},
				}
			}
		}, {
			plugins: [listPlugin(), tablePlugin()]
		});
		
		// Download the file
		const url = URL.createObjectURL(docxBlob as Blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${filename}.docx`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Failed to generate DOCX report:', error);
		throw new Error('Failed to generate transparency report');
	}
}

function generateTransparencyReportMarkdown(draftData: DraftData): string {
	const report: string[] = [];
	
	report.push('# AI-assisted Writing Transparency Report');
	report.push('');
	report.push(`**Manuscript Title:** ${draftData.manuscriptTitle}`);
	report.push(`**Report Generated:** ${new Date().toUTCString()}`);
	
	// Add AI model information
	if (draftData.modelName || draftData.providerType) {
		report.push('');
		report.push('## AI MODEL INFORMATION');
		if (draftData.modelName) {
			report.push(`**Model Used:** ${draftData.modelName}`);
		}
		if (draftData.providerType) {
			report.push(`**Provider:** ${draftData.providerType}`);
		}
	}
	
	report.push('');
	
	if (draftData.researchFocus) {
		report.push('## RESEARCH FOCUS');
		report.push('The following research focus was defined to generate the paper outline:');
		report.push('');
		report.push(draftData.researchFocus);
		report.push('');
	}
	
	if (draftData.paperOutline && draftData.paperOutline.length > 0) {
		report.push('## PAPER OUTLINE');
		
		draftData.paperOutline.forEach((section, index) => {
			report.push(`### ${index + 1}. ${section.title}`);
			section.bulletPoints.forEach((point) => {
				report.push(`- ${point}`);
			});
			report.push('');
		});
	}
	
	return report.join('\n');
}

/**
 * Load complete draft data from localStorage
 */
export function loadCompleteDraftData(draftId: string): DraftData | null {
	try {
		// Load main draft data
		const mainDrafts = JSON.parse(localStorage.getItem('paperwriter-drafts') || '[]');
		const mainDraft = mainDrafts.find((d: any) => d.id === draftId);
		
		if (!mainDraft) return null;

		const draftData: DraftData = {
			id: mainDraft.id,
			projectTitle: mainDraft.projectTitle,
			createdAt: mainDraft.createdAt,
			lastModified: mainDraft.lastModified
		};

		// Load format data
		const formatData = localStorage.getItem(`paperwriter-draft-${draftId}-format`);
		if (formatData) {
			const format = JSON.parse(formatData);
			draftData.paperType = format.paperType;
			draftData.targetLength = format.targetLength;
			draftData.targetLanguage = format.targetLanguage;
		}

		// Load outline data
		const outlineData = localStorage.getItem(`paperwriter-draft-${draftId}-outline`);
		if (outlineData) {
			const outline = JSON.parse(outlineData);
			draftData.manuscriptTitle = outline.title;
			draftData.paperOutline = outline.paperOutline;
		}

		// Load documents data
		const documentsData = localStorage.getItem(`paperwriter-draft-${draftId}-documents`);
		if (documentsData) {
			const documents = JSON.parse(documentsData);
			draftData.citations = documents.citations;
		}

		// Load focus data
		const focusData = localStorage.getItem(`paperwriter-draft-${draftId}-focus`);
		if (focusData) {
			const focus = JSON.parse(focusData);
			draftData.researchFocus = focus.researchFocus;
		}

		// Load writing data
		const writingData = localStorage.getItem(`paperwriter-draft-${draftId}-writing`);
		if (writingData) {
			const writing = JSON.parse(writingData);
			draftData.content = writing.content || writing.paperContent;
			
			// Load model information from writing data (the actual model used during writing)
			draftData.modelName = writing.modelName;
			draftData.providerType = writing.providerType;
		}

		return draftData;
	} catch (error) {
		console.error('Failed to load complete draft data:', error);
		return null;
	}
}