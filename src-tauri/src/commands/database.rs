use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use std::sync::Mutex;
use std::path::PathBuf;

const DB_VERSION: i32 = 2;

const MAX_TITLE_LEN: usize = 500;
const MAX_CONTENT_LEN: usize = 10_000_000;
const MAX_URL_LEN: usize = 2048;
const MAX_TYPE_LEN: usize = 50;
const MAX_RESULT_LEN: usize = 10_000_000;
const MAX_PROVIDER_LEN: usize = 100;
const MAX_MODEL_LEN: usize = 100;
const MAX_QUERY_LIMIT: i32 = 1000;
const MIN_QUERY_LIMIT: i32 = 1;
const MIN_QUERY_OFFSET: i32 = 0;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub source_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub content: String,
    pub source_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentRequest {
    pub id: i64,
    pub title: Option<String>,
    pub content: Option<String>,
    pub source_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryRecord {
    pub id: i64,
    pub r#type: String,
    pub title: String,
    pub content: String,
    pub result: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateHistoryRequest {
    pub r#type: String,
    pub title: String,
    pub content: String,
    pub result: String,
    pub provider: Option<String>,
    pub model: Option<String>,
}

pub struct Database {
    conn: Mutex<rusqlite::Connection>,
    db_path: PathBuf,
}

impl Database {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;
        
        std::fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app directory: {}", e))?;
        
        let db_path = app_dir.join("lancui_jijian.db");
        let db_exists = db_path.exists();
        
        let conn = rusqlite::Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| format!("Failed to set pragmas: {}", e))?;
        
        if !db_exists {
            Self::create_tables_v2(&conn)?;
            Self::set_version(&conn, DB_VERSION)?;
        } else {
            Self::run_migrations(&conn)?;
        }
        
        Ok(Self {
            conn: Mutex::new(conn),
            db_path,
        })
    }

    fn create_tables_v2(conn: &rusqlite::Connection) -> Result<(), String> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                source_url TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            
            CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
            
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                result TEXT NOT NULL,
                provider TEXT,
                model TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            
            CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at);

            CREATE TABLE IF NOT EXISTS db_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );"
        ).map_err(|e| format!("Failed to create tables: {}", e))?;
        Ok(())
    }

    fn get_version(conn: &rusqlite::Connection) -> i32 {
        conn.query_row(
            "SELECT value FROM db_meta WHERE key = 'version'",
            [],
            |row| row.get::<_, String>(0)
        ).ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1)
    }

    fn set_version(conn: &rusqlite::Connection, version: i32) -> Result<(), String> {
        conn.execute(
            "INSERT OR REPLACE INTO db_meta (key, value) VALUES ('version', ?1)",
            [version.to_string()],
        ).map_err(|e| format!("Failed to set db version: {}", e))?;
        Ok(())
    }

    fn run_migrations(conn: &rusqlite::Connection) -> Result<(), String> {
        let current_version = Self::get_version(conn);

        if current_version < 2 {
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS db_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );"
            ).map_err(|e| format!("Migration v2 failed: {}", e))?;
        }

        Self::set_version(conn, DB_VERSION)?;
        Ok(())
    }
    
    pub fn get_db_path(&self) -> &PathBuf {
        &self.db_path
    }
}

fn validate_string_len(value: &str, max_len: usize, field_name: &str) -> Result<(), String> {
    if value.len() > max_len {
        Err(format!("{} 超出最大长度限制 ({} > {})", field_name, value.len(), max_len))
    } else {
        Ok(())
    }
}

fn validate_optional_string_len(value: &Option<String>, max_len: usize, field_name: &str) -> Result<(), String> {
    match value {
        Some(s) if s.len() > max_len => Err(format!("{} 超出最大长度限制 ({} > {})", field_name, s.len(), max_len)),
        _ => Ok(())
    }
}

fn validate_query_bounds(limit: i32, offset: i32) -> Result<(i32, i32), String> {
    let clamped_limit = limit.clamp(MIN_QUERY_LIMIT, MAX_QUERY_LIMIT);
    let clamped_offset = offset.max(MIN_QUERY_OFFSET);
    Ok((clamped_limit, clamped_offset))
}

#[tauri::command]
pub async fn init_database(
    app_handle: AppHandle,
) -> Result<String, String> {
    let db = Database::new(&app_handle)?;
    app_handle.manage(db);
    Ok("Database initialized successfully".to_string())
}

#[tauri::command]
pub async fn get_documents(
    db: State<'_, Database>,
    limit: i32,
    offset: i32,
) -> Result<Vec<Document>, String> {
    let (limit, offset) = validate_query_bounds(limit, offset)?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, title, content, source_url, created_at, updated_at 
         FROM documents 
         ORDER BY created_at DESC 
         LIMIT ?1 OFFSET ?2"
    ).map_err(|e| e.to_string())?;
    
    let documents = stmt.query_map([limit, offset], |row| {
        Ok(Document {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            source_url: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    Ok(documents)
}

#[tauri::command]
pub async fn create_document(
    db: State<'_, Database>,
    request: CreateDocumentRequest,
) -> Result<Document, String> {
    validate_string_len(&request.title, MAX_TITLE_LEN, "标题")?;
    validate_string_len(&request.content, MAX_CONTENT_LEN, "内容")?;
    validate_optional_string_len(&request.source_url, MAX_URL_LEN, "来源URL")?;

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT INTO documents (title, content, source_url) VALUES (?1, ?2, ?3)",
        rusqlite::params![request.title, request.content, request.source_url],
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    
    let created_at: String = conn.query_row(
        "SELECT created_at FROM documents WHERE id = ?1",
        [id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    Ok(Document {
        id,
        title: request.title,
        content: request.content,
        source_url: request.source_url,
        created_at: created_at.clone(),
        updated_at: created_at,
    })
}

#[tauri::command]
pub async fn update_document(
    db: State<'_, Database>,
    request: UpdateDocumentRequest,
) -> Result<Document, String> {
    if let Some(ref title) = request.title {
        validate_string_len(title, MAX_TITLE_LEN, "标题")?;
    }
    if let Some(ref content) = request.content {
        validate_string_len(content, MAX_CONTENT_LEN, "内容")?;
    }
    validate_optional_string_len(&request.source_url, MAX_URL_LEN, "来源URL")?;

    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let existing: Document = conn.query_row(
        "SELECT id, title, content, source_url, created_at, updated_at FROM documents WHERE id = ?1",
        [request.id],
        |row| Ok(Document {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            source_url: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        }),
    ).map_err(|e| format!("Document not found: {}", e))?;

    let title = request.title.unwrap_or(existing.title);
    let content = request.content.unwrap_or(existing.content);
    let source_url = request.source_url.or(existing.source_url);

    conn.execute(
        "UPDATE documents SET title = ?1, content = ?2, source_url = ?3, updated_at = datetime('now') WHERE id = ?4",
        rusqlite::params![title, content, source_url, request.id],
    ).map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, title, content, source_url, created_at, updated_at FROM documents WHERE id = ?1",
        [request.id],
        |row| Ok(Document {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            source_url: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_document(
    db: State<'_, Database>,
    id: i64,
) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM documents WHERE id = ?1",
        [id],
    ).map_err(|e| e.to_string())?;
    
    Ok(true)
}

#[tauri::command]
pub async fn get_history(
    db: State<'_, Database>,
    limit: i32,
    offset: i32,
) -> Result<Vec<HistoryRecord>, String> {
    let (limit, offset) = validate_query_bounds(limit, offset)?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, type, title, content, result, provider, model, created_at
         FROM history
         ORDER BY created_at DESC
         LIMIT ?1 OFFSET ?2"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map([limit, offset], |row| {
        Ok(HistoryRecord {
            id: row.get(0)?,
            r#type: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            result: row.get(4)?,
            provider: row.get(5)?,
            model: row.get(6)?,
            created_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(records)
}

#[tauri::command]
pub async fn create_history(
    db: State<'_, Database>,
    request: CreateHistoryRequest,
) -> Result<HistoryRecord, String> {
    validate_string_len(&request.r#type, MAX_TYPE_LEN, "类型")?;
    validate_string_len(&request.title, MAX_TITLE_LEN, "标题")?;
    validate_string_len(&request.content, MAX_CONTENT_LEN, "内容")?;
    validate_string_len(&request.result, MAX_RESULT_LEN, "结果")?;
    validate_optional_string_len(&request.provider, MAX_PROVIDER_LEN, "提供商")?;
    validate_optional_string_len(&request.model, MAX_MODEL_LEN, "模型")?;

    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO history (type, title, content, result, provider, model) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![request.r#type, request.title, request.content, request.result, request.provider, request.model],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    conn.query_row(
        "SELECT id, type, title, content, result, provider, model, created_at FROM history WHERE id = ?1",
        [id],
        |row| Ok(HistoryRecord {
            id: row.get(0)?,
            r#type: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            result: row.get(4)?,
            provider: row.get(5)?,
            model: row.get(6)?,
            created_at: row.get(7)?,
        }),
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_history(
    db: State<'_, Database>,
    id: i64,
) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM history WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub async fn clear_history(
    db: State<'_, Database>,
) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM history", [])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub async fn get_database_path(
    db: State<'_, Database>,
) -> Result<String, String> {
    Ok(db.get_db_path().to_string_lossy().to_string())
}
