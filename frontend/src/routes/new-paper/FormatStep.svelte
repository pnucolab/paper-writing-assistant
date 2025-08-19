<script lang="ts">
    import { onMount } from 'svelte';
    import * as m from '$lib/paraglide/messages.js';

    import Label from '$lib/components/Label.svelte';
	import Select from '$lib/components/Select.svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';

	// Props
	let { 
		onNextStep,
	}: { 
		onNextStep: () => void;
	} = $props();

	// Paper format data
	let paperType = $state('research');
	let targetLength = $state(5000);
	let customLength = $state('');
	let targetLanguage = $state('English');

	// Paper types
    let paperTypes = $derived([
        { value: 'research', label: m.format_paper_type_research() },
        { value: 'review', label: m.format_paper_type_review() },
        { value: 'perspective', label: m.format_paper_type_perspective() },
        { value: 'protocol', label: m.format_paper_type_protocol() },
        { value: 'reply', label: m.format_paper_type_reply() },
        { value: 'letter', label: m.format_paper_type_letter() }
    ]);

	// Citation formatting state
	let citationStyle = $state('apa');
	let inlineCitationStyle = $state('author-year'); // author-year, numeric, parenthesis
	let includeUrls = $state(true);
	let includeDoi = $state(true);

	// Citation examples (derived from the preview)
	let singleInlineCitationExample = $derived(() => {
		if (inlineCitationStyle === 'author-year') {
			return '(Smith & Johnson, 2024)';
		} else if (inlineCitationStyle === 'numeric') {
			return '[1]';
		} else if (inlineCitationStyle === 'parenthesis') {
			return '(1)';
		}
		return '(Smith & Johnson, 2024)';
	});

	let multipleInlineCitationExample = $derived(() => {
		if (inlineCitationStyle === 'author-year') {
			return '(Smith & Johnson, 2024; Brown et al., 2023; Wilson, 2024)';
		} else if (inlineCitationStyle === 'numeric') {
			return '[1, 2, 5]';
		} else if (inlineCitationStyle === 'parenthesis') {
			return '(1, 2, 5)';
		}
		return '(Smith & Johnson, 2024; Brown et al., 2023; Wilson, 2024)';
	});

	let referenceCitationExample = $derived(() => {
		if (citationStyle === 'apa') {
			return `Smith, J. A., & Johnson, M. B. (2024). AI in academic writing. Journal of Technology, 15(3), 45-62.${includeDoi ? ' https://doi.org/10.1000/example' : ''}`;
		} else if (citationStyle === 'mla') {
			return `Smith, John A., and Mary B. Johnson. "AI in Academic Writing." Journal of Technology, vol. 15, no. 3, 2024, pp. 45-62${includeDoi ? ', doi:10.1000/example' : ''}.`;
		} else {
			return `Smith, J.A. and Johnson, M.B. (2024) 'AI in academic writing', Journal of Technology, 15(3), pp. 45-62${includeDoi ? '. doi: 10.1000/example' : ''}.`;
		}
	});

	// Citation styles
    let citationStyles = $derived([
        { value: 'apa', label: m.format_citation_apa() },
        { value: 'mla', label: m.format_citation_mla() },
        { value: 'chicago', label: m.format_citation_chicago() },
        { value: 'harvard', label: m.format_citation_harvard() },
        { value: 'ieee', label: m.format_citation_ieee() }
    ]);

	// Target paper lengths (in words)
	let targetLengths = $derived([
		{ value: 1000, label: m.format_target_length_option({ type: m.format_target_length_short(), count: '1,000' }) },
		{ value: 2500, label: m.format_target_length_option({ type: m.format_target_length_brief(), count: '2,500' }) },
		{ value: 5000, label: m.format_target_length_option({ type: m.format_target_length_standard(), count: '5,000' }) },
		{ value: 0, label: m.format_target_length_custom() }
	]);

	// Target languages
	const targetLanguages = [
		{ value: 'English', label: 'English' },
		{ value: 'Korean', label: '한국어 (Korean)' },
		{ value: 'Japanese', label: '日本語 (Japanese)' },
		{ value: 'Chinese', label: '中文 (Chinese)' },
		{ value: 'Spanish', label: 'Español (Spanish)' },
		{ value: 'French', label: 'Français (French)' },
		{ value: 'German', label: 'Deutsch (German)' },
		{ value: 'Italian', label: 'Italiano (Italian)' },
		{ value: 'Portuguese', label: 'Português (Portuguese)' },
		{ value: 'Russian', label: 'Русский (Russian)' }
	];

	let isCustomLength = $derived(() => {
		return targetLength === 0;
	});

	let finalTargetLength = $derived(() => {
		if (targetLength === 0) {
			const customNum = parseInt(customLength);
			return isNaN(customNum) ? 5000 : customNum;
		}
		return targetLength;
	});

	function savePaperFormat() {
		try {
			const format = {
				paperType,
				targetLength: finalTargetLength(),
				customLength,
				targetLanguage,
				citationStyle,
				inlineCitationStyle,
				includeUrls,
				includeDoi,
				singleCitationExample: singleInlineCitationExample(),
				multipleCitationExample: multipleInlineCitationExample(),
				referenceCitationExample: referenceCitationExample(),
				lastSaved: new Date().toISOString()
			};
			localStorage.setItem('paperwriter-paper-format', JSON.stringify(format));
		} catch (error) {
			console.error('Failed to save paper format:', error);
		}
	}

	function handleTargetLengthChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const value = parseInt(target.value);
		targetLength = value;
		
		// Reset custom length when switching away from custom
		if (value !== 0) {
			customLength = '';
		}
		
		// Auto-save draft
		savePaperFormat();
	}

    function proceedToNextStep() {
		savePaperFormat();
		onNextStep();
	}

	function loadPaperFormat() {
		try {
			const saved = localStorage.getItem('paperwriter-paper-format');
			if (saved) {
				const format = JSON.parse(saved);
				paperType = format.paperType || 'research';
				targetLength = format.targetLength || 5000;
				customLength = format.customLength || '';
				targetLanguage = format.targetLanguage || 'English';
				citationStyle = format.citationStyle || 'apa';
				inlineCitationStyle = format.inlineCitationStyle || 'author-year';
				includeUrls = format.includeUrls !== undefined ? format.includeUrls : true;
				includeDoi = format.includeDoi !== undefined ? format.includeDoi : true;
			}
		} catch (error) {
			console.error('Failed to load paper format:', error);
		}
	}
    
	// Load saved data on mount
	onMount(() => {
		loadPaperFormat();
	});
</script>

<!-- Citations Step -->
<div class="space-y-6">
    <!-- Paper Type Selection -->
    <Card>
        {#snippet header()}
            <Heading level="h3" size="lg">{m.format_step_title()}</Heading>
            <p class="text-secondary-600 mt-1">{m.format_step_subtitle()}</p>
        {/snippet}
        
        <div class="space-y-6">
            <div class="space-y-4">
                <Select
                    bind:value={paperType}
                    label={m.format_paper_type_label()}
                    onchange={() => savePaperFormat()}
                    options={paperTypes}
                />
                <hr class="border-secondary-200 mt-6 mb-4" />
                <Select
                    bind:value={targetLength}
                    onchange={handleTargetLengthChange}
                    label={m.format_target_length_label()}
                    options={targetLengths}
                />
                
                {#if isCustomLength()}
                    <Input
                        bind:value={customLength}
                        type="number"
                        label={m.format_custom_length_label()}
                        placeholder="Enter custom word count"
                        min={100}
                        max={50000}
                        oninput={() => savePaperFormat()}
                    />
                {/if}
                
                <hr class="border-secondary-200 mt-6 mb-4" />
                
                <Select
                    bind:value={targetLanguage}
                    label={m.format_target_language_label()}
                    helpText={m.format_target_language_help()}
                    onchange={() => savePaperFormat()}
                    options={targetLanguages}
                />
            </div>
        </div>
    </Card>

    <!-- Citation Formatting -->
    <Card>
        {#snippet header()}
            <Heading level="h3" size="lg">{m.format_citation_title()}</Heading>
            <p class="text-secondary-600 mt-1">{m.format_citation_subtitle()}</p>
        {/snippet}

        <div class="space-y-8">
            <!-- Citation Style Section -->
            <div>
                <Heading level="h4" size="md" class="mb-4">
                    {m.format_citation_style_section()}
                </Heading>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Select
                            bind:value={citationStyle}
                            label={m.format_citation_format_label()}
                            helpText={m.format_citation_format_help()}
                            options={citationStyles}
                            onchange={() => savePaperFormat()}
                        />
                    </div>

                    <div>
                        <Select
                            bind:value={inlineCitationStyle}
                            label={m.format_inline_citation_label()}
                            helpText={m.format_inline_citation_help()}
                            options={[
                                { value: 'author-year', label: m.format_inline_citation_author_year() },
                                { value: 'numeric', label: '[1]' },
                                { value: 'parenthesis', label: '(1)' }
                            ]}
                            onchange={() => savePaperFormat()}
                        />
                    </div>
                </div>
            </div>

            <hr class="border-secondary-200" />

            <!-- Citation Options Section -->
            <div>
                <Heading level="h4" size="md" class="mb-4">
                    {m.format_citation_options_section()}
                </Heading>
                
                <div class="space-y-4">
                    <div class="flex items-center justify-between py-3 border-b border-secondary-100 last:border-b-0">
                        <div>
                            <Label for="include-urls">{m.format_include_urls_label()}</Label>
                            <p class="text-sm text-secondary-500">{m.format_include_urls_help()}</p>
                        </div>
                        <input
                            id="include-urls"
                            type="checkbox"
                            bind:checked={includeUrls}
                            onchange={() => savePaperFormat()}
                            class="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                        />
                    </div>

                    <div class="flex items-center justify-between py-3 border-b border-secondary-100 last:border-b-0">
                        <div>
                            <Label for="include-doi">{m.format_include_doi_label()}</Label>
                            <p class="text-sm text-secondary-500">{m.format_include_doi_help()}</p>
                        </div>
                        <input
                            id="include-doi"
                            type="checkbox"
                            bind:checked={includeDoi}
                            onchange={() => savePaperFormat()}
                            class="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                        />
                    </div>
                </div>
            </div>

            <hr class="border-secondary-200" />

            <!-- Preview Section -->
            <div>
                <Heading level="h4" size="md" class="mb-4">
                    {m.format_preview_section()}
                </Heading>
                
                <!-- In-line Citation Examples -->
                <div class="mb-4">
                    <h6 class="text-sm font-semibold text-secondary-600 mb-2">{m.format_preview_inline_citations()}</h6>
                    <div class="border-l-2 border-primary-200 pl-3 py-2 text-sm text-secondary-700">
                        <p>
                            {#if inlineCitationStyle === 'author-year'}
                                AI is transforming academic writing <strong>(Smith & Johnson, 2024)</strong> and changing how researchers approach documentation <strong>(OpenAI, 2024)</strong>. Several studies support this conclusion <strong>(Smith & Johnson, 2024; Brown et al., 2023; Wilson, 2024)</strong> and demonstrate the effectiveness of these approaches.
                            {:else if inlineCitationStyle === 'numeric'}
                                AI is transforming academic writing <strong>[1]</strong> and changing how researchers approach documentation <strong>[2]</strong>. Several studies support this conclusion <strong>[1, 2, 5]</strong> while others show sequential findings <strong>[3-6]</strong>.
                            {:else if inlineCitationStyle === 'parenthesis'}
                                AI is transforming academic writing <strong>(1)</strong> and changing how researchers approach documentation <strong>(2)</strong>. Several studies support this conclusion <strong>(1, 2, 5)</strong> while others show sequential findings <strong>(3-6)</strong>.
                            {/if}
                        </p>
                    </div>
                </div>

                <!-- Bibliography Examples -->
                <div>
                    <h6 class="text-sm font-semibold text-secondary-600 mb-2">{m.format_preview_bibliography()}</h6>
                    <div class="space-y-3 text-sm text-secondary-700">
                        {#if citationStyle === 'apa'}
                            <div class="border-l-2 border-green-200 pl-3 py-2">
                                <p><strong>{m.format_preview_journal_article()}</strong> Smith, J. A., & Johnson, M. B. (2024). AI in academic writing. <em>Journal of Technology</em>, 15(3), 45-62. {includeDoi ? 'https://doi.org/10.1000/example' : ''}</p>
                            </div>
                            <div class="border-l-2 border-green-200 pl-3 py-2">
                                <p><strong>{m.format_preview_website()}</strong> OpenAI. (2024, March 15). ChatGPT documentation. <em>OpenAI</em>. {includeUrls ? 'https://openai.com/chatgpt' : ''}</p>
                            </div>
                        {:else if citationStyle === 'mla'}
                            <div class="border-l-2 border-green-200 pl-3 py-2">
                                <p><strong>{m.format_preview_journal_article()}</strong> Smith, John A., and Mary B. Johnson. "AI in Academic Writing." <em>Journal of Technology</em>, vol. 15, no. 3, 2024, pp. 45-62{includeDoi ? ', doi:10.1000/example' : ''}.</p>
                            </div>
                            <div class="border-l-2 border-green-200 pl-3 py-2">
                                <p><strong>{m.format_preview_website()}</strong> OpenAI. "ChatGPT Documentation." <em>OpenAI</em>, 15 Mar. 2024{includeUrls ? ', openai.com/chatgpt' : ''}.</p>
                            </div>
                        {:else}
                            <div class="border-l-2 border-green-200 pl-3 py-2">
                                <p><strong>{m.format_preview_journal_article()}</strong> Smith, J.A. and Johnson, M.B. (2024) 'AI in academic writing', Journal of Technology, 15(3), pp. 45-62{includeDoi ? '. doi: 10.1000/example' : ''}.</p>
                            </div>
                            <div class="border-l-2 border-green-200 pl-3 py-2">
                                <p><strong>{m.format_preview_website()}</strong> OpenAI (2024) ChatGPT documentation. Available at: {includeUrls ? 'https://openai.com/chatgpt' : '[URL]'} (Accessed: 15 March 2024).</p>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </Card>

    <!-- Navigation -->
    <div class="flex flex-row-reverse">
        <Button
            onclick={proceedToNextStep}
            variant="primary"
            iconRight="heroicons:arrow-right"
        >
            {m.format_next_step()}
        </Button>
    </div>
</div>
