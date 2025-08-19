# Scientific Paper Writer Assistant

An AI-powered scientific paper writing assistant that helps researchers write papers based on their thoughts, experimental outcomes, and literature research. The application uses an agentic workflow to guide users through the complete paper writing process.

## Features

- **Agentic Workflow**: Guided paper writing process with structured steps
- **Multi-LLM Support**: Supports various AI models via OpenRouter API
- **Interactive Chat**: Real-time collaboration with AI during draft editing
- **Clean Web Interface**: Modern, utilitarian design with tabbed output
- **Local Storage**: Persistent data storage in browser
- **Internationalization**: Support for multiple languages

## Quick Start

### Prerequisites

- Node.js 21+
- API keys for OpenRouter or supported LLM providers

### Setup

1. Clone the repository and navigate to the frontend directory:
```bash
git clone <repository-url>
cd paperwriter/frontend
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

## Usage

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

## Configuration

The application stores settings locally in your browser. Configure:

- **OpenRouter API Key**: Your API key for accessing AI models
- **AI Model**: Choose from available models on OpenRouter
- **Language**: Select interface language (English/Korean supported)

### Citation Styles

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