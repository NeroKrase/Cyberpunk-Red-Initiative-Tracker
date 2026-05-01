use std::env;
use std::fs;
use std::path::PathBuf;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, save_card])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
