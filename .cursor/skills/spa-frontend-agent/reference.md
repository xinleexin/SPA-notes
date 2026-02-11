# Reference: SPA Patterns from notes.html

This file summarizes architecture and patterns from the Markdown Notebook SPA (`notes.html`) for use by the SPA front-end agent.

## Stack

- Single HTML file: structure, styles, and script in one place; no build step.
- Vanilla JS: no framework; `document.getElementById`, `createElement`, `addEventListener`.
- External libs via CDN: marked.js (markdown), KaTeX (math). No bundler.

## State Shape

```js
let notes = {};           // id -> { title, content, history: [{ timestamp, content }, ...] }
let currentNoteId = null;
let currentView = 'source'; // 'source' | 'preview'
let lastSavedContent = '';
// Optional: selectedHistoryItems (Set) for multi-select.
```

- Persistence: `localStorage.setItem('markdownNotes', JSON.stringify(notes))`; load on init, save after mutations.

## Init and Data Flow

1. **init()** (on `window.load`): `loadNotes()` → `updateNotesList()` → `setupEventListeners()`; optionally `selectNote(firstId)`.
2. **loadNotes()**: Read from localStorage; if empty, create one default note and `saveNotes()`.
3. All mutations: change `notes` (or related state), then `saveNotes()`, then one or more `update*()` to refresh DOM.

## DOM Update Functions

- **updateNotesList()**: Clear list container; if empty state show empty-state div; else for each note append a `.note-item` with click (select) and contextmenu (context menu); add `.selected` when `noteId === currentNoteId`.
- **updateHistoryList()**: Clear history container; add “Current Version” item; then each `note.history[i]` with click (single or Ctrl+multi) and contextmenu (rename/delete or bulk delete).
- **updateForPreviewMode()**: If preview, parse markdown (e.g. `marked.parse`), optional KaTeX pass, set innerHTML on preview div and hide textarea; else remove preview div and show textarea. Toggle button text Show/Source.

## Event Binding

- Buttons: `createNoteBtn` → `notesAdd()`; Save → `editSave()`; Toggle → `editToggleView()`; Import/Export → `importNotes()` / `exportNotes()`.
- **editContent** `input`: debounced (e.g. 300ms) auto-save of `notes[id].content` and `saveNotes()` only (no new history version).
- **Resize**: `mousedown` on handle stores `startX`, `startWidth`; `document` `mousemove` updates panel width (clamped); `mouseup` clears flag.
- **Context menu**: one `#contextMenu`; show at `event.pageX/pageY`; populate items (e.g. Rename, Delete); `document` click closes it.

## Key Functions (signatures and roles)

- **notesAdd()**: New `notes[id] = { title, content, history: [] }`, `saveNotes()`, `updateNotesList()`, `selectNote(id)`.
- **notesDelete(id)**: Confirm → delete `notes[id]`, save, update list; if deleted was current, select first or clear editor.
- **notesRename(id)**: `prompt` for new title → update `notes[id].title`, save, update list.
- **selectNote(id)**: Set `currentNoteId`, `editLoad(id)`, `updateNotesList()`, `updateHistoryList()`.
- **editLoad(id)**: Set textarea to `notes[id].content`, `lastSavedContent`, and refresh preview if needed.
- **editSave()**: Persist `notes[currentNoteId].content`, then `historyCreate(currentNoteId)`, then `updateHistoryList()`.
- **historyCreate(id)**: Push `{ timestamp, content }` to `notes[id].history`, unshift; keep last 20.
- **historyVersionSelect(id, versionIndex)**: If `'current'` load `notes[id].content`, else load `notes[id].history[versionIndex].content`; update textarea and preview.
- **validateImportedNotes(obj)**: Ensure object, each value has `title`, `content` (strings), `history` (array).

## Import/Export

- **Import**: File input (accept `.json`) → FileReader → `JSON.parse` → `validateImportedNotes` → replace `notes`, save, update list.
- **Export**: `JSON.stringify(notes, null, 2)`; optional File System Access API or fallback download via blob URL and `<a download>`.

## Testing Hooks

- Pure and easy to unit test: `validateImportedNotes`, `historyCreate` (given a note object), timestamp uniqueness logic.
- DOM-dependent but testable with jsdom/happy-dom: `updateNotesList`, `updateHistoryList` with mock `notes` and `currentNoteId`.
- E2E: create note, edit, save, switch note, history restore, import/export (use stable IDs or export file content assertions).

Use this reference when implementing or refactoring similar SPAs; prefer the same separation (state → persistence, state → DOM, events → state updates).
