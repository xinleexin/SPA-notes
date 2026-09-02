const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];

// Store references to board squares for efficient updates
const squareMap = {}; // keyed by data-chessCoord

function initRenderBoard() {
    // Derive check purely from the position — no gameActive gate: at checkmate the
    // game is already over (gameActive false) but the mated king must stay highlighted.
    const kingInCheck = chessGame.gameState.isCheck(chessGame.gameState.currentTurn);
    const kingPos = kingInCheck ? chessGame.gameState.findKing(chessGame.gameState.currentTurn) : null;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            // Use BUTTON element instead of DIV for better MCP compatibility
            const square = document.createElement('button');
            
            const isWhiteSquare = (row + col) % 2 === 0;
            square.className = `square ${isWhiteSquare ? 'white' : 'black'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            // Add chess coordinate like "a1", "h8" for easy referencing
            const coord = columns[col] + rows[row];
            square.dataset.chessCoord = coord;
            
            if (chessGame.selectedSquare && chessGame.selectedSquare.row === row && 
                chessGame.selectedSquare.col === col) {
                square.classList.add('selected');
            }

            if (chessGame.legalMoves.some(m => m.row === row && m.col === col)) {
                square.classList.add('legal-move');
            }

            if (chessGame.lastMove) {
                const from = chessGame.lastMove.from;
                const to = chessGame.lastMove.to;

                if ((from.row === row && from.col === col) || (to.row === row && to.col === col)) {
                    square.classList.add('last-move');
                }
            }

            if (kingPos && kingPos.row === row && kingPos.col === col) {
                square.classList.add('in-check');
            }

            // Store reference for future updates
            squareMap[coord] = square;
            
            // Add aria-label with chess coordinate for MCP accessibility
            square.setAttribute('aria-label', coord);

            // Add click handler directly on button
            square.onclick = () => selectSquare(row, col);

            if (col === 0) {
                const rankCoord = document.createElement('span');
                rankCoord.className = 'coord-rank';
                rankCoord.textContent = rows[row];
                square.appendChild(rankCoord);
            }

            if (row === 7) {
                const fileCoord = document.createElement('span');
                fileCoord.className = 'coord-file';
                fileCoord.textContent = columns[col];
                square.appendChild(fileCoord);
            }
            
            // Add aria-label with chess coordinate for MCP accessibility
            square.setAttribute('aria-label', coord);

            const piece = chessGame.board.grid[row][col];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.className = `piece ${piece.color}`;
                pieceSpan.textContent = getPieces(piece.color)[piece.type];
                square.appendChild(pieceSpan);
            }

            chessBoardElement.appendChild(square);
        }
    }
}

function updateRenderBoard() {
    // Derive check purely from the position (see initRenderBoard for why gameActive
    // must not gate this — the mated king keeps its highlight at game over).
    const kingInCheck = chessGame.gameState.isCheck(chessGame.gameState.currentTurn);
    const kingPos = kingInCheck ? chessGame.gameState.findKing(chessGame.gameState.currentTurn) : null;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const coord = columns[col] + rows[row];
            const square = squareMap[coord];

            if (!square) continue; // Skip if not created yet

            // Update selected state
            if (chessGame.selectedSquare && chessGame.selectedSquare.row === row && 
                chessGame.selectedSquare.col === col) {
                square.classList.add('selected');
            } else {
                square.classList.remove('selected');
            }

            // Update legal move indicators
            const isLegalMove = chessGame.legalMoves.some(m => m.row === row && m.col === col);
            if (isLegalMove) {
                square.classList.add('legal-move');
            } else {
                square.classList.remove('legal-move');
            }

            // Update last move indicator
            if (chessGame.lastMove) {
                const from = chessGame.lastMove.from;
                const to = chessGame.lastMove.to;

                if ((from.row === row && from.col === col) || (to.row === row && to.col === col)) {
                    square.classList.add('last-move');
                } else {
                    square.classList.remove('last-move');
                }
            }

            // Update check indicator
            if (kingPos && kingPos.row === row && kingPos.col === col) {
                square.classList.add('in-check');
            } else {
                square.classList.remove('in-check');
            }

            // Update piece display if changed
            const currentPiece = chessGame.board.grid[row][col];
            const existingPieceSpan = square.querySelector('.piece');

            if (currentPiece && !existingPieceSpan) {
                // Piece was added to this square
                const pieceSpan = document.createElement('span');
                pieceSpan.className = `piece ${currentPiece.color}`;
                pieceSpan.textContent = getPieces(currentPiece.color)[currentPiece.type];
                square.appendChild(pieceSpan);
            } else if (!currentPiece && existingPieceSpan) {
                // Piece was removed from this square
                existingPieceSpan.remove();
            } else if (existingPieceSpan && currentPiece) {
                // Piece type/color changed (e.g., promotion)
                existingPieceSpan.className = `piece ${currentPiece.color}`;
                existingPieceSpan.textContent = getPieces(currentPiece.color)[currentPiece.type];
            }
        }
    }
}

function renderBoard() {
    // Check if squares exist (first render vs updates)
    const hasSquares = chessBoardElement.children.length > 0;

    if (!hasSquares) {
        initRenderBoard();
    } else {
        updateRenderBoard();
    }
}

const PIECES = {
    white: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    black: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

function getPieces(color) {
    return PIECES[color];
}

const chessBoardElement = document.getElementById('mcp-board-grid-8x8');
const gameStatusElement = document.getElementById('mcp-status-display');

function updateTakeBackButton() {
    const btn = document.getElementById('mcp-btn-reset-position');
    if (chessGame && chessGame.canUndo()) {
        btn.disabled = false;
        btn.textContent = 'Take Back';
    } else {
        btn.disabled = true;
        btn.textContent = 'No Move to Undo';
    }
}

function renderMoveHistory() {
    const moveHistoryList = document.getElementById('mcp-move-history-list');
    moveHistoryList.innerHTML = '';

    if (chessGame.moveHistory.length === 0) {
        moveHistoryList.innerHTML = '<p class="history-empty">No moves yet</p>';
        return;
    }

    for (let i = 0; i < chessGame.moveHistory.length; i += 2) {
        const row = document.createElement('div');
        row.className = 'history-row';

        const index = document.createElement('div');
        index.className = 'history-index';
        index.textContent = `${Math.floor(i / 2) + 1}.`;

        const whiteMove = document.createElement('div');
        whiteMove.className = 'history-move';
        whiteMove.textContent = chessGame.moveHistory[i]?.notation || '';

        const blackMove = document.createElement('div');
        blackMove.className = 'history-move';
        blackMove.textContent = chessGame.moveHistory[i + 1]?.notation || '';

        row.appendChild(index);
        row.appendChild(whiteMove);
        row.appendChild(blackMove);

        moveHistoryList.appendChild(row);
    }

    moveHistoryList.scrollTop = moveHistoryList.scrollHeight;
    
    // Update Take Back button state after rendering history
    updateTakeBackButton();
}

function updateStatus() {
    if (!chessGame.gameActive) {
        const kingCaptured = chessGame.checkKingCapture();

        if (kingCaptured) {
            gameStatusElement.textContent = `${kingCaptured.charAt(0).toUpperCase() + kingCaptured.slice(1)} wins! (King captured)`;
            gameStatusElement.style.backgroundColor = '#e74c3c';
        } else if (chessGame.gameState.isCheckmate()) {
            const winner = chessGame.gameState.currentTurn === 'white' ? 'Black' : 'White';
            gameStatusElement.textContent = `Checkmate! ${winner} wins!`;
            gameStatusElement.style.backgroundColor = '#e74c3c';
        } else if (chessGame.gameState.isStalemate()) {
            gameStatusElement.textContent = 'Stalemate! Game drawn.';
            gameStatusElement.style.backgroundColor = '#f39c12';
        }

        updateChessClockActive();  // Game over: freeze the clock (no highlighted player)

        return;
    }

    const checkStatus = chessGame.gameState.isCheck(chessGame.gameState.currentTurn) ? ' (CHECK!)' : '';

        // Read current dropdown value at move time to handle difficulty changes during game
        const currentDifficulty = getCurrentDifficulty();

        if (currentDifficulty !== 'none' && chessGame.gameState.currentTurn === 'black' && chessGame.gameActive) {
            gameStatusElement.textContent = `Bot (${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}) is thinking...`;
        gameStatusElement.style.backgroundColor = '#e67e22';
    } else {
        const turnName = chessGame.gameState.currentTurn.charAt(0).toUpperCase() +
                        chessGame.gameState.currentTurn.slice(1);
        gameStatusElement.textContent = `${turnName}'s turn${checkStatus}`;

        if (chessGame.gameState.currentTurn === 'white') { gameStatusElement.style.backgroundColor = '#34495e'; }
        else { gameStatusElement.style.backgroundColor = '#2c3e50'; }
    }
}

// ============================================
// Timer Functions
// ============================================

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

let timerInterval = null;

function startTimer() {
    stopTimer();
    chessGame.currentTurnTime = 0;

    document.getElementById('chessClock').style.display = 'flex';

    if (botDifficulty !== 'none') { document.getElementById('blackClockContainer').style.display = 'none'; }

    updateChessClockDisplay();

    timerInterval = setInterval(() => {
        if (chessGame.currentTurnTime !== null && chessGame.gameActive) {
            chessGame.currentTurnTime++;
            updateChessClockDisplay();
            updateChessClockActive();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    if (chessGame.currentTurnTime !== null && chessGame.gameActive) {
        const playerKey = chessGame.gameState.currentTurn === 'white' ? 'black' : 'white';
        chessGame.currentTime[playerKey] += chessGame.currentTurnTime;
    }

    chessGame.currentTurnTime = null;
    updateChessClockDisplay();
    updateChessClockActive();
}

function updateChessClockDisplay() {
    const turnTime = chessGame.currentTurnTime || 0;
    const whiteTotal = chessGame.currentTime.white +
        (chessGame.gameState.currentTurn === 'white' ? turnTime : 0);
    const blackTotal = chessGame.currentTime.black +
        (chessGame.gameState.currentTurn === 'black' ? turnTime : 0);

    document.getElementById('currentWhiteTime').textContent = formatTime(whiteTotal);
    document.getElementById('currentBlackTime').textContent = formatTime(blackTotal);
}

function updateChessClockActive() {
    const whiteDisplay = document.getElementById('whiteTimeDisplay');
    const blackDisplay = document.getElementById('blackTimeDisplay');

    if (!chessGame.gameActive) {
        // Game over (checkmate / stalemate / king captured): freeze — no active player
        whiteDisplay.classList.remove('active');
        blackDisplay.classList.remove('active');
        return;
    }

    if (chessGame.gameState.currentTurn === 'white') {
        whiteDisplay.classList.add('active');
        blackDisplay.classList.remove('active');
    } else {
        blackDisplay.classList.add('active');
        whiteDisplay.classList.remove('active');
    }
}
