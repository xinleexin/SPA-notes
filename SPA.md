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
4. **Hard Bot Mode**: Test white moves followed by the iterative-deepening search engine (runs in a Web Worker; falls back to synchronous on worker failure/timeout)

#### Key MCP-Ready Elements
| Element | ID | Purpose |
|---------|-----|---------|
| Chess Board Grid | `mcp-board-grid-8x8` | Main board container for testing piece positions |
| Game Status Display | `mcp-status-display` | Current turn status and game state messages |
| Bot Difficulty Select | `mcp-bot-difficulty-select` | Dropdown to set bot difficulty level (none/easy/medium/hard) |
| New Game Button | `mcp-btn-new-game` | Reset game state with confirmation dialog |
| Save Game Button | `mcp-btn-save-game` | Export game to JSON file |
| Load Game Button | `mcp-btn-load-game` | Import game from JSON file |
| Take Back Button | `mcp-btn-reset-position` | Undo the last move (1 half-move in human mode, 2 in bot mode); disabled when there's nothing to undo |

#### Test API (window.chessMCP)
The UI exposes `window.chessMCP` (defined in `chess-ui.js`) for reliable programmatic testing:
```javascript
{
  clickSquare: (row, col) => selectSquare(row, col),                     // select a square / start a move
  executeMove: (fromRow, fromCol, toRow, toCol) =>                      // execute a move directly
      chessGame.executeMove({row: fromRow, col: fromCol}, {row: toRow, col: toCol}),
  getBoardState: () => chessGame.board.grid,                             // 8x8 piece grid
  getCurrentTurn: () => chessGame.gameState.currentTurn,                 // 'white' | 'black'
  getLegalMovesForSquare: (row, col) => chessGame.getLegalMoves(chessGame.board, row, col)
}
```

> **Note:** Older docs referenced `window.chessTestAPI`; the current build exposes `window.chessMCP` with the shape above. `chessGame` is also a `window` global (`window.chessGame`).

#### Testing Workflow Using MCP Tools
1. **Navigate**: `navigate_page({type: 'url', url: 'file:///path/to/chess.html'})`
2. **Snapshot**: Use `take_snapshot()` to get element UIDs for buttons/boards
3. **Query State**: Use `evaluate_script()` with `window.chessMCP` functions (e.g. `getCurrentTurn()`, `getBoardState()`, `getLegalMovesForSquare(row, col)`)
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

### Chess UI File Structure (2026 refactor)
The chess UI was split out of a single ~1000-line inline `<script>` into classic global scripts (no build step, no ES modules) to keep the Worker + MCP API working while cleaning up duplicated logic. Files and load order (as loaded at the bottom of `chess.html`):

| Order | File | Responsibility |
|-------|------|----------------|
| 1 | `chess-core.js` | DOM-free core engine: `Piece`/`createPiece`, `ChessBoard`, `GameState`, piece-square tables. Loaded by the main thread **and** the Worker (`importScripts`). |
| 2-5 | `bot-ai.js`, `bot-ai-evaluation.js`, `bot-ai-engine.js`, `bot-ai-moves.js` | `BotAI` class split across a base file + three prototype-extension files (evaluation / search engine / move generation). |
| 6 | `chess.js` | `ChessGame` class: `init`, `executeMove`, `createNewGame`, `undoLastMove`, bot orchestration + the lazy Worker singleton. |
| 7 | `chess-ui-render.js` | Board/status/clock rendering: `initRenderBoard`, `updateRenderBoard`, `renderBoard`, `updateStatus`, `renderMoveHistory`, `updateTakeBackButton`, `startTimer`/`stopTimer`/`updateTimerDisplay`, `calculateTimeColor`. |
| 8 | `chess-ui-persistence.js` | Save/load: `autoSave`, `saveGame`, `loadGame`, `loadFromLocalStorage`, `loadFromSaved`, and the single serializer `getGameState()`. |
| 9 | `chess-ui.js` | Controller + init: `selectSquare`, `deselectAll`, `recordMove`, `setupEventListeners`, `init`, `initAsync` (runs last), `getCurrentDifficulty()`, and `window.chessMCP`. |
| — | `chess.css` | All board/layout/panel styling (linked via `<link href="chess.css?v=2">`). |

Key invariants:
- **Load order matters**: core → bot-ai* → chess.js → render → persistence → controller. The controller (`chess-ui.js`) must run last so the globals it calls (`renderBoard`, `autoSave`, `chessGame`, …) all exist.
- **`getGameState()` is the single save serializer** — `autoSave()` reuses it; don't re-implement the object shape.
- **`getCurrentDifficulty()`** reads the `mcp-bot-difficulty-select` value (`initialBotDifficulties[value] || 'medium'`); used for the initial `botDifficulty`, `init`, `updateStatus` (render), and `executeMove`.
- **localStorage key**: `'chessGame'` (separate from the notes app's `'markdownNotes'`).
- **Keyboard shortcuts** (wired in `setupEventListeners`): `Ctrl/Cmd+S` save, `Ctrl/Cmd+L` load, `Ctrl/Cmd+N` new game, `Esc` deselect.
- **Take Back** (`undoLastMove()`): 1 half-move in human mode, 2 in bot mode; aborts (all-or-nothing) on king/rook/castling moves.

### Bot AI Architecture (Hard Mode)
- **Shared engine**: `chess-core.js` (DOM-free: pieces, board, game state, piece-square tables) is loaded by both the main thread and the Web Worker via `importScripts`. The `BotAI` class is split across four classic scripts — `bot-ai.js` (class + constructor + shared utilities) plus three prototype-extension files (`bot-ai-evaluation.js`, `bot-ai-engine.js`, `bot-ai-moves.js`) — all loaded after `bot-ai.js` and before `chess.js`.
- **Search engine**: `searchBestMoveIterative()` runs iterative-deepening negamax with alpha-beta pruning, MVV-LVA move ordering, threefold-repetition detection, and a time check every 64 nodes (`_checkTime`).
- **Hard mode runs off-thread**: `bot-worker.js` deserializes the position and posts back the best move `{ from, to, depth, nodes, ms }`. The worker is a lazy singleton (`_getBotWorker()`), reused across moves, and terminated on `createNewGame()` and `beforeunload`.
- **Synchronous fallback**: if the worker times out (2500 ms), returns an illegal move, or errors, the worker is terminated and the bot falls back to `searchBestMoveIterative()` on the main thread (depth 3 / 250 ms) — a warning is logged and the bot still moves.
- **Quiet logging**: `BotAI.logLevel` defaults to `'warn'` so the console stays clean (no per-node spam). Set `botAI.logLevel = 'info'` to restore verbose debug logging. The applied hard move is tagged `(depth=N, Xms)` in the console.

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

## Chess Medium Bot Repetition Detection Bug (2026-02-20)

### Issue Description
The Medium bot difficulty in chess.html exhibited an infinite loop bug where it would move the black rook from Rb8 to Ra8 and back repeatedly, creating a cycle that never ended.

**Test sequence**: d4, Na6, e3, Rb8, e4, Ra8, f3, Rb8

### Root Cause
The `BotAI.isRepetition()` method expects the full ChessGame object (which has `moveHistory` property), but was being called with only `game.gameState` in two locations:

```javascript
// BUGGY CODE - Line 1039 and 1175:
if (this.isRepetition(game.gameState, move)) {
    score -= 200;
```

The GameState class does NOT have a `moveHistory` property. Only the ChessGame class has this:

```javascript
class ChessGame {
    constructor(board) {
        // ...
        this.moveHistory = [];  // <-- This is where history is stored!
    }
}

class GameState {
    constructor(board) {
        this.board = board;
        // NO moveHistory here!
    }
}
```

### Why This Caused the Rb8/Ra8 Loop
1. When evaluating potential moves, `isRepetition()` returned false (because `game.gameState.moveHistory` was undefined)
2. The repetition penalty of -200 was never applied
3. Without this penalty, moving back to b8 after Ra8 had equal or better score than making a different move
4. This created an infinite loop: Rb8 → Ra8 → Rb8 → Ra8...

### Fix Applied
Changed both calls from `isRepetition(game.gameState, ...)` to `isRepetition(game, ...)`:

```javascript
// FIXED CODE - Line 1039 and 1175:
if (this.isRepetition(game, move)) {
    score -= 200;
```

### How It Was Fixed in chess.html
**Line ~1039** in `getMediumMove()` method:
```javascript
// Before:
if (this.isRepetition(game.gameState, move)) { 

// After:  
if (this.isRepetition(game, move)) {
```

**Line ~1175** in `getHardMove()` method:
```javascript
// Before:
if (this.isRepetition(game.gameState, item.move)) {

// After:
if (this.isRepetition(game, item.move)) {
```

### Regression Analysis
This was a **regression bug** introduced during code refactoring. The original implementation correctly passed the ChessGame object to `isRepetition()`, but at some point in the refactor, it was accidentally changed to pass only `game.gameState`. This is a common type of error that occurs when:

1. Methods are moved between classes
2. Variable names change during refactoring
3. Code is copied/pasted without full context review

### Prevention for Future Refactors
- Always verify object signatures match expected parameters when moving methods
- Add JSDoc type hints to method signatures: `@param {ChessGame} game`
- Run the Medium bot test sequence after any changes to BotAI class
- Consider adding unit tests specifically for repetition detection

---

## File Structure (Updated)

| File | Purpose |
|------|---------|
| `SPA.md` | This workspace skill documentation |
| `notes.html` | Main notes SPA application |
| `note.html` | Individual note template/variant |
| `start-server.ps1` | Starts a local HTTP server on port 8000 (required to load the modularized JS via `<script src>`) |
| **Chess SPA (classic global scripts, no build)** | |
| `chess.html` | Chess SPA shell (~60 lines): DOM + `<link>`/`<script>` wiring only |
| `chess.css` | All chess UI styling (linked via `?v=2`) |
| `chess-core.js` | DOM-free core engine (pieces, board, game state, PST); shared by main thread + Worker |
| `bot-ai.js` + `bot-ai-evaluation.js` / `bot-ai-engine.js` / `bot-ai-moves.js` | `BotAI` class (base + prototype extensions) |
| `bot-worker.js` | Web Worker for hard-mode iterative-deepening search (off-thread) |
| `chess.js` | `ChessGame` class (game lifecycle, execute/undo move, bot + Worker orchestration) |
| `chess-ui-render.js` | Board/status/clock rendering |
| `chess-ui-persistence.js` | Save/load/localStorage (single `getGameState()` serializer) |
| `chess-ui.js` | UI controller + init + `window.chessMCP` test API |
| `chess-tests.html` | Unit test framework for chess classes |
| `chess-test.md` | Chrome DevTools MCP test cases for chess.html |

---

## Workspace Configuration

**Git Remote**: https://github.com/xinleexin/SPA-notes.git