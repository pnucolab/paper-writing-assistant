# COLab Tools

A collection of AI-powered research tools developed by the Computational Omics Laboratory at Pusan National University. These tools are designed to assist researchers with various aspects of their scientific work while maintaining transparency, traceability, and human oversight.

## Quick Start

### Prerequisites

- Node.js 21+
- API keys for OpenRouter or supported LLM providers

### Setup

1. Clone the repository and navigate to the frontend directory:
```bash
git clone <repository-url>
cd colab-tools/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## Tools

### Scientific Paper Writing Assistant

An AI-powered scientific paper writing assistant that helps researchers write papers based on their thoughts, experimental outcomes, and literature research. The application uses an agentic workflow to guide users through the complete paper writing process.

#### Project Rationale

This tool was carefully designed to make all AI-assisted paper writing **traceable and transparent**, providing a comprehensive report of all user-AI interactions. Rather than generating research papers instantly, this application involves meaningful human interaction at each step to create better papers, lower language barriers, and maintain focus on scientific work.

#### Core Principles

- **Traceable AI Interactions**: Every AI interaction is logged and can be exported as a comprehensive report, ensuring full transparency in the writing process
- **Human-in-the-Loop Design**: Instead of instant paper generation, we guide you through each step with meaningful human oversight to create better, more thoughtful research
- **Lower Language Barriers**: Focus on your scientific work while AI assists with academic writing conventions, helping non-native speakers express their research clearly
- **Scientific Integrity**: Step-by-step human verification ensures quality, accuracy, and authentic scholarly contribution rather than automated content generation

#### Features

- **Agentic Workflow**: Guided paper writing process with structured steps
- **Multi-LLM Support**: Supports various AI models via OpenRouter API
- **Interactive Chat**: Real-time collaboration with AI during draft editing
- **Clean Web Interface**: Modern, utilitarian design with tabbed output
- **Local Storage**: Persistent data storage in browser
- **Internationalization**: Support for multiple languages

#### Usage

1. **Configure Settings**:
   - Go to Settings page
   - Enter your OpenRouter API key
   - Select your preferred AI model

2. **Create a New Paper**:
   - Click "New Paper" in the sidebar
   - Follow the guided workflow steps
   - Provide research topic and paper details

3. **Edit Drafts**:
   - Access your drafts from the Drafts page
   - Use the integrated editor to modify content
   - Chat with AI for writing assistance

#### Configuration

The application stores settings locally in your browser. Configure:

- **OpenRouter API Key**: Your API key for accessing AI models
- **AI Model**: Choose from available models on OpenRouter
- **Language**: Select interface language (English/Korean supported)

#### Citation Styles

Supported citation formats:
- APA (American Psychological Association)
- MLA (Modern Language Association)
- Chicago Manual of Style
- IEEE
- Nature

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub Issues page.