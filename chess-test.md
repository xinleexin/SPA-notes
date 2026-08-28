# Chess SPA Test Cases

## Overview
This document contains quick test steps using `chrome-devtools-mcp` tools to verify chess.html functionality across different game modes.

## **Important notice**
Use `Click("UID")` tool from `chrome-devtools-mcp` to select and move pieces on the chessboard.
---

## Prerequisites: Starting HTTP Server

### Why HTTP Server is Required
Modern browsers block loading JavaScript files via `<script src="...">` from local HTML files due to CORS (Cross-Origin Resource Sharing) security restrictions. To properly test the modularized version of chess.html, you need to run a simple HTTP server.

### How to Start the HTTP Server

**Option 1: Using PowerShell Script**
```powershell
# Run this command in PowerShell
.\start-server.ps1
```
This will:
- Start a Python HTTP server on port 8000
- Automatically open your browser to `http://localhost:8000/chess.html`

### Testing with chrome-devtools-mcp
After starting the HTTP server, use `navigate_page` tool to access the chess game:

```javascript
// Navigate to the chess page via HTTP
navigate_page({ type: 'url', url: 'http://localhost:8000/chess.html' })
```

**Note:** Wait for the board squares to render (board is populated dynamically via JavaScript). Take a snapshot using `take_snapshot` to understand the page layout.
---

## Test Scenario 1: Create New Game and Validate Board

### Prerequisites
- Start HTTP server using `start-server.ps1`
- Navigate to chess game: `navigate_page({ type: 'url', url: 'http://localhost:8000/chess.html' })`
- Wait for board squares to render (board is populated dynamically via JavaScript)
- Take snapshot of the page by using `take_snapshot` to understand the page layout

**Note:** Each square button now has an `aria-label` attribute with its chess coordinate (e.g., "a8", "e4"), making it easy to identify squares from snapshots.

### Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to http://localhost:8000/chess.html | Page loads with chess board |
| 2 | Take snapshot | Verify board grid ID: `mcp-board-grid-8x8` |
| 3 | Check board structure | 8x8 grid of squares (64 total) |
| 4 | Verify pieces | All starting positions correct (white on row 7, black on row 0) |
| 5 | Check coordinates | a-h columns and 1-8 rows visible |
| 6 | Verify status display | Text: "White's turn" |

### Coordinate System Reference
Each square button in the chess grid has three key identifiers:
| Identifier | Description |
|------------|-------------|
| **UID** | Unique identifier from MCP snapshot (e.g., `uid=19_3`) - used for click actions via `click(uid)` tool |
| **Coordinate** | Chess notation like "a8", "e4" stored in the button's `aria-label` attribute and `data-chessCoord` data attribute |
| **Piece** | Optional chess piece character if present on the square |

**Board Structure:**
- Grid ID: `mcp-board-grid-8x8`
- 64 squares total (8 rows × 8 columns)
- Each button has aria-label with coordinate (e.g., `<button aria-label="a8">`)

**Coordinate Mapping:**
| File/Column | Index | Rank/Row | Index |
|-------------|-------|----------|-------|
| a | 0 | 8 | 0 |
| b | 1 | 7 | 1 |
| c | 2 | 6 | 2 |
| d | 3 | 5 | 3 |
| e | 4 | 4 | 4 |
| f | 5 | 3 | 5 |
| g | 6 | 2 | 6 |
| h | 7 | 1 | 7 |

**Example Coordinates:**
- a8 (row 0, col 0) - black rook starting position
- e2 (row 6, col 4) - white pawn starting position  
- e4 (row 4, col 4) - empty square in middle of board

### Validation Points
- Grid has `id="mcp-board-grid-8x8"`
- White pieces (♔ ♕ ♖ ♗ ♘ ♙) on row 7
- Black pieces (♚ ♛ ♜ ♝ ♞ ♟) on row 0
- Pawns on rows 6 and 1

## Test Scenario 2: No Bot Mode (Human vs Human)

### Setup
- Select "No Bot (Human vs Human)" from difficulty dropdown (`mcp-bot-difficulty-select`)

### Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click white pawn at e2 (row 6, col 4) | Square highlights yellow, shows legal moves |
| 2 | Verify legal move indicators | Green dots on e3 and e4 squares |
| 3 | Click e4 square to move | Pawn moves from e2→e4, turn switches to black |
| 4 | Verify history panel | Move recorded: "1. e4" under White column |
| 5 | Check timer display | Chess clock visible with white time active |
| 6 | Click black pawn at d7 (row 1, col 3) | Legal moves shown for black pawn |
| 7 | Move black pawn to d5 | Pawn moves from d7→d5 |
| 8 | Verify history panel | "1. e4 d5" recorded in move history |

### Validation Points
- White moves first correctly
- Black responds after white's move
- Timer starts for human vs human mode
- Move history displays alternating turns

---

## Bug Fixes Applied

### Fixed: Missing Board Parameter in `chessTestAPI.getLegalMoves`

**Issue:** The `window.chessTestAPI.getLegalMoves(row, col)` function was missing the board parameter when calling `ChessGame.getLegalMoves()`.

**Fix Applied:** Updated the function signature to include the board reference:
```javascript
// Before (broken):
getLegalMoves: (row, col) => chessGame.getLegalMoves(row, col),

// After (fixed):
getLegalMoves: (row, col) => chessGame.getLegalMoves(chessGame.board, row, col),
```

**Verification:** After the fix:
- Knight at b1 correctly shows 2 legal moves
- Rook at a1 correctly shows 0 legal moves (blocked by pawn)
- Pawn movements calculate correctly

---

## Test Scenario 4: Bot Difficulty Levels

### Easy Mode (Random Moves)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set difficulty to "Easy" | Bot responds with random valid move |
| 2 | Click any white piece and make a move | After 500ms delay, bot makes a response |

### Medium Mode (Strategic Scoring, main thread)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set difficulty to "Medium" | Bot responds with a move from `getMediumMove()` (per-move `calculateMoveScore()`, run on the main thread) |
| 2 | Observe console logs | Console stays quiet (BotAI `logLevel` defaults to `'warn'` — no per-node spam); a sensible developing/capturing move is played |

### Hard Mode (Iterative-Deepening Search in a Web Worker)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set difficulty to "Hard" | Bot runs `searchBestMoveIterative()` (negamax + alpha-beta, depth 4, 400 ms time cap) inside a Web Worker (`bot-worker.js`) |
| 2 | Observe console logs | Console stays quiet; the applied move is tagged `Executing bot move (depth=N, Xms)` (only the worker path sets the depth tag) |
| 3 | Verify off-thread | `chessGame._botWorker` is an active `Worker` and the UI stays responsive during the search |

**Worker / fallback behavior:**
- The worker is a lazy singleton (`_getBotWorker()`), reused across moves and terminated on `createNewGame()` and `beforeunload`.
- The main thread waits up to **2500 ms** for the worker's reply. On timeout, an illegal move, or a worker error, the worker is terminated and the bot falls back to the **synchronous** `searchBestMoveIterative()` (depth 3, 250 ms) — a warning is logged and the bot still moves.
- `chess-core.js` (DOM-free) is loaded by both the main thread and the worker via `importScripts`; `bot-ai.js` holds the shared search engine used by both paths.

---

## Bug Fix: Infinite Rook Loop (Hard Difficulty)

### Issue Description
When playing with "Hard" difficulty, the bot would fall into an infinite loop moving a Rook back and forth between b8 and a8. The move history that reproduced this issue was: d4, Na6, e3, Rb8, e4, Ra8

### Root Cause
The `makeMoveOnClonedGame()` function in bot-ai.js was not updating the cloned game's `moveHistory` array after making test moves during evaluation. This caused the `isRepetition()` check to always compare against stale history data, failing to detect when a rook would cycle between two squares.

### Fix Applied
Added move history tracking to `makeMoveOnClonedGame()`:
```javascript
// Update move history with the new move so repetition detection works correctly
const notation = this.generateMoveNotation(piece, from, to);
clonedGame.moveHistory.push({
    turn: clonedGame.moveHistory.length + 1,
    color: piece.color,
    from: { row: from.row, col: from.col },
    to: { row: to.row, col: to.col },
    piece: piece,
    captured: targetPiece || null,
    notation: notation
});
```

Added new helper method `generateMoveNotation()` for proper move notation generation.

---

## E2E Test: Hard Bot No Infinite Loop

### Prerequisites
- Start HTTP server using `start-server.ps1`
- Navigate to chess game: `navigate_page({ type: 'url', url: 'http://localhost:8000/chess.html' })`

### Setup Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set difficulty dropdown to "Hard" | Difficulty set correctly |

### Test Scenario: Reproduce and Verify Fix for Infinite Rook Loop

| Step | Action | Expected Result |
|------|--------|-----------------|
| 2 | Click white pawn at d2 (UID from snapshot) | Square highlights yellow, shows legal moves |
| 3 | Click d4 square to move | Pawn moves d2→d4, turn switches to Black |
| 4 | Wait for bot response (~500ms) | Bot responds with Na6 (knight b8→a8) |
| 5 | Click white pawn at e2 | Square highlights yellow |
| 6 | Click e3 square to move | Pawn moves e2→e3, turn switches to Black |
| 7 | Wait for bot response | Bot responds with Rb8 (rook a8→b8) |
| 8 | Click white pawn at e4 | Square highlights yellow |
| 9 | Click e4 square to move | Pawn moves e2→e4, turn switches to Black |
| 10 | Wait for bot response | Bot responds with Ra8 (rook b8→a8) |
| 11 | Take snapshot after Ra8 | Verify rook at a8, board state correct |
| 12 | Click white c2 pawn to move | White makes any legal move |
| 13-20 | Monitor next 8 bot moves via console logs | Bot should NOT cycle Rook between b8↔a8 |

### Validation Points
- After Ra8 (move 6), black rook is at a8
- White makes move, then bot responds with Black's turn
- **Bug Fixed**: Console log shows `repetition(-300)` penalty applied when rook would cycle back to b8
- Bot selects alternative moves instead of repeating the same rook pattern

### Expected Console Output (for verification)
```
[BotAI.getHardMove] Safe: Ra8 -> Rb8: safety=100 trade=-500  <- Should NOT appear after fix
[BotAI.isRepetition] Detection working correctly for back-and-forth moves
```

---

## Best Practices for Using chrome-devtools-mcp

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `"Missing value for required parameter 'tool_name'"` | Malformed XML tag - tool name must be inside `<tool_name>` tags | Use correct format: `<use_mcp_tool><server_name>...</server_name><tool_name>click</tool_name><arguments>{...}</arguments></use_mcp_tool>` |
| `"The element did not become interactive within the configured timeout"` | UI in transient state (dropdown opening, dialog appearing) | Take a fresh snapshot first to see current UI state before clicking |
| `"No such element found in the snapshot"` | Using outdated UID from previous snapshot | Always take a new snapshot after page changes or animations |

### Best Practices

1. **Always take a fresh snapshot before clicking**
   - Ensures you have the latest UI state and correct UID values
   - Essential when dialog overlays appear (they get different UIDs)
   
2. **Check move history to verify moves**
   - Use `uid=71_68` heading "Move History" to confirm your moves were recorded
   - Bot responses may take 500ms+ in hard mode
   
3. **Use console logs for debugging AI behavior**
   - Check `[BotAI.makeMove]` messages to see what moves are being evaluated
   - Look for `trade=` values to verify piece capture calculations

4. **Wait for bot response before next action**
   - Hard mode takes ~500ms; use `wait_for(["Bot (Hard) is thinking..."])`
   - Status display shows "White's turn" or "Black's turn" during transitions

5. **Handle dialog overlays properly**
   - Many actions require confirmation dialogs
   - Check snapshot for overlay elements with different UIDs (e.g., `uid=76_0`)
   - Click appropriate button within the overlay ("Yes"/"No")

### Coordinate System Reference

| Identifier | Description |
|------------|-------------|
| **UID** | Unique identifier from MCP snapshot (e.g., `uid=19_3`) - used for click actions via `click(uid)` tool |
| **Coordinate** | Chess notation like "a8", "e4" stored in button's `aria-label` attribute and `data-chessCoord` data attribute |
| **Piece** | Optional chess piece character if present on the square |

### Bot AI Debugging

When testing bot moves, check console logs for:
```
[BotAI.makeMove] SELECTED: d7 -> d5
[getHardMove] Safe: a8 -> b6: score=10 (trade=-440)  <- Good trade penalty applied
```

**Key indicators of correct AI behavior:**
- High negative `trade=` values indicate bad captures are being penalized
- `repetition` penalties should appear for cycling moves
- Bot should avoid Knight vs Pawn trades with defenders

---

## Known Limitations

- Pawn promotion requires manual selection in human vs human mode
- Chess clock only displays when no bot is active
- Move history may not display check/checkmate symbols if game ends immediately
