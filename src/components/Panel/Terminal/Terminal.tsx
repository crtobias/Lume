import { useEffect, useRef } from "react";
import { Terminal as Xterm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useWorkspaceStore } from "../../../state/workspace";
import { useTerminalStore } from "../../../state/terminal";
import { useThemeStore, xtermTheme } from "../../../state/theme";
import "@xterm/xterm/css/xterm.css";
import styles from "./Terminal.module.css";

function b64ToString(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function Terminal({ localKey }: { localKey: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Xterm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const setBackendId = useTerminalStore((s) => s.setBackendId);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const shellPath = useTerminalStore(
    (s) => s.sessions.find((t) => t.localKey === localKey)?.shellPath ?? null,
  );

  useEffect(() => {
    if (!hostRef.current || xtermRef.current) return;

    const term = new Xterm({
      theme: xtermTheme(useThemeStore.getState()),
      fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
      fontSize: 12.5,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();

    xtermRef.current = term;
    fitRef.current = fit;

    let unlistenData: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;
    let mounted = true;

    (async () => {
      try {
        const cols = term.cols;
        const rows = term.rows;
        const id = await invoke<number>("pty_spawn", {
          args: { cwd: rootPath ?? null, shell: shellPath, cols, rows },
        });
        if (!mounted) {
          await invoke("pty_kill", { id }).catch(() => {});
          return;
        }
        sessionIdRef.current = id;
        setBackendId(localKey, id);

        unlistenData = await listen<string>(`pty://${id}/data`, (event) => {
          term.write(b64ToString(event.payload));
        });
        unlistenExit = await listen(`pty://${id}/exit`, () => {
          term.writeln("\r\n[process exited]");
        });

        term.onData((data) => {
          invoke("pty_write", { id, data }).catch((e) => {
            console.error("pty_write failed:", e);
          });
        });
        term.onResize(({ cols, rows }) => {
          invoke("pty_resize", { id, cols, rows }).catch((e) => {
            console.error("pty_resize failed:", e);
          });
        });
      } catch (err) {
        console.error("pty_spawn failed:", err);
        term.writeln(`\r\n[lume] failed to spawn shell: ${String(err)}`);
      }
    })();

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* container not measurable yet */
      }
    });
    ro.observe(hostRef.current);

    return () => {
      mounted = false;
      ro.disconnect();
      unlistenData?.();
      unlistenExit?.();
      const id = sessionIdRef.current;
      if (id != null) invoke("pty_kill", { id }).catch(() => {});
      term.dispose();
      xtermRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fit when this terminal becomes visible.
  useEffect(() => {
    fitRef.current?.fit();
  });

  // Repaint the terminal palette whenever the lume theme changes.
  useEffect(() => {
    const unsub = useThemeStore.subscribe((s) => {
      const term = xtermRef.current;
      if (term) term.options.theme = xtermTheme(s);
    });
    return unsub;
  }, []);

  return <div ref={hostRef} className={styles.host} />;
}
