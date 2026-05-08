use std::env;
use std::fs;
use std::path::PathBuf;

use serde::Deserialize;
use serde_json::Value as JsonValue;
use sqlx::Executor;
use tauri::State;
use tauri_plugin_sql::{DbInstances, DbPool, Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Save a generated NPC card image into a `cards/` directory placed next
/// to the running executable.
///
/// Files land in `<exe_dir>/cards/<filename>`. The directory is created
/// on demand if it doesn't exist. Returns the absolute path of the
/// written file so the UI can show it in a notification.
#[tauri::command]
fn save_card(filename: String, bytes: Vec<u8>) -> Result<String, String> {
    if filename.is_empty() {
        return Err("filename is empty".into());
    }
    // Reject anything that tries to escape the cards/ directory.
    if filename.contains('/')
        || filename.contains('\\')
        || filename.contains("..")
    {
        return Err(format!("invalid filename: {filename}"));
    }

    let exe_path = env::current_exe()
        .map_err(|e| format!("resolve current exe: {e}"))?;
    let exe_dir: PathBuf = exe_path
        .parent()
        .ok_or_else(|| "current exe has no parent dir".to_string())?
        .to_path_buf();
    let cards_dir = exe_dir.join("cards");
    fs::create_dir_all(&cards_dir)
        .map_err(|e| format!("create {}: {e}", cards_dir.display()))?;

    let file_path = cards_dir.join(&filename);
    fs::write(&file_path, &bytes)
        .map_err(|e| format!("write {}: {e}", file_path.display()))?;

    Ok(file_path.to_string_lossy().into_owned())
}

#[derive(Deserialize)]
struct TxStatement {
    sql: String,
    #[serde(default)]
    params: Vec<JsonValue>,
}

// Run a batch of statements inside a single sqlx transaction. Needed
// because @tauri-apps/plugin-sql executes each call on a fresh pool
// connection — issuing BEGIN/COMMIT from JS does not bind those
// statements to the inner work. Couples to tauri-plugin-sql's public
// surface (DbInstances, DbPool::Sqlite); revisit on plugin upgrade.
#[tauri::command]
async fn db_tx_execute(
    db_instances: State<'_, DbInstances>,
    db: String,
    statements: Vec<TxStatement>,
) -> Result<(), String> {
    let instances = db_instances.0.read().await;
    let pool = instances
        .get(&db)
        .ok_or_else(|| format!("db not loaded: {db}"))?;
    // Only the sqlite feature of tauri-plugin-sql is enabled, so the
    // pattern is irrefutable today. Match keeps it honest if more
    // variants ever appear.
    #[allow(irrefutable_let_patterns)]
    let DbPool::Sqlite(pool) = pool
    else {
        return Err("db_tx_execute only supports sqlite pools".into());
    };

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for stmt in statements {
        let mut q = sqlx::query(&stmt.sql);
        for v in stmt.params {
            // Mirror the binding rules from tauri-plugin-sql's wrapper so
            // JS callers see identical semantics inside and outside a tx.
            if v.is_null() {
                q = q.bind(None::<JsonValue>);
            } else if v.is_string() {
                q = q.bind(v.as_str().unwrap().to_owned());
            } else if let Some(n) = v.as_number() {
                q = q.bind(n.as_f64().unwrap_or_default());
            } else {
                q = q.bind(v);
            }
        }
        tx.execute(q).await.map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "init",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "net_architectures",
            sql: include_str!("../migrations/002_net_architectures.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:initiative-tracker.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, save_card, db_tx_execute])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
