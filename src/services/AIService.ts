import { RequestError } from '../errors/RequestError';

// 默认系统提示词（与 main.ts 中的 DEFAULT_SYSTEM_PROMPT 保持一致）
const DEFAULT_SYSTEM_PROMPT = '请根据以下文档内容和已有标签列表，生成5个标签，优先从已有标签中挑选1-2个最相关的标签，如果没有合适的已有标签，可以全部新生成。只返回标签，用逗号分隔，不要包含其他内容。';

export interface AIServiceConfig {
    apiKey: string;
    apiUrl: string;
    model: string;
    existingTags?: string[];
    tagCount?: number;
    customPrompt?: string;
}

export interface AIResponse {
    content: string;
}

export class AIService {
    private config: AIServiceConfig;

    private getSystemPrompt(): string {
        // 如果设置了自定义提示词则使用，否则使用默认提示词
        return this.config.customPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
    }
    private static TIMEOUT = 30000; // 30 秒超时

    constructor(config: AIServiceConfig) {
        this.config = config;
    }

    private async makeRequest(url: string, options: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AIService.TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            if (!response.ok) {
                const error = await response.json();
                throw new RequestError(error.error?.message || '请求失败', response.status);
            }

            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new RequestError('请求超时', 408);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private calculateSimilarity(str1: string, str2: string): number {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
        if (str1 === str2) return 1.0;
        
        const set1 = new Set(str1.split(''));
        const set2 = new Set(str2.split(''));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        
        return intersection.size / Math.max(set1.size, set2.size);
    }

    private findSimilarExistingTag(newTag: string): string | null {
        if (!this.config.existingTags?.length) return null;
        
        const similarityThreshold = 0.7;
        let mostSimilarTag = null;
        let highestSimilarity = 0;

        for (const existingTag of this.config.existingTags) {
            const similarity = this.calculateSimilarity(newTag, existingTag);
            if (similarity > similarityThreshold && similarity > highestSimilarity) {
                highestSimilarity = similarity;
                mostSimilarTag = existingTag;
            }
        }

        return mostSimilarTag;
    }

    async generateTags(content: string): Promise<string[]> {
        const provider = this.getProviderFromUrl();
        const response = await this.makeRequest(
            this.getFullApiUrl(provider),
            {
                method: 'POST',
                headers: this.getHeaders(provider),
                body: JSON.stringify(this.getRequestBody(content, provider))
            }
        );

        const data = await response.json();
        const generatedTags = this.parseResponse(data, provider);
        
        return generatedTags.map(tag => {
            const similarTag = this.findSimilarExistingTag(tag);
            return similarTag || tag;
        });
    }

    private getProviderFromUrl(): string {
        if (this.config.apiUrl.includes('generativelanguage.googleapis.com')) {
            return 'gemini';
        }
        if (this.config.apiUrl.includes('anthropic.com')) {
            return 'claude';
        }
        if (this.config.apiUrl.includes('localhost:11434') || this.config.apiUrl.includes('ollama')) {
            return 'ollama';
        }
        return 'openai';
    }

    private getFullApiUrl(provider: string): string {
        if (provider === "gemini") {
            const baseUrl = this.config.apiUrl;
            const modelPath = `/v1beta/models/${this.config.model}:generateContent`;
            // 如果是代理地址，直接返回完整URL
            if (baseUrl.includes('gemini-proxy')) {
                return baseUrl;
            }
            return `${baseUrl}${modelPath}`;
        }
        return this.config.apiUrl;
    }

    private getHeaders(provider: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (this.config.apiKey) {
            if (provider === 'gemini') {
                headers['x-goog-api-key'] = this.config.apiKey;
            } else if (provider === 'claude') {
                headers['x-api-key'] = this.config.apiKey;
            } else if (provider === 'openai') {
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            }
            // ollama 不需要 key
        }
        return headers;
    }

    private getRequestBody(content: string, provider: string): any {
        if (provider === 'gemini') {
            return {
                contents: [
                    {
                        parts: [
                            { text: this.getSystemPrompt() },
                            { text: content }
                        ]
                    }
                ]
            };
        }
        if (provider === 'claude') {
            return {
                model: this.config.model,
                max_tokens: 256,
                messages: [
                    {
                        role: 'user',
                        content: content
                    }
                ]
            };
        }
        // openai
        return {
            model: this.config.model,
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt()
                },
                {
                    role: 'user',
                    content: content
                }
            ]
        };
    }

    private parseResponse(data: any, provider: string): string[] {
        try {
            let tagsText = '';
            if (provider === 'gemini') {
                tagsText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            } else if (provider === 'claude') {
                tagsText = data?.content?.[0]?.text?.trim() || data?.completion?.trim() || '';
            } else {
                tagsText = data.choices?.[0]?.message?.content?.trim() || '';
            }

            return tagsText
                .split(',')
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag)
                .map((tag: string) => tag.replace(/\s+/g, ''));
        } catch (error) {
            throw new Error('解析 AI 响应失败');
        }
    }

    async testConnection(): Promise<void> {
        const provider = this.getProviderFromUrl();
        const testMessage = '你好';
        
        try {
            await this.makeRequest(
                this.getFullApiUrl(provider),
                {
                    method: 'POST',
                    headers: this.getHeaders(provider),
                    body: JSON.stringify(this.getRequestBody(testMessage, provider))
                }
            );
        } catch (error) {
            throw new Error(`API连接测试失败: ${error.message}`);
        }
    }
}