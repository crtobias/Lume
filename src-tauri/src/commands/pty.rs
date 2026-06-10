use crate::state::{AppState, PtySession};
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnArgs {
    pub cwd: Option<String>,
    pub shell: Option<String>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

fn default_shell() -> String {
    if cfg!(target_os = "windows") {
        "powershell.exe".into()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into())
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShellInfo {
    pub name: String,
    pub path: String,
    pub icon: String,
}

fn first_existing(candidates: &[&str]) -> Option<PathBuf> {
    for c in candidates {
        let p = PathBuf::from(c);
        if p.exists() {
            return Some(p);
        }
    }
    None
}

fn which(cmd: &str) -> Option<PathBuf> {
    let path_var = std::env::var_os("PATH")?;
    let exts: Vec<String> = if cfg!(target_os = "windows") {
        std::env::var("PATHEXT")
            .unwrap_or_else(|_| ".EXE;.CMD;.BAT;.COM".into())
            .split(';')
            .map(|s| s.to_string())
            .collect()
    } else {
        vec![String::new()]
    };
    for dir in std::env::split_paths(&path_var) {
        for ext in &exts {
            let candidate = dir.join(format!("{}{}", cmd, ext));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

#[tauri::command]
pub async fn detect_shells() -> Vec<ShellInfo> {
    let mut out = Vec::new();
    if cfg!(target_os = "windows") {
        if let Some(p) = which("pwsh")
            .or_else(|| first_existing(&["C:\\Program Files\\PowerShell\\7\\pwsh.exe"]))
        {
            out.push(ShellInfo {
                name: "PowerShell 7".into(),
                path: p.to_string_lossy().to_string(),
                icon: "pwsh".into(),
            });
        }
        if let Some(p) = first_existing(&[
            "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        ])
        .or_else(|| which("powershell"))
        {
            out.push(ShellInfo {
                name: "Windows PowerShell".into(),
                path: p.to_string_lossy().to_string(),
                icon: "powershell".into(),
            });
        }
        if let Some(p) = first_existing(&[
            "C:\\Program Files\\Git\\bin\\bash.exe",
            "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        ])
        .or_else(|| which("bash"))
        {
            out.push(ShellInfo {
                name: "Git Bash".into(),
                path: p.to_string_lossy().to_string(),
                icon: "bash".into(),
            });
        }
        if let Some(p) = which("wsl") {
            out.push(ShellInfo {
                name: "WSL".into(),
                path: p.to_string_lossy().to_string(),
                icon: "wsl".into(),
            });
        }
        if let Some(p) = first_existing(&["C:\\Windows\\System32\\cmd.exe"]).or_else(|| which("cmd")) {
            out.push(ShellInfo {
                name: "Command Prompt".into(),
                path: p.to_string_lossy().to_string(),
                icon: "cmd".into(),
            });
        }
    } else {
        let candidates = [
            ("zsh", "Zsh"),
            ("bash", "Bash"),
            ("fish", "Fish"),
            ("sh", "sh"),
        ];
        for (cmd, name) in candidates {
            if let Some(p) = which(cmd) {
                out.push(ShellInfo {
                    name: name.into(),
                    path: p.to_string_lossy().to_string(),
                    icon: cmd.into(),
                });
            }
        }
    }
    out
}

#[tauri::command]
pub async fn pty_spawn(app: AppHandle, args: SpawnArgs) -> Result<u32, String> {
    let pty_system = native_pty_system();
    let size = PtySize {
        rows: args.rows.unwrap_or(24),
        cols: args.cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };
    let pair = pty_system.openpty(size).map_err(|e| e.to_string())?;

    let shell = args.shell.unwrap_or_else(default_shell);
    let mut cmd = CommandBuilder::new(shell);
    if let Some(cwd) = args.cwd {
        cmd.cwd(cwd);
    } else if let Ok(home) = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        cmd.cwd(home);
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let state: State<AppState> = app.state();
    let id = state.next_id.fetch_add(1, Ordering::Relaxed) + 1;

    state.sessions.lock().unwrap().insert(
        id,
        PtySession {
            master: pair.master,
            writer,
            child,
        },
    );

    // Stream output → emit base64 frames to the frontend.
    let app_clone = app.clone();
    let event_name = format!("pty://{}/data", id);
    let exit_event = format!("pty://{}/exit", id);
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let chunk = B64.encode(&buf[..n]);
                    let _ = app_clone.emit(&event_name, chunk);
                }
            }
        }
        let _ = app_clone.emit(&exit_event, ());
    });

    Ok(id)
}

#[tauri::command]
pub async fn pty_write(app: AppHandle, id: u32, data: String) -> Result<(), String> {
    let state: State<AppState> = app.state();
    let mut sessions = state.sessions.lock().unwrap();
    let session = sessions.get_mut(&id).ok_or("session not found")?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    session.writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn pty_resize(app: AppHandle, id: u32, cols: u16, rows: u16) -> Result<(), String> {
    let state: State<AppState> = app.state();
    let sessions = state.sessions.lock().unwrap();
    let session = sessions.get(&id).ok_or("session not found")?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn pty_kill(app: AppHandle, id: u32) -> Result<(), String> {
    let state: State<AppState> = app.state();
    let mut session = state
        .sessions
        .lock()
        .unwrap()
        .remove(&id)
        .ok_or("session not found")?;
    let _ = session.child.kill();
    Ok(())
}
