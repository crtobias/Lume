use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsEntry {
    name: String,
    path: String,
    is_dir: bool,
}

fn is_hidden(name: &str) -> bool {
    name.starts_with('.')
}

#[tauri::command]
pub async fn fs_read_dir(path: String) -> Result<Vec<FsEntry>, String> {
    let p = PathBuf::from(&path);
    let mut rd = tokio::fs::read_dir(&p).await.map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    while let Some(entry) = rd.next_entry().await.map_err(|e| e.to_string())? {
        let ft = match entry.file_type().await {
            Ok(ft) => ft,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();
        // Skip noisy directories by default; the user can toggle later.
        if is_hidden(&name) && (name == ".git" || name == ".DS_Store") {
            continue;
        }
        let full = entry.path().to_string_lossy().to_string();
        out.push(FsEntry {
            name,
            path: full,
            is_dir: ft.is_dir(),
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn fs_read_file(path: String) -> Result<String, String> {
    let bytes = tokio::fs::read(&path).await.map_err(|e| e.to_string())?;
    // Reject obvious binaries quickly: NUL byte in the first 8 KiB.
    let probe = &bytes[..bytes.len().min(8192)];
    if probe.contains(&0) {
        return Err("binary file".into());
    }
    String::from_utf8(bytes).map_err(|_| "file is not valid UTF-8".to_string())
}

#[tauri::command]
pub async fn fs_write_file(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| e.to_string())
}
