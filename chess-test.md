# Chess SPA Test Documentation

## Overview
This document contains test results using Chrome DevTools MCP tools to verify chess.html functionality.

---

## Test Setup

### Environment
- **File**: `chess.html`
- **Bot Difficulty**: Medium (2-ply) - Default setting

### Prerequisites
- Open `chess.html` in browser with Chrome DevTools MCP connected

---

## Test Scenario: Human vs Bot Match

### Test Steps and Results

| Round | White Move | Black Response | Board State Verification |
|-------|------------|----------------|-------------------------|
| 1 | a3 (a-pawn to rank 3) | Na6 (knight to a6) | ✓ Pawn moved, knight responded |
| 2 | f3 (f-pawn to rank 3) | Rb8 (rook to b8) | ✓ Board updated correctly |
| 3 | g3 (g-pawn to rank 3) | Ra8 (rook to a8) | ✓ Legal moves calculated |
| 4 | h4 (h-pawn to rank 4) | Rb8 (rook to b8) | ✓ Bot responded consistently |
| 5 | b3 (b-pawn to rank 3) | Ra8 (rook to a8) | ✓ All pieces positioned correctly |

### MCP Test Script
```javascript
// Navigate to chess.html
navigate_page({ type: 'url', url: 'file:///c:/Users/xinle/code/SPA-notes/chess.html' })

// Click squares using UID references:
// - Select piece: click({ uid: "20_51" })  // a-pawn at row index 6, col 0
// - Target square: click({ uid: "20_43" }) // a3 at row index 5, col 0

// Example move sequence:
click({ uid: "20_51" }); // Select white a-pawn (row 6, col 0)
click({ uid: "20_43" }); // Move to a3 (row 5, col 0)

click({ uid: "20_57" }); // Select white h-pawn (row 6, col 5)  
click({ uid: "20_48" }); // Move to f3 (row 5, col 5)
```

### Square UID Mapping Reference

| Chess Coordinate | Row Index | Col Index | Button UID |
|------------------|-----------|-----------|------------|
| a1 | 7 | 0 | 20_59 |
| b1 | 7 | 1 | 20_60 |
| c1 | 7 | 2 | 20_61 |
| d1 | 7 | 3 | 20_62 |
| e1 | 7 | 4 | 20_63 |
| f1 | 7 | 5 | 20_64 |
| g1 | 7 | 6 | 20_65 |
| h1 | 7 | 7 | 20_66 |
| a8 | 0 | 0 | 20_3 |
| b8 | 0 | 1 | 20_4 |
| c8 | 0 | 2 | 20_5 |
| d8 | 0 | 3 | 20_6 |
| e8 | 0 | 4 | 20_7 |
| f8 | 0 | 5 | 20_8 |
| g8 | 0 | 6 | 20_9 |
| h8 | 0 | 7 | 20_10 |

### Board State Verification
- **Grid ID**: `mcp-board-grid-8x8` ✓
- **Board Size**: 8x8 grid (64 squares) ✓
- **Piece Colors**: White pieces at bottom (row index 6, 7), Black at top (row index 0, 1) ✓
- **Coordinates**: a-h columns and 1-8 rows visible on all edge squares ✓

### Bot Response Verification
| Round | Response | Valid Move |
|-------|----------|------------|
| 1 | Na6 | ✓ Knight moved from b8 to a6 |
| 2 | Rb8 | ✓ Rook moved from c8 to b8 |
| 3 | Ra8 | ✓ Rook moved from h8 to a8 |
| 4 | Rb8 | ✓ Rook moved from a8 to b8 |
| 5 | Ra8 | ✓ Rook moved from b8 to a8 |

### Move History Verification
- **Display Element**: `#mcp-move-history-list` ✓
- **Format**: "[Round]. [WhiteMove] [BlackMove]" ✓
- **Notation Style**: Standard algebraic notation (e.g., "a3", "Na6") ✓

---

## MCP Tool Usage Reference

### navigate_page
```javascript
navigate_page({ type: 'url', url: 'file:///c:/Users/xinle/code/SPA-notes/chess.html' })
```

### click
```javascript
click({ uid: "20_51" })  // Click element by UID
```

### take_snapshot
```javascript
take_snapshot()  // Get current page state and snapshot
```

---

## Notes

- The chess board uses button elements with coordinate labels for MCP compatibility
- Legal moves are calculated and displayed before move execution
- Bot difficulty can be changed via dropdown: `mcp-bot-difficulty-select`