use serde::Serialize;
use std::path::Path;
use tokio::process::Command;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub changes: Vec<FileChange>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChange {
    pub path: String,
    pub staged_status: String,
    pub unstaged_status: String,
    pub kind: String,
}

fn git(repo: &str) -> Command {
    let mut c = Command::new("git");
    c.arg("-C").arg(repo).arg("-c").arg("core.quotepath=false");
    c
}

async fn run(cmd: &mut Command) -> Result<String, String> {
    let out = cmd.output().await.map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

fn parse_status(text: &str) -> GitStatus {
    let mut st = GitStatus {
        is_repo: true,
        ..Default::default()
    };
    for line in text.lines() {
        if line.starts_with("## ") {
            let rest = &line[3..];
            // branch...upstream [ahead N, behind M]
            let (head, tail) = match rest.find(" [") {
                Some(i) => (&rest[..i], &rest[i + 2..rest.len() - 1]),
                None => (rest, ""),
            };
            let (branch, upstream) = match head.find("...") {
                Some(i) => (&head[..i], Some(&head[i + 3..])),
                None => (head, None),
            };
            st.branch = Some(branch.to_string());
            st.upstream = upstream.map(|s| s.to_string());
            for piece in tail.split(", ") {
                if let Some(n) = piece.strip_prefix("ahead ") {
                    st.ahead = n.parse().unwrap_or(0);
                } else if let Some(n) = piece.strip_prefix("behind ") {
                    st.behind = n.parse().unwrap_or(0);
                }
            }
            continue;
        }
        if line.len() < 4 {
            continue;
        }
        let xy = &line[..2];
        let rest = &line[3..];
        let x = xy.chars().next().unwrap_or(' ');
        let y = xy.chars().nth(1).unwrap_or(' ');

        if xy == "??" {
            st.changes.push(FileChange {
                path: rest.to_string(),
                staged_status: ".".into(),
                unstaged_status: "?".into(),
                kind: "untracked".into(),
            });
            continue;
        }
        if xy == "!!" {
            continue; // ignored
        }
        // Rename "R  old -> new" → keep new path only.
        let path = if let Some(arrow) = rest.find(" -> ") {
            rest[arrow + 4..].to_string()
        } else {
            rest.to_string()
        };
        let kind = if x == 'U' || y == 'U' { "conflict" } else { "tracked" };
        st.changes.push(FileChange {
            path,
            staged_status: norm_status(x),
            unstaged_status: norm_status(y),
            kind: kind.into(),
        });
    }
    st
}

fn norm_status(c: char) -> String {
    match c {
        ' ' => ".".into(),
        other => other.to_string(),
    }
}

async fn is_repo(repo: &str) -> bool {
    Path::new(repo).join(".git").exists()
        || run(git(repo).arg("rev-parse").arg("--is-inside-work-tree"))
            .await
            .is_ok()
}

const SCAN_SKIP: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build", "out", ".next",
    ".cache", "vendor", "__pycache__", ".venv", "venv", ".idea", ".vscode",
];

fn scan_repos(dir: &Path, depth: usize, max_depth: usize, out: &mut Vec<String>) {
    if dir.join(".git").exists() {
        if let Some(s) = dir.to_str() {
            out.push(s.replace('\\', "/"));
        }
    }
    if depth >= max_depth {
        return;
    }
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with('.') || SCAN_SKIP.iter().any(|s| *s == name) {
            continue;
        }
        scan_repos(&path, depth + 1, max_depth, out);
    }
}

/// Discover every git repository at or beneath `root` (bounded depth), so a
/// folder that contains several independent repos shows them all.
#[tauri::command]
pub async fn git_discover_repos(root: String) -> Result<Vec<String>, String> {
    let root_path = Path::new(&root);
    if !root_path.is_dir() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    scan_repos(root_path, 0, 2, &mut out);
    out.sort();
    out.dedup();
    Ok(out)
}

#[tauri::command]
pub async fn git_status(repo: String) -> Result<GitStatus, String> {
    if !is_repo(&repo).await {
        return Ok(GitStatus::default());
    }
    let out = run(git(&repo).arg("status").arg("--porcelain").arg("--branch")).await?;
    Ok(parse_status(&out))
}

/// Content of a file as committed at HEAD. Returns an empty string when the
/// path doesn't exist at HEAD (e.g. newly added / untracked files).
#[tauri::command]
pub async fn git_file_at_head(repo: String, path: String) -> Result<String, String> {
    let spec = format!("HEAD:{}", path);
    match run(git(&repo).arg("show").arg(&spec)).await {
        Ok(content) => Ok(content),
        Err(_) => Ok(String::new()),
    }
}

#[tauri::command]
pub async fn git_stage(repo: String, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Ok(());
    }
    let mut cmd = git(&repo);
    cmd.arg("add").arg("--");
    for p in &paths {
        cmd.arg(p);
    }
    run(&mut cmd).await.map(|_| ())
}

#[tauri::command]
pub async fn git_unstage(repo: String, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Ok(());
    }
    let mut cmd = git(&repo);
    cmd.arg("reset").arg("HEAD").arg("--");
    for p in &paths {
        cmd.arg(p);
    }
    run(&mut cmd).await.map(|_| ())
}

#[tauri::command]
pub async fn git_discard(repo: String, paths: Vec<String>) -> Result<(), String> {
    if paths.is_empty() {
        return Ok(());
    }
    let mut cmd = git(&repo);
    cmd.arg("checkout").arg("--");
    for p in &paths {
        cmd.arg(p);
    }
    run(&mut cmd).await.map(|_| ())
}

#[tauri::command]
pub async fn git_commit(repo: String, message: String) -> Result<(), String> {
    if message.trim().is_empty() {
        return Err("commit message is empty".into());
    }
    run(git(&repo).arg("commit").arg("-m").arg(message))
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn git_push(repo: String) -> Result<String, String> {
    run(git(&repo).arg("push")).await
}

#[tauri::command]
pub async fn git_pull(repo: String) -> Result<String, String> {
    run(git(&repo).arg("pull")).await
}

#[tauri::command]
pub async fn git_fetch(repo: String) -> Result<String, String> {
    run(git(&repo).arg("fetch")).await
}

#[tauri::command]
pub async fn git_branches(repo: String) -> Result<Vec<String>, String> {
    let out = run(git(&repo).arg("branch").arg("--list").arg("--format=%(refname:short)")).await?;
    Ok(out.lines().map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect())
}

#[tauri::command]
pub async fn git_checkout(repo: String, branch: String) -> Result<(), String> {
    run(git(&repo).arg("checkout").arg(branch)).await.map(|_| ())
}
