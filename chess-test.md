# Chess SPA Test Cases

## Overview
This document contains quick test steps using Chrome DevTools MCP tools to verify chess.html functionality across different game modes.

---

## Test Scenario 1: Create New Game and Validate Board

### Prerequisites
- Open `chess.html` in browser

### Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to file://.../chess.html | Page loads with chess board |
| 2 | Take snapshot | Verify board grid ID: `mcp-board-grid-8x8` |
| 3 | Check board structure | 8x8 grid of squares (64 total) |
| 4 | Verify pieces | All starting positions correct (white on row 7, black on row 0) |
| 5 | Check coordinates | a-h columns and 1-8 rows visible |
| 6 | Verify status display | Text: "White's turn" |

### Validation Points
- Grid has `id="mcp-board-grid-8x8"`
- White pieces (♔ ♕ ♖ ♗ ♘ ♙) on row 7
- Black pieces (♚ ♛ ♜ ♝ ♞ ♟) on row 0
- Pawns on rows 6 and 1

### MCP Test Script
```javascript
navigate_page({ type: 'url', url: 'file:///c:/Users/xinle/code/SPA-notes/chess.html' })
```

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

## Test Scenario 3: MCP API Testing - Legal Moves Calculation

### Setup
- Ensure chess.html is loaded with default settings

### Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click white pawn at e2 (row 6, col 4) | Pawn selected with 2 legal moves (e3, e4) |
| 2 | Verify using chessTestAPI | `window.chessTestAPI.getLegalMoves(6, 4)` returns array of 2 move objects |
| 3 | Click white knight at b1 (row 7, col 1) | Knight selected with 2 legal moves |
| 4 | Verify using chessTestAPI | `window.chessTestAPI.getLegalMoves(7, 1)` returns array of 2 move objects: [{row:5,col:0}, {row:5,col:2}] |
| 5 | Click white rook at a1 (row 7, col 0) | Rook has 0 legal moves initially (blocked by pawn on a2) |

### Validation Points
- `chessTestAPI.getLegalMoves(row, col)` correctly calculates legal moves for all piece types
- Pawns have correct forward movement and double-step options
- Knights can jump over pieces with L-shaped movements
- Rooks are blocked by own pieces (correct chess behavior)
- API returns proper move objects with row/col coordinates

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

### Medium/Hard Mode (Strategic Moves)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set difficulty to "Medium" or "Hard" | Bot responds with strategic move based on minimax algorithm |
| 2 | Observe console logs | `[BotAI.makeMove]` messages show evaluation of moves |

---

## Known Limitations

- Pawn promotion requires manual selection in human vs human mode
- Chess clock only displays when no bot is active
- Move history may not display check/checkmate symbols if game ends immediately