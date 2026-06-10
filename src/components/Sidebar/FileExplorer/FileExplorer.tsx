import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { useState } from "react";
import { useWorkspaceStore, type TreeNode } from "../../../state/workspace";
import { useEditorStore } from "../../../state/editor";
import styles from "./FileExplorer.module.css";

export function FileExplorer() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const rootName = useWorkspaceStore((s) => s.rootName);
  const tree = useWorkspaceStore((s) => s.tree);
  const openFolder = useWorkspaceStore((s) => s.openFolder);

  if (!rootPath) {
    return (
      <div className={styles.welcome}>
        <p>You have not yet opened a folder.</p>
        <button className={styles.openBtn} onClick={openFolder}>
          <FolderOpen size={14} strokeWidth={2} />
          <span>Open Folder</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.tree} role="tree" aria-label={rootName ?? ""}>
      <div className={styles.rootLabel}>{rootName?.toUpperCase()}</div>
      {tree.map((n) => (
        <TreeRow key={n.id} node={n} depth={0} />
      ))}
    </div>
  );
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(false);
  const expand = useWorkspaceStore((s) => s.expand);
  const openFile = useEditorStore((s) => s.openFile);
  const activePath = useEditorStore((s) => s.activePath);

  const onClick = async () => {
    if (node.isDir) {
      if (!open && !node.loaded) await expand(node.path);
      setOpen((o) => !o);
    } else {
      try {
        await openFile(node.path);
      } catch (err) {
        console.warn("openFile failed:", node.path, err);
      }
    }
  };

  const isActive = !node.isDir && activePath === node.path;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <>
      <div
        role="treeitem"
        aria-expanded={node.isDir ? open : undefined}
        className={`${styles.row} ${isActive ? styles.active : ""}`}
        style={{ paddingLeft: 4 + depth * 12 }}
        onClick={onClick}
        title={node.name}
      >
        <span className={styles.chev}>
          {node.isDir ? <Chevron size={14} strokeWidth={2} /> : null}
        </span>
        <span className={styles.name}>{node.name}</span>
      </div>
      {node.isDir && open && node.children
        ? node.children.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} />)
        : null}
    </>
  );
}
