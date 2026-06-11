import { useEffect, useRef, useState } from "react";
import { MergeView } from "@codemirror/merge";
import { ipc } from "../../../lib/ipc";
import { languageFor } from "../../../lib/cm/languages";
import { readOnlyBase, diffDeletionTheme, diffAdditionTheme } from "../../../lib/cm/setup";
import type { Tab } from "../../../state/editor";
import styles from "./DiffView.module.css";

export function DiffView({ tab }: { tab: Tab }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !tab.repo || !tab.relPath) return;

    const repo = tab.repo;
    const relPath = tab.relPath;
    let mv: MergeView | null = null;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const fullPath = `${repo.replace(/[\\/]+$/, "")}/${relPath}`;
      let original = "";
      let modified = "";
      try {
        original = await ipc.git.fileAtHead(repo, relPath);
      } catch {
        original = "";
      }
      try {
        modified = await ipc.fs.readFile(fullPath);
      } catch {
        modified = ""; // file deleted in the working tree
      }
      if (cancelled) return;

      const lang = await languageFor(relPath);
      if (cancelled) return;
      const langExt = lang ?? [];

      mv = new MergeView({
        a: { doc: original, extensions: [readOnlyBase(), langExt, diffDeletionTheme] },
        b: { doc: modified, extensions: [readOnlyBase(), langExt, diffAdditionTheme] },
        parent: host,
        collapseUnchanged: { margin: 3, minSize: 4 },
        gutter: true,
        highlightChanges: true,
      });
      setLoading(false);
    })().catch((e) => {
      if (!cancelled) {
        setError(String(e));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      mv?.destroy();
      if (host) host.innerHTML = "";
    };
  }, [tab.path, tab.repo, tab.relPath]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.name}>{tab.name}</span>
        <span className={styles.sides}>
          <span className={styles.side}>HEAD</span>
          <span className={styles.arrow}>↔</span>
          <span className={styles.side}>Working Tree</span>
        </span>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.host} ref={hostRef} style={loading ? { opacity: 0 } : undefined} />
    </div>
  );
}
