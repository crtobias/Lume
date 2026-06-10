import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
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

  // Create the view once, then swap state per tab.
  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: "",
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
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [updateContent]);

  // Switch documents when active tab changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !tab) return;

    if (lastPathRef.current !== tab.path) {
      lastPathRef.current = tab.path;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: tab.content },
      });
      lastContentRef.current = tab.content;

      // Lazy-load language for this file.
      languageFor(tab.path).then((ext) => {
        if (lastPathRef.current !== tab.path) return;
        view.dispatch({
          effects: languageCompartment.reconfigure(ext ?? []),
        });
      });
    } else if (tab.content !== lastContentRef.current) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: tab.content },
      });
      lastContentRef.current = tab.content;
    }
  }, [tab]);

  if (!activePath) return null;
  return <div ref={hostRef} className={styles.host} />;
}
