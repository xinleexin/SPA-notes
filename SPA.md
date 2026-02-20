# Workspace Skill: SPA Notes Application

## Overview
This is a Single Page Application (SPA) for managing markdown notes with version history, built as pure client-side HTML/JS with no build process. The main application is `notes.html`. There's also a chess SPA (`chess.html`) with bot AI support and comprehensive unit testing capabilities.

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
| Run tests | Open `test.html` or `chess-tests.html` in browser and click "Run All Tests" |
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
- `chess-tests.html` - Unit testing framework for chess classes
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

## Chess TDD Framework Design and Lessons Learned

### Key Issues Discovered in Chess Bot AI

#### Issue 1: Undefined Global `board` Variable
**Symptom**: Runtime errors when GameState methods tried to access the board.

```javascript
// Problematic code:
GameState.findKing(color) {
    for (let row = 0; row < 8; row++) {
        const piece = board.grid[row][col]; // 'board' is undefined!
    }
}
```

**Fix**: Pass board as parameter and store in GameState constructor.
```javascript
class GameState {
    constructor(board) { this.board = board; }  // Explicit dependency injection
    
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            const piece = this.board.grid[row][col]; // Now works!
        }
    }
}
```

#### Issue 2: Missing Board Parameter in BotAI
**Symptom**: `BotAI.getAllLegalMovesForColor()` returned empty array because GameState.getLegalMoves() required board parameter.

```javascript
// Problematic code:
getAllLegalMovesForColor(game, color) {
    // ...
    const legalMoves = game.gameState.getLegalMoves(row, col); // Missing board!
}
```

**Fix**: Pass the board explicitly.
```javascript
const legalMoves = game.gameState.getLegalMoves(game.board, row, col);
```

#### Issue 3: Turn State Mismatch
**Symptom**: When calculating moves for black (opponent), GameState.currentTurn was still 'white'.

**Fix**: Temporarily set turn to the player's color during move calculation.
```javascript
getAllLegalMovesForColor(game, color) {
    const originalTurn = game.gameState.currentTurn;
    game.gameState.currentTurn = color; // Set to player's color
    
    const moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            // ... collect moves ...
        }
    }
    
    game.gameState.currentTurn = originalTurn; // Restore
    return moves;
}
```

#### Issue 4: King.getPseudoLegalMoves Signature Mismatch
**Symptom**: "board.isValidPosition is not a function" error when checking castling validity.

```javascript
// Problematic code:
gameState.isSquareUnderAttack(row, col, attackerColor) // Missing board parameter!
```

**Fix**: Pass board as first parameter.
```javascript
gameState.isSquareUnderAttack(board, row, col, attackerColor)
```

### Lessons Learned

#### 1. Testability Requires Planning from Start
- Classes should accept dependencies as parameters rather than relying on globals
- Methods should have explicit parameters for better isolation and mocking
- Consider testability during initial design phase, not after implementation

**Anti-pattern to avoid:**
```javascript
// Relies on global state - hard to test in isolation
class GameState {
    constructor() { this.board = window.board || new ChessBoard(); }
}
```

#### 2. Signature Consistency is Critical
When refactoring methods:
- Update ALL callers when method signature changes
- BotAI.getAllLegalMovesForColor must match GameState.getLegalMoves parameters
- King.getPseudoLegalMoves must pass board to gameState.isSquareUnderAttack

**Recommendation**: Use TypeScript interfaces or JSDoc type hints to catch signature mismatches early.

#### 3. Turn State Management in Multi-Turn Logic
When calculating opponent moves for AI:
- Temporarily set GameState.currentTurn to the player being evaluated
- Store and restore original turn state after calculation
- This enables accurate legal move generation without side effects

#### 4. Bot AI Debugging Workflow with MCP Tools
1. **Check console messages first** - Look for runtime errors that break execution
2. **Test individual methods in isolation** using `evaluate_script()`:
   ```javascript
   window.chessGame.botAI.getAllLegalMovesForColor(window.chessGame, 'black')
   ```
3. **Verify state before/after move operations**
4. Use chessTestAPI to inspect game state without modifying the code

#### 5. Board Parameter Propagation Chain
The board parameter must flow through:
```
BotAI.makeMove()
    → BotAI.getAllLegalMovesForColor(game, color)
        → GameState.getLegalMoves(board, row, col)
            → Piece.getPseudoLegalMoves(board, gameState, row, col)
                → GameState.isSquareUnderAttack(board, row, col, attackerColor)
                    → Board.isValidPosition(), board.getPiece()
```

---

### File Structure (Updated)

| File | Purpose |
|------|---------|
| `SPA.md` | This workspace skill documentation |
| `notes.html` | Main notes SPA application |
| `chess.html` | Chess SPA with bot AI and testability fixes |
| `note.html` | Individual note template/variant |

---

## Workspace Configuration

**Git Remote**: https://github.com/xinleexin/SPA-notes.git