use portable_pty::{Child, MasterPty};
use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;
use std::sync::atomic::AtomicU32;

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
    pub child: Box<dyn Child + Send + Sync>,
}

#[derive(Default)]
pub struct AppState {
    pub sessions: Mutex<HashMap<u32, PtySession>>,
    pub next_id: AtomicU32,
}
