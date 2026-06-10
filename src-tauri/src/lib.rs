mod commands;
mod state;

use commands::fs::{fs_read_dir, fs_read_file, fs_write_file};
use commands::git::{
    git_branches, git_checkout, git_commit, git_discard, git_fetch, git_pull, git_push,
    git_stage, git_status, git_unstage,
};
use commands::pty::{detect_shells, pty_kill, pty_resize, pty_spawn, pty_write};
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            fs_read_dir,
            fs_read_file,
            fs_write_file,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            detect_shells,
            git_status,
            git_stage,
            git_unstage,
            git_discard,
            git_commit,
            git_push,
            git_pull,
            git_fetch,
            git_branches,
            git_checkout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
