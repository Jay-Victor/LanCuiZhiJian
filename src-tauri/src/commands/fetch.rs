use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle, WebviewUrl, WebviewWindowBuilder};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FetchResult {
    pub success: bool,
    pub html: String,
    pub title: String,
    pub text_content: String,
    pub word_count: usize,
    pub description: Option<String>,
    pub author: Option<String>,
    pub publish_date: Option<String>,
    pub canonical_url: Option<String>,
    pub language: Option<String>,
    pub og_title: Option<String>,
    pub og_description: Option<String>,
    pub og_image: Option<String>,
    pub og_type: Option<String>,
    pub site_name: Option<String>,
    pub links: Vec<LinkInfo>,
    pub images: Vec<ImageInfo>,
    pub status_code: u16,
    pub content_type: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LinkInfo {
    pub url: String,
    pub text: Option<String>,
    pub is_external: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageInfo {
    pub url: String,
    pub alt: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct FetchOptions {
    pub url: String,
    pub timeout_secs: Option<u64>,
    pub user_agent: Option<String>,
    pub extra_headers: Option<HashMap<String, String>>,
    #[allow(dead_code)]
    pub follow_redirects: Option<bool>,
    pub extract_links: Option<bool>,
    pub extract_images: Option<bool>,
}

fn build_client(timeout_secs: u64) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .connect_timeout(std::time::Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(5))
        .danger_accept_invalid_certs(false)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

fn get_random_user_agent() -> String {
    let agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    ];
    use std::time::SystemTime;
    let seed = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as usize;
    agents[seed % agents.len()].to_string()
}

struct ExtractedMetadata {
    title: String,
    text_content: String,
    word_count: usize,
    description: Option<String>,
    author: Option<String>,
    publish_date: Option<String>,
    canonical_url: Option<String>,
    language: Option<String>,
    og_title: Option<String>,
    og_description: Option<String>,
    og_image: Option<String>,
    og_type: Option<String>,
    site_name: Option<String>,
    links: Vec<LinkInfo>,
    images: Vec<ImageInfo>,
}

fn extract_metadata(html: &str, base_url: &str) -> ExtractedMetadata {
    use scraper::{Html, Selector};

    let document = Html::parse_document(html);
    let base_host = url_host(base_url);

    let title = select_meta_content(&document, "meta[property='og:title']")
        .or_else(|| select_meta_content(&document, "meta[name='twitter:title']"))
        .or_else(|| {
            Selector::parse("h1").ok().and_then(|s| {
                document.select(&s).next().map(|el| el.text().collect::<String>().trim().to_string())
            })
        })
        .or_else(|| {
            Selector::parse("title").ok().and_then(|s| {
                document.select(&s).next().map(|el| el.text().collect::<String>().trim().to_string())
            })
        })
        .unwrap_or_default();

    let text_content = {
        let body_selector = Selector::parse("body").ok();
        let article_selectors = [
            "article", "[role='main']", "main", ".post-content",
            ".article-content", ".entry-content", ".content", "#content",
            ".post", ".article", ".readme", ".markdown-body", ".detail-content",
        ];

        let mut best_text = String::new();
        let mut best_len = 0usize;

        for sel_str in &article_selectors {
            if let Ok(selector) = Selector::parse(sel_str) {
                for el in document.select(&selector) {
                    let text = clean_element_text(el);
                    if text.len() > best_len {
                        best_len = text.len();
                        best_text = text;
                    }
                }
            }
        }

        if best_len < 100 {
            if let Some(body_sel) = body_selector {
                for el in document.select(&body_sel) {
                    let text = clean_element_text(el);
                    if text.len() > best_len {
                        best_text = text;
                    }
                }
            }
        }

        best_text
    };

    let word_count = count_words(&text_content);

    let description = select_meta_content(&document, "meta[name='description']")
        .or_else(|| select_meta_content(&document, "meta[property='og:description']"));

    let author = select_meta_content(&document, "meta[name='author']")
        .or_else(|| select_meta_content(&document, "meta[property='article:author']"));

    let publish_date = select_meta_content(&document, "meta[property='article:published_time']")
        .or_else(|| select_meta_content(&document, "meta[name='publish-date']"))
        .or_else(|| select_meta_content(&document, "meta[name='date']"));

    let canonical_url = select_attr(&document, "link[rel='canonical']", "href");
    let language = select_attr(&document, "html", "lang");
    let og_title = select_meta_content(&document, "meta[property='og:title']");
    let og_description = select_meta_content(&document, "meta[property='og:description']");
    let og_image = select_meta_content(&document, "meta[property='og:image']");
    let og_type = select_meta_content(&document, "meta[property='og:type']");
    let site_name = select_meta_content(&document, "meta[property='og:site_name']");

    let links = extract_links(&document, base_url, base_host.as_deref());
    let images = extract_images(&document, base_url);

    ExtractedMetadata {
        title, text_content, word_count, description, author, publish_date,
        canonical_url, language, og_title, og_description, og_image, og_type,
        site_name, links, images,
    }
}

fn clean_element_text(el: scraper::ElementRef<'_>) -> String {
    use scraper::Selector;

    let mut html = el.html();

    let remove_selectors = [
        "script", "style", "noscript", "nav", "header", "footer", "aside",
        ".advertisement", ".ad", ".ads", ".sidebar", ".navigation", ".menu",
        ".comment", ".comments", ".social-share", ".share-buttons",
        ".modal", ".overlay", ".dialog", ".toast",
        "[class*='newsletter']", "[class*='subscribe']", "[class*='paywall']",
        "[class*='consent']", "[class*='gdpr']",
    ];

    let doc = scraper::Html::parse_document(&html);
    for sel_str in &remove_selectors {
        if let Ok(selector) = Selector::parse(sel_str) {
            for remove_el in doc.select(&selector) {
                let remove_html = remove_el.html();
                html = html.replace(&remove_html, "");
            }
        }
    }

    let clean_doc = scraper::Html::parse_document(&html);
    if let Ok(body_sel) = Selector::parse("body") {
        if let Some(body) = clean_doc.select(&body_sel).next() {
            let text: String = body.text().collect::<Vec<_>>().join(" ");
            return text.split_whitespace().collect::<Vec<_>>().join(" ");
        }
    }

    let text: String = clean_doc.root_element().text().collect::<Vec<_>>().join(" ");
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn select_meta_content(document: &scraper::Html, selector_str: &str) -> Option<String> {
    scraper::Selector::parse(selector_str).ok().and_then(|selector| {
        document.select(&selector).next().and_then(|el| {
            el.value().attr("content").map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
        })
    })
}

fn select_attr(document: &scraper::Html, selector_str: &str, attr: &str) -> Option<String> {
    scraper::Selector::parse(selector_str).ok().and_then(|selector| {
        document.select(&selector).next().and_then(|el| {
            el.value().attr(attr).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
        })
    })
}

fn url_host(url: &str) -> Option<String> {
    url::Url::parse(url).ok().map(|u| u.host_str().unwrap_or("").to_string())
}

fn resolve_url(href: &str, base_url: &str) -> Option<String> {
    if href.starts_with("javascript:") || href.starts_with("#") || href.starts_with("mailto:") || href.starts_with("tel:") {
        return None;
    }
    if href.starts_with("//") {
        return Some(format!("https:{}", href));
    }
    if href.starts_with("http://") || href.starts_with("https://") {
        return Some(href.to_string());
    }
    url::Url::parse(base_url).ok().and_then(|base| {
        base.join(href).ok().map(|u| u.to_string())
    })
}

fn extract_links(document: &scraper::Html, base_url: &str, base_host: Option<&str>) -> Vec<LinkInfo> {
    let mut links = Vec::new();
    let mut seen = std::collections::HashSet::new();

    if let Ok(selector) = scraper::Selector::parse("a[href]") {
        for el in document.select(&selector) {
            if let Some(href) = el.value().attr("href") {
                if let Some(absolute_url) = resolve_url(href, base_url) {
                    if seen.insert(absolute_url.clone()) {
                        let link_host = url_host(&absolute_url);
                        let is_external = base_host.map_or(true, |bh| {
                            link_host.as_deref() != Some(bh)
                        });
                        let text = el.text().collect::<Vec<_>>().join("").trim().to_string();
                        links.push(LinkInfo {
                            url: absolute_url,
                            text: if text.is_empty() { None } else { Some(text) },
                            is_external,
                        });
                    }
                }
            }
            if links.len() >= 50 { break; }
        }
    }

    links
}

fn extract_images(document: &scraper::Html, base_url: &str) -> Vec<ImageInfo> {
    let mut images = Vec::new();
    let mut seen = std::collections::HashSet::new();

    if let Ok(selector) = scraper::Selector::parse("img") {
        for el in document.select(&selector) {
            let src_candidates = [
                el.value().attr("src"),
                el.value().attr("data-src"),
                el.value().attr("data-original"),
                el.value().attr("data-lazy-src"),
            ];

            for src_opt in &src_candidates {
                if let Some(src) = src_opt {
                    if src.starts_with("data:") || src.len() <= 10 { continue; }
                    if let Some(absolute_url) = resolve_url(src, base_url) {
                        if seen.insert(absolute_url.clone()) {
                            let alt = el.value().attr("alt")
                                .or_else(|| el.value().attr("title"))
                                .map(|s| s.to_string())
                                .filter(|s| !s.is_empty());

                            let width = el.value().attr("width")
                                .and_then(|w| w.parse::<u32>().ok())
                                .filter(|&w| w > 1);
                            let height = el.value().attr("height")
                                .and_then(|h| h.parse::<u32>().ok())
                                .filter(|&h| h > 1);

                            if width == Some(1) || height == Some(1) { continue; }

                            images.push(ImageInfo {
                                url: absolute_url,
                                alt,
                                width,
                                height,
                            });
                        }
                        break;
                    }
                }
            }
            if images.len() >= 30 { break; }
        }
    }

    if let Ok(selector) = scraper::Selector::parse("meta[property='og:image']") {
        if let Some(el) = document.select(&selector).next() {
            if let Some(content) = el.value().attr("content") {
                if let Some(absolute_url) = resolve_url(content, base_url) {
                    if seen.insert(absolute_url.clone()) {
                        images.insert(0, ImageInfo {
                            url: absolute_url,
                            alt: None,
                            width: None,
                            height: None,
                        });
                    }
                }
            }
        }
    }

    images
}

fn count_words(text: &str) -> usize {
    let chinese_chars = text.chars().filter(|c| '\u{4e00}' <= *c && *c <= '\u{9fa5}').count();
    let english_words = text.split_whitespace()
        .filter(|w| w.chars().any(|c| c.is_ascii_alphabetic()))
        .count();
    let numbers = text.split_whitespace()
        .filter(|w| w.chars().all(|c| c.is_ascii_digit()))
        .count();
    chinese_chars + english_words + numbers
}

#[command]
pub async fn tauri_fetch_url(options: FetchOptions) -> FetchResult {
    let timeout = options.timeout_secs.unwrap_or(30).max(5).min(60);
    let client = match build_client(timeout) {
        Ok(c) => c,
        Err(e) => return FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: String::new(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code: 0,
            content_type: String::new(),
            error: Some(e),
        },
    };

    let ua = options.user_agent.unwrap_or_else(get_random_user_agent);

    let mut req = client.get(&options.url)
        .header("User-Agent", &ua)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
        .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6")
        .header("Accept-Encoding", "gzip, deflate, br")
        .header("Cache-Control", "no-cache")
        .header("Sec-Ch-Ua", "\"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\"")
        .header("Sec-Ch-Ua-Mobile", "?0")
        .header("Sec-Ch-Ua-Platform", "\"Windows\"")
        .header("Sec-Fetch-Dest", "document")
        .header("Sec-Fetch-Mode", "navigate")
        .header("Sec-Fetch-Site", "none")
        .header("Sec-Fetch-User", "?1")
        .header("Upgrade-Insecure-Requests", "1");

    if let Some(headers) = options.extra_headers {
        for (key, value) in headers {
            req = req.header(&key, &value);
        }
    }

    let response = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            let error_msg = if e.is_timeout() {
                "请求超时".to_string()
            } else if e.is_connect() {
                "无法连接到服务器".to_string()
            } else if e.is_redirect() {
                "重定向过多".to_string()
            } else {
                format!("网络请求失败: {}", e)
            };
            return FetchResult {
                success: false,
                html: String::new(),
                title: String::new(),
                text_content: String::new(),
                word_count: 0,
                description: None,
                author: None,
                publish_date: None,
                canonical_url: None,
                language: None,
                og_title: None,
                og_description: None,
                og_image: None,
                og_type: None,
                site_name: None,
                links: Vec::new(),
                images: Vec::new(),
                status_code: 0,
                content_type: String::new(),
                error: Some(error_msg),
            };
        }
    };

    let status_code = response.status().as_u16();
    let content_type = response.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    if !response.status().is_success() {
        let error_msg = match status_code {
            403 => "访问被拒绝：该网站禁止了自动化访问".to_string(),
            404 => "页面不存在".to_string(),
            429 => "请求过于频繁".to_string(),
            451 => "内容因法律原因不可用".to_string(),
            _ => format!("HTTP错误: {}", status_code),
        };
        return FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: String::new(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code,
            content_type,
            error: Some(error_msg),
        };
    }

    let unsupported = ["application/pdf", "application/json", "image/", "video/", "audio/", "application/octet-stream"];
    if unsupported.iter().any(|t| content_type.to_lowercase().contains(t)) {
        return FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: String::new(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code,
            content_type: content_type.clone(),
            error: Some(format!("不支持的内容类型: {}", content_type)),
        };
    }

    let html = match response.text().await {
        Ok(h) => h,
        Err(e) => {
            return FetchResult {
                success: false,
                html: String::new(),
                title: String::new(),
                text_content: String::new(),
                word_count: 0,
                description: None,
                author: None,
                publish_date: None,
                canonical_url: None,
                language: None,
                og_title: None,
                og_description: None,
                og_image: None,
                og_type: None,
                site_name: None,
                links: Vec::new(),
                images: Vec::new(),
                status_code,
                content_type,
                error: Some(format!("读取响应内容失败: {}", e)),
            };
        }
    };

    if html.len() < 100 {
        return FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: "页面内容为空，可能需要JavaScript渲染".to_string(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code,
            content_type,
            error: Some("返回内容为空：该页面可能需要JavaScript渲染".to_string()),
        };
    }

    let should_extract_links = options.extract_links.unwrap_or(true);
    let should_extract_images = options.extract_images.unwrap_or(true);

    let meta = extract_metadata(&html, &options.url);

    FetchResult {
        success: true,
        html,
        title: meta.title,
        text_content: meta.text_content,
        word_count: meta.word_count,
        description: meta.description,
        author: meta.author,
        publish_date: meta.publish_date,
        canonical_url: meta.canonical_url,
        language: meta.language,
        og_title: meta.og_title,
        og_description: meta.og_description,
        og_image: meta.og_image,
        og_type: meta.og_type,
        site_name: meta.site_name,
        links: if should_extract_links { meta.links } else { Vec::new() },
        images: if should_extract_images { meta.images } else { Vec::new() },
        status_code,
        content_type,
        error: None,
    }
}

#[derive(Debug, Deserialize)]
pub struct RenderedFetchOptions {
    pub url: String,
    pub wait_secs: Option<u64>,
    pub timeout_secs: Option<u64>,
}

const EXTRACTION_JS: &str = r#"
(function() {
    try {
        var removeSelectors = [
            'script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside',
            '.advertisement', '.ad', '.ads', '.sidebar', '.navigation', '.menu',
            '.comment', '.comments', '.social-share', '.share-buttons',
            '.modal', '.overlay', '.dialog', '.toast',
            '[class*="newsletter"]', '[class*="subscribe"]', '[class*="paywall"]',
            '[class*="consent"]', '[class*="gdpr"]'
        ];
        var clone = document.documentElement.cloneNode(true);
        removeSelectors.forEach(function(sel) {
            try {
                clone.querySelectorAll(sel).forEach(function(el) { el.remove(); });
            } catch(e) {}
        });
        var textContent = (clone.body ? clone.body.innerText : clone.textContent) || '';
        var title = document.title || '';
        var descEl = document.querySelector('meta[name="description"]');
        var ogTitleEl = document.querySelector('meta[property="og:title"]');
        var ogDescEl = document.querySelector('meta[property="og:description"]');
        var ogImgEl = document.querySelector('meta[property="og:image"]');
        var authorEl = document.querySelector('meta[name="author"]');
        var langEl = document.documentElement.lang;
        var canonicalEl = document.querySelector('link[rel="canonical"]');
        var data = {
            title: title,
            html: document.documentElement.outerHTML,
            textContent: textContent.trim(),
            description: descEl ? descEl.getAttribute('content') : null,
            ogTitle: ogTitleEl ? ogTitleEl.getAttribute('content') : null,
            ogDescription: ogDescEl ? ogDescEl.getAttribute('content') : null,
            ogImage: ogImgEl ? ogImgEl.getAttribute('content') : null,
            author: authorEl ? authorEl.getAttribute('content') : null,
            language: langEl || null,
            canonicalUrl: canonicalEl ? canonicalEl.getAttribute('href') : null,
        };
        var json = encodeURIComponent(JSON.stringify(data));
        window.location.href = 'https://__tauri_extract__.local/result?d=' + json;
    } catch(e) {
        var errData = { error: e.message };
        var errJson = encodeURIComponent(JSON.stringify(errData));
        window.location.href = 'https://__tauri_extract__.local/error?d=' + errJson;
    }
})();
"#;

#[command]
pub async fn tauri_fetch_rendered(app: AppHandle, options: RenderedFetchOptions) -> FetchResult {
    let wait_secs = options.wait_secs.unwrap_or(5).min(15);
    let timeout_secs = options.timeout_secs.unwrap_or(30).max(10).min(60);

    let (tx, rx) = tokio::sync::oneshot::channel::<Result<serde_json::Value, String>>();
    let tx = Arc::new(Mutex::new(Some(tx)));

    let window_label = format!("extractor-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis());

    let parsed_url = match url::Url::parse(&options.url) {
        Ok(u) => u,
        Err(e) => return FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: String::new(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code: 0,
            content_type: String::new(),
            error: Some(format!("无效的URL: {}", e)),
        },
    };

    let tx_clone = tx.clone();
    let webview_window = match WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::External(parsed_url),
    )
    .inner_size(1280.0, 800.0)
    .visible(false)
    .on_navigation(move |nav_url| {
        if nav_url.host_str() == Some("__tauri_extract__.local") {
            let path = nav_url.path();
            let is_error = path == "/error";
            let data_param = nav_url.query_pairs()
                .find(|(k, _)| k == "d")
                .map(|(_, v)| v.to_string());

            if let Some(json_str) = data_param {
                let result = if is_error {
                    Err(json_str)
                } else {
                    match serde_json::from_str::<serde_json::Value>(&json_str) {
                        Ok(v) => Ok(v),
                        Err(e) => Err(format!("JSON解析失败: {}", e)),
                    }
                };
                if let Some(sender) = tx_clone.lock().unwrap().take() {
                    let _ = sender.send(result);
                }
            }
            return false;
        }
        true
    })
    .build()
    {
        Ok(w) => w,
        Err(e) => return FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: String::new(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code: 0,
            content_type: String::new(),
            error: Some(format!("创建WebView窗口失败: {}", e)),
        },
    };

    tokio::time::sleep(std::time::Duration::from_secs(wait_secs)).await;

    if let Err(e) = webview_window.eval(EXTRACTION_JS) {
        let _ = webview_window.close();
        return FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: String::new(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code: 0,
            content_type: String::new(),
            error: Some(format!("注入JavaScript失败: {}", e)),
        };
    }

    let _result = tokio::time::sleep(std::time::Duration::from_secs(timeout_secs - wait_secs))
        .await;

    let _ = webview_window.close();

    match rx.await {
        Ok(Ok(data)) => {
            let text_content = data.get("textContent")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let word_count = count_words(&text_content);

            let html = data.get("html")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            let meta = if !html.is_empty() {
                let m = extract_metadata(&html, &options.url);
                m
            } else {
                ExtractedMetadata {
                    title: String::new(),
                    text_content: text_content.clone(),
                    word_count,
                    description: None,
                    author: None,
                    publish_date: None,
                    canonical_url: None,
                    language: None,
                    og_title: None,
                    og_description: None,
                    og_image: None,
                    og_type: None,
                    site_name: None,
                    links: Vec::new(),
                    images: Vec::new(),
                }
            };

            FetchResult {
                success: true,
                html,
                title: data.get("title").and_then(|v| v.as_str()).unwrap_or(&meta.title).to_string(),
                text_content: if text_content.len() > meta.text_content.len() { text_content } else { meta.text_content },
                word_count: word_count.max(meta.word_count),
                description: data.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()).or(meta.description),
                author: data.get("author").and_then(|v| v.as_str()).map(|s| s.to_string()).or(meta.author),
                publish_date: meta.publish_date,
                canonical_url: data.get("canonicalUrl").and_then(|v| v.as_str()).map(|s| s.to_string()).or(meta.canonical_url),
                language: data.get("language").and_then(|v| v.as_str()).map(|s| s.to_string()).or(meta.language),
                og_title: data.get("ogTitle").and_then(|v| v.as_str()).map(|s| s.to_string()).or(meta.og_title),
                og_description: data.get("ogDescription").and_then(|v| v.as_str()).map(|s| s.to_string()).or(meta.og_description),
                og_image: data.get("ogImage").and_then(|v| v.as_str()).map(|s| s.to_string()).or(meta.og_image),
                og_type: meta.og_type,
                site_name: meta.site_name,
                links: meta.links,
                images: meta.images,
                status_code: 200,
                content_type: "text/html".to_string(),
                error: None,
            }
        }
        Ok(Err(err)) => FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: String::new(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code: 0,
            content_type: String::new(),
            error: Some(if err.starts_with('{') { format!("页面提取失败: {}", err) } else { err }),
        },
        Err(_) => FetchResult {
            success: false,
            html: String::new(),
            title: String::new(),
            text_content: String::new(),
            word_count: 0,
            description: None,
            author: None,
            publish_date: None,
            canonical_url: None,
            language: None,
            og_title: None,
            og_description: None,
            og_image: None,
            og_type: None,
            site_name: None,
            links: Vec::new(),
            images: Vec::new(),
            status_code: 0,
            content_type: String::new(),
            error: Some("渲染提取超时".to_string()),
        },
    }
}
