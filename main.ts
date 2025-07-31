import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, Modal, MarkdownView, DropdownComponent, TextComponent } from 'obsidian';

import { AIService } from './src/services/AIService';

interface ProviderConfig {
	defaultUrl: string;
	defaultModel: string;
	models: string[];
}

interface ProviderConfigs {
	[key: string]: ProviderConfig;
}

const PROVIDER_CONFIGS: ProviderConfigs = {
	openai: {
		defaultUrl: 'https://api.openai.com/v1/chat/completions',
		defaultModel: 'gpt-3.5-turbo',
		models: ['gpt-3.5-turbo', 'gpt-4']
	},
	gemini: {
		defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
		defaultModel: 'gemini-pro',
		models: ['gemini-pro']
	},
	claude: {
		defaultUrl: 'https://api.anthropic.com/v1/messages',
		defaultModel: 'claude-3-opus-20240229',
		models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229']
	},
	deepseek: {
		defaultUrl: 'https://api.deepseek.com/v1/chat/completions',
		defaultModel: 'deepseek-chat',
		models: ['deepseek-chat']
	},
	volcano: {
		defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
		defaultModel: 'volcengine',
		models: ['volcengine']
	},
	ollama: {
		defaultUrl: 'http://localhost:11434/v1/chat/completions',
		defaultModel: 'llama3',
		models: ['llama3', 'phi3', 'qwen2', 'mistral']
	}
};

interface ProviderSettings {
	apiKey: string;
	apiUrl: string;
	model: string;
	customModel?: string;
}

interface AIServiceConfig {
	apiKey: string;
	apiUrl: string;
	model: string;
	customPrompt?: string;
}

interface AutoTaggerSettings {
	provider: string;
	providerSettings: {
		[key: string]: ProviderSettings;
	};
	customPrompt: string;
}

const DEFAULT_SETTINGS: AutoTaggerSettings = {
	provider: 'openai',
	providerSettings: {
		openai: {
			apiKey: '',
			apiUrl: PROVIDER_CONFIGS.openai.defaultUrl,
			model: PROVIDER_CONFIGS.openai.defaultModel
		},
		gemini: {
			apiKey: '',
			apiUrl: PROVIDER_CONFIGS.gemini.defaultUrl,
			model: PROVIDER_CONFIGS.gemini.defaultModel
		},
		claude: {
			apiKey: '',
			apiUrl: PROVIDER_CONFIGS.claude.defaultUrl,
			model: PROVIDER_CONFIGS.claude.defaultModel
		},
		deepseek: {
			apiKey: '',
			apiUrl: PROVIDER_CONFIGS.deepseek.defaultUrl,
			model: PROVIDER_CONFIGS.deepseek.defaultModel
		},
		volcano: {
			apiKey: '',
			apiUrl: PROVIDER_CONFIGS.volcano.defaultUrl,
			model: PROVIDER_CONFIGS.volcano.defaultModel
		},
		ollama: {
			apiKey: '',
			apiUrl: PROVIDER_CONFIGS.ollama.defaultUrl,
			model: PROVIDER_CONFIGS.ollama.defaultModel
		}
	},
	customPrompt: ''
};

export default class AutoTaggerPlugin extends Plugin {
	settings: AutoTaggerSettings;
	existingTags: Set<string> = new Set(); // 存储所有已有标签

	async onload() {
		await this.loadSettings();
		await this.loadExistingTags(); // 加载已有标签

		this.addRibbonIcon('tag', '生成标签', async () => {
			await this.generateTags();
		});

		this.addSettingTab(new AutoTaggerSettingTab(this.app, this));

		this.registerEvent(
			this.app.vault.on('rename', () => this.loadExistingTags())
		);
		this.registerEvent(
			this.app.vault.on('delete', () => this.loadExistingTags())
		);
		this.registerEvent(
			this.app.vault.on('create', () => this.loadExistingTags())
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// 替换标签提取逻辑，提取 frontmatter 和正文所有标签
	async loadExistingTags() {
		this.existingTags = new Set<string>();
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			// 1. frontmatter tags
			if (cache?.frontmatter && cache.frontmatter.tags) {
				const tags = Array.isArray(cache.frontmatter.tags)
					? cache.frontmatter.tags
					: [cache.frontmatter.tags];
				tags.forEach(tag => this.existingTags.add(tag));
			}
			// 2. inline tags
			if (cache?.tags) {
				cache.tags.forEach(tagObj => this.existingTags.add(tagObj.tag.replace(/^#/, '')));
			}
		}
	}

	// 查找最相关的已有标签
	findRelevantExistingTags(content: string): string[] {
		const relevantTags: string[] = [];
		const contentLower = content.toLowerCase();
		
		// 将内容分词（简单实现，可以改进）
		const words = contentLower.split(/[\s,，.。!！?？;；:：]/);
		
		// 遍历已有标签，查找匹配的
		for (const tag of this.existingTags) {
			const tagLower = tag.toLowerCase();
			// 如果标签在内容中出现，或者内容中的词在标签中出现
			if (contentLower.includes(tagLower) || words.some(word => tagLower.includes(word))) {
				relevantTags.push(tag);
				if (relevantTags.length >= 2) break; // 最多返回2个相关标签
			}
		}
		
		return relevantTags;
	}

	async generateTags() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('请打开一个文档以生成标签');
			return;
		}

		const file = activeView.file;
		const content = await this.app.vault.read(file);

		const loadingNotice = new Notice('正在生成标签...', 0);

		try {
			const tags = await this.analyzeTags(content);
			loadingNotice.hide();
			new TagSelectionModal(this.app, tags, async (selectedTags) => {
				await this.updateFileFrontMatter(file, selectedTags);
			}).open();
		} catch (error) {
			loadingNotice.hide();
			new Notice(`生成标签失败：${error.message}`);
		}
	}

	async analyzeTags(content: string): Promise<string[]> {
		const provider = this.settings.provider;
		const providerConfig = this.settings.providerSettings[provider];

		// 智能标签推荐：将所有已有标签和内容一起发给 AI
		if (!providerConfig) {
			new Notice('AI Tags 配置错误：未找到当前服务商的配置，请重新保存设置。');
			return [];
		}
		if (!providerConfig.apiUrl || !providerConfig.model) {
			new Notice('AI Tags 配置错误：API 地址或模型未设置，请在设置中补全。');
			return [];
		}

		// 构造智能 prompt
		const allExistingTags = Array.from(this.existingTags);
		const smartPrompt =
			`你是一个文档标签生成器。请根据以下文档内容和已有标签列表，优先从已有标签中挑选1-2个最相关的标签，再补充新标签使总数达到3个。如果没有合适的已有标签，可以全部新生成。只返回标签，用逗号分隔，不要包含其他内容。\n\n` +
			`文档内容：\n${content}\n\n` +
			`已有标签列表：\n${allExistingTags.join(', ')}\n`;

		const config: AIServiceConfig = {
			apiKey: providerConfig.apiKey,
			apiUrl: providerConfig.apiUrl,
			model: providerConfig.model,
			customPrompt: smartPrompt
		};
		const aiService = new AIService(config);
		try {
			const result = await aiService.generateTags(content);
			return result;
		} catch (error) {
			new Notice('AI Tags 生成标签时出错，请检查控制台日志。');
			return [];
		}
	}

	async updateFileFrontMatter(file: TFile, newTags: string[]) {
		const content = await this.app.vault.read(file);

		const yamlRegex = /^---\n([\s\S]*?)\n---/;
		const hasYaml = yamlRegex.test(content);

		let newContent;
		if (hasYaml) {
			const yamlMatch = content.match(yamlRegex);
			const yaml = yamlMatch[1];
			const tagsRegex = /^tags:\s*\[(.*)\]/m;
			const tagsMatch = yaml.match(tagsRegex);

			if (tagsMatch) {
				const existingTagsStr = tagsMatch[1];
				const existingTags = existingTagsStr
					.split(',')
					.map(tag => tag.trim())
					.filter(tag => tag !== '');

				const allTags = [...new Set([...existingTags, ...newTags])];

				newContent = content.replace(tagsRegex, `tags: [${allTags.join(', ')}]`);
			} else {
				newContent = content.replace(yamlRegex, `---\n${yaml}\ntags: [${newTags.join(', ')}]\n---`);
			}
		} else {
			newContent = `---\ntags: [${newTags.join(', ')}]\n---\n\n${content}`;
		}

		await this.app.vault.modify(file, newContent);
		new Notice(`已成功添加标签：${newTags.join(', ')}`);
	}
}

class TagSelectionModal extends Modal {
	tags: string[];
	onSubmit: (tags: string[]) => void;
	selectedTags: string[];

	constructor(app: App, tags: string[], onSubmit: (tags: string[]) => void) {
		super(app);
		this.tags = tags;
		this.onSubmit = onSubmit;
		this.selectedTags = [...tags];
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h3', { text: '标签生成' });

		const tagContainer = contentEl.createDiv({ cls: 'tag-container' });

		this.tags.forEach((tag, index) => {
			const tagRow = tagContainer.createDiv({ cls: 'tag-row' });

			const checkbox = tagRow.createEl('input', {
				type: 'checkbox',
				attr: { checked: true }
			});

			const tagInput = tagRow.createEl('input', {
				type: 'text',
				value: tag
			});

			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this.selectedTags[index] = tagInput.value;
				} else {
					this.selectedTags[index] = null;
				}
			});

			tagInput.addEventListener('input', () => {
				if (checkbox.checked) {
					this.selectedTags[index] = tagInput.value;
				}
			});
		});

		const buttonContainer = contentEl.createDiv({ cls: 'button-container' });

		buttonContainer.createEl('button', { text: '取消' }).addEventListener('click', () => {
			this.close();
		});

		buttonContainer.createEl('button', { text: '确定' }).addEventListener('click', () => {
			const finalTags = this.selectedTags.filter(tag => tag !== null);
			this.onSubmit(finalTags);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class AutoTaggerSettingTab extends PluginSettingTab {
	plugin: AutoTaggerPlugin;

	constructor(app: App, plugin: AutoTaggerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h3', { text: '自动标签生成设置' });

		// 添加 GitHub 链接
		const githubLink = containerEl.createEl('a', {
			text: '在 GitHub 上提交反馈',
			href: 'https://github.com/anghunk/obsidian-ai-tags'
		});
		githubLink.addClass('setting-item-description');
		githubLink.addClass('github-feedback-link');

		// 添加提供商说明
		const providerDescriptions = {
			openai: [
				'OpenAI',
				'• API 地址：https://api.openai.com/v1/chat/completions',
				'• 支持模型：gpt-4o-mini, gpt-4o, gpt-3.5-turbo'
			],
			gemini: [
				'Gemini',
				'• API 地址：https://generativelanguage.googleapis.com（暂不支持代理地址）',
				'• 支持模型：gemini-1.5-flash, gemini-2.0-flash'
			],
			claude: [
				'Claude',
				'• API 地址：https://api.anthropic.com/v1/messages',
				'• 支持模型：claude-3-5-sonnet, claude-3-7-sonnet, claude-3-opus, claude-3-haiku'
			],
			deepseek: [
				'DeepSeek - 深度求索',
				'• API 地址：https://api.deepseek.com/v1/chat/completions',
				'• 支持模型：deepseek-chat, deepseek-reasoner'
			],
			volcano: [
				'DeepSeek - 火山引擎',
				'• API 地址：https://ark.cn-beijing.volces.com/api/v3/chat/completions',
				'• 注意：需要在火山方舟设置推理模型，然后添加模型名称，如：ep-20250221084433'
			],
			ollama: [
				'Ollama（本地）',
				'• API 地址：http://localhost:11434/v1/chat/completions',
				'• 支持模型：llama3, phi3, qwen2, mistral 等本地模型',
				'• 本地部署，无需 API Key'
			]
		};

		const showProviderInfo = (provider: string) => {
			const providerSection = containerEl.querySelector('.provider-section');
			if (providerSection) {
				providerSection.remove();
			}

			const section = containerEl.createDiv({ cls: 'provider-section' });
			const providerInfo = section.createDiv({ cls: 'provider-info' });

			if (providerDescriptions[provider]) {
				providerDescriptions[provider].forEach(text => {
					providerInfo.createEl('p', { text });
				});
			}
		};

		// 显示当前选择的提供商信息
		showProviderInfo(this.plugin.settings.provider);

		// 添加提供商选择下拉框
		new Setting(containerEl)
			.setName('AI 服务商')
			.setDesc('选择要使用的 AI 服务商')
			.addDropdown(dropdown => {
				Object.keys(PROVIDER_CONFIGS).forEach(provider => {
					let label = '';
					switch (provider) {
						case 'openai': label = 'OpenAI'; break;
						case 'gemini': label = 'Gemini'; break;
						case 'claude': label = 'Claude'; break;
						case 'deepseek': label = 'DeepSeek - 深度求索'; break;
						case 'volcano': label = 'DeepSeek - 火山引擎'; break;
						case 'ollama': label = 'Ollama（本地）'; break;
						default: label = provider;
					}
					dropdown.addOption(provider, label);
				});
				dropdown.setValue(this.plugin.settings.provider);
				dropdown.onChange(async (value: string) => {
					// 保存当前提供商的设置
					const currentProvider = this.plugin.settings.provider;
					const currentSettings = this.plugin.settings.providerSettings[currentProvider];

					// 更新提供商
					this.plugin.settings.provider = value;

					// 初始化新提供商的设置（仅在首次设置时）
					if (!this.plugin.settings.providerSettings[value]) {
						this.plugin.settings.providerSettings[value] = {
							apiKey: '',
							apiUrl: PROVIDER_CONFIGS[value].defaultUrl,
							model: PROVIDER_CONFIGS[value].defaultModel
						};
					}

					await this.plugin.saveSettings();
					this.display();
				});
			});

		// API 密钥设置 + 测试连通性图标按钮
		new Setting(containerEl)
			.setName('API 密钥')
			.setDesc('输入你的 API 密钥')
			.addText((text: TextComponent) => {
				text.setPlaceholder('请输入 API 密钥')
					.setValue(this.plugin.settings.providerSettings[this.plugin.settings.provider].apiKey)
					.onChange(async (value: string) => {
						this.plugin.settings.providerSettings[this.plugin.settings.provider].apiKey = value;
						await this.plugin.saveSettings();
					});
			})
			.addExtraButton((btn) => {
				btn.setIcon('lucide-zap')
					.setTooltip('测试连通性')
					.onClick(async () => {
						btn.setDisabled(true);
						const originalIcon = btn.extraSettingsEl.querySelector('svg')?.outerHTML;
						btn.setIcon('lucide-loader');
						btn.extraSettingsEl.classList.add('ai-tags-spin');
						const provider = this.plugin.settings.provider;
						const config = this.plugin.settings.providerSettings[provider];
						const aiService = new AIService({
							apiKey: config.apiKey,
							apiUrl: config.apiUrl,
							model: config.model
						});
						try {
							await aiService.testConnection();
							new Notice('API 连接测试成功');
						} catch (e: any) {
							new Notice('API 连接测试失败: ' + (e?.message || e));
						} finally {
							btn.setDisabled(false);
							btn.setIcon('lucide-zap');
							btn.extraSettingsEl.classList.remove('ai-tags-spin');
						}
					});
			});

		// API 地址设置 + 恢复默认图标按钮
		new Setting(containerEl)
			.setName('API 地址')
			.setDesc('输入 API 地址')
			.addText((text: TextComponent) => {
				text.setPlaceholder(PROVIDER_CONFIGS[this.plugin.settings.provider].defaultUrl)
					.setValue(this.plugin.settings.providerSettings[this.plugin.settings.provider].apiUrl)
					.onChange(async (value: string) => {
						this.plugin.settings.providerSettings[this.plugin.settings.provider].apiUrl = value;
						await this.plugin.saveSettings();
					});
			})
			.addExtraButton((btn) => {
				btn.setIcon('lucide-rotate-ccw')
					.setTooltip('恢复默认')
					.onClick(async () => {
						const provider = this.plugin.settings.provider;
						this.plugin.settings.providerSettings[provider].apiUrl = PROVIDER_CONFIGS[provider].defaultUrl;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		// 添加预设模型下拉框
		new Setting(containerEl)
			.setName('预设模型')
			.setDesc('选择预设的 AI 模型')
			.addDropdown(dropdown => {
				const models = PROVIDER_CONFIGS[this.plugin.settings.provider]?.models ?? [];
				models.forEach(model => {
					dropdown.addOption(model, model);
				});
				// 获取当前提供商的模型设置
				const currentModel = this.plugin.settings.providerSettings[this.plugin.settings.provider].model;
				// 设置当前值为预设模型中的一个，如果不在预设中则选择第一个
				const defaultModel = models.includes(currentModel) ? currentModel : (models[0] ?? '');
				dropdown.setValue(defaultModel);
				dropdown.onChange(async (value: string) => {
					// 只有当用户没有输入自定义模型时，才使用预设模型
					const customModelInput = this.plugin.settings.providerSettings[this.plugin.settings.provider].customModel || '';
					if (!customModelInput.trim()) {
						this.plugin.settings.providerSettings[this.plugin.settings.provider].model = value;
						await this.plugin.saveSettings();
					}
				});
			})
			.settingEl.style.display = 'none';

		// 为每个提供商添加自定义模型输入
		new Setting(containerEl)
			.setName(this.plugin.settings.provider === 'volcano' ? '模型' : '自定义模型')
			.setDesc(this.plugin.settings.provider === 'volcano' ? '输入模型名称' : '输入自定义模型名称 (优先使用)')
			.addText((text: TextComponent) => {
				text.setPlaceholder('自定义模型名称')
					.setValue(this.plugin.settings.providerSettings[this.plugin.settings.provider].model)
					.onChange(async (value: string) => {
						// 更新模型设置为自定义输入的值
						this.plugin.settings.providerSettings[this.plugin.settings.provider].model = value.trim();
						await this.plugin.saveSettings();
					});
			});

		// 添加自定义提示词设置
		const defaultPrompt = '你是一个文档标签生成器，请根据文档内容生成最多 3 个相关的标签。只需返回标签，用逗号分隔，不要包含其他解释或说明。';
		const customPromptSetting = new Setting(containerEl)
			.setClass('custom-prompt-setting')
			.setName('自定义提示词')
			.setDesc('自定义 AI 生成标签的提示词，留空则使用默认提示词')
			.addTextArea(text => {
				text.setValue(this.plugin.settings.customPrompt || defaultPrompt)
					.onChange(async (value) => {
						this.plugin.settings.customPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 6;
				text.inputEl.cols = 50;
				text.inputEl.style.minHeight = '150px';
				text.inputEl.style.resize = 'vertical';
			})
			.addButton(button => {
				button
					.setIcon('reset')
					.setTooltip('重置为默认提示词')
					.onClick(async () => {
						this.plugin.settings.customPrompt = defaultPrompt;
						await this.plugin.saveSettings();
						this.display();
					});
			});
	}
}
