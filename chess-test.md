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
take_snapshot({})
evaluate_script({
  function: () => {
    const grid = document.getElementById('mcp-board-grid-8x8');
    return { 
      gridId: grid.id,
      piecesAtStart: window.chessGame.board.grid.map((row, r) => row.map((p, c) => p ? {type:p.type,color:p.color} : null))
    };
  }
})
```

---

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

### MCP Test Script
```javascript
// Select No Bot mode and start new game
fill({ uid: "dropdown_element_uid", value: "No Bot (Human vs Human)" })
click({ uid: "new_game_button" })

// Play white move e4 using JavaScript
evaluate_script({
  function: () => {
    const squares = Array.from(document.querySelectorAll('.square'));
    // Click e2 pawn to select, then e4 to move
    squares.find(s => s.dataset.row === '6' && s.dataset.col === '4').click();
    squares.find(s => s.dataset.row === '4' && s.dataset.col === '4').click();
  }
})

// Verify history and turn
evaluate_script({
  function: () => ({
    historyLength: window.chessGame.moveHistory.length,
    currentTurn: window.chessGame.gameState.currentTurn
  })
})
```

---

## Test Scenario 3: Easy Bot Mode (Random)

### Setup
- Select "Easy (Random)" from difficulty dropdown

### Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click white pawn at e2 → move to e4 | Pawn moves, bot starts thinking... status shown |
| 2 | Wait ~500ms+ | Bot makes random legal black move (e.g., e5, c5, d5) |
| 3 | Verify history panel | "1. e4 [bot-move]" recorded |
| 4 | Click white knight at g1 | Shows L-shaped moves (f3, h3) |
| 5 | Move knight to f3 | Knight moves, bot responds after delay |

### Validation Points
- Bot makes a legal move within ~500ms+ 
- Bot response is random but valid chess moves
- Status shows "Bot (Easy) is thinking..." during black's turn

### MCP Test Script
```javascript
// Select Easy mode and start new game
fill({ uid: "dropdown_element_uid", value: "easy" })
click({ uid: "new_game_button" })

// Play white e4 move using JavaScript
evaluate_script({
  function: () => {
    const squares = Array.from(document.querySelectorAll('.square'));
    squares.find(s => s.dataset.row === '6' && s.dataset.col === '4').click();
    squares.find(s => s.dataset.row === '4' && s.dataset.col === '4').click();
  }
})

// Wait for bot response (use longer wait than test step)
evaluate_script({
  function: () => {
    return new Promise(resolve => setTimeout(() => resolve({
      statusText: document.getElementById('mcp-status-display').textContent,
      historyLength: window.chessGame.moveHistory.length,
      currentTurn: window.chessGame.gameState.currentTurn
    }), 1000));
  }
})

// Verify bot moved (should see Black's turn, not "Bot is thinking...")
```

---

## Test Scenario 4: Hard Bot Mode (Minimax)

### Setup
- Select "Hard (3-ply)" from difficulty dropdown

### Test Steps
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click white pawn at e2 → move to e4 | Pawn moves, bot starts thinking... status |
| 2 | Wait ~1000ms+ | Bot makes strategic black move using minimax search (depth-2) |
| 3 | Verify bot response | Higher quality move (center control or development like Nc6/Nf6) |
| 4 | Play several more turns | Bot consistently plays strong positional chess |

### Validation Points
- Bot takes longer to calculate (depth-2 minimax with quiescence search)
- Moves prioritize center control and piece development
- Status shows "Bot (Hard) is thinking..." during black's turn

### MCP Test Script
```javascript
// Select Hard mode and start new game
fill({ uid: "dropdown_element_uid", value: "hard" })
click({ uid: "new_game_button" })

// Play white e4 move using JavaScript
evaluate_script({
  function: () => {
    const squares = Array.from(document.querySelectorAll('.square'));
    squares.find(s => s.dataset.row === '6' && s.dataset.col === '4').click();
    squares.find(s => s.dataset.row === '4' && s.dataset.col === '4').click();
  }
})

// Wait for bot response (hard mode takes longer due to minimax)
evaluate_script({
  function: () => {
    return new Promise(resolve => setTimeout(() => resolve({
      statusText: document.getElementById('mcp-status-display').textContent,
      historyLength: window.chessGame.moveHistory.length,
      currentTurn: window.chessGame.gameState.currentTurn,
      moveHistory: window.chessGame.moveHistory.map(m => ({turn:m.turn, notation:m.notation}))
    }), 2000));
  }
})

// Verify bot made strategic move (Nc6/Nf6 indicate minimax working)
```

---

## Test Scenario 5: Bot AI Debugging

### Common Issues to Check
| Issue | Symptom | Solution |
|-------|---------|----------|
| Bot not moving | Status stuck on "White's turn" after white moves, history shows black move but status wrong | Check `undoMoveOnBoard` function for undefined property access errors |
| Console error | `Cannot read properties of undefined (reading 'isCastling')` at line ~1558 | Ensure savedState includes isCastling/isEnPassant fields |

### Debug Commands
```javascript
// 1. Check console messages for errors first!
list_console_messages({ types: ["error", "warn"] })

// 2. Check bot AI exists and has all legal moves
evaluate_script({
  function: () => {
    const botAI = window.chessGame.botAI;
    if (!botAI) return { error: 'No bot AI' };
    
    const allMoves = botAI.getAllLegalMovesForColor(window.chessGame, 'black');
    return {
      moveCount: allMoves.length,
      moves: allMoves.slice(0, 5).map(m => ({from:m.from,to:m.to}))
    };
  }
})

// 3. Test minimax directly (may take a few seconds)
evaluate_script({
  function: () => {
    const botAI = window.chessGame.botAI;
    if (!botAI) return { error: 'No bot AI' };
    
    try {
      const allMoves = botAI.getAllLegalMovesForColor(window.chessGame, 'black');
      const hardMove = botAI.getHardMove(window.chessGame, 'black', allMoves);
      return { move: hardMove };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  }
})

// 4. Check board state
evaluate_script({
  function: () => ({
    grid: window.chessGame.board.grid.map(row => row.map(p => p ? {type:p.type,color:p.color} : null)),
    currentTurn: window.chessGame.gameState.currentTurn,
    enPassantTarget: window.chessGame.gameState.enPassantTarget
  })
})
```

---

## Common Test Patterns Using MCP Tools

### Basic Navigation
```javascript
navigate_page({
  type: 'url',
  url: 'file:///c:/Users/xinle/code/SPA-notes/chess.html'
})
```

### Take Snapshot for UI State
```javascript
take_snapshot({})
```
Look for:
- `id="mcp-board-grid-8x8"` - Board container
- `id="mcp-status-display"` - Game status text  
- `id="mcp-bot-difficulty-select"` - Difficulty dropdown

### Click Elements by ID
```javascript
click({ uid: "element_uid_from_snapshot" })
```

### Fill Form (Dropdown Selection)
```javascript
fill({
  uid: "dropdown_element_uid",
  value: "easy"
})
```

### Verify Board State via JavaScript
```javascript
evaluate_script({
  function: () => {
    // Access global chessGame instance
    return {
      turn: window.chessGame.gameState.currentTurn,
      selectedSquare: window.chessGame.selectedSquare,
      moveCount: window.chessGame.moveHistory.length
    };
  }
})
```

### Get Legal Moves for Debugging
```javascript
evaluate_script({
  function: () => {
    const moves = window.chessGame.getLegalMoves(6, 4); // e2 pawn
    return moves.map(m => ({ row: m.row, col: m.col }));
  }
})

// Check console messages (for debugging)
list_console_messages({ types: ["error", "warn"] })