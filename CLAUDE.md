# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
This is a Single Page Application (SPA) for managing markdown notes with version history, built as pure client-side HTML/JS with no build process. The main application is `notes.html`. There's also a chess SPA (`chess.html`) with bot difficulty levels.

## Development Environment
You are **powershell** expert and running on Windows 11. Utilize **powershell** for file operations and etc.

## Key Commands

| Task | Command |
|------|---------|
| Run the app | Open `notes.html` directly in a browser |
| Run tests | Open `test.html` in a browser and click "Run All Tests" |
| Test import/export | Open `import-export-test.html` if available |
| Play Chess | Open `chess.html` in a browser |

## Architecture

### State Management (Notes SPA)

- **`notes`**: Object `{ noteId: { title, content, history: [{timestamp, content}] } }`
- **`currentNoteId`**: ID of the currently selected note (null if none)
- **`currentView`**: `'source'` (textarea) or `'preview'` (rendered markdown)
- **`autoSaveTimer`**: Debounce timer for auto-save (300ms delay)
- **`lastSavedContent`**: Tracks content to avoid redundant saves
- **`selectedHistoryItems`**: Set tracking multi-selected history versions (Ctrl/Cmd+click)
- **`editFontSizePx`**: Current zoom level in edit panel (10-24px range)

**Persistence**: All state persists to `localStorage` under key `'markdownNotes'`. Edit zoom level stored separately under `'editFontSizePx'`.

### Chess SPA State Management

- **`board`**: 8x8 array of `{type, color}` objects or null
- **`currentTurn`**: 'white' or 'black'
- **`botDifficulty`**: 'easy', 'medium', or 'hard'
- **`selectedSquare`**, **`legalMoves`**, **`moveHistory`**, etc.

**Persistence**: Chess state persists to `localStorage` under key `'chessGame'`.

### Data Flow (Notes)

1. **Initialization**: `init()` → `loadNotes()` → `updateNotesList()` → `setupEventListeners()`
2. **User actions** → update state → `saveNotes()` → `update*()` to refresh DOM
3. **No framework**; direct DOM manipulation with vanilla JS

### Key Components (Notes)

| Component | Description |
|-----------|-------------|
| **Notes panel** (20% width) | List of notes with create/delete/rename context menu |
| **Edit panel** (60% width) | Textarea for markdown editing; toggle to preview with `marked.js` + `KaTeX` |
| **History panel** (20% width) | Version history with restore/delete/rename; supports Ctrl+multi-select |
| **Resize handle** | Draggable divider for panel width adjustment |

### Chess SPA Components

| Component | Description |
|-----------|-------------|
| **Board panel** | 8x8 grid with chess pieces, coordinates |
| **History panel** | Move history list, difficulty dropdown (Easy/Medium/Hard) |
| **Buttons** | New Game, Save/Load Game, Reset Position |

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

## Important Patterns (Notes)

| Pattern | Implementation |
|---------|----------------|
| **Debounced auto-save** | 300ms after input; updates content only |
| **Save button** | Creates new history version + persists content |
| **History limit** | Keeps last 20 versions per note |
| **Context menu** | Shared element at cursor position |

## Important Patterns (Chess)

| Pattern | Implementation |
|---------|----------------|
| **Bot difficulty levels** | Easy (random), Medium (2-ply), Hard (3-ply) |
| **Piece-square tables** | Positional bonuses for better play |
| **Minimax search** | Bot evaluates positions after opponent's response |
| **Auto-promotion** | Bot auto-queues pawns on last rank |

## Chess Bot Difficulty Levels

### Easy (0-ply - Random)
- Picks random legal moves
- Slight randomness factor for variety

### Medium (2-ply with piece-square tables)
- Current 2-ply search implementation
- Evaluates position after each initial move
- Uses piece-square tables for positional awareness

### Hard (3-ply minimax)
- For each initial white move:
  - Simulate the move
  - Find black's best response (minimize white's score)
  - Evaluate resulting position after white's second move
- Considers deeper calculation and threat blocking

## Key Functions Reference (Notes)

### Notes Panel Functions
- `notesAdd()` - Create new note with timestamped title
- `notesDelete(noteId)` - Delete note with confirmation
- `notesRename(noteId)` - Rename note via prompt
- `selectNote(noteId)` - Select note and load into editor

### Edit Panel Functions
- `editLoad(noteId)` - Load note content into editor
- `editToggleView()` - Toggle between source/preview
- `editSave()` - Save content and create history version
- `handleEditInput()` - Debounced auto-save handler

### History Panel Functions
- `historyCreate(noteId)` - Create new version from current content
- `historyDelete(noteId, versionId)` - Delete specific version
- `historyRename(noteId, versionId, newName)` - Rename version timestamp
- `updateHistoryList()` - Re-render history list with current version highlighted

### Utility Functions
- `validateImportedNotes(data)` - Verify imported notes structure
- `renderMathWithKaTeX(html)` - Process math formulas in rendered HTML

## Chess SPA Key Functions

### Bot AI Functions
- `botMakeMove()` - Select and execute bot move based on difficulty
- `evaluateBoard(board, botColor)` - Score position using piece values + positional tables
- `getAllLegalMovesForColor(color)` - Get all legal moves for a color
- `makeMoveOnBoard(from, to)` / `undoMoveOnBoard(savedState)` - Simulate/undo moves for search

### State Persistence
- `autoSave()` - Save to localStorage
- `saveGame()` / `loadGame()` - File-based export/import with File System Access API fallback

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