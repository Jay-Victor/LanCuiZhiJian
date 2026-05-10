<a id="readme-top"></a>

<div align="center">

<a href="https://github.com/Jay-Victor/LanCuiZhiJian">
  <img src="./logo/icon_source.png" alt="LanCuiZhiJian Logo" width="120" height="120" />
</a>

# LanCuiZhiJian

**AI-Powered Intelligent Text Processing Desktop Application**

*Distill the essence of a thousand volumes, discern the truth of knowledge*

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/Jay-Victor/LanCuiZhiJian)
[![Gitee](https://img.shields.io/badge/Gitee-Repository-red?logo=gitee)](https://gitee.com/Jay-Victor/LanCuiZhiJian)
[![Tauri](https://img.shields.io/badge/Tauri-2.10-FFC131?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.81+-DEA584?logo=rust)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-Custom-blue)](LICENSE)

[Quick Start](#-installation-guide) · [Features](#-core-features) · [Usage](#-usage-instructions) · [Report Bug](https://github.com/Jay-Victor/LanCuiZhiJian/issues) · [Contribute](#-contributing-guide)

English · [中文](./README.md)

</div>

<details>
<summary><strong>📑 Table of Contents</strong></summary>

- [Product Overview](#-product-overview)
- [Core Features](#-core-features)
  - [Intelligent Web Extraction](#-intelligent-web-extraction)
  - [AI Intelligent Processing Pipeline](#-ai-intelligent-processing-pipeline)
  - [Text Preprocessing Pipeline](#-text-preprocessing-pipeline)
  - [AI Request Optimizer](#-ai-request-optimizer)
  - [Design System](#-design-system)
  - [Internationalization](#-internationalization)
  - [More Features](#-more-features)
- [Technical Architecture](#-technical-architecture)
- [Installation Guide](#-installation-guide)
- [Usage Instructions](#-usage-instructions)
- [Configuration](#-configuration)
- [FAQ](#-faq)
- [Changelog](#-changelog)
- [Contributing Guide](#-contributing-guide)
- [Acknowledgements](#-acknowledgements)
- [Support the Project](#-support-the-project)

</details>

---

## 📖 Product Overview

**LanCuiZhiJian** (揽萃知鉴) is an AI-powered intelligent text processing desktop application designed to help users efficiently distill knowledge from massive amounts of information. The name embodies the philosophy of "distilling the essence of a thousand volumes, discerning the truth of knowledge," deeply integrating modern AI technology with traditional Chinese scholarly aesthetics.

### Target Users

LanCuiZhiJian is designed for knowledge workers, researchers, content creators, and students who need to process large volumes of text. Whether you're extracting key information from web pages, generating intelligent summaries of long documents, or batch processing core content from files, LanCuiZhiJian provides end-to-end intelligent support from information input to knowledge output.

### Core Value Proposition

| | Feature | Description |
|:-:|---------|-------------|
| 📥 | **All-in-One Text Processing** | URL extraction / file import / free text input — covers every information entry point; supports TXT, MD, DOCX, DOC, JSON, CSV, XML, HTML, LOG and more file formats |
| 🧠 | **Deep AI Semantic Processing** | 5-stage AI pipeline (Semantic Chunking → Information Extraction → Noise Filtering → Semantic Enhancement → Content Reconstruction), batch parallel execution, far beyond simple text summarization |
| 🤖 | **8 AI Service Providers** | Built-in DeepSeek, ChatGPT, Anthropic, Google Gemini, Qwen, Kimi, Doubao, Zhipu — 8 providers with 25 models + custom provider compatible with all OpenAI API formats |
| 🌐 | **8 Strategies, 3-Layer Extraction** | Rust native HTTP (bypasses CORS) → WebView headless rendering → Third-party API (Jina / Firecrawl) → Browser direct fetch → Web Archive historical snapshots, intelligently adapting to various web pages |
| 🛡️ | **Enterprise-Grade Request Optimization** | Circuit breaker, LRU cache, request deduplication, adaptive timeout, exponential backoff retry, concurrency control, provider health tracking — 7 safeguard mechanisms for high-concurrency stability |
| ⚡ | **Native Desktop Experience** | Built on Tauri 2 + Rust, installer only ~11 MB, memory usage 80–150 MB, significantly lower than Electron solutions (typically 100 MB+ installer, 300 MB+ memory) |
| 🎨 | **Cultural & Technical Fusion** | Noto Serif SC typeface, 27 Chinese traditional culture background presets (Ink Wash / Celadon Blue / Cinnabar Red, etc.), traditional decorative corner accents — creating a unique scholarly ink-wash design language |

---

## ✨ Core Features

### 🌐 Intelligent Web Extraction

LanCuiZhiJian implements **8 extraction strategies**, intelligently dispatched across a 3-layer architecture:

#### 3-Layer Strategy Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Tauri Layer (priority execution, bypasses CORS)         │
│  ① tauri_fetch  —— Rust reqwest HTTP request + scraper HTML     │
│  ② tauri_webview —— Tauri WebView headless browser, JS render   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: API Layer (parallel/sequential execution)                │
│  ③ jina_reader          —— Jina Reader API quick extraction      │
│  ④ jina_reader_rendered —— Jina Reader full render mode          │
│  ⑤ firecrawl            —— Firecrawl API professional JS render  │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Browser Layer (fallback execution)                       │
│  ⑥ direct_fetch —— Browser direct request (CORS-limited)         │
│  ⑦ readability  —— Direct request + Readability algorithm        │
│  ⑧ web_archive  —— Internet Archive historical snapshot fallback │
└─────────────────────────────────────────────────────────────────┘
```

#### Intelligent Strategy Scheduling

| Feature | Implementation Details |
|---------|----------------------|
| **Page Type Detection** | Domain-based classification (SPA domains 20+, AJAX-heavy domains 12+, auth-required domains 7+), supplemented by HTML feature detection (`__NEXT_DATA__`, `__NUXT__`, `ng-app`, etc.) |
| **Dynamic Strategy Ranking** | After 3+ samples, sort by actual success rate; when success rate difference ≤ 0.1, sort by preset priority; automatically filter strategies incompatible with current page type and those missing API keys |
| **Layer-by-Layer Execution** | Layer 1 Tauri strategies tried sequentially, success (word count > 50) returns immediately; Layer 2 API strategies execute in parallel (max 3 by default), select result with most words; Layer 3 browser strategies fallback sequentially |
| **Success Criteria** | Tauri/API layers require extracted word count > 50; WebView rendering strategy requires word count ≥ 30 |
| **Manual Strategy Override** | Supports manually specifying preferred strategy or disabling specific strategies for special scenarios |

#### Rust Backend Extraction Engine

| Capability | Implementation Details |
|-----------|----------------------|
| **HTTP Client** | Based on `reqwest`, connection timeout 10s, max 5 redirects, timeout range 5–60s (default 30s) |
| **Anti-Detection Headers** | Full browser fingerprint: `Sec-Ch-Ua`, `Sec-Fetch-*` and other anti-detection headers + 7 random User-Agents |
| **Intelligent HTML Parsing** | Based on `scraper` crate, article content selector priority chain: `article` → `[role='main']` → `main` → `.post-content` → `.article-content` → `.entry-content` → `.content` → `#content` → `.post` → `.article` → `.readme` → `.markdown-body` → `.detail-content` → `body` (fallback if < 100 characters) |
| **Content Cleaning** | Removes `script`, `style`, `nav`, `header`, `footer`, `aside`, `.ad`, `.sidebar`, `.comment`, `.modal` and other interference elements |
| **Resource Extraction** | Links: max 50 (deduplicated); Images: max 30, supports `src` / `data-src` / `data-original` / `data-lazy-src` four lazy-load attributes, 1×1 pixel tracker filtering, `og:image` inserted at head |
| **WebView Rendering** | Creates hidden WebView (1280×800), injects JS script to extract `innerText` (not `textContent`, preserves visible text), wait time dynamically adjusted by page type (AJAX-heavy 8s, SPA 6s, normal 4s) |

#### Anti-Crawler Mechanisms

| Mechanism | Implementation Details |
|-----------|----------------------|
| **Rate Limiting** | Base delay 800ms + random [0, 1200ms] + jitter [0, 500ms] ≈ 0.8–2.5s |
| **Session Rotation** | Default rotate every 10 requests, immediately rotate on ban (403), keep last 5 historical sessions |
| **User-Agent Pool** | 8 UAs (Chrome/Windows, Chrome/Mac, Firefox/Windows, Safari/Mac, Chrome/Linux, Edge/Windows, etc.) + 3 browser header templates + 4 random Accept-Language variants |
| **CAPTCHA Detection** | 30 CAPTCHA keyword recognition (captcha, recaptcha, hcaptcha, cloudflare, challenge, 人机验证, 安全验证, 滑动验证, etc.), 6 CAPTCHA type classifications |
| **Honeypot Link Detection** | 11 hidden link detection rules (`display:none`, `visibility:hidden`, `opacity:0`, `position:absolute;left:-9999px`, `font-size:0`, `aria-hidden="true"`, etc.) |
| **Banned Domains** | Auto-detects and prompts for social media domains requiring login: facebook.com, instagram.com, twitter.com, linkedin.com, etc. |
| **429 Rate Limiting** | Wait 2000–5000ms after receiving 429 status code before throwing exception |
| **Result Cache** | Max 100 entries, 15 min TTL, FIFO eviction, concurrent requests for same URL automatically merged |

---

### 🤖 AI Intelligent Processing Pipeline

LanCuiZhiJian employs a 5-stage AI processing pipeline with batch parallel execution to maximize throughput:

```
                ┌──────────────────────────────────────────────┐
 Raw Text ─────►│ Batch 1 (parallel)                            │
                │  ├─ Semantic Chunking (SemanticChunker) temp=0.2  │
                │  └─ Noise Filtering (NoiseFilter)      temp=0.2  │
                ├──────────────────────────────────────────────┤
                │ Batch 2 (parallel, depends on Batch 1)       │
                │  ├─ Information Extraction (InfoExtractor) temp=0.2 │
                │  └─ Semantic Enhancement (CognitiveEnhancer) temp=0.6 │
                ├──────────────────────────────────────────────┤
                │ Batch 3 (sequential, merges Batch 1+2)       │
                │  └─ Content Reconstruction (Reconstructor) temp=0.4  │
                └──────────────────────────────────────────────┘
                                    │
                                    ▼
                            Structured Output Result
```

#### Stage Details

| Stage | Module | AI Temp | Processing Logic | Fallback Strategy |
|-------|--------|---------|-----------------|-------------------|
| **1. Semantic Chunking** | `semantic-chunker.ts` | 0.2 | AI segments long text by semantic boundaries into logical paragraphs, extracting `topic` + `keywords` per chunk | Split by double newlines, extract top 5 keywords by word frequency |
| **2. Information Extraction** | `information-extractor.ts` | 0.2 | Generates index markers `[i] content` per chunk, AI extracts `mainPoints`, `keyData`, `conclusions`, `sources` (with traceable chunkIndex) | Take first 3 chunks' topics as mainPoints, first 100 chars per chunk as source |
| **3. Noise Filtering** | `noise-filter.ts` | 0.2 | AI identifies and filters template text, ads, duplicate info, returning `cleanedText`, `noiseRatio`, `removedContent` | Plain text cleaning: merge whitespace, remove extra spaces, calculate noise ratio |
| **4. Semantic Enhancement** | `cognitive-enhancer.ts` | 0.6 | Performs critical analysis on denoised text, identifying `biases`, `logicalFallacies`, `counterArguments` | Regex-based analysis engine: 6 bias patterns + 6 logical fallacy patterns + counter-argument generation |
| **5. Content Reconstruction** | `content-reconstructor.ts` | 0.4 | Aggregates all 4 stages' outputs (chunk summaries + mainPoints + conclusions + cleanedText summary + counterArguments), generates structured output | Take first 3 chunks as Sections, first 2 mainPoints as summary |

#### Semantic Enhancement Fallback Engine Details

When AI is unavailable, the Semantic Enhancement stage activates a built-in **regex-based critical analysis engine**:

**Bias Detection (6 patterns)**:

| Pattern | Match Examples | Type |
|---------|---------------|------|
| Absolutist Claims | "绝对", "一定", "必然", "毫无疑问" | Cognitive Bias |
| Bandwagon Effect | "所有人都知道", "大家都在说", "众所周知" | Logical Flaw |
| Appeal to Authority | "专家表示", "权威人士", "据内部人士" | Argumentation Defect |
| False Dichotomy | "不得不", "只能", "别无选择" | Simplification Fallacy |
| Appeal to Tradition | "一直都是", "自古以来", "历来如此" | Thought Pattern |
| Oversimplification | "说白了就是", "其实就是", "无非就是" | Reduction Bias |

**Logical Fallacy Detection (6 patterns)**: Ad hominem, false dichotomy fallacy, slippery slope, appeal to ignorance, post hoc fallacy, overgeneralization

**Counter-Argument Generation**: Matches opinion verbs ("认为", "主张", "表明", "证明", etc.), replaces opinion verbs with "的反对者认为" (opponents argue that) to automatically generate counter-arguments

#### Checkpoint Resume Mechanism

`CheckpointStorage` implements pipeline-level checkpoint resume based on `localStorage`:

- **Save Timing**: Immediately saves checkpoint after each stage completes (includes completed stage list and each stage's results)
- **Max Capacity**: 20 checkpoints, evicts by update time when exceeded
- **Recovery Flow**: Load checkpoint → determine completed stages → resume by group (chunk/filter as one group, extract/enhance as one group, reconstruct standalone) → auto-delete checkpoint after completion
- **Partial Results**: Even if some stages fail, returns `partialData` from completed stages, avoiding wasted Token consumption

#### Task-Level Timeout Mapping

Different AI tasks use differentiated timeout strategies:

| Task | Base Timeout | Description |
|------|-------------|-------------|
| `chunk` (Semantic Chunking) | 45s | Long input text but simple output structure |
| `extract` (Information Extraction) | 60s | Per-chunk extraction, moderate time consumption |
| `filter` (Noise Filtering) | 45s | Direct processing of original text, shorter output |
| `enhance` (Semantic Enhancement) | 90s | Requires deep analysis, higher creative temperature |
| `reconstruct` (Content Reconstruction) | 90s | Aggregates multi-stage results, generates structured output |

#### Response Parsing & Result Validation

- **6-Layer JSON Parsing Strategy**: Direct parse → Markdown code block extraction → brace/bracket extraction → lenient JSON repair (trailing commas, control characters, escape fixes) → balanced bracket extraction → deep repair (single-quote replacement, unquoted key fix, missing bracket completion)
- **5 Validation Functions**: Each stage's results undergo structural validation, missing fields auto-filled (e.g., topic defaults to "段落N"), anomalies (e.g., cleaned text longer than original) trigger warnings

---

### 📝 Text Preprocessing Pipeline

Before text enters AI processing, LanCuiZhiJian provides a 7-step preprocessing pipeline, each step independently toggleable:

| Step | Function | Implementation Details |
|------|----------|----------------------|
| **1. Encoding Fix** | Fix UTF-8 double encoding and Windows-1252 mojibake | 25 replacement rules (e.g., `â€™`→`'`, `Ã©`→`é`), remove zero-width characters |
| **2. Unicode Normalization** | Normalize Unicode characters to NFC standard form | Eliminates encoding representation differences for identical characters |
| **3. Special Character Removal** | Remove invisible control characters and abnormal whitespace | Remove U+0000–U+001F, U+007F–U+009F control characters, 3+ consecutive spaces → 2, trim leading/trailing whitespace |
| **4. Whitespace Normalization** | Unify line breaks, tabs, compress extra spaces | `\r\n`→`\n`, `\r`→`\n`, Tab→4 spaces, multi-whitespace→1, trim line leading/trailing spaces |
| **5. Boilerplate Removal** | Auto-detect and remove web template content | **50 regex patterns** matching cookie notices, newsletter subscriptions, social sharing, copyright notices, comment sections, navigation bars, ads, login prompts, etc.; lines over 200 characters are skipped |
| **6. Line Deduplication** | Remove duplicate text paragraphs, keep first occurrence | Lines under 10 characters preserved; longer lines deduplicated via dedupKey normalization (remove non-alphanumeric and non-Chinese chars, take first 100 chars) |
| **7. Empty & Short Line Cleanup** | Clean empty lines and overly short lines, preserve structure | Lines shorter than `minLineLength`(2) removed (structural lines excepted), consecutive newlines limited to `maxConsecutiveNewlines`(2) |

**Structural Line Preservation Rules**: When `preserveStructure` is enabled, the following Markdown structural lines are preserved even if shorter than minimum line length:

```
# Headings (#{1,6}\s)  ·  Unordered lists ([-*+]\s)  ·  Ordered lists (\d+\.\s)  ·  Blockquotes (>\s)  ·  Horizontal rules (---)
```

**Compression Ratio Protection**: When preprocessing result compression ratio < 30% and original text length > 500 characters, automatically discard preprocessing result and use simple whitespace cleaning instead (multi-space normalization, multi-newline→double, tab→spaces), preventing over-cleaning that loses important content.

---

### 📊 AI Request Optimizer

Built-in enterprise-grade AI request optimizer with 7 safeguard mechanisms ensuring stability and performance under high-concurrency scenarios:

#### 1. Exponential Backoff Retry

- **Backoff Formula**: `baseDelay × 2^attempt × multiplier + jitter`
- **Error-Type-Specific Backoff Multipliers**: Rate limit (rate_limit) ×2, server error (server) ×1.5, network/timeout ×1.2, others ×1
- **Non-Retriable Errors**: 401 authentication failure, 403 insufficient permissions, invalid API Key, insufficient balance — thrown immediately, avoiding meaningless retries
- **Defaults**: Max 3 retries, 1s base delay, 30s max delay

#### 2. Circuit Breaker

```
closed (normal) ──5 consecutive failures──► open (tripped)
                                              │
                              30s wait then   │
                              half-open       │
                                              ▼
                                       half-open (probing)
                                         │         │
                                     1 success   1 failure
                                         │         │
                                         ▼         ▼
                                      closed     open
```

- Maintained independently per provider dimension — one provider's circuit break doesn't affect others
- Default threshold: 5 consecutive failures trigger circuit break, 30s wait before half-open recovery attempt

#### 3. LRU Cache

- **Cache Key**: Composed of dual FNV-1a hash of `provider:model:task:inputHash:promptHash:maxTokens:temperature`, ensuring exact match for identical requests
- **Capacity**: Max 1000 entries, evict bottom 20% sorted by `hitCount` when exceeded
- **TTL**: 30 minutes, 5-minute interval cleanup of expired entries
- **Effect**: Identical requests return cached results directly, avoiding duplicate Token consumption

#### 4. Request Deduplication

- Implemented via `inFlightRequests Map`, concurrent requests with identical parameters share the same Promise
- 30-minute timeout auto-cleanup of expired deduplication records
- Enabled by default

#### 5. Concurrency Control

- Priority queue + semaphore, default max 5 concurrent requests
- Supports batch execution (`executeBatch`): grouped parallel by concurrency
- Priority levels: `low` / `normal` / `high` / `urgent`

#### 6. Adaptive Timeout

- Dynamically adjusted based on P95 historical latency: `adaptiveTimeout = P95 × 1.5`
- Range constraint: `[baseTimeout, baseTimeout × 3]`
- Requires at least 5 historical data points to enable adaptive mode
- Calculated independently per `provider:task` dimension

#### 7. Provider Health Tracking

- Tracks per provider: average latency, P95 latency, success rate, recent errors (5-minute window)
- Error classification: auth / rate_limit / network / timeout / server / parse / unknown
- 24-hour auto-cleanup of expired metrics
- Unhealthy nodes automatically circuit-broken

---

### 🎨 Design System

#### Design Philosophy

> **Warm minimalism with lightweight texture, restrained yet sophisticated visual expression.**

LanCuiZhiJian adopts a "lightweight Soft UI" design style, discarding heavy decorative effects in favor of large rounded corners, low-contrast micro-light/shadow, and an extremely restrained color system — creating a warm, approachable, and transparent desktop experience. Traditional Chinese aesthetic elements — ink wash backgrounds, mountain silhouettes, bamboo shadows, corner ornaments — are subtly woven into the minimalism, conveying Eastern elegance.

#### Color System

The brand color is celadon blue (`--primary: 200 60% 45%`). A single brand accent color is used throughout — color serves function, not decoration.

| Purpose | CSS Variable | Light Value | Dark Value | Description |
|---------|-------------|-------------|------------|-------------|
| Brand | `--primary` | `200 60% 45%` | Same | Celadon blue, for emphasis, selected state, core actions |
| Background | `--background` | `0 0% 100%` | `222 30% 8%` | Pure white / deep blue-black |
| Card | `--card` | `30 30% 98%` | `222 30% 12%` | Warm white / deep gray-blue |
| Text | `--foreground` | `220 20% 15%` | `210 40% 98%` | Dark text / bright text |
| Border | `--border` | `220 15% 85%` | `222 25% 22%` | Low-contrast fine borders |
| Decoration | `--decoration` | `200 55% 30%` | `200 55% 65%` | Traditional elements, brightens in dark mode |

Status colors: Success `142 76% 36%` · Warning `38 92% 50%` · Error `0 84% 60%` · Info `199 89% 48%`

Global border radius: `--radius: 0.75rem` (12px), unified large rounded corners for all cards and dialogs.

#### Layout System

The app uses a **sidebar navigation + main content area** two-column layout:

```
┌──────────────┬──────────────────────────────────────┐
│              │                                      │
│  Sidebar Nav │          Main Content Area           │
│  (collapsible)│          (responsive)               │
│              │                                      │
│  w-60 / w-16 │          flex-1                      │
│  (240/64px)  │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Sidebar navigation**: Expanded state (240px) shows Logo + text menu + feature toggles; collapsed state (64px) shows icons only + hover tooltips. Nav items include Home, Smart Processing (with submenu), Task Manager (active task badge), History, and Settings.

#### Chinese Traditional Decorative Elements

Subtly woven into the minimal design, all decorative elements render at the global Layout layer with very low opacity (0.05–0.25), never interfering with content readability:

| Element | Component | Description |
|---------|-----------|-------------|
| Ink Wash Background | `ElegantInkBackground` | Two large blurred glows (top-right + bottom-left), simulating ink wash diffusion |
| Mountain Silhouette | `MountainSilhouette` | Low-opacity dual-layer mountain outline SVG at bottom, creating depth |
| Bamboo Shadow | `BambooSilhouette` | Bamboo pole and leaf silhouette SVGs on left/right sides |
| Corner Ornament | `CornerDecoration` | Minimalist line-and-dot SVGs at four corners, modern interpretation of traditional corner motifs |
| Traditional Divider | `MinimalDivider` | Center dot + gradient lines on both sides, classical divider aesthetics |
| Title Ornament | `MinimalTitleDecoration` | Wave line + dot + wave line, title accent decoration |

All decorative elements use CSS variable `--decoration` for color, auto-adapting to light/dark themes, with `pointer-events-none` to not affect interactions.

#### Typography & Animation

| Category | Implementation |
|----------|---------------|
| **Body Font** | Noto Serif SC / Source Han Serif SC, reflecting classical literature processing identity |
| **Monospace Font** | JetBrains Mono / Fira Code, for code display and result editing |
| **Font Size System** | Based on 4px grid, 12px–30px across 7 levels; weights limited to 400/500/600/700 |
| **Page Entry** | Fade-up 0.4s ease-out, cascading delay 75ms increments |
| **Collapse/Expand** | `max-height` + `opacity` transition 300ms ease-out |
| **Card Hover** | Lift `translate-y-0.5` + shadow enhancement `shadow-lg` |
| **Toast Notification** | Scale + translate 250ms, exit 250ms ease-in |
| **Accessibility** | All animations respect `prefers-reduced-motion`, Radix UI ensures keyboard navigation, complete ARIA attributes |

#### Page Design

| Page | Layout | Core Content |
|------|--------|-------------|
| **Home** | Centered symmetric (`max-w-5xl`) | Brand area + quick entry (URL / Text / File three-column cards) + 3-step guide + best practices + traditional wave-line footer |
| **Smart Processing** | Vertical card stack (`max-w-4xl`) | Input card + AI model selector (collapsible) + processing results (collapsible) + progress bar; URL mode includes extraction content card (metadata / keywords / attachments / performance metrics) |
| **Task Manager** | Stats panel + list | 5-column stats cards (total / running / paused / completed / failed) + search filter + task cards (status icon / tags / progress bar) + performance monitor panel |
| **History** | Search + list + modal | Search box + type filter + batch operations + history list + detail full-screen modal (original + result / copy / download) |
| **Settings** | Four tab pages | AI Model Config (8 provider cards + current config panel) · Usage Statistics · Custom Provider · Advanced Settings (prompts / storage / import-export / data cleanup) |

---

### 🌍 Internationalization

| Language | Status | Translation Keys | App Name |
|----------|--------|-----------------|----------|
| 简体中文 | ✅ Complete | ~662 | 揽萃知鉴 |
| English | ✅ Complete | ~662 | LanCui ZhiJian |
| 日本語 | ✅ Complete | ~662 | 蘭萃知鑑 |

Translation keys organized by functional module namespaces (`app.*`, `nav.*`, `reader.*`, `settings.*`, `preprocess.*`, `extraction.*`, `optimizer.*` and 20+ namespaces), supports variable interpolation (`{count}`, `{name}`, etc.).

---

### 📦 More Features

- **Task Manager**: Full task lifecycle management based on React Context — create / update / pause / resume / cancel / retry (max 3 times) / priority adjustment / background running / subscribe to change notifications; supports multi-dimensional filtering and sorting by status/type/priority; max 100 stored tasks, 500ms debounce persistence
- **Multi-Format Export**: Markdown (`.md`) / Plain Text (`.txt`) / Word Document (`.doc`, HTML-in-Word format with Microsoft YaHei font and heading hierarchy styles); save path selected via Tauri file dialog
- **Custom Prompts**: Each AI task's default prompt includes role definition, objectives, execution steps, rules/standards, boundary handling, JSON output format example and constraints; supports `{{variable}}` interpolation, localStorage persistence, schema version migration, structural validation
- **Token Usage Statistics**: Tracks Token consumption per request (prompt_tokens / completion_tokens / total_tokens), with daily/weekly/monthly statistics
- **AI Performance Monitoring**: Real-time monitoring of request success rate, P95/P99 latency distribution, cache hit rate, deduplicated request count, circuit breaker rejection count, per-stage duration
- **History**: Max 50 processing history entries, supports search, type filtering (URL/Text/File), batch select/delete, view details, re-export
- **Auto Update Check**: Built-in software update detection and notification
- **Config Backup & Restore**: Supports exporting and importing all configurations (AI providers, advanced settings, appearance preferences, etc.)
- **Sidebar Navigation**: Collapsible sidebar (expanded 240px / collapsed 64px), smart processing submenu, task manager active task count badge

---

## 🏗️ Technical Architecture

### Overall Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      LanCuiZhiJian Desktop App                    │
├────────────────────────────┬─────────────────────────────────────┤
│     Frontend (WebView)      │        Backend (Rust)               │
│  ┌──────────────────────┐  │  ┌────────────────────────────┐     │
│  │   React 19 + TS 5    │  │  │   Tauri 2 Core Runtime     │     │
│  │                      │  │  │                            │     │
│  │  ┌────────────────┐  │  │  │  ┌──────────────────────┐  │     │
│  │  │   Page Routes   │  │  │  │  │ tauri_fetch_url     │  │     │
│  │  │  · Home         │  │  │  │  │ (reqwest + scraper)  │  │     │
│  │  │  · Reader       │  │  │  │  ├──────────────────────┤  │     │
│  │  │    - URL Fetch  │  │  │  │  │ tauri_fetch_rendered │  │     │
│  │  │    - Text Input │  │  │  │  │ (WebView headless)   │  │     │
│  │  │    - File Import│  │  │  │  ├──────────────────────┤  │     │
│  │  │  · Tasks        │  │  │  │  │ SQLite Database      │  │     │
│  │  │  · History      │  │  │  │  │ (rusqlite bundled)   │  │     │
│  │  │  · Settings     │  │  │  │  ├──────────────────────┤  │     │
│  │  │  · About/Donate │  │  │  │  │ Update Checker       │  │     │
│  │  └────────────────┘  │  │  │  └──────────────────────┘  │     │
│  │  ┌────────────────┐  │  │  └────────────────────────────┘     │
│  │  │  Business Svc  │  │  │                                    │
│  │  │  · AI Pipeline │◄─┼──►│                                    │
│  │  │  · URL Engine  │  │IPC│                                    │
│  │  │  · Optimizer   │  │  │                                    │
│  │  │  · Preprocessor│  │  │                                    │
│  │  │  · File Parser │  │  │                                    │
│  │  │  · Prompt Mgmt │  │  │                                    │
│  │  └────────────────┘  │  │                                    │
│  │  ┌────────────────┐  │  │                                    │
│  │  │  State Mgmt    │  │  │                                    │
│  │  │  (6 Zustand    │  │  │                                    │
│  │  │   Stores)      │  │  │                                    │
│  │  └────────────────┘  │  │                                    │
│  └──────────────────────┘  │                                    │
├────────────────────────────┴─────────────────────────────────────┤
│                    IPC Bridge (Tauri Commands)                    │
└──────────────────────────────────────────────────────────────────┘
```

### AI Service Provider Support Matrix

| Provider | Region | Models | Recommended Model | API Format | Auth Method |
|----------|--------|--------|-------------------|------------|-------------|
| DeepSeek | China | 2 | DeepSeek V4 Flash | OpenAI Compatible | Bearer Token |
| ChatGPT (OpenAI) | International | 5 | GPT-4.1 Mini | OpenAI Native | Bearer Token |
| Anthropic (Claude) | International | 3 | Claude Sonnet 4.6 | Anthropic Native | x-api-key |
| Google (Gemini) | International | 3 | Gemini 3.2 Flash | Google Native | Query Parameter |
| Doubao | China | 3 | Doubao Seed 1.6 Flash | OpenAI Compatible | Bearer Token |
| Kimi (Moonshot) | China | 2 | Kimi K2.6 | OpenAI Compatible | Bearer Token |
| Qwen | China | 3 | Qwen3.6 Flash | OpenAI Compatible | Bearer Token |
| Zhipu GLM | China | 4 | GLM-4.7 Flash (Free) | OpenAI Compatible | Bearer Token |
| Custom | -- | Unlimited | User-defined | OpenAI Compatible | Bearer / API Key / OAuth |

> **Special Handling**: OpenAI reasoning models (o1/o3/o4 series) do not send `temperature` and `response_format`; DeepSeek reasoning model (deepseek-v4-pro) does not send `temperature` but preserves `response_format`; Doubao model IDs are actually Volcano Engine Endpoint IDs; Anthropic requires enabling browser direct access in the console.

### Tech Stack Details

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Desktop Framework** | Tauri | 2.10 | Rust + WebView desktop app framework, Electron alternative |
| **Frontend** | React | 19.0 | UI construction with Hooks-driven declarative UI |
| **Type System** | TypeScript | 5.3 | Project-wide strict mode type safety |
| **Build Tool** | Vite | 6.0 | Fast HMR development & efficient production builds |
| **Styling** | Tailwind CSS | 3.4 | Atomic CSS + CSS variables dual-theme system |
| **UI Primitives** | Radix UI | 1.x | Accessible low-level UI primitives (Dialog / Tabs / Tooltip / Collapsible) |
| **Variant Management** | CVA | 0.7 | class-variance-authority for type-safe component variants |
| **State Management** | Zustand | 4.5 | 6 Stores + persist middleware for persistence |
| **Routing** | React Router DOM | 7.0 | Client-side routing (10 route pages) |
| **Form Validation** | Zod | 3.22 | Runtime type validation |
| **Rust Async** | Tokio | 1.x | Rust async runtime (full features) |
| **HTTP Client** | Reqwest | 0.12 | Rust HTTP requests (bypasses browser CORS) |
| **HTML Parser** | Scraper | 0.19 | Rust HTML DOM parsing & CSS selectors |
| **Database** | Rusqlite | 0.31 | Rust SQLite embedded database (bundled mode) |
| **Markdown** | react-markdown + remark-gfm | 10.1 / 4.0 | GitHub-flavored Markdown rendering |
| **File Parsing** | Mammoth | 1.12 | .docx file parsing |
| **Icons** | Lucide React | 0.344 | Open-source icon library |
| **Testing** | Vitest + Testing Library | 1.0 / 14.0 | Unit testing + React component testing |
| **Code Quality** | ESLint + Prettier | 8.56 / 3.2 | Code standards and formatting |

### Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Installer Size | ~11 MB | NSIS installer, much smaller than Electron (~100MB+) |
| Portable Size | ~12 MB | ZIP archive |
| Memory Usage | ~80–150 MB | Typical workload (including WebView2 runtime) |
| Startup Time | < 2s | Cold start to UI ready |
| Source Files | 125 | .tsx(62) + .ts(56) + .rs(7) |
| Total Translations | ~1,986 | 3 languages × ~662 translation keys |
| AI Provider Models | 24 | 8 built-in providers + unlimited custom |
| Extraction Strategies | 8 | 3-layer architecture, intelligent auto-scheduling |

### Project Directory Structure

```
LanCuiZhiJian/
├── src/                              # Frontend source code
│   ├── app/routes/                   # Page routes (10 pages)
│   │   ├── home/                     #   Home (3-step guide + best practices)
│   │   ├── reader/                   #   Smart Processing
│   │   │   ├── url.tsx               #     URL extraction mode
│   │   │   ├── text.tsx              #     Text input mode (max 5000 chars)
│   │   │   └── file.tsx              #     File import mode (max 10MB)
│   │   ├── tasks/                    #   Task Manager
│   │   ├── history/                  #   History (max 50 entries)
│   │   ├── settings/                 #   Settings Center
│   │   ├── about/                    #   About
│   │   └── donate/                   #   Donate
│   ├── components/                   # UI components
│   │   ├── ui/                       #   Base components (Button / Card / Dialog / Tabs / Toast...)
│   │   ├── layout/                   #   Layout (Layout / Collapsible Sidebar)
│   │   ├── reader/                   #   Smart processing components (AIModelSelector / MarkdownRenderer / DownloadDialog...)
│   │   ├── settings/                 #   Settings components (ProviderCard / AIPerformanceMonitor / TextPreprocessorConfig...)
│   │   ├── theme/                    #   Theme switching (ThemeProvider / ThemeToggle)
│   │   ├── language/                 #   Language switching
│   │   ├── decorative/               #   Decorative elements (traditional patterns / custom backgrounds)
│   │   └── error/                    #   Error boundaries
│   ├── services/                     # Business service layer
│   │   ├── ai/                       #   AI core
│   │   │   ├── providers/            #     AI provider adapters (OpenAI / Google / Moonshot / Zhipu / Custom)
│   │   │   ├── pipeline/             #     5-stage AI processing pipeline + checkpoint resume + orchestrator
│   │   │   └── utils/                #     Response parser (6-layer strategy) + result validator (5 validation functions)
│   │   ├── extraction/               #   URL extraction (8 strategies + 3-layer architecture) + text preprocessing (7-step pipeline)
│   │   ├── usage/                    #   Token usage statistics
│   │   ├── prompts/                  #   Custom prompts (variable interpolation + schema migration)
│   │   ├── file/                     #   File processing (dialog / format filtering)
│   │   └── error/                    #   Global error handling
│   ├── stores/                       # 6 Zustand Stores (app / aiConfig / history / extraction / background / toast)
│   ├── contexts/                     # React Context (TaskManager)
│   ├── i18n/                         # Internationalization (CN / EN / JP, ~662 keys/language)
│   ├── data/                         # Static data definitions (AI providers / background presets)
│   ├── types/                        # TypeScript type definitions
│   └── utils/                        # Utility functions
├── src-tauri/                        # Rust backend source code
│   └── src/
│       ├── main.rs                   #   App entry point
│       ├── lib.rs                    #   Core library
│       └── commands/                 #   Tauri commands
│           ├── fetch.rs              #     Network request proxy (reqwest + scraper + WebView rendering)
│           ├── database.rs           #     SQLite database operations
│           └── update.rs             #     Software update checker
├── assets/                            # Donation QR codes & project assets
├── Releases/                         # Release artifacts
├── package.json                      # Frontend dependencies
├── src-tauri/Cargo.toml              # Rust dependencies
├── src-tauri/tauri.conf.json         # Tauri configuration
├── tailwind.config.js                # Tailwind configuration
└── vite.config.ts                    # Vite configuration
```

---

## 📥 Installation Guide

### System Requirements

| Item | Minimum Requirement |
|------|---------------------|
| Operating System | Windows 10 1803 or later |
| WebView2 | Microsoft Edge WebView2 Runtime (built into Windows 10 21H2+ and Windows 11) |
| Disk Space | ~50 MB (including runtime dependencies) |
| Memory | 4 GB+ recommended |

### Option 1: Standard Installer (Recommended)

1. Download the latest `揽萃知鉴_vX.X.X_Setup.exe` from the [Releases](https://github.com/Jay-Victor/LanCuiZhiJian/releases) page
2. Double-click to run the installer
3. Follow the installation wizard (supports Chinese/English UI)
4. Launch from Start Menu or desktop shortcut

> **Note**: If the system prompts for missing WebView2 runtime, the installer will automatically guide you to download and install it (Evergreen Bootstrapper method).

### Option 2: Portable Version

1. Download the latest `揽萃知鉴_vX.X.X_Portable.zip` from the [Releases](https://github.com/Jay-Victor/LanCuiZhiJian/releases) page
2. Extract the ZIP to any directory
3. Double-click `揽萃知鉴.exe` to run

> **Portable Features**: No installation needed, no registry entries, no system services. Delete the folder to completely uninstall.

### Option 3: Build from Source

#### Prerequisites

| Tool | Version | Installation |
|------|---------|-------------|
| Node.js | >= 18.0 | [nodejs.org](https://nodejs.org) |
| Rust | >= 1.81 | [rustup.rs](https://rustup.rs) |
| pnpm / npm | Latest stable | npm included with Node.js |

#### Build Steps

```bash
# 1. Clone the repository
git clone https://github.com/Jay-Victor/LanCuiZhiJian.git
cd LanCuiZhiJian

# 2. Install frontend dependencies
npm install

# 3. Run in development mode
npm run tauri dev

# 4. Production build (generates installer)
npm run tauri build
```

Build artifacts are located in `src-tauri/target/release/bundle/nsis/`.

#### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Start frontend dev server |
| `npm run build` | `tsc && vite build` | TypeScript type check + frontend build |
| `npm run tauri dev` | `tauri dev` | Start Tauri dev mode (frontend + Rust) |
| `npm run tauri build` | `tauri build` | Production build (generates installer) |
| `npm run typecheck` | `tsc --noEmit` | TypeScript type check |
| `npm run lint` | `eslint . --ext ts,tsx` | ESLint code standards check |
| `npm run lint:fix` | `eslint . --ext ts,tsx --fix` | Auto-fix ESLint issues |
| `npm run format` | `prettier --write "src/**/*.{ts,tsx,css}"` | Prettier formatting |
| `npm run test` | `vitest` | Run tests |
| `npm run test:coverage` | `vitest --coverage` | Test coverage |

---

## 📚 Usage Instructions

### Quick Start

1. **Launch the app**: First launch opens the home page with feature introduction and best practices
2. **Configure AI service**: Go to "Settings → AI Models", select a provider and enter your API Key
3. **Start using**: Choose an input method from the sidebar

### Three Input Methods

#### 🌐 URL Extraction

1. Click "Smart Processing" → "URL Extraction" in the sidebar
2. Paste a web URL in the input field
3. Click "Start Extraction" — the system automatically executes 3-layer strategy scheduling to fetch web content
4. After extraction, select an AI model
5. Click "Start Processing" — AI pipeline executes in batch parallel
6. View results, export as Markdown / Plain Text / Word Document

> **Supported special pages**: SPA single-page apps, AJAX dynamic loading pages, JavaScript-rendered pages; does not support pages requiring login authentication (system auto-detects and prompts).

#### 📝 Text Input

1. Switch to the "Text" tab
2. Paste or type text in the text area (max 5,000 characters)
3. Select an AI model, click "Start Processing"

#### 📁 File Import

1. Switch to the "File" tab
2. Click "Select File" or drag and drop files into the window
3. Supported formats: `.txt`, `.md`, `.docx`, `.doc`, `.json`, `.csv`, `.xml`, `.html`, `.log` (max 10 MB)
4. Select an AI model, click "Start Processing"

### AI Processing Pipeline Details

When you click "Start Processing", text goes through the following 5 stages (batch parallel execution):

| Stage | Input | Output | AI Temp | Description |
|-------|-------|--------|---------|-------------|
| Semantic Chunking | Raw text | Logical paragraph list (topic + keywords) | 0.2 | AI understands text structure, splits at semantic boundaries |
| Information Extraction | Indexed logical paragraphs | mainPoints + keyData + conclusions + sources | 0.2 | Extracts key arguments, data, and conclusions per paragraph, with traceability |
| Noise Filtering | Raw text | cleanedText + noiseRatio + removedContent | 0.2 | Identifies and removes duplicates, ads, and template content |
| Semantic Enhancement | Denoised text | biases + logicalFallacies + counterArguments | 0.6 | Critical analysis: identifies biases, logical fallacies, generates counter-arguments |
| Content Reconstruction | Aggregated from all 4 stages | title + summary + sections + insights + recommendations | 0.4 | Reorganizes into clearly structured output document |

> Each stage has a local fallback strategy (auto-activated when AI is unavailable) and checkpoint resume (can continue from last completed position after interruption), ensuring processing reliability.

### Task Management

- All processing tasks automatically enter the background queue, supporting 6 states (Waiting / Running / Paused / Completed / Failed / Cancelled)
- 4 priority levels (Low / Normal / High / Urgent), supports dynamic adjustment
- View all task status, progress, and results in the "Task Management" page
- Supports pause / resume / cancel / retry for in-progress tasks
- Historical tasks can be viewed and re-exported from the "History" page

---

## ⚙️ Configuration

### AI Service Provider Configuration

Navigate to "Settings → AI Models" tab to configure your AI service providers:

| Provider | Region | Models | Recommended Model | Get API Key |
|----------|--------|--------|-------------------|-------------|
| DeepSeek | China | 2 | DeepSeek V4 Flash | [Platform](https://platform.deepseek.com) |
| ChatGPT | International | 5 | GPT-4.1 Mini | [Platform](https://platform.openai.com) |
| Anthropic | International | 3 | Claude Sonnet 4.6 | [Platform](https://console.anthropic.com) |
| Google Gemini | International | 3 | Gemini 3.2 Flash | [Platform](https://aistudio.google.com) |
| Doubao | China | 3 | Doubao Seed 1.6 Flash | [Platform](https://console.volcengine.com/ark) |
| Kimi | China | 2 | Kimi K2.6 | [Platform](https://platform.moonshot.cn) |
| Qwen | China | 3 | Qwen3.6 Flash | [Platform](https://dashscope.console.aliyun.com) |
| Zhipu GLM | China | 4 | GLM-4.7 Flash (Free) | [Platform](https://open.bigmodel.cn) |
| Custom | -- | Unlimited | User-defined | User-provided |

**Configuration Steps**:

1. Toggle the "Enable" switch on the provider card
2. Enter your API Key (supports password mode for hiding)
3. Select a default model
4. Click "Verify Connectivity" to test if the configuration is correct

**Custom Provider**: Supports configuring custom Base URL, API Key, authentication method (Bearer Token / API Key / OAuth), custom headers, and default model. Compatible with any OpenAI API format provider. Smart endpoint concatenation: if Base URL already contains `/chat/completions` it's used directly, otherwise automatically appended.

### Advanced Configuration

Navigate to "Settings → Advanced" tab:

#### Text Preprocessing Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Fix Encoding | On | 25 rules to fix UTF-8 double encoding and Windows-1252 mojibake, remove zero-width characters |
| Unicode Normalization | On | NFC standard form unification, eliminates encoding differences |
| Whitespace Normalization | On | `\r\n`→`\n`, Tab→4 spaces, multi-whitespace→1, trim line leading/trailing spaces |
| Remove Special Characters | On | Remove U+0000–U+001F, U+007F–U+009F control characters, 3+ consecutive spaces → 2 |
| Remove Boilerplate | On | 50 regex patterns to remove cookie notices, ads, copyright notices, etc. |
| Line Deduplication | On | Deduplicate via dedupKey normalization, keep first occurrence |
| Preserve Structure | On | Keep Markdown headings / lists / quotes / horizontal rules and other structural lines |
| Min Line Length | 2 | Lines shorter than this will be removed (structural lines excepted) |
| Max Consecutive Newlines | 2 | Empty lines exceeding this will be compressed |

#### URL Extraction Strategy Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Preferred Strategy | Auto | Manually specify preferred extraction strategy (8 options) |
| Strategy Enable/Disable | All enabled | Disable unwanted strategies |
| Jina API Key | Empty | API key for Jina Reader service (no key uses shared infrastructure, may be rate-limited) |
| Firecrawl API Key | Empty | API key for Firecrawl service (required, otherwise this strategy is skipped) |
| Parallel Execution | On | Layer 2 API strategies execute simultaneously |
| Anti-Crawler Mode | On | Session rotation + UA randomization + honeypot detection + CAPTCHA recognition |
| Max Parallel Count | 3 | Upper limit of simultaneously executing API strategies |
| Session Rotation Interval | 10 | Rotate session every N requests |

#### AI Request Optimization Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Cache | On | Dual FNV-1a hash cache key, max 1000 entries, LRU eviction |
| Adaptive Timeout | On | Dynamically adjusted based on P95 historical latency × 1.5, requires at least 5 historical data points |
| Request Deduplication | On | Concurrent requests with identical parameters share Promise |
| Max Retries | 3 | Maximum retry count on failure (non-retriable errors thrown immediately) |
| Request Timeout | 60s | Maximum wait time per global request |
| Connection Timeout | 10s | Maximum wait for connection establishment |
| Max Concurrency | 5 | Upper limit of concurrent AI requests (priority queue + semaphore) |
| Base Delay | 1000ms | Exponential backoff initial delay |
| Max Delay | 30s | Exponential backoff delay ceiling |
| Cache TTL | 30min | Cache entry time-to-live |
| Circuit Breaker Threshold | 5 | Consecutive failures to trigger circuit break (per provider) |
| Circuit Breaker Recovery | 30s | Wait time before recovery attempt (half-open probe) |
| Adaptive Multiplier | 1.5x | P95 latency multiplier |

### Appearance Configuration

- **Theme**: Light / Dark / System (CSS variables global switching, double-frame rendering on switch to prevent flicker)
- **Language**: 简体中文 / English / 日本語 (~662 translation keys/language)
- **Background Presets**: 12 solid colors + 15 gradients (Ink Wash / Nature / Minimal categories), each with light/dark dual adaptation; supports custom images (JPG/PNG/WebP, max 5MB, with crop), adjustable opacity / blur / foreground overlay

### Custom Prompts

Navigate to "Settings → Advanced → Custom Prompts" to customize the prompt templates used at each AI processing stage. Each default prompt includes: role definition, objectives, execution steps, rules/standards, boundary handling, JSON output format example, and constraints. Supports `{{variable}}` interpolation, persistent storage, and schema version migration.

---

## ❓ FAQ

### Installation & Running

**Q: The installer says WebView2 is missing?**

A: Windows 10 21H2+ and Windows 11 have WebView2 built-in. For older Windows 10, the installer will automatically guide you to download the Evergreen Bootstrapper. You can also manually install it from the [Microsoft website](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

**Q: What's the difference between the installer and portable versions?**

A: Functionality is identical. The installer creates Start Menu shortcuts and uninstall entries; the portable version runs from any folder and is deleted by removing the folder. Regular users should use the installer; portable needs use the ZIP version.

**Q: The app shows a white screen after launch?**

A: Verify WebView2 runtime is correctly installed. Try uninstalling and reinstalling WebView2 Evergreen Runtime. If the issue persists, please file an Issue.

### AI Service Configuration

**Q: Which AI providers are supported?**

A: 8 built-in providers (DeepSeek / ChatGPT / Anthropic / Google Gemini / Doubao / Kimi / Qwen / Zhipu GLM) with 25 models total, plus custom provider. The custom provider supports any service compatible with the OpenAI API format.

**Q: Why does it say "Please configure an AI model first"?**

A: You need to enable at least one provider and enter a valid API Key in "Settings → AI Models" before using AI processing features.

**Q: Which AI provider is recommended for users in China?**

A: DeepSeek V4 Flash (high cost-effectiveness), Qwen3.6 Flash (stable), or Kimi K2.6 (strong Chinese capabilities) are recommended. Zhipu GLM-4.7 Flash offers free quota. International services like ChatGPT / Anthropic may require network proxy configuration.

**Q: How to configure a custom provider?**

A: In Settings, click "Add Custom Provider", fill in the service name, Base URL, API Key, select authentication method (Bearer Token / API Key / OAuth), and optionally configure custom headers and default model. The system is compatible with all OpenAI API format services.

**Q: What is the Doubao Endpoint ID?**

A: Doubao's model IDs are not conventional model names — they are Endpoint IDs obtained after creating an access point in the Volcano Engine console. Please enter your Endpoint ID in the Doubao provider configuration.

### Web Extraction

**Q: URL extraction failed, what should I do?**

A: The system uses 3-layer 8-strategy automatic fallback, which usually succeeds. Possible failure causes and solutions:
- **CORS restrictions**: The system auto-prioritizes Rust native fetch (completely bypasses CORS). If still failing, try switching strategies
- **Anti-crawl mechanisms**: Enable "Anti-Crawler Mode" in Settings → Advanced (session rotation + UA randomization + CAPTCHA detection)
- **Dynamic content**: WebView rendering strategy handles JavaScript-rendered pages (wait 4–8s)
- **Page unavailable**: System auto-falls back to Web Archive historical snapshots
- **API rate limiting**: Jina Reader shared infrastructure may be rate-limited; recommend configuring an API Key
- **Login-required pages**: System auto-detects authentication-required pages and prompts (e.g., GitHub, Google login pages)

**Q: How to choose an extraction strategy?**

A: The default "Auto" mode is sufficient — the system detects page type based on domain classification + HTML features, combined with historical success rate for dynamic ranking. To manually specify, go to "Settings → Advanced → URL Extraction Strategy" and select a preferred strategy.

### Performance & Optimization

**Q: Processing large texts is slow?**

A: Optimization suggestions:
- Adjust max concurrency (default 5) and timeout in "Settings → Advanced → AI Request Optimization"
- Enable cache to avoid reprocessing identical content (enabled by default)
- Use faster AI models (e.g., DeepSeek V4 Flash) for initial processing, then stronger models for enhancement

**Q: AI requests frequently time out?**

A: The system sets differentiated timeouts for different tasks (chunking 45s, extraction 60s, enhancement/reconstruction 90s). You can increase the global request timeout (default 60s) in "Settings → Advanced → AI Request Optimization", or enable adaptive timeout to let the system auto-adjust based on network conditions.

**Q: Token consumption is too high?**

A: Enable the cache feature in the AI Request Optimizer (on by default, dual FNV-1a hash ensures exact matching) — identical requests won't consume additional Tokens. You can also view detailed Token consumption in "Settings → Usage Statistics". The checkpoint resume feature also avoids duplicate Token consumption after interruptions.

---

## 📋 Changelog

### v0.1.0 (2026-05-10)

#### Added

- 🎉 First public release
- **URL Web Text Intelligent Extraction**: 8 strategies, 3-layer architecture, page type detection, dynamic strategy ranking, anti-crawler mechanisms (session rotation / UA randomization / CAPTCHA detection / honeypot link detection)
- **AI 5-Stage Intelligent Processing Pipeline**: Semantic Chunking → Information Extraction → Noise Filtering → Semantic Enhancement → Content Reconstruction, batch parallel execution, per-stage independent fallback strategy
- **8 AI Service Providers** built-in 25 models + custom provider (OpenAI API format compatible, 3 auth methods)
- **Text Preprocessing Pipeline**: 7-step processing (encoding fix / Unicode normalization / special character removal / whitespace normalization / 50-pattern boilerplate removal / line deduplication / structure preservation), compression ratio protection
- **AI Request Optimizer**: Circuit breaker / LRU cache / request deduplication / concurrency control / adaptive timeout / exponential backoff retry / provider health tracking
- **Task Management**: 6 states / 4 priorities / background queue / progress tracking / checkpoint resume / retry / filter & sort
- **Multi-Format Export**: Markdown / Plain Text / Word Document
- **CN / EN / JP Trilingual Internationalization**: ~662 translation keys/language, variable interpolation support
- **Light / Dark / System Triple Theme**: CSS variables global switching, double-frame rendering to prevent flicker
- **27 Chinese Traditional Culture Background Presets**: 12 solid + 15 gradient (Ink Wash / Nature / Minimal), light/dark dual adaptation
- **Custom Background**: Supports solid color / gradient / custom image (crop / opacity / blur / foreground overlay)
- **AI Performance Monitoring Dashboard**: P95/P99 latency / success rate / cache hit rate / error classification / provider health
- **Token Usage Statistics**: prompt / completion / total tokens tracking
- **Custom Prompt Templates**: Variable interpolation / schema migration / structural validation
- **Text Preprocessing / Extraction Strategy / AI Request Optimization** Configuration UI
- **Config Backup & Restore**
- **NSIS Installer + Portable ZIP Version**

---

## 🤝 Contributing Guide

We welcome and appreciate all forms of contribution — bug reports, feature suggestions, code contributions, and documentation improvements.

### Reporting Issues

1. Search [GitHub Issues](https://github.com/Jay-Victor/LanCuiZhiJian/issues) or [Gitee Issues](https://gitee.com/Jay-Victor/LanCuiZhiJian/issues) for existing reports
2. If none exists, create a new Issue with:
   - Operating system version
   - Application version
   - Steps to reproduce
   - Expected vs. actual behavior
   - Relevant screenshots or logs

### Submitting Code

1. **Fork the repository**: Click the Fork button on the repository page
2. **Create a branch**: `git checkout -b feature/your-feature-name`
3. **Develop and test**:
   ```bash
   npm install          # Install dependencies
   npm run tauri dev    # Development mode
   npm run typecheck    # Type checking
   npm run lint         # Code standards check
   npm run test         # Run tests
   ```
4. **Commit**: `git commit -m 'feat: add some feature'`
5. **Push**: `git push origin feature/your-feature-name`
6. **Create a Pull Request**: Open a PR on GitHub / Gitee

### Commit Convention

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation update |
| `style` | Code formatting (no logic change) |
| `refactor` | Code refactoring |
| `perf` | Performance optimization |
| `test` | Test-related |
| `chore` | Build/toolchain changes |

### Development Standards

- **TypeScript strict mode**: All code must pass `npm run typecheck`
- **ESLint compliance**: Code must pass `npm run lint`
- **Component patterns**: Follow existing shadcn/ui + CVA component patterns
- **Styling**: Use Tailwind CSS atomic classes + `cn()` utility for class merging
- **Internationalization**: All user-visible text must use i18n translation keys (~662 keys/language)
- **Accessibility**: Interactive components must support keyboard navigation; animations must respect `prefers-reduced-motion`
- **State Management**: Use Zustand + persist middleware, configuration data auto-persisted to localStorage

### Project Structure Conventions

- `src/components/ui/` — Base UI components (Button, Card, Dialog, etc.)
- `src/components/settings/` — Settings page components
- `src/components/reader/` — Smart processing components
- `src/services/ai/providers/` — AI provider adapters
- `src/services/ai/pipeline/` — AI processing pipeline + checkpoint resume
- `src/services/extraction/` — URL extraction + text preprocessing
- `src/stores/` — 6 Zustand Stores
- `src/i18n/` — Internationalization translation files
- `src-tauri/src/commands/` — Rust backend Tauri commands

---

## 🙏 Acknowledgements

Thanks to the following open-source projects and communities:

| Project | Purpose |
|---------|---------|
| [Tauri](https://tauri.app) | Lightweight desktop application framework |
| [React](https://react.dev) | UI construction library |
| [Rust](https://www.rust-lang.org) | Safe and efficient systems programming language |
| [Tailwind CSS](https://tailwindcss.com) | Atomic CSS framework |
| [Radix UI](https://www.radix-ui.com) | Accessible UI primitives |
| [Zustand](https://github.com/pmndrs/zustand) | Lightweight state management |
| [Reqwest](https://github.com/seanmonstar/reqwest) | Rust HTTP client |
| [Scraper](https://github.com/causal-agent/scraper) | Rust HTML parsing library |
| [Lucide](https://lucide.dev) | Open-source icon library |
| [Vite](https://vite.dev) | Next-generation frontend build tool |

---

## ☕ Support the Project

If LanCuiZhiJian has been helpful to you, consider buying the author a coffee ☕ Your support is the driving force for continued development!

> Donations are completely voluntary and do not affect any functionality. Every gesture is deeply appreciated 🙏

<div align="center">

| WeChat | Alipay |
|:---:|:---:|
| ![WeChat QR](./assets/wechat-donate.png) | ![Alipay QR](./assets/alipay-donate.jpg) |

</div>

---

<div align="center">

**Distill the essence of a thousand volumes, discern the truth of knowledge**

[GitHub](https://github.com/Jay-Victor/LanCuiZhiJian) · [Gitee](https://gitee.com/Jay-Victor/LanCuiZhiJian) · [Report Issue](https://github.com/Jay-Victor/LanCuiZhiJian/issues)

</div>
