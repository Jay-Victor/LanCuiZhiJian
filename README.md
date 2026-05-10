<a id="readme-top"></a>

<div align="center">

<a href="https://github.com/Jay-Victor/LanCuiZhiJian">
  <img src="./logo/icon_source.png" alt="揽萃知鉴 Logo" width="120" height="120" />
</a>

# 揽萃知鉴

**AI 驱动的智能文本处理桌面应用**

*揽万卷之精华，鉴知识之真谛*

[![GitHub](https://img.shields.io/badge/GitHub-仓库-blue?logo=github)](https://github.com/Jay-Victor/LanCuiZhiJian)
[![Gitee](https://img.shields.io/badge/Gitee-仓库-red?logo=gitee)](https://gitee.com/Jay-Victor/LanCuiZhiJian)
[![Tauri](https://img.shields.io/badge/Tauri-2.10-FFC131?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.81+-DEA584?logo=rust)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/协议-自定义-blue)](LICENSE)

[快速开始](#-安装指南) · [功能特性](#-核心功能与特性) · [使用说明](#-使用说明) · [反馈问题](https://github.com/Jay-Victor/LanCuiZhiJian/issues) · [贡献代码](#-贡献指南)

[English](./README_EN.md) · 中文

</div>

<details>
<summary><strong>📑 目录</strong></summary>

- [产品概述](#-产品概述)
- [核心功能与特性](#-核心功能与特性)
  - [智能网页抓取](#-智能网页抓取)
  - [AI 智能处理管线](#-ai-智能处理管线)
  - [文本预处理管线](#-文本预处理管线)
  - [AI 请求优化器](#-ai-请求优化器)
  - [设计系统](#-设计系统)
  - [国际化](#-国际化)
  - [更多功能](#-更多功能)
- [技术架构](#-技术架构)
- [安装指南](#-安装指南)
- [使用说明](#-使用说明)
- [配置方法](#-配置方法)
- [常见问题解答](#-常见问题解答)
- [更新日志](#-更新日志)
- [贡献指南](#-贡献指南)
- [致谢](#-致谢)
- [打赏支持](#-打赏支持)

</details>

---

## 📖 产品概述

**揽萃知鉴** 是一款基于 AI 技术的智能文本处理桌面应用，旨在帮助用户从海量信息中高效提炼知识精华。产品名称取意"揽万卷之精华，鉴知识之真谛"，秉承中国传统文人"博观而约取，厚积而薄发"的治学理念，将现代 AI 技术与传统文化气质深度融合。

### 产品定位

揽萃知鉴面向需要处理大量文本信息的知识工作者、研究人员、内容创作者和在校学生。无论您需要从网页中提取关键信息、对长文本进行智能摘要，还是批量处理文档中的核心内容，揽萃知鉴都能为您提供从信息输入到知识输出的全链路智能化支持。

### 核心价值

| | 特性 | 说明 |
|:-:|------|------|
| 📥 | **一站式文本处理** | URL 抓取 / 文件导入 / 自由文本输入，覆盖全场景信息入口；支持 TXT、MD、DOCX、DOC、JSON、CSV、XML、HTML、LOG 等多种文件格式 |
| 🧠 | **AI 深度语义处理** | 5 阶段 AI 处理管线（语义分段 → 信息提取 → 噪声过滤 → 语义增强 → 内容重构），分组并行执行，远超简单的文本摘要 |
| 🤖 | **8 大 AI 服务商** | 内置 DeepSeek、ChatGPT、Anthropic、Google Gemini、通义千问、Kimi、豆包、智谱共 8 家服务商 25 个模型 + 自定义服务商兼容所有 OpenAI API 格式 |
| 🌐 | **8 策略三层抓取** | Rust 原生 HTTP（绕过 CORS）→ WebView 无头渲染 → 第三方 API（Jina / Firecrawl）→ 浏览器请求 → Web Archive 历史快照，智能适配各类网页 |
| 🛡️ | **企业级请求优化** | 熔断器、LRU 缓存、请求去重、自适应超时、指数退避重试、并发控制、服务商健康度追踪——7 大保障机制确保高并发稳定 |
| ⚡ | **桌面原生体验** | 基于 Tauri 2 + Rust 构建，安装包仅约 11 MB，内存占用 80–150 MB，远低于 Electron 方案（通常 100 MB+ 安装包、300 MB+ 内存） |
| 🎨 | **文化与技术融合** | 思源宋体字族、27 种中国传统文化背景预设（水墨渲染 / 天青色 / 朱砂等）、传统装饰角标，打造独特的文人水墨设计语言 |

---

## ✨ 核心功能与特性

### 🌐 智能网页抓取

揽萃知鉴实现了 **8 种抓取策略**，按三层架构智能调度：

#### 三层策略架构

```
┌─────────────────────────────────────────────────────────────────┐
│ 第一层：Tauri 层（优先执行，绕过 CORS）                            │
│  ① tauri_fetch  —— Rust reqwest HTTP 请求 + scraper HTML 解析    │
│  ② tauri_webview —— Tauri WebView 无头浏览器，支持 JS 渲染        │
├─────────────────────────────────────────────────────────────────┤
│ 第二层：API 层（并行/串行执行）                                    │
│  ③ jina_reader          —— Jina Reader API 快速提取              │
│  ④ jina_reader_rendered —— Jina Reader 完整渲染模式              │
│  ⑤ firecrawl            —— Firecrawl API 专业 JS 渲染抓取       │
├─────────────────────────────────────────────────────────────────┤
│ 第三层：浏览器层（降级执行）                                       │
│  ⑥ direct_fetch —— 浏览器直接请求（受 CORS 限制）                │
│  ⑦ readability  —— 直接请求 + Readability 算法                   │
│  ⑧ web_archive  —— Internet Archive 历史快照回退                │
└─────────────────────────────────────────────────────────────────┘
```

#### 策略智能调度

| 特性 | 实现细节 |
|------|----------|
| **页面类型检测** | 基于域名分类（SPA 域名 20+、AJAX 重型域名 12+、需认证域名 7+），辅助 HTML 特征检测（`__NEXT_DATA__`、`__NUXT__`、`ng-app` 等） |
| **动态策略排序** | 采样超过 3 次后按实际成功率排序；成功率差 ≤ 0.1 时按预设优先级排序；自动过滤不适配当前页面类型的策略和缺少 API Key 的策略 |
| **分层执行** | 第一层 Tauri 策略串行尝试，成功（字数 > 50）即返回；第二层 API 策略并行执行（默认最多 3 个同时），取字数最多结果；第三层浏览器策略串行降级 |
| **成功判定** | Tauri/API 层要求提取字数 > 50；WebView 渲染策略要求字数 ≥ 30 |
| **手动策略覆盖** | 支持手动指定首选策略或禁用特定策略，满足特殊场景需求 |

#### Rust 后端抓取引擎

| 能力 | 实现细节 |
|------|----------|
| **HTTP 客户端** | 基于 `reqwest`，连接超时 10s，最多 5 次重定向，超时范围 5–60s（默认 30s） |
| **反检测请求头** | 完整浏览器指纹：`Sec-Ch-Ua`、`Sec-Fetch-*` 等反检测头 + 7 种随机 User-Agent |
| **HTML 智能解析** | 基于 `scraper` crate，文章内容选择器优先级链：`article` → `[role='main']` → `main` → `.post-content` → `.article-content` → `.entry-content` → `.content` → `#content` → `.post` → `.article` → `.readme` → `.markdown-body` → `.detail-content` → `body`（< 100 字符降级） |
| **内容清洗** | 移除 `script`、`style`、`nav`、`header`、`footer`、`aside`、`.ad`、`.sidebar`、`.comment`、`.modal` 等干扰元素 |
| **资源提取** | 链接最多 50 条（去重）；图片最多 30 张，支持 `src` / `data-src` / `data-original` / `data-lazy-src` 四种延迟加载属性，1×1 像素追踪图过滤，`og:image` 插入队首 |
| **WebView 渲染** | 创建隐藏 WebView（1280×800），注入 JS 脚本提取 `innerText`（非 `textContent`，保留可视文本），等待时间按页面类型动态调整（AJAX 重型 8s、SPA 6s、普通 4s） |

#### 反爬机制

| 机制 | 实现细节 |
|------|----------|
| **请求限速** | 基础延迟 800ms + 随机 [0, 1200ms] + 抖动 [0, 500ms] ≈ 0.8–2.5s |
| **会话轮换** | 默认每 10 次请求轮换会话，被封禁（403）时立即轮换，保留最近 5 个历史会话 |
| **User-Agent 池** | 8 种 UA（Chrome/Windows、Chrome/Mac、Firefox/Windows、Safari/Mac、Chrome/Linux、Edge/Windows 等）+ 3 套浏览器请求头模板 + 4 种随机 Accept-Language 变体 |
| **验证码检测** | 30 个 CAPTCHA 关键词识别（captcha、recaptcha、hcaptcha、cloudflare、challenge、人机验证、安全验证、滑动验证等），6 种验证码类型分类 |
| **蜜罐链接检测** | 11 种隐藏链接检测规则（`display:none`、`visibility:hidden`、`opacity:0`、`position:absolute;left:-9999px`、`font-size:0`、`aria-hidden="true"` 等） |
| **封禁域名** | 自动识别并提示 facebook.com、instagram.com、twitter.com、linkedin.com 等需要登录的社交媒体域名 |
| **429 限流** | 收到 429 状态码后等待 2000–5000ms 再抛出异常 |
| **结果缓存** | 最大 100 条缓存，TTL 15 分钟，FIFO 淘汰，相同 URL 并发请求自动合并 |

---

### 🤖 AI 智能处理管线

揽萃知鉴采用 5 阶段 AI 处理管线，分组并行执行以最大化吞吐量：

```
                ┌──────────────────────────────────────────────┐
 原始文本 ─────►│ 第一批（并行）                                │
                │  ├─ 语义分段 (SemanticChunker)  temp=0.2     │
                │  └─ 噪声过滤 (NoiseFilter)     temp=0.2     │
                ├──────────────────────────────────────────────┤
                │ 第二批（并行，依赖第一批结果）                   │
                │  ├─ 信息提取 (InfoExtractor)   temp=0.2     │
                │  └─ 语义增强 (CognitiveEnhancer) temp=0.6   │
                ├──────────────────────────────────────────────┤
                │ 第三批（串行，汇总前两批结果）                   │
                │  └─ 内容重构 (ContentReconstructor) temp=0.4│
                └──────────────────────────────────────────────┘
                                    │
                                    ▼
                              结构化输出结果
```

#### 各阶段详解

| 阶段 | 模块 | AI 温度 | 处理逻辑 | 降级策略 |
|------|------|---------|----------|----------|
| **1. 语义分段** | `semantic-chunker.ts` | 0.2 | AI 将长文本按语义边界分割为逻辑段落，每段提取 `topic` + `keywords` | 按双换行符分段，词频统计提取前 5 个关键词 |
| **2. 信息提取** | `information-extractor.ts` | 0.2 | 为每个 chunk 生成索引标记 `[i] content`，AI 提取 `mainPoints`、`keyData`、`conclusions`、`sources`（含溯源 chunkIndex） | 取前 3 个 chunk 的 topic 作为 mainPoints，每个 chunk 前 100 字作为 source |
| **3. 噪声过滤** | `noise-filter.ts` | 0.2 | AI 识别并过滤模板文本、广告、重复信息，返回 `cleanedText`、`noiseRatio`、`removedContent` | 纯文本清洗：合并空白、去除多余空格，计算噪音比 |
| **4. 语义增强** | `cognitive-enhancer.ts` | 0.6 | 对降噪后文本进行批判性分析，识别 `biases`（偏见）、`logicalFallacies`（逻辑谬误）、`counterArguments`（反观点） | 基于正则规则的分析引擎：6 种偏见模式 + 6 种逻辑谬误模式 + 反观点生成 |
| **5. 内容重构** | `content-reconstructor.ts` | 0.4 | 汇总前 4 阶段输出（chunks 摘要 + mainPoints + conclusions + cleanedText 摘要 + counterArguments），生成结构化输出 | 取前 3 个 chunk 生成 Section，前 2 个 mainPoint 作为 summary |

#### 语义增强降级引擎详解

当 AI 不可用时，语义增强阶段启用内置的**基于正则的批判性分析引擎**：

**偏见检测（6 种模式）**：

| 模式 | 匹配示例 | 类型 |
|------|----------|------|
| 绝对化表述 | "绝对"、"一定"、"必然"、"毫无疑问" | 认知偏差 |
| 从众效应 | "所有人都知道"、"大家都在说"、"众所周知" | 逻辑漏洞 |
| 诉诸权威 | "专家表示"、"权威人士"、"据内部人士" | 论证缺陷 |
| 虚假二分 | "不得不"、"只能"、"别无选择" | 简化谬误 |
| 诉诸传统 | "一直都是"、"自古以来"、"历来如此" | 思维定势 |
| 过度简化 | "说白了就是"、"其实就是"、"无非就是" | 还原偏差 |

**逻辑谬误检测（6 种模式）**：人身攻击、虚假二分谬误、滑坡谬误、诉诸无知、事后归因、过度概括

**反观点生成**：匹配观点性动词（"认为"、"主张"、"表明"、"证明"等），将观点动词替换为"的反对者认为"自动生成反论

#### 断点续传机制

`CheckpointStorage` 基于 `localStorage` 实现管线级别断点续传：

- **保存时机**：每个阶段完成后立即保存断点（含已完成阶段列表和各阶段结果）
- **最大数量**：20 个断点，超出时按更新时间淘汰
- **恢复流程**：加载断点 → 判断已完成阶段 → 按分组恢复（chunk/filter 一组，extract/enhance 一组，reconstruct 单独） → 恢复完成后自动删除断点
- **部分结果**：即使部分阶段失败，也返回已完成阶段的 `partialData`，不浪费已消耗的 Token

#### 任务级超时映射

不同 AI 任务采用差异化的超时策略：

| 任务 | 基础超时 | 说明 |
|------|----------|------|
| `chunk`（语义分段） | 45s | 输入文本较长但输出结构简单 |
| `extract`（信息提取） | 60s | 需要逐段提取，耗时中等 |
| `filter`（噪声过滤） | 45s | 直接处理原文，输出较短 |
| `enhance`（语义增强） | 90s | 需要深度分析，创造性温度较高 |
| `reconstruct`（内容重构） | 90s | 汇总多阶段结果，生成结构化输出 |

#### 响应解析与结果验证

- **6 层 JSON 解析策略**：直接解析 → Markdown 代码块提取 → 花括号/方括号提取 → 宽松 JSON 修复（尾逗号、控制字符、转义修复）→ 平衡括号提取 → 深度修复（单引号替换、未引号键名修复、缺失括号补全）
- **5 个验证函数**：每个阶段的结果都经过结构验证，缺失字段自动补全（如 topic 默认"段落N"），异常情况（如清理后比原文更长）发出警告

---

### 📝 文本预处理管线

在文本进入 AI 处理之前，揽萃知鉴提供 7 步预处理管线，每步均可独立开关：

| 步骤 | 功能说明 | 实现细节 |
|------|----------|----------|
| **1. 编码修复** | 修复 UTF-8 双重编码和 Windows-1252 乱码 | 25 条替换规则（如 `â€™`→`'`、`Ã©`→`é`），清除零宽字符 |
| **2. Unicode 归一化** | 将 Unicode 字符统一为 NFC 标准形式 | 消除同一字符的不同编码表示差异 |
| **3. 特殊字符移除** | 清除不可见控制字符和异常空白 | 移除 U+0000–U+001F、U+007F–U+009F 控制字符，3+ 连续空格归 2，行首行尾空白 |
| **4. 空白归一化** | 统一换行符、制表符，压缩多余空格 | `\r\n`→`\n`、`\r`→`\n`、Tab→4 空格、多空白归 1、去行首行尾空格 |
| **5. 样板文本移除** | 自动识别并移除网页模板内容 | **50 条正则模式**匹配 Cookie 提示、订阅 Newsletter、社交分享、版权声明、评论区、导航栏、广告、登录提示等，超过 200 字符的行跳过 |
| **6. 行去重** | 移除重复的文本段落，保留首次出现 | 10 字符以下短行保留；长行通过 dedupKey 归一化（去非字母数字和中文字符，取前 100 字符）后去重 |
| **7. 空行与短行清理** | 清理空行和过短行，保持结构 | 短于 `minLineLength`(2) 的行移除（结构行例外），连续换行限制为 `maxConsecutiveNewlines`(2) |

**结构行保留规则**：当 `preserveStructure` 开启时，以下 Markdown 结构行即使短于最小行长度也会保留：

```
# 标题（#{1,6}\s）  ·  无序列表（[-*+]\s）  ·  有序列表（\d+\.\s）  ·  引用（>\s）  ·  分隔线（---）
```

**压缩比保护**：当预处理结果压缩比 < 30% 且原文长度 > 500 字符时，自动放弃预处理结果，改用简单空白清洗（多空格归一、多换行归双、Tab 转空格），防止过度清洗丢失重要内容。

---

### 📊 AI 请求优化器

内置企业级 AI 请求优化器，7 大保障机制确保高并发场景下的稳定性和性能：

#### 1. 指数退避重试

- **退避公式**：`baseDelay × 2^attempt × multiplier + jitter`
- **错误类型差异化退避倍数**：限流 (rate_limit) ×2、服务器错误 (server) ×1.5、网络/超时 ×1.2、其他 ×1
- **不可重试错误**：401 认证失败、403 权限不足、API Key 无效、余额不足——直接抛出，避免无意义重试
- **默认**：最多重试 3 次，基础延迟 1s，最大延迟 30s

#### 2. 熔断器（Circuit Breaker）

```
closed（正常）──连续失败达5次──► open（熔断）
                                  │
                    等待30s后半开  │
                                  ▼
                            half-open（试探）
                              │         │
                          成功1次    失败1次
                              │         │
                              ▼         ▼
                           closed     open
```

- 按 provider 维度独立维护，一个服务商熔断不影响其他服务商
- 默认阈值 5 次连续失败触发熔断，30s 后尝试半开恢复

#### 3. LRU 缓存

- **缓存 Key**：由 `provider:model:task:inputHash:promptHash:maxTokens:temperature` 的双重 FNV-1a 哈希组成，确保相同请求精确匹配
- **容量**：最大 1000 条，超出时按 `hitCount` 排序淘汰最低 20%
- **TTL**：30 分钟，5 分钟定时清理过期条目
- **效果**：相同请求直接返回缓存，避免重复 Token 消耗

#### 4. 请求去重

- 通过 `inFlightRequests Map` 实现，相同参数的并发请求共享同一个 Promise
- 30 分钟超时自动清理过期的去重记录
- 默认开启

#### 5. 并发控制

- 优先级队列 + 信号量，默认最大 5 个并发请求
- 支持批量执行（`executeBatch`）：按 concurrency 分组并行
- 优先级支持：`low` / `normal` / `high` / `urgent`

#### 6. 自适应超时

- 基于 P95 历史延迟动态调整：`adaptiveTimeout = P95 × 1.5`
- 范围限制：`[baseTimeout, baseTimeout × 3]`
- 至少需要 5 条历史数据才启用自适应
- 按 `provider:task` 维度独立计算

#### 7. 服务商健康度追踪

- 追踪每个服务商的：平均延迟、P95 延迟、成功率、最近错误（5 分钟窗口）
- 错误分类：auth / rate_limit / network / timeout / server / parse / unknown
- 24 小时自动清理过期指标
- 不健康节点自动熔断

---

### 🎨 设计系统

#### 设计理念

> **温润极简的轻量质感，克制且高级的视觉表达。**

揽萃知鉴采用"轻量化 Soft UI 软质感"设计风格，摒弃厚重的装饰效果，通过大圆角、低对比度微光影、极致克制的色彩体系，打造温润亲和、通透舒适的桌面应用体验。同时融入中国传统美学元素——水墨背景、山峦剪影、竹影、角花装饰——在极简中传递东方意韵。

#### 色彩体系

品牌色采用青蓝色（`--primary: 200 60% 45%`），全程仅用单一品牌色作为强调色，色彩服务于功能而非装饰。

| 用途 | CSS 变量 | 亮色值 | 暗色值 | 说明 |
|------|---------|--------|--------|------|
| 品牌色 | `--primary` | `200 60% 45%` | 同左 | 青蓝色，用于强调、选中态、核心操作 |
| 主背景 | `--background` | `0 0% 100%` | `222 30% 8%` | 亮色纯白 / 暗色深蓝黑 |
| 卡片背景 | `--card` | `30 30% 98%` | `222 30% 12%` | 亮色暖白 / 暗色深灰蓝 |
| 主文字 | `--foreground` | `220 20% 15%` | `210 40% 98%` | 亮色深色 / 暗色高亮 |
| 边框 | `--border` | `220 15% 85%` | `222 25% 22%` | 细边框，低对比不干扰 |
| 装饰色 | `--decoration` | `200 55% 30%` | `200 55% 65%` | 中国风装饰元素，暗色下变亮 |

状态色：成功 `142 76% 36%` · 警告 `38 92% 50%` · 错误 `0 84% 60%` · 信息 `199 89% 48%`

全局圆角：`--radius: 0.75rem`（12px），所有卡片、对话框统一大圆角。

#### 布局系统

应用采用**侧边导航栏 + 核心内容区**的二栏布局：

```
┌──────────────┬──────────────────────────────────────┐
│              │                                      │
│  侧边导航栏   │          核心内容区                   │
│  (可折叠)    │          (自适应)                     │
│              │                                      │
│  w-60 / w-16 │          flex-1                      │
│  (240/64px)  │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**侧边导航**：展开态（240px）显示 Logo + 文字菜单 + 功能切换；收起态（64px）仅显示图标 + 悬浮提示。导航项包括首页、智能处理（含子菜单）、任务管理（活动任务角标）、历史记录、设置。

#### 中国风装饰元素

在极简设计中融入克制的中国传统美学元素，所有装饰元素在全局 Layout 层渲染，透明度极低（0.05–0.25），不干扰内容阅读：

| 元素 | 组件 | 描述 |
|------|------|------|
| 水墨背景 | `ElegantInkBackground` | 两个大面积模糊光晕（右上 + 左下），模拟水墨晕染效果 |
| 山峦剪影 | `MountainSilhouette` | 底部低透明度双层山脉轮廓 SVG，营造深远意境 |
| 竹影 | `BambooSilhouette` | 左右两侧竹竿与竹叶剪影 SVG，增添文雅气质 |
| 角花装饰 | `CornerDecoration` | 四角简约线条与圆点 SVG，传统角花现代演绎 |
| 传统分隔线 | `MinimalDivider` | 中心圆点 + 两侧渐变线条，古典分隔美学 |
| 标题装饰 | `MinimalTitleDecoration` | 波浪线 + 圆点 + 波浪线，标题上方点缀 |

所有装饰元素使用 CSS 变量 `--decoration` 控制颜色，自动适配亮暗主题，设置 `pointer-events-none` 不影响交互。

#### 字体与动画

| 类别 | 实现 |
|------|------|
| **正文字体** | Noto Serif SC / Source Han Serif SC，契合古典文献处理定位 |
| **等宽字体** | JetBrains Mono / Fira Code，用于代码展示与结果编辑 |
| **字号体系** | 基于 4px 网格，12px–30px 共 7 级；字重仅 400/500/600/700 四档 |
| **页面入场** | 渐显上移 0.4s ease-out，级联延迟 75ms 递增 |
| **折叠展开** | `max-height` + `opacity` 过渡 300ms ease-out |
| **卡片悬浮** | 上移 `translate-y-0.5` + 阴影增强 `shadow-lg` |
| **Toast 通知** | 缩放 + 位移 250ms，退场 250ms ease-in |
| **无障碍** | 全部动画尊重 `prefers-reduced-motion`，Radix UI 确保键盘导航，ARIA 属性完备 |

#### 页面设计

| 页面 | 布局 | 核心内容 |
|------|------|----------|
| **首页** | 居中对称（`max-w-5xl`） | 品牌区 + 快捷入口（URL / 文本 / 文件三列卡片）+ 三步引导 + 最佳实践 + 传统波浪线页脚 |
| **智能处理** | 纵向卡片堆叠（`max-w-4xl`） | 输入卡片 + AI 模型选择（可折叠）+ 处理结果（可折叠）+ 进度条；URL 模式额外含提取内容卡片（元信息 / 关键词 / 附件 / 性能指标） |
| **任务管理** | 统计面板 + 列表 | 5 列统计卡片（总数 / 运行中 / 已暂停 / 已完成 / 已失败）+ 搜索筛选 + 任务卡片（状态图标 / 标签 / 进度条）+ 性能监控面板 |
| **历史记录** | 搜索 + 列表 + 弹窗 | 搜索框 + 类型筛选 + 批量操作 + 历史列表 + 详情全屏弹窗（原文 + 结果 / 复制 / 下载） |
| **设置** | 四 Tab 页 | AI 模型配置（8 家服务商卡片 + 当前配置面板）· 使用统计 · 自定义服务商 · 高级设置（提示词 / 存储 / 导入导出 / 数据清理） |

---

### 🌍 国际化

| 语言 | 状态 | 翻译键数 | 应用名 |
|------|------|----------|--------|
| 简体中文 | ✅ 完整 | ~662 | 揽萃知鉴 |
| English | ✅ 完整 | ~662 | LanCui ZhiJian |
| 日本語 | ✅ 完整 | ~662 | 蘭萃知鑑 |

翻译键按功能模块命名空间划分（`app.*`、`nav.*`、`reader.*`、`settings.*`、`preprocess.*`、`extraction.*`、`optimizer.*` 等 20+ 命名空间），支持变量插值（`{count}`、`{name}` 等）。

---

### 📦 更多功能

- **任务管理器**：基于 React Context 的完整任务生命周期管理——创建 / 更新 / 暂停 / 恢复 / 取消 / 重试（最多 3 次）/ 优先级调整 / 后台运行 / 订阅变更通知；支持状态/类型/优先级多维筛选和排序；最多存储 100 个任务，500ms 防抖持久化
- **多格式导出**：Markdown（`.md`）/ 纯文本（`.txt`）/ Word 文档（`.doc`，HTML-in-Word 格式，含微软雅黑字体和标题层级样式）；通过 Tauri 文件对话框选择保存路径
- **自定义提示词**：每个 AI 任务的默认提示词均包含角色定义、目标、执行步骤、规则/标准、边界处理、JSON 输出格式示例和约束条件；支持 `{{variable}}` 变量插值、localStorage 持久化、schema 版本迁移、结构验证
- **Token 用量统计**：追踪每次请求的 Token 消耗（prompt_tokens / completion_tokens / total_tokens），按日/周/月统计
- **AI 性能监控**：实时监控请求成功率、P95/P99 延迟分布、缓存命中率、去重请求数、断路器拒绝数、各阶段耗时
- **历史记录**：最多 50 条处理历史，支持搜索、类型筛选（URL/文本/文件）、批量选择/删除、查看详情、重新导出
- **自动更新检查**：内置软件更新检测与提示
- **配置备份与恢复**：支持导出和导入全部配置（AI 服务商、高级设置、外观偏好等）
- **侧边栏导航**：可折叠侧边栏（展开 240px / 折叠 64px），智能处理子菜单，任务管理器活动任务数量徽章

---

## 🏗️ 技术架构

### 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        揽萃知鉴 桌面应用                           │
├────────────────────────────┬─────────────────────────────────────┤
│     前端 (WebView)          │        后端 (Rust)                   │
│  ┌──────────────────────┐  │  ┌────────────────────────────┐     │
│  │   React 19 + TS 5    │  │  │   Tauri 2 Core Runtime     │     │
│  │                      │  │  │                            │     │
│  │  ┌────────────────┐  │  │  │  ┌──────────────────────┐  │     │
│  │  │   页面路由       │  │  │  │  │ tauri_fetch_url     │  │     │
│  │  │  · 首页          │  │  │  │  │ (reqwest + scraper)  │  │     │
│  │  │  · 智能处理      │  │  │  │  ├──────────────────────┤  │     │
│  │  │    - URL 抓取    │  │  │  │  │ tauri_fetch_rendered │  │     │
│  │  │    - 文本输入    │  │  │  │  │ (WebView 无头渲染)    │  │     │
│  │  │    - 文件导入    │  │  │  │  ├──────────────────────┤  │     │
│  │  │  · 任务管理      │  │  │  │  │ SQLite Database      │  │     │
│  │  │  · 历史记录      │  │  │  │  │ (rusqlite bundled)   │  │     │
│  │  │  · 设置          │  │  │  │  ├──────────────────────┤  │     │
│  │  │  · 关于 / 打赏   │  │  │  │  │ Update Checker       │  │     │
│  │  └────────────────┘  │  │  │  └──────────────────────┘  │     │
│  │  ┌────────────────┐  │  │  └────────────────────────────┘     │
│  │  │   业务服务层     │  │  │                                    │
│  │  │  · AI 管线      │◄─┼──►│                                    │
│  │  │  · URL 提取引擎 │  │IPC│                                    │
│  │  │  · 请求优化器   │  │  │                                    │
│  │  │  · 文本预处理器 │  │  │                                    │
│  │  │  · 文件解析器   │  │  │                                    │
│  │  │  · 提示词管理   │  │  │                                    │
│  │  └────────────────┘  │  │                                    │
│  │  ┌────────────────┐  │  │                                    │
│  │  │   状态管理       │  │  │                                    │
│  │  │  (6 Zustand     │  │  │                                    │
│  │  │   Stores)       │  │  │                                    │
│  │  └────────────────┘  │  │                                    │
│  └──────────────────────┘  │                                    │
├────────────────────────────┴─────────────────────────────────────┤
│                    IPC Bridge (Tauri Commands)                    │
└──────────────────────────────────────────────────────────────────┘
```

### AI 服务商支持矩阵

| 服务商 | 区域 | 模型数 | 推荐模型 | API 格式 | 认证方式 |
|--------|------|--------|----------|----------|----------|
| DeepSeek | 国内 | 2 | DeepSeek V4 Flash | OpenAI 兼容 | Bearer Token |
| ChatGPT (OpenAI) | 国际 | 5 | GPT-4.1 Mini | OpenAI 原生 | Bearer Token |
| Anthropic (Claude) | 国际 | 3 | Claude Sonnet 4.6 | Anthropic 原生 | x-api-key |
| Google (Gemini) | 国际 | 3 | Gemini 3.2 Flash | Google 原生 | Query 参数 |
| 豆包 (Doubao) | 国内 | 3 | Doubao Seed 1.6 Flash | OpenAI 兼容 | Bearer Token |
| Kimi (Moonshot) | 国内 | 2 | Kimi K2.6 | OpenAI 兼容 | Bearer Token |
| 通义千问 (Qwen) | 国内 | 3 | Qwen3.6 Flash | OpenAI 兼容 | Bearer Token |
| 智谱 GLM (Zhipu) | 国内 | 4 | GLM-4.7 Flash（免费） | OpenAI 兼容 | Bearer Token |
| 自定义 | -- | 不限 | 用户自定义 | OpenAI 兼容 | Bearer / API Key / OAuth |

> **特殊处理**：OpenAI 推理模型（o1/o3/o4 系列）不传 `temperature` 和 `response_format`；DeepSeek 推理模型（deepseek-v4-pro）不传 `temperature` 但保留 `response_format`；豆包模型 ID 实际为火山引擎接入点 ID；Anthropic 需在控制台启用浏览器直接访问。

### 技术栈详情

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **桌面框架** | Tauri | 2.10 | Rust + WebView 桌面应用框架，替代 Electron 方案 |
| **前端框架** | React | 19.0 | 用户界面构建，Hooks 驱动的声明式 UI |
| **类型系统** | TypeScript | 5.3 | 全项目严格模式类型安全 |
| **构建工具** | Vite | 6.0 | 极速 HMR 开发体验与高效生产构建 |
| **样式方案** | Tailwind CSS | 3.4 | 原子化 CSS + CSS 变量双主题体系 |
| **组件原语** | Radix UI | 1.x | 无障碍访问的底层 UI 原语（Dialog / Tabs / Tooltip / Collapsible） |
| **变体管理** | CVA | 0.7 | class-variance-authority，类型安全的组件变体 |
| **状态管理** | Zustand | 4.5 | 6 个 Store + persist 中间件持久化 |
| **路由** | React Router DOM | 7.0 | 客户端路由（10 个路由页面） |
| **表单校验** | Zod | 3.22 | 运行时类型校验 |
| **Rust 异步** | Tokio | 1.x | Rust 端异步运行时（full features） |
| **HTTP 客户端** | Reqwest | 0.12 | Rust 端 HTTP 请求（绕过浏览器 CORS） |
| **HTML 解析** | Scraper | 0.19 | Rust 端 HTML DOM 解析与 CSS 选择器 |
| **数据库** | Rusqlite | 0.31 | Rust 端 SQLite 嵌入式数据库（bundled 模式） |
| **Markdown** | react-markdown + remark-gfm | 10.1 / 4.0 | GitHub 风格 Markdown 渲染 |
| **文件解析** | Mammoth | 1.12 | .docx 文件解析 |
| **图标** | Lucide React | 0.344 | 开源图标库 |
| **测试** | Vitest + Testing Library | 1.0 / 14.0 | 单元测试 + React 组件测试 |
| **代码质量** | ESLint + Prettier | 8.56 / 3.2 | 代码规范与格式化 |

### 性能指标

| 指标 | 数据 | 说明 |
|------|------|------|
| 安装包体积 | ~11 MB | NSIS 安装包，远小于 Electron 方案（通常 100MB+） |
| 绿色版体积 | ~12 MB | 免安装 ZIP 压缩包 |
| 内存占用 | ~80–150 MB | 典型工作负载下（含 WebView2 运行时） |
| 启动时间 | < 2s | 冷启动到界面可用 |
| 源码文件数 | 125 | .tsx(62) + .ts(56) + .rs(7) |
| 翻译总条目 | ~1,986 | 3 种语言 × ~662 翻译键 |
| AI 服务商模型 | 24 个 | 8 家服务商内置 + 不限自定义 |
| 抓取策略 | 8 种 | 3 层架构，自动智能调度 |

### 项目目录结构

```
揽萃知鉴/
├── src/                              # 前端源码
│   ├── app/routes/                   # 页面路由（10 个页面）
│   │   ├── home/                     #   首页（三步指南 + 最佳实践）
│   │   ├── reader/                   #   智能处理
│   │   │   ├── url.tsx               #     URL 抓取模式
│   │   │   ├── text.tsx              #     文本输入模式（最多 5000 字符）
│   │   │   └── file.tsx              #     文件导入模式（最大 10MB）
│   │   ├── tasks/                    #   任务管理器
│   │   ├── history/                  #   历史记录（最多 50 条）
│   │   ├── settings/                 #   设置中心
│   │   ├── about/                    #   关于
│   │   └── donate/                   #   打赏
│   ├── components/                   # UI 组件
│   │   ├── ui/                       #   基础组件（Button / Card / Dialog / Tabs / Toast...）
│   │   ├── layout/                   #   布局（Layout / 可折叠 Sidebar）
│   │   ├── reader/                   #   智能处理组件（AIModelSelector / MarkdownRenderer / DownloadDialog...）
│   │   ├── settings/                 #   设置组件（ProviderCard / AIPerformanceMonitor / TextPreprocessorConfig...）
│   │   ├── theme/                    #   主题切换（ThemeProvider / ThemeToggle）
│   │   ├── language/                 #   语言切换
│   │   ├── decorative/               #   装饰元素（传统纹样 / 自定义背景）
│   │   └── error/                    #   错误边界
│   ├── services/                     # 业务服务层
│   │   ├── ai/                       #   AI 核心
│   │   │   ├── providers/            #     AI 服务商适配器（OpenAI / Google / Moonshot / Zhipu / Custom）
│   │   │   ├── pipeline/             #     5 阶段 AI 处理管线 + 断点续传 + 编排器
│   │   │   └── utils/                #     响应解析器（6 层策略） + 结果验证器（5 个验证函数）
│   │   ├── extraction/               #   URL 抓取（8 策略 + 3 层架构） + 文本预处理（7 步管线）
│   │   ├── usage/                    #   Token 用量统计
│   │   ├── prompts/                  #   自定义提示词（变量插值 + schema 迁移）
│   │   ├── file/                     #   文件处理（对话框 / 格式过滤）
│   │   └── error/                    #   全局错误处理
│   ├── stores/                       # 6 个 Zustand Store（app / aiConfig / history / extraction / background / toast）
│   ├── contexts/                     # React Context（TaskManager）
│   ├── i18n/                         # 国际化（中 / 英 / 日，~662 键/语言）
│   ├── data/                         # 静态数据定义（AI 服务商 / 背景预设）
│   ├── types/                        # TypeScript 类型定义
│   └── utils/                        # 工具函数
├── src-tauri/                        # Rust 后端源码
│   └── src/
│       ├── main.rs                   #   应用入口
│       ├── lib.rs                    #   核心库
│       └── commands/                 #   Tauri 命令
│           ├── fetch.rs              #     网络请求代理（reqwest + scraper + WebView 渲染）
│           ├── database.rs           #     SQLite 数据库操作
│           └── update.rs             #     软件更新检查
├── assets/                            # 捐赠二维码与项目资源
├── Releases/                         # 发布产物
├── package.json                      # 前端依赖
├── src-tauri/Cargo.toml              # Rust 依赖
├── src-tauri/tauri.conf.json         # Tauri 配置
├── tailwind.config.js                # Tailwind 配置
└── vite.config.ts                    # Vite 配置
```

---

## 📥 安装指南

### 系统要求

| 项目 | 最低要求 |
|------|----------|
| 操作系统 | Windows 10 1803 或更高版本 |
| WebView2 | Microsoft Edge WebView2 运行时（Windows 10 21H2+ 和 Windows 11 已内置） |
| 磁盘空间 | 约 50 MB（含运行时依赖） |
| 内存 | 建议 4 GB 以上 |

### 方式一：标准安装包（推荐）

1. 前往 [Releases](https://github.com/Jay-Victor/LanCuiZhiJian/releases) 页面下载最新版 `揽萃知鉴_vX.X.X_Setup.exe`
2. 双击运行安装程序
3. 按照安装向导完成安装（支持中文 / 英文安装界面）
4. 安装完成后从开始菜单或桌面快捷方式启动

> **注意**：如果系统提示缺少 WebView2 运行时，安装程序会自动引导您下载安装（Evergreen Bootstrapper 方式）。

### 方式二：绿色免安装版

1. 前往 [Releases](https://github.com/Jay-Victor/LanCuiZhiJian/releases) 页面下载最新版 `揽萃知鉴_vX.X.X_Portable.zip`
2. 解压 ZIP 文件到任意目录
3. 双击运行 `揽萃知鉴.exe` 即可使用

> **绿色版特点**：无需安装、不写入注册表、不创建系统服务，删除文件夹即可完全卸载。

### 方式三：从源码构建

#### 环境准备

| 工具 | 版本要求 | 安装方式 |
|------|----------|----------|
| Node.js | >= 18.0 | [nodejs.org](https://nodejs.org) |
| Rust | >= 1.81 | [rustup.rs](https://rustup.rs) |
| pnpm / npm | 最新稳定版 | Node.js 自带 npm |

#### 构建步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Jay-Victor/LanCuiZhiJian.git
cd LanCuiZhiJian

# 2. 安装前端依赖
npm install

# 3. 开发模式运行
npm run tauri dev

# 4. 生产构建（生成安装包）
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/nsis/` 目录。

#### 可用脚本

| 脚本 | 命令 | 用途 |
|------|------|------|
| `npm run dev` | `vite` | 启动前端开发服务器 |
| `npm run build` | `tsc && vite build` | TypeScript 类型检查 + 前端构建 |
| `npm run tauri dev` | `tauri dev` | 启动 Tauri 开发模式（前端 + Rust） |
| `npm run tauri build` | `tauri build` | 生产构建（生成安装包） |
| `npm run typecheck` | `tsc --noEmit` | TypeScript 类型检查 |
| `npm run lint` | `eslint . --ext ts,tsx` | ESLint 代码规范检查 |
| `npm run lint:fix` | `eslint . --ext ts,tsx --fix` | 自动修复 ESLint 问题 |
| `npm run format` | `prettier --write "src/**/*.{ts,tsx,css}"` | Prettier 格式化 |
| `npm run test` | `vitest` | 运行测试 |
| `npm run test:coverage` | `vitest --coverage` | 测试覆盖率 |

---

## 📚 使用说明

### 快速上手

1. **启动应用**：安装后首次启动，进入首页查看功能介绍和最佳实践
2. **配置 AI 服务**：进入「设置 → AI 模型」，选择服务商并输入 API Key
3. **开始使用**：通过侧边栏选择输入方式

### 三种输入方式

#### 🌐 URL 抓取

1. 点击侧边栏「智能处理」→ 「URL 抓取」
2. 在 URL 输入框中粘贴网页地址
3. 点击「开始提取」，系统自动执行三层策略调度抓取网页内容
4. 提取完成后，选择 AI 模型
5. 点击「开始处理」，AI 管线分组并行处理
6. 查看处理结果，支持导出为 Markdown / 纯文本 / Word 文档

> **支持的特殊页面**：SPA 单页应用、AJAX 动态加载页面、需要 JS 渲染的页面；不支持需要登录认证的页面（系统会自动检测并提示）。

#### 📝 文本输入

1. 切换到「文本」标签页
2. 在文本框中粘贴或输入需要处理的文本（最多 5,000 字符）
3. 选择 AI 模型，点击「开始处理」

#### 📁 文件导入

1. 切换到「文件」标签页
2. 点击「选择文件」或拖拽文件到窗口
3. 支持的格式：`.txt`、`.md`、`.docx`、`.json`、`.csv`、`.xml`、`.html`（最大 10 MB）
4. 选择 AI 模型，点击「开始处理」

### AI 处理管线详解

当您点击「开始处理」后，文本将经过以下 5 个阶段（分组并行执行）：

| 阶段 | 输入 | 输出 | AI 温度 | 说明 |
|------|------|------|---------|------|
| 语义分段 | 原始文本 | 逻辑段落列表（topic + keywords） | 0.2 | AI 理解文本结构，按语义边界分割 |
| 信息提取 | 带索引的逻辑段落 | mainPoints + keyData + conclusions + sources | 0.2 | 从每个段落提取关键论点、数据和结论，支持溯源 |
| 噪声过滤 | 原始文本 | cleanedText + noiseRatio + removedContent | 0.2 | 识别并移除重复、广告、模板内容 |
| 语义增强 | 降噪后文本 | biases + logicalFallacies + counterArguments | 0.6 | 批判性分析：识别偏见、逻辑谬误、生成反论 |
| 内容重构 | 前 4 阶段汇总 | title + summary + sections + insights + recommendations | 0.4 | 重新组织为结构清晰的输出文档 |

> 每个阶段都有本地降级策略（AI 不可用时自动启用）和断点续传（中断后可从上次完成位置继续），确保处理过程的可靠性。

### 任务管理

- 所有处理任务自动进入后台队列，支持 6 种状态（等待 / 运行 / 暂停 / 完成 / 失败 / 取消）
- 4 种优先级（低 / 普通 / 高 / 紧急），支持动态调整
- 在「任务管理」页面查看所有任务的状态、进度和结果
- 支持暂停 / 恢复 / 取消 / 重试正在进行的任务
- 历史任务可在「历史记录」页面查看和重新导出

---

## ⚙️ 配置方法

### AI 服务商配置

进入「设置 → AI 模型」标签页，配置您使用的 AI 服务商：

| 服务商 | 区域 | 模型数 | 推荐模型 | 获取 API Key |
|--------|------|--------|----------|--------------|
| DeepSeek | 国内 | 2 | DeepSeek V4 Flash | [平台链接](https://platform.deepseek.com) |
| ChatGPT | 国际 | 5 | GPT-4.1 Mini | [平台链接](https://platform.openai.com) |
| Anthropic | 国际 | 3 | Claude Sonnet 4.6 | [平台链接](https://console.anthropic.com) |
| Google Gemini | 国际 | 3 | Gemini 3.2 Flash | [平台链接](https://aistudio.google.com) |
| 豆包 | 国内 | 3 | Doubao Seed 1.6 Flash | [平台链接](https://console.volcengine.com/ark) |
| Kimi | 国内 | 2 | Kimi K2.6 | [平台链接](https://platform.moonshot.cn) |
| 通义千问 | 国内 | 3 | Qwen3.6 Flash | [平台链接](https://dashscope.console.aliyun.com) |
| 智谱 GLM | 国内 | 3 | GLM-4.7 Flash（免费） | [平台链接](https://open.bigmodel.cn) |
| 自定义 | -- | 不限 | 用户自定义 | 用户自行提供 |

**配置步骤**：

1. 选择服务商卡片上的「启用」开关
2. 输入 API Key（支持密码模式隐藏）
3. 选择默认模型
4. 点击「验证连通性」测试配置是否正确

**自定义服务商**：支持配置自定义 Base URL、API Key、认证方式（Bearer Token / API Key / OAuth）、自定义请求头和默认模型，兼容所有 OpenAI API 格式的服务商。智能端点拼接：如果 Base URL 已包含 `/chat/completions` 则直接使用，否则自动追加。

### 高级配置

进入「设置 → 高级」标签页：

#### 文本预处理配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 修复编码 | 开启 | 25 条规则修复 UTF-8 双重编码和 Windows-1252 乱码，清除零宽字符 |
| Unicode 归一化 | 开启 | NFC 标准形式统一，消除编码差异 |
| 空白归一化 | 开启 | `\r\n`→`\n`、Tab→4 空格、多空白归 1、去行首行尾空格 |
| 移除特殊字符 | 开启 | 清除 U+0000–U+001F、U+007F–U+009F 控制字符，3+ 连续空格归 2 |
| 移除样板文本 | 开启 | 50 条正则模式移除 Cookie 提示、广告、版权声明等 |
| 行去重 | 开启 | dedupKey 归一化后去重，保留首次出现 |
| 保留结构 | 开启 | 保留 Markdown 标题 / 列表 / 引用 / 分隔线等结构行 |
| 最小行长度 | 2 | 低于此长度的行将被移除（结构行例外） |
| 最大连续换行 | 2 | 超过此数的空行将被压缩 |

#### URL 抓取策略配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 首选策略 | 自动选择 | 可手动指定优先使用的抓取策略（8 种可选） |
| 策略启用/禁用 | 全部启用 | 可禁用不需要的策略 |
| Jina API Key | 空 | Jina Reader 服务的 API 密钥（无 Key 使用共享基础设施，可能限流） |
| Firecrawl API Key | 空 | Firecrawl 服务的 API 密钥（必需，否则跳过此策略） |
| 并行执行 | 开启 | 第二层 API 策略同时执行 |
| 反爬虫模式 | 开启 | 会话轮换 + UA 随机化 + 蜜罐检测 + 验证码识别 |
| 最大并行数 | 3 | 同时执行的 API 策略数上限 |
| 会话轮换间隔 | 10 | 每 N 次请求后轮换会话参数 |

#### AI 请求优化配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 缓存 | 开启 | 双重 FNV-1a 哈希缓存 Key，最大 1000 条，LRU 淘汰 |
| 自适应超时 | 开启 | 基于 P95 历史延迟 × 1.5 动态调整，至少 5 条历史数据启用 |
| 请求去重 | 开启 | 相同参数的并发请求共享 Promise |
| 最大重试 | 3 | 失败后的最大重试次数（不可重试错误直接抛出） |
| 请求超时 | 60s | 全局单次请求最大等待时间 |
| 连接超时 | 10s | 建立连接最大等待时间 |
| 最大并发 | 5 | 同时进行的 AI 请求数上限（优先级队列 + 信号量） |
| 基础延迟 | 1000ms | 指数退避初始延迟 |
| 最大延迟 | 30s | 指数退避延迟上限 |
| 缓存有效期 | 30min | 缓存条目存活时间 |
| 熔断阈值 | 5 | 连续失败触发熔断的次数（按服务商独立） |
| 熔断恢复 | 30s | 熔断后等待恢复时间（半开试探） |
| 自适应倍数 | 1.5x | P95 延迟的乘数 |

### 外观配置

- **主题**：浅色 / 深色 / 跟随系统（CSS 变量全局切换，切换时双帧渲染防闪烁）
- **语言**：简体中文 / English / 日本語（~662 翻译键/语言）
- **背景预设**：12 种纯色 + 15 种渐变（水墨 / 自然 / 素雅三类），每种均提供浅/深色双适配；支持自定义图片（JPG/PNG/WebP，最大 5MB，带裁剪），可调透明度 / 模糊度 / 前景遮罩

### 自定义提示词

进入「设置 → 高级 → 自定义提示词」，可自定义 AI 处理各阶段使用的提示词模板。每个默认提示词包含：角色定义、目标、执行步骤、规则/标准、边界处理、JSON 输出格式示例和约束条件。支持 `{{variable}}` 变量插值、持久化存储和 schema 版本迁移。

---

## ❓ 常见问题解答

### 安装与运行

**Q: 安装时提示缺少 WebView2 运行时怎么办？**

A: Windows 10 21H2+ 和 Windows 11 已内置 WebView2。如果是旧版 Windows 10，安装程序会自动引导下载 Evergreen Bootstrapper。您也可以手动从 [Microsoft 官网](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) 下载安装。

**Q: 绿色版和安装版有什么区别？**

A: 功能完全一致。安装版会创建开始菜单快捷方式和卸载入口，绿色版解压即用、删除即卸。推荐普通用户使用安装版，便携需求使用绿色版。

**Q: 应用启动后白屏怎么办？**

A: 请确认 WebView2 运行时已正确安装。尝试卸载并重新安装 WebView2 Evergreen Runtime。如仍有问题，请提交 Issue。

### AI 服务配置

**Q: 支持哪些 AI 服务商？**

A: 内置 8 家服务商（DeepSeek / ChatGPT / Anthropic / Google Gemini / 豆包 / Kimi / 通义千问 / 智谱 GLM），共 25 个模型，+ 自定义服务商。自定义服务商支持任何兼容 OpenAI API 格式的服务。

**Q: 为什么提示"请先配置 AI 模型"？**

A: 使用 AI 处理功能前，需要先在「设置 → AI 模型」中至少启用一个服务商并输入有效的 API Key。

**Q: 国内用户推荐使用哪个 AI 服务商？**

A: 推荐 DeepSeek V4 Flash（性价比高）、通义千问 Qwen3.6 Flash（稳定）或 Kimi K2.6（中文能力强）。智谱 GLM-4.7 Flash 提供免费额度。如需使用 ChatGPT / Anthropic 等国际服务，可能需要配置网络代理。

**Q: 自定义服务商如何配置？**

A: 在设置页面点击「添加自定义服务商」，填写服务名称、Base URL、API Key，选择认证方式（Bearer Token / API Key / OAuth），可选配置自定义请求头和默认模型。系统兼容所有 OpenAI API 格式的服务。

**Q: 豆包模型的接入点 ID 是什么？**

A: 豆包的模型 ID 不是常规模型名称，而是需要在火山引擎控制台创建接入点后获得的 Endpoint ID。请在豆包服务商配置中填入您的接入点 ID。

### 网页抓取

**Q: URL 抓取失败怎么办？**

A: 系统采用三层 8 策略自动降级，通常能成功抓取。可能的失败原因和解决方案：
- **CORS 限制**：系统自动优先使用 Rust 原生抓取（完全绕过 CORS），如仍失败可尝试切换策略
- **反爬机制**：启用「设置 → 高级 → 反爬虫模式」（会话轮换 + UA 随机化 + 验证码检测）
- **动态内容**：WebView 渲染策略可处理 JavaScript 渲染的页面（等待 4–8s）
- **页面不可用**：系统自动回退到 Web Archive 历史快照
- **API 限流**：Jina Reader 共享基础设施可能限流，建议配置 API Key
- **需登录页面**：系统会自动检测需认证页面并提示（如 GitHub、Google 等登录页面）

**Q: 如何选择抓取策略？**

A: 默认「自动选择」即可，系统根据域名分类 + HTML 特征检测页面类型，结合历史成功率动态排序。如需手动指定，可在「设置 → 高级 → URL 抓取策略」中选择首选策略。

### 性能与优化

**Q: 处理大量文本时很慢怎么办？**

A: 优化建议：
- 在「设置 → 高级 → AI 请求优化」中调整最大并发数（默认 5）和超时时间
- 开启缓存以避免重复处理相同内容（默认已开启）
- 使用较快的 AI 模型（如 DeepSeek V4 Flash）进行初步处理，再用更强模型进行增强

**Q: AI 请求经常超时怎么办？**

A: 系统对不同任务设置了差异化超时（分段 45s、提取 60s、增强/重构 90s）。可在「设置 → 高级 → AI 请求优化」中适当增加全局请求超时时间（默认 60s），或开启自适应超时让系统根据网络状况自动调整。

**Q: Token 消耗太高怎么办？**

A: 开启 AI 请求优化器中的缓存功能（默认已开启，双重 FNV-1a 哈希确保精确匹配），相同请求不会重复消耗 Token。同时可在「设置 → 使用统计」中查看 Token 消耗详情。断点续传功能也避免了中断后重复消耗 Token。

---

## 📋 更新日志

### v0.1.0 (2026-05-10)

#### 新增

- 🎉 首个公开发布版本
- **URL 网页文本智能抓取**：8 种策略、三层架构、页面类型检测、动态策略排序、反爬机制（会话轮换 / UA 随机化 / 验证码检测 / 蜜罐链接检测）
- **AI 5 阶段智能处理管线**：语义分段 → 信息提取 → 噪声过滤 → 语义增强 → 内容重构，分组并行执行，每阶段独立降级策略
- **8 大 AI 服务商**内置 25 个模型 + 自定义服务商（兼容 OpenAI API 格式，支持 3 种认证方式）
- **文本预处理管线**：7 步处理（编码修复 / Unicode 归一化 / 特殊字符移除 / 空白归一化 / 50 条样板文本移除 / 行去重 / 结构保留），压缩比保护
- **AI 请求优化器**：熔断器 / LRU 缓存 / 请求去重 / 并发控制 / 自适应超时 / 指数退避重试 / 服务商健康度追踪
- **任务管理**：6 种状态 / 4 种优先级 / 后台队列 / 进度追踪 / 断点续传 / 重试 / 筛选排序
- **多格式导出**：Markdown / 纯文本 / Word 文档
- **中 / 英 / 日三语国际化**：~662 翻译键/语言，支持变量插值
- **浅色 / 深色 / 系统三主题**：CSS 变量全局切换，双帧渲染防闪烁
- **27 种中国传统文化背景预设**：12 纯色 + 15 渐变（水墨 / 自然 / 素雅），浅深色双适配
- **自定义背景**：支持纯色 / 渐变 / 自定义图片（裁剪 / 透明度 / 模糊度 / 前景遮罩）
- **AI 性能监控面板**：P95/P99 延迟 / 成功率 / 缓存命中率 / 错误分类 / 服务商健康度
- **Token 用量统计**：prompt / completion / total tokens 追踪
- **自定义提示词模板**：变量插值 / schema 迁移 / 结构验证
- **文本预处理 / 抓取策略 / AI 请求优化**配置 UI
- **配置备份与恢复**
- **NSIS 安装包 + 绿色免安装版**

---

## 🤝 贡献指南

我们欢迎并感谢任何形式的贡献！无论是 Bug 报告、功能建议、代码贡献还是文档改进。

### 报告问题

1. 在 [GitHub Issues](https://github.com/Jay-Victor/LanCuiZhiJian/issues) 或 [Gitee Issues](https://gitee.com/Jay-Victor/LanCuiZhiJian/issues) 中搜索是否已有相关问题
2. 如果没有，创建新的 Issue，包含以下信息：
   - 操作系统版本
   - 应用版本号
   - 问题复现步骤
   - 预期行为与实际行为
   - 相关截图或日志

### 提交代码

1. **Fork 仓库**：点击仓库页面的 Fork 按钮
2. **创建分支**：`git checkout -b feature/your-feature-name`
3. **开发与测试**：
   ```bash
   npm install          # 安装依赖
   npm run tauri dev    # 开发模式
   npm run typecheck    # 类型检查
   npm run lint         # 代码规范检查
   npm run test         # 运行测试
   ```
4. **提交代码**：`git commit -m 'feat: add some feature'`
5. **推送分支**：`git push origin feature/your-feature-name`
6. **创建 Pull Request**：在 GitHub / Gitee 上发起 PR

### 提交规范

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建 / 工具链变更 |

### 开发规范

- **TypeScript 严格模式**：所有代码必须通过 `npm run typecheck`
- **ESLint 规范**：代码必须通过 `npm run lint` 检查
- **组件规范**：遵循项目已有的 shadcn/ui + CVA 组件模式
- **样式规范**：使用 Tailwind CSS 原子类 + `cn()` 工具函数合并
- **国际化**：所有用户可见文字必须通过 i18n 翻译键引用（~662 键/语言）
- **无障碍**：交互组件需支持键盘导航，动画需尊重 `prefers-reduced-motion`
- **状态管理**：使用 Zustand + persist 中间件，配置数据自动持久化到 localStorage

### 项目结构约定

- `src/components/ui/` — 基础 UI 组件（Button, Card, Dialog 等）
- `src/components/settings/` — 设置页相关组件
- `src/components/reader/` — 智能处理相关组件
- `src/services/ai/providers/` — AI 服务商适配器
- `src/services/ai/pipeline/` — AI 处理管线 + 断点续传
- `src/services/extraction/` — URL 抓取 + 文本预处理
- `src/stores/` — 6 个 Zustand Store
- `src/i18n/` — 国际化翻译文件
- `src-tauri/src/commands/` — Rust 后端 Tauri 命令

---

## 🙏 致谢

感谢以下开源项目和技术社区的支持：

| 项目 | 用途 |
|------|------|
| [Tauri](https://tauri.app) | 轻量级桌面应用框架 |
| [React](https://react.dev) | 用户界面构建库 |
| [Rust](https://www.rust-lang.org) | 安全高效的系统编程语言 |
| [Tailwind CSS](https://tailwindcss.com) | 原子化 CSS 框架 |
| [Radix UI](https://www.radix-ui.com) | 无障碍 UI 原语 |
| [Zustand](https://github.com/pmndrs/zustand) | 轻量级状态管理 |
| [Reqwest](https://github.com/seanmonstar/reqwest) | Rust HTTP 客户端 |
| [Scraper](https://github.com/causal-agent/scraper) | Rust HTML 解析库 |
| [Lucide](https://lucide.dev) | 开源图标库 |
| [Vite](https://vite.dev) | 下一代前端构建工具 |

---

## ☕ 打赏支持

如果揽萃知鉴对您有所帮助，欢迎请作者喝杯咖啡 ☕ 您的支持是持续开发的动力！

> 打赏完全自愿，不影响任何功能使用。每一份心意我们都深表感谢 🙏

<div align="center">

| 微信 | 支付宝 |
|:---:|:---:|
| ![微信赞赏码](./assets/wechat-donate.png) | ![支付宝赞赏码](./assets/alipay-donate.jpg) |

</div>

---

<div align="center">

**揽万卷之精华，鉴知识之真谛**

[GitHub](https://github.com/Jay-Victor/LanCuiZhiJian) · [Gitee](https://gitee.com/Jay-Victor/LanCuiZhiJian) · [报告问题](https://github.com/Jay-Victor/LanCuiZhiJian/issues)

</div>
