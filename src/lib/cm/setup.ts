import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
import { tags as t } from "@lezer/highlight";

export const languageCompartment = new Compartment();

/**
 * Theme + syntax highlight driven entirely by CSS custom properties (--bg, --fg,
 * --accent, --kw, --str, …). Because the colors resolve to live CSS variables,
 * switching the lume theme re-paints the editor with no reconfiguration.
 */
const lumeTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "var(--font-size-mono)",
    color: "var(--fg)",
    backgroundColor: "var(--bg)",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.6",
  },
  ".cm-content": { caretColor: "var(--accent)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--sel)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg)",
    color: "var(--faint)",
    border: "none",
  },
  ".cm-activeLine": { backgroundColor: "var(--active)" },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--accent)",
  },
  ".cm-foldGutter span": { color: "var(--faint)" },
  ".cm-selectionMatch": { backgroundColor: "var(--hover)" },
  "&.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--hover)",
    outline: "1px solid var(--border)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--fg)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--hover)",
    color: "var(--fg)",
  },
}, { dark: true });

const lumeHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: "var(--kw)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--str)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.labelName], color: "var(--fn)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--num)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--com)", fontStyle: "italic" },
  { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName)], color: "var(--type)" },
  { tag: [t.propertyName, t.attributeName], color: "var(--fn)" },
  { tag: [t.tagName, t.angleBracket], color: "var(--kw)" },
  { tag: [t.variableName, t.definition(t.variableName)], color: "var(--fg)" },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: "var(--muted)" },
  { tag: t.heading, color: "var(--kw)", fontWeight: "600" },
  { tag: t.link, color: "var(--fn)", textDecoration: "underline" },
  { tag: t.invalid, color: "var(--color-git-conflict)" },
]);

/** Read-only editor base for the diff viewer (no editing keymaps/history). */
export function readOnlyBase(): Extension[] {
  return [
    lineNumbers(),
    syntaxHighlighting(lumeHighlight, { fallback: true }),
    lumeTheme,
    EditorView.editable.of(false),
    EditorState.readOnly.of(true),
    EditorView.lineWrapping,
  ];
}

/** Left side of a diff (HEAD): removed/changed text in red. */
export const diffDeletionTheme = EditorView.theme({
  ".cm-changedLine": { backgroundColor: "rgba(200,125,125,0.10)" },
  ".cm-changedText": { backgroundColor: "rgba(200,125,125,0.28)", borderRadius: "2px" },
  ".cm-changedLineGutter": { backgroundColor: "rgba(200,125,125,0.12)" },
  ".cm-deletedChunk": { backgroundColor: "rgba(200,125,125,0.10)" },
  ".cm-collapsedLines": { color: "var(--faint)", backgroundColor: "var(--active)", padding: "2px 0" },
});

/** Right side of a diff (working tree): added/changed text in green. */
export const diffAdditionTheme = EditorView.theme({
  ".cm-changedLine": { backgroundColor: "rgba(155,191,158,0.10)" },
  ".cm-changedText": { backgroundColor: "rgba(155,191,158,0.28)", borderRadius: "2px" },
  ".cm-changedLineGutter": { backgroundColor: "rgba(155,191,158,0.12)" },
  ".cm-collapsedLines": { color: "var(--faint)", backgroundColor: "var(--active)", padding: "2px 0" },
});

export function baseExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    history(),
    foldGutter(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(lumeHighlight, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      indentWithTab,
    ]),
    lumeTheme,
  ];
}
