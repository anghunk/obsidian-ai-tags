# AI Tags Generator

[English](README.en.md) | 简体中文

一个强大的 Obsidian 插件，使用 AI 技术为笔记文件智能生成标签，帮助你更好地组织和管理知识库。

![](https://github.com/user-attachments/assets/cd11f758-8846-440d-8ff7-dba637cbcaf9)

## ✨ 主要特性

- 🤖 支持多种主流 AI 服务商
  - OpenAI
  - Gemini
  - DeepSeek - 深度求索
  - DeepSeek - 火山引擎（火山旗下其他模型亦可使用）
  - Claude
  - Ollama（本地大模型）

- 🏷️ 智能标签生成
  - 每次智能推荐3个标签，优先从已有标签中挑选1-2个最相关的标签，剩余由 AI 补齐
  - 已有标签与内容的相关性由 AI 智能判断，推荐更贴合文档的标签
  - 支持自定义 Prompt，灵活定制标签生成风格和规则

- 🛠️ 灵活的配置选项
  - 支持自定义 API 接口地址
  - 支持自定义模型选择
  - 支持本地 Ollama 模型，无需 API Key，隐私安全
  - 支持恢复默认 API 地址，一键还原官方推荐配置

- ⚡ 便捷体验
  - 一键测试 API 连通性，快速验证配置是否可用
  - 生成标签后可手动编辑和筛选
  - 自动更新文档的 frontmatter

## 🚀 安装方法

> 注：该项目暂未上架 Obsidian 插件商店

1. 从 [GitHub Releases](https://github.com/anghunk/obsidian-ai-tags/releases) 页面下载最新版本的以下文件：
   - main.js
   - manifest.json
   - styles.css
2. 在你的 Obsidian 库的 `.obsidian/plugins/` 目录下创建 `obsidian-ai-tags` 文件夹
3. 将下载的文件放入 `obsidian-ai-tags` 文件夹中
4. 重启 Obsidian
5. 在设置 > 第三方插件中启用 AI Tags Generator

**或者使用 [BRAT 插件](https://github.com/TfTHacker/obsidian42-brat) 安装：**
1. 安装 BRAT 插件
2. 在 BRAT 设置中添加本插件仓库路径：`anghunk/obsidian-ai-tags`
3. 启用 AI Tags Generator 插件

## ⚙️ 配置说明

1. 在 Obsidian 设置面板中找到 "AI Tags Generator" 设置项
2. 选择你想使用的 AI 服务商（支持本地 Ollama）
3. 配置对应服务商的设置：
   - API 密钥（如需）
   - API 接口地址（可选，默认使用官方接口或本地地址）
   - 选择要使用的模型
   - 自定义提示词模板（可选，用于定制标签生成的风格和规则）
   - 可一键恢复默认 API 地址
   - 可一键测试 API 连通性

## 💡 使用说明

- 打开任意 Markdown 文档，点击侧边栏标签图标或命令面板，自动生成智能标签
- 生成结果会优先推荐已有标签，AI 补齐不足部分，确保标签更贴合内容
- 支持手动编辑和筛选推荐标签，自动写入 frontmatter

## 🖼️ 功能展示

![image](https://github.com/user-attachments/assets/f2e1da14-0ce3-4a6f-8b28-95c854ba175c)

![](https://github.com/user-attachments/assets/cd11f758-8846-440d-8ff7-dba637cbcaf9)
![](https://github.com/user-attachments/assets/0bb82f73-b3ab-49c9-b94f-558d6009477c)

## ❓ 常见问题

- **API 连通性测试失败？**
  - 请检查 API Key、API 地址、网络代理等配置
- **Ollama 本地模型如何用？**
  - 选择 Ollama（本地），填写本地模型名称（如 llama3），无需 API Key，确保本地服务已启动
- **标签不够相关？**
  - 可自定义 Prompt 或优化已有标签库，AI 会智能判断最相关标签

---

MIT License | 欢迎贡献 | [GitHub Issues](https://github.com/anghunk/obsidian-ai-tags/issues)
