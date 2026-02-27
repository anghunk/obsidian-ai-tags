# AI Tags Generator

[English](README.en.md) | [简体中文](README.md)

A powerful Obsidian plugin that uses AI to intelligently generate tags for your notes, helping you better organize and manage your knowledge base.

![](https://github.com/user-attachments/assets/cd11f758-8846-440d-8ff7-dba637cbcaf9)

## ✨ Key Features

- 🤖 Supports Multiple Mainstream AI Providers
  - OpenAI
  - Gemini
  - DeepSeek
  - DeepSeek - Volcano Engine (other Volcano models are also supported)
  - Claude
  - Ollama (local LLM)

- 🏷️ Intelligent Tag Generation
  - Configurable number of tags to generate (default: 3)
  - 50% existing tag priority: AI will first select 50% most relevant tags from your existing tag list, then generate new tags for the rest
  - The relevance of existing tags is judged by AI, ensuring more accurate recommendations
  - Supports custom prompts for flexible tag generation style and rules

- 🛠️ Flexible Configuration
  - Custom API endpoint support
  - Custom model selection
  - Supports local Ollama models (no API Key required, privacy-friendly)
  - One-click restore to default API endpoint

- ⚡ Convenient Experience
  - One-click API connectivity test to quickly verify your configuration
  - Edit and filter recommended tags before applying
  - Automatically updates document frontmatter

## 🚀 Installation

> Note: This project is not yet available on the Obsidian plugin store.

1. Download the following files from the [GitHub Releases](https://github.com/anghunk/obsidian-ai-tags/releases) page:
   - main.js
   - manifest.json
   - styles.css
2. Create an `obsidian-ai-tags` folder in your Obsidian vault's `.obsidian/plugins/` directory
3. Place the downloaded files into the `obsidian-ai-tags` folder
4. Restart Obsidian
5. Enable AI Tags Generator in Settings > Community Plugins

**Or use the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat):**
1. Install the BRAT plugin
2. Add this repo to BRAT: `anghunk/obsidian-ai-tags`
3. Enable AI Tags Generator

## ⚙️ Configuration

1. Find "AI Tags Generator" in the Obsidian settings panel
2. Choose your preferred AI provider (Ollama/local supported)
3. Configure the provider:
   - API Key (if required)
   - API endpoint (optional, defaults to official or local endpoint)
   - Model selection
   - Custom prompt template (optional, for customizing tag generation style and rules)
   - One-click restore to default API endpoint
   - One-click API connectivity test
   - Configurable number of tags to generate

## 💡 Usage

- Open any Markdown note, click the sidebar tag icon or use the command palette to generate tags
- The plugin will prioritize recommending existing tags, and use AI to fill up to 3 tags
- You can edit and filter the recommended tags before applying; tags are written to the frontmatter

## ❓ FAQ

- **API connectivity test failed?**
  - Please check your API Key, endpoint, and network/proxy settings
- **How to use Ollama local models?**
  - Select Ollama (local), enter your local model name (e.g. llama3), no API Key required, make sure your local Ollama service is running
- **Tags not relevant enough?**
  - Try customizing the prompt or improving your tag library; AI will intelligently select the most relevant tags

---

MIT License | Contributions welcome | [GitHub Issues](https://github.com/anghunk/obsidian-ai-tags/issues)

## 🖼️ Feature Showcase

![](https://github.com/user-attachments/assets/571891dd-04cc-44f5-9168-3411133033ab)
![](https://github.com/user-attachments/assets/cd11f758-8846-440d-8ff7-dba637cbcaf9)
![](https://github.com/user-attachments/assets/0bb82f73-b3ab-49c9-b94f-558d6009477c)

## 📄 License

This project is open-source under the MIT License. Contributions and suggestions are welcome.

## 🙏 Acknowledgments

Thanks to all users who have provided feedback and suggestions for this project.