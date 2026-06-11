import { useEffect, useRef } from "react";
import { EditorState, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEditorStore } from "../../../state/editor";
import { baseExtensions, languageCompartment } from "../../../lib/cm/setup";
import { languageFor } from "../../../lib/cm/languages";
import styles from "./Editor.module.css";

export function Editor() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lastPathRef = useRef<string | null>(null);
  const lastContentRef = useRef<string>("");

  const activePath = useEditorStore((s) => s.activePath);
  const tab = useEditorStore((s) =>
    s.activePath ? s.tabs.find((t) => t.path === s.activePath) ?? null : null,
  );
  const updateContent = useEditorStore((s) => s.updateContent);

  // Create the view once.
  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const view = new EditorView({ parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
      lastPathRef.current = null;
    };
  }, []);

  // Switch documents when the active tab changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !tab) return;

    if (lastPathRef.current !== tab.path) {
      lastPathRef.current = tab.path;
      lastContentRef.current = tab.content;

      // Build a FRESH state per file: each document gets its own clean undo
      // history, so Ctrl+Z can never undo past the file's loaded content.
      const state = EditorState.create({
        doc: tab.content,
        extensions: [
          ...baseExtensions(),
          languageCompartment.of([]),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged) return;
            const path = lastPathRef.current;
            if (!path) return;
            const text = u.state.doc.toString();
            lastContentRef.current = text;
            updateContent(path, text);
          }),
        ],
      });
      view.setState(state);

      // Lazy-load language for this file.
      languageFor(tab.path).then((ext) => {
        if (lastPathRef.current !== tab.path) return;
        view.dispatch({ effects: languageCompartment.reconfigure(ext ?? []) });
      });
    } else if (tab.content !== lastContentRef.current) {
      // Content changed outside the editor (e.g. reload): replace the doc
      // WITHOUT adding it to the undo history.
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: tab.content },
        annotations: Transaction.addToHistory.of(false),
      });
      lastContentRef.current = tab.content;
    }
  }, [tab, updateContent]);

  if (!activePath) return null;
  return <div ref={hostRef} className={styles.host} />;
}
