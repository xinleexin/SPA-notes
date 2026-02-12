# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Single Page Application (SPA) for managing markdown notes with version history, built as pure client-side HTML/JS with no build process. The main application is `notes.html`.

## Key Commands

| Task | Command |
|------|---------|
| Run the app | Open `notes.html` directly in a browser |
| Run tests | Open `test.html` in a browser and click "Run All Tests" |
| Test import/export | Open `import-export-test.html` if available |

## Architecture

### State Management

- **`notes`**: Object `{ noteId: { title, content, history: [{timestamp, content}] } }`
- **`currentNoteId`**: ID of the currently selected note (null if none)
- **`currentView`**: `'source'` (textarea) or `'preview'` (rendered markdown)
- **`autoSaveTimer`**: Debounce timer for auto-save (300ms delay)
- **`lastSavedContent`**: Tracks content to avoid redundant saves
- **`selectedHistoryItems`**: Set tracking multi-selected history versions (Ctrl/Cmd+click)
- **`editFontSizePx`**: Current zoom level in edit panel (10-24px range)

**Persistence**: All state persists to `localStorage` under key `'markdownNotes'`. Edit zoom level stored separately under `'editFontSizePx'`.

### Data Flow

1. **Initialization**: `init()` → `loadNotes()` → `updateNotesList()` → `setupEventListeners()`
2. **User actions** → update state → `saveNotes()` → `update*()` to refresh DOM
3. **No framework**; direct DOM manipulation with vanilla JS

### Key Components

| Component | Description |
|-----------|-------------|
| **Notes panel** (20% width) | List of notes with create/delete/rename context menu |
| **Edit panel** (60% width) | Textarea for markdown editing; toggle to preview with `marked.js` + `KaTeX` |
| **History panel** (20% width) | Version history with restore/delete/rename; supports Ctrl+multi-select |
| **Resize handle** | Draggable divider for panel width adjustment |
| **Context menu** | Shared dropdown for note and history item operations |

### External Dependencies (CDN)

- **marked.js**: Markdown parsing and HTML rendering
- **KaTeX**: Math formula rendering (`$...$` inline, `$$...$$` display)

## Testing Approach

**TDD workflow** for new features:
1. Define expected behavior
2. Write test first (unit → integration → E2E)
3. Run tests and verify failure
4. Implement minimal code to pass
5. Refactor while keeping tests green
6. Manual UI sanity check

**Test patterns:**
- **Unit**: test pure functions (`validateImportedNotes`, `historyCreate`, `editSave` with mock data)
- **Integration**: test DOM + state interaction with mock state (see `test.html`)
- **E2E**: browser automation for user flows (create → edit → save → restore)

**Test commands**:
- Run all tests: `runAllTests()` in test.html console
- Reset test environment: `resetTestEnvironment()` in test.html console

## Important Patterns

| Pattern | Implementation |
|---------|----------------|
| **Debounced auto-save** | 300ms after input; updates content only (no history version) |
| **Save button** | Creates new history version + persists content |
| **History limit** | Keeps last 20 versions per note (oldest dropped) |
| **Context menu** | Shared element at cursor position; hidden on document click |
| **Resize handle** | mousedown→mousemove→mouseup pattern for panel width adjustment |
| **Import/export** | File System Access API with blob download fallback |
| **Math rendering** | KaTeX processes rendered HTML for `$...$` (inline) and `$$...$$` (display) |

## Key Functions Reference

### Notes Panel Functions
- `notesAdd()` - Create new note with timestamped title
- `notesDelete(noteId)` - Delete note with confirmation
- `notesRename(noteId)` - Rename note via prompt
- `selectNote(noteId)` - Select note and load into editor
- `updateNotesList()` - Re-render notes list with current selection

### Edit Panel Functions
- `editLoad(noteId)` - Load note content into editor
- `editToggleView()` - Toggle between source/preview
- `editSave()` - Save content and create history version
- `handleEditInput()` - Debounced auto-save handler
- `editZoomIn/Out()` - Adjust font size in editor

### History Panel Functions
- `historyCreate(noteId)` - Create new version from current content
- `historyDelete(noteId, versionId)` - Delete specific version
- `historyRename(noteId, versionId, newName)` - Rename version timestamp
- `updateHistoryList()` - Re-render history list with current version highlighted
- `historyVersionSelect(noteId, versionIndex)` - Load selected version into editor

### Utility Functions
- `validateImportedNotes(data)` - Verify imported notes structure
- `renderMathWithKaTeX(html)` - Process math formulas in rendered HTML
- `saveFileWithFileSystemAccessAPI(data, fileName)` - Modern file save API
- `saveDataToFile(data, filename, type)` - Fallback blob download

## Project-Specific Best Practices

### File Operations
- Use dedicated tools (`Read`, `Edit`, `Write`, `Glob`, `Grep`) for file operations
- Avoid `sed`, `cat`, `grep`, `find` commands - use Claude Code's built-in tools
- These tools are safer, more precise, and provide better error handling

### Chess SPA Specifics
- **Auto-save vs Manual save**: Separate logic - `autoSave()` for silent localStorage persistence, `saveGame()` for user-triggered file export
- **Async functions**: Use `async`/`await` for file system operations (File System Access API)
- **Fallback patterns**: Always provide fallbacks for modern APIs (e.g., blob download for save, file input for load)

### CSS Optimization
- Use `clamp()` for responsive font sizes
- Use `aspect-ratio` for maintaining square boards
- Use `max-width`/`max-height` with viewport units for responsive sizing
- Keep styling simple - avoid complex 3D effects unless requested
