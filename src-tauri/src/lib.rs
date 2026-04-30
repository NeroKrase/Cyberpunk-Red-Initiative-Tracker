use std::fs;
use std::path::PathBuf;

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Save a generated NPC card image into the application's cards directory.
///
/// Files land in `<app_data_dir>/cards/<filename>`, where `app_data_dir` is
/// the per-user data directory chosen by Tauri for this bundle. The
/// directory is created on demand. Returns the absolute path of the
/// written file so the UI can show it in a notification.
#[tauri::command]
fn save_card(
    app: tauri::AppHandle,
    filename: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
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

    let data_dir: PathBuf = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("resolve app_data_dir: {e}"))?;
    let cards_dir = data_dir.join("cards");
    fs::create_dir_all(&cards_dir)
        .map_err(|e| format!("create {}: {e}", cards_dir.display()))?;

    let file_path = cards_dir.join(&filename);
    fs::write(&file_path, &bytes)
        .map_err(|e| format!("write {}: {e}", file_path.display()))?;

    Ok(file_path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, save_card])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
