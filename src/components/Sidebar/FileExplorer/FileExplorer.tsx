import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  FileCog,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useWorkspaceStore, type TreeNode } from "../../../state/workspace";
import { useEditorStore } from "../../../state/editor";
import styles from "./FileExplorer.module.css";

function fileIcon(name: string): { Icon: LucideIcon; color: string } {
  const lower = name.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  switch (ext) {
    case "ts":
    case "tsx":
    case "d.ts":
      return { Icon: FileCode, color: "var(--type)" };
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return { Icon: FileCode, color: "var(--num)" };
    case "rs":
      return { Icon: FileCode, color: "var(--num)" };
    case "py":
    case "go":
    case "java":
    case "c":
    case "cpp":
    case "h":
      return { Icon: FileCode, color: "var(--fn)" };
    case "css":
    case "scss":
    case "sass":
    case "less":
      return { Icon: FileCode, color: "var(--fn)" };
    case "html":
    case "htm":
    case "xml":
    case "svg":
      return { Icon: FileCode, color: "var(--kw)" };
    case "json":
      return { Icon: FileJson, color: "var(--num)" };
    case "md":
    case "mdx":
    case "txt":
      return { Icon: FileText, color: "var(--muted)" };
    case "toml":
    case "yaml":
    case "yml":
    case "ini":
    case "env":
    case "lock":
      return { Icon: FileCog, color: "var(--faint)" };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
    case "bmp":
      return { Icon: FileImage, color: "var(--str)" };
    default:
      return { Icon: File, color: "var(--faint)" };
  }
}

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
  const FolderIcon = open ? FolderOpen : Folder;
  const file = node.isDir ? null : fileIcon(node.name);

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
          {node.isDir ? <Chevron size={13} strokeWidth={2} /> : null}
        </span>
        <span className={styles.icon} style={{ color: file ? file.color : "var(--muted)" }}>
          {node.isDir ? (
            <FolderIcon size={15} strokeWidth={1.6} />
          ) : (
            file && <file.Icon size={15} strokeWidth={1.6} />
          )}
        </span>
        <span className={styles.name}>{node.name}</span>
      </div>
      {node.isDir && open && node.children
        ? node.children.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} />)
        : null}
    </>
  );
}
