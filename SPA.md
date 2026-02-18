# Workspace Skill: SPA Notes Application

## Overview
This is a Single Page Application (SPA) for managing markdown notes with version history, built as pure client-side HTML/JS with no build process. The main application is `notes.html`. There's also a chess SPA (`chess.html`) with bot difficulty levels.

---

## Development Environment
- **OS**: Windows 11
- **Shell**: PowerShell (use for file operations)
- **Language**: JavaScript (pure client-side, no build process)

---

## Key Commands

| Task | Command |
|------|---------|
| Run the app | Open `notes.html` directly in a browser |
| Run tests | Open `test.html` in a browser and click "Run All Tests" |
| Test import/export | Open `import-export-test.html` if available |
| Play Chess | Open `chess.html` in a browser |

---

## Architecture (Notes SPA)

### Class-Based Structure

| Class | Purpose |
|-------|---------|
| **StorageManager** | localStorage operations, auto-save (debounced), file import/export |
| **HistoryManager** | Version history management (create/delete/rename/restore) |
| **NotesManager** | Note lifecycle (create/delete/rename/select/import/export) |
| **ContextMenu** | Right-click menu for notes and history versions |

### State Management

- **`notes`**: Object `{ noteId: { title, content, history: [{timestamp, content}] } }`
- **`currentNoteId`**: ID of currently selected note (null if none)
- **`currentView`**: `'source'` (textarea) or `'preview'` (rendered markdown)
- **`lastSavedContent`**: Tracks content to avoid redundant auto-saves
- **`selectedHistoryItems`** (in HistoryManager): Set tracking multi-selected history versions
- **`editFontSizePx`**: Current zoom level in edit panel (10-24px range)

### Persistence

All state persists to `localStorage`:
- Notes data: key `'markdownNotes'`
- Edit zoom: key `'editFontSizePx'`

---

## Data Flow

1. **Initialization**: `init()` → manager instances → `loadNotes()` → `updateList()` → `setupEventListeners()`
2. **User actions** → update state → storage persistence → DOM refresh via class methods

### Key Components (Notes)

| Component | Description |
|-----------|-------------|
| **Notes panel** (20% width) | List of notes with create/delete/rename context menu |
| **Edit panel** (60% width) | Textarea for markdown editing; toggle to preview with `marked.js` + `KaTeX` |
| **History panel** (20% width) | Version history with restore/delete/rename; supports Ctrl+multi-select |
| **Resize handle** | Draggable divider for panel width adjustment |

### Class Reference

#### StorageManager
- `loadNotes(defaultData)` - Load from localStorage or create defaults
- `saveNotes(notes)` - Persist to localStorage
- `initAutoSave(callback, 300ms)` - Debounced auto-save
- `importFromFile(file)` / `exportToFile(data)` - File I/O with FileSystem API fallback

#### HistoryManager
- `create(noteId)` - Create new version (max 20 kept)
- `delete(noteId, index)` - Remove specific version
- `rename(noteId, index, newName)` - Update version timestamp
- `select(noteId, versionIndex)` - Load version into editor
- `updateList()` - Re-render history panel

#### NotesManager
- `create()` - Create new note with timestamp title
- `delete(noteId)` - Delete note with confirmation
- `rename(noteId)` - Rename via prompt dialog
- `select(noteId)` - Select and load note content
- `import()` / `export()` - File-based import/export

#### ContextMenu
- `showNoteContextMenu(event, noteId)` - Rename/Delete for notes
- `showHistoryContextMenu(event, noteId, versionIndex)` - Rename/Delete for versions
- `showBulkHistoryContextMenu(event, noteId)` - Bulk delete selected versions

---

## Key Functions Reference (Notes)

| Function | Description |
|----------|-------------|
| `init()` | Application initialization with manager setup |
| `setupEventListeners()` | Register all DOM event handlers |
| `editSave()` | Manual save with history version creation |
| `handleEditInput()` | Debounced auto-save handler (300ms) |
| `applyEditZoom()` | Apply zoom level to editor/preview |
| `editToggleView()` | Toggle source/preview view mode |

### Utility Functions
- `renderMathWithKaTeX(html)` - Process math formulas in rendered HTML

---

## Important Patterns (Notes)

| Pattern | Implementation |
|---------|----------------|
| **Debounced auto-save** | 300ms after input; updates content only |
| **Save button** | Creates new history version + persists content |
| **History limit** | Keeps last 20 versions per note |
| **Context menu** | Shared element at cursor position |

---

## Testing Approach

**TDD workflow** for new features:
1. Define expected behavior
2. Write test first (unit → integration → E2E)
3. Run tests and verify failure
4. Implement minimal code to pass
5. Refactor while keeping tests green
6. Manual UI sanity check

**Test patterns:**
- **Unit**: test pure functions with mock data
- **Integration**: test DOM + state interaction
- **E2E**: browser automation for user flows

### Testing Best Practices (MCP Tools)

When using Chrome DevTools MCP tools, ensure proper JSON formatting in tool calls:

**Correct format:**
```xml
<use_mcp_tool>
<server_name>chrome-devtools-mcp</server_name>
<tool_name>navigate_page</tool_name>
<arguments>
{
  "type": "url",
  "url": "file:///path/to/file.html"
}
</arguments>
</use_mcp_tool>
```

**Key points:**
- Use `</arguments>` (not `</args>`) for closing tag
- Arguments content must be valid JSON with proper quotes and brackets
- All parameters should be inside the `<arguments>` block

---

## Project-Specific Best Practices

### File Operations
- Use dedicated tools (`Read`, `Edit`, `Write`, `Glob`, `Grep`) for file operations
- Avoid `sed`, `cat`, `grep`, `find` commands - use Claude Code's built-in tools
- These tools are safer, more precise, and provide better error handling

### Chrome DevTools MCP Testing
When testing with chrome-devtools-mcp:

1. **Modal dialogs**: Replace native `confirm()` with custom DOM-based modals for testability:
   ```javascript
   class ModalManager {
     show(title, message) {
       return new Promise(resolve => {
         // Show modal UI and resolve on button click
       });
     }
   }
   ```

2. **Testing workflow**:
   - Navigate to page → Take snapshot → Click elements → Verify state changes

3. **Avoid blocking dialogs**: Native `confirm()` blocks execution and cannot be handled by MCP tools; use async Promise-based modals instead.

### Chess SPA Testing (chess-test.md)

#### Test Files
- `chess.html` - Main chess application with bot AI support  
- `chess-test.md` - Comprehensive test cases using Chrome DevTools MCP

#### Test Scenarios Covered
1. **Create New Game**: Validate board is loaded correctly with all pieces in starting positions
2. **No Bot Mode (Human vs Human)**: Test white moves, black moves, timer display, and move history  
3. **Easy Bot Mode**: Test white moves followed by random bot response
4. **Hard Bot Mode**: Test white moves followed by strategic minimax bot response

#### Key MCP-Ready Elements
| Element | ID | Purpose |
|---------|-----|---------|
| Chess Board Grid | `mcp-board-grid-8x8` | Main board container for testing piece positions |
| Game Status Display | `mcp-status-display` | Current turn status and game state messages |
| Bot Difficulty Select | `mcp-bot-difficulty-select` | Dropdown to set bot difficulty level (none/easy/medium/hard) |
| New Game Button | `mcp-btn-new-game` | Reset game state with confirmation dialog |
| Save Game Button | `mcp-btn-save-game` | Export game to JSON file |
| Load Game Button | `mcp-btn-load-game` | Import game from JSON file |
| Reset Position Button | `mcp-btn-reset-position` | Reset board while keeping game active |

#### Test API (window.chessTestAPI)
```javascript
{
  getBoardState: () => chessGame.board.grid,     // Get current piece positions as 8x8 array
  getCurrentTurn: () => chessGame.gameState.currentTurn,
  getSelectedSquare: () => chessGame.selectedSquare,
  getLegalMoves: (row, col) => chessGame.getLegalMoves(row, col),
  getMoveHistory: () => chessGame.moveHistory,
  isGameActive: () => chessGame.gameActive
}
```

#### Testing Workflow Using MCP Tools
1. **Navigate**: `navigate_page({type: 'url', url: 'file:///path/to/chess.html'})`
2. **Snapshot**: Use `take_snapshot()` to get element UIDs for buttons/boards
3. **Query State**: Use `evaluate_script()` with chessTestAPI functions
4. **Interact**: Click board squares or buttons using their UIDs from snapshot  
5. **Verify**: Check status display, move history panel, and timer

#### Known Limitations & Workarounds
- Bot moves use setTimeout (500ms delay) - tests should wait before verifying bot response
- Dropdown interactions may have timing issues; consider JavaScript-based selection via `evaluate_script`
- Pawn promotion dialog requires manual interaction in human vs human mode

---

### Chess SPA Specifics
- **Auto-save vs Manual save**: Separate logic - `autoSave()` for silent localStorage persistence, `saveGame()` for user-triggered file export
- **Async functions**: Use `async`/`await` for file system operations (File System Access API)
- **Fallback patterns**: Always provide fallbacks for modern APIs (e.g., blob download for save, file input for load)

### CSS Optimization
- Use `clamp()` for responsive font sizes
- Use `aspect-ratio` for maintaining square boards
- Use `max-width`/`max-height` with viewport units for responsive sizing
- Keep styling simple - avoid complex 3D effects unless requested

---

## File Structure

| File | Purpose |
|------|---------|
| `SPA.md` | This workspace skill documentation |
| `notes.html` | Main notes SPA application |
| `chess.html` | Chess SPA with bot AI |
| `note.html` | Individual note template/variant |
| `notes.html` | Notes management SPA |

---

## Workspace Configuration

**Git Remote**: https://github.com/xinleexin/SPA-notes.git