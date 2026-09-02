// ============================================
// CHESS GAME SPA - Initialization Code
// ============================================

// Set to true to restore per-click debug logging (used by MCP test scenarios)
const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log(...args); };

const initialBotDifficulties = {
    'none': 'none',
    'easy': 'easy', 
    'medium': 'medium',
    'hard': 'hard'
};

// Read the currently-selected bot difficulty from the dropdown. Single source of
// truth for what was previously copy-pasted as
// `initialBotDifficulties[...value] || 'medium'` in several places.
function getCurrentDifficulty() {
    const select = document.getElementById('mcp-bot-difficulty-select');
    return initialBotDifficulties[select?.value] || 'medium';
}

let botDifficulty = getCurrentDifficulty();

// MCP Test API - Direct function calls for reliable testing
window.chessMCP = {
    clickSquare: (row, col) => selectSquare(row, col),
    executeMove: (fromRow, fromCol, toRow, toCol) => {
        // Validate the move first — unlike selectSquare(), this API is called
        // directly, and applying an illegal move corrupts the board (no engine check).
        const piece = chessGame.board.getPiece(fromRow, fromCol);
        const legal = piece ? chessGame.getLegalMoves(chessGame.board, fromRow, fromCol) : [];
        const move = legal.find(m => m.row === toRow && m.col === toCol);
        if (!move) {
            console.warn(`[chessMCP.executeMove] Rejected illegal move (${fromRow},${fromCol}) -> (${toRow},${toCol})`);
            return;
        }
        return chessGame.executeMove({ row: fromRow, col: fromCol }, { row: toRow, col: toCol });
    },
    getBoardState: () => chessGame.board.grid,
    getCurrentTurn: () => chessGame.gameState.currentTurn,
    getLegalMovesForSquare: (row, col) => chessGame.getLegalMoves(chessGame.board, row, col)
};

function selectSquare(row, col) {
    log('[SELECT_SQUARE] Clicked:', { row, col });

    if (!chessGame.gameActive) { 
        log('[SELECT_SQUARE] Game not active - returning'); 
        return; 
    }

    const piece = chessGame.board.getPiece(row, col);
    const currentTurn = chessGame.gameState.currentTurn;

    log('[SELECT_SQUARE] Piece:', piece ? { type: piece.type, color: piece.color } : 'null', '| Current turn:', currentTurn);

    if (piece && piece.color === currentTurn) {
        log('[SELECT_SQUARE] Selected own piece - setting selectedSquare and legalMoves');
        chessGame.selectedSquare = { row, col };
        const moves = chessGame.getLegalMoves(chessGame.board, row, col);
        chessGame.legalMoves = moves;
        log('[SELECT_SQUARE] Legal moves:', moves.length > 0 ? moves : 'none', '| selectedSquare:', chessGame.selectedSquare);
        
        // Force re-render to show visual updates
        renderBoard();
        updateStatus(); // Update status in case of check

        return;
    }

    if (chessGame.selectedSquare) {
        const move = chessGame.legalMoves.find(m => m.row === row && m.col === col);
        log('[SELECT_SQUARE] Looking for legal move in selectedSquare:', { found: !!move, move });

        if (move) {
            log('[SELECT_SQUARE] Executing move from', chessGame.selectedSquare, 'to', move);
            chessGame.executeMove(chessGame.selectedSquare, move);
            return;
        } else {
            log('[SELECT_SQUARE] Clicked non-legal square - deselecting');
            deselectAll();
            return;
        }
    }

    // Deselect if clicking on empty square or invalid
    deselectAll();
}

function deselectAll() {
    log('[DESELECT_ALL] Clearing selection');
    chessGame.selectedSquare = null;
    chessGame.legalMoves = [];
    renderBoard();
    updateStatus();
}

function recordMove(from, to, piece, captured) {
    let notation = '';
    if (piece.type !== 'p') { notation += piece.type.toUpperCase(); }
    if (captured || to.isEnPassant) {
        if (piece.type === 'p') notation += columns[from.col];
        notation += '×';
    }
    notation += columns[to.col] + rows[to.row];

    // Pawn promotion is always auto-queen (see executeMove) — show it in the notation
    if (piece.type === 'p' && (to.row === 0 || to.row === 7)) notation += '=Q';

    const opponentColor = piece.color === 'white' ? 'black' : 'white';

    if (chessGame.gameState.isCheck(opponentColor)) {
        if (chessGame.gameState.isCheckmate()) { notation += '#'; }
        else { notation += '+'; }
    }

    if (to.isCastling === 'kingside') notation = 'O-O';
    if (to.isCastling === 'queenside') notation = 'O-O-O';

    chessGame.moveHistory.push({
        turn: chessGame.moveHistory.length + 1,
        color: piece.color,
        from: { row: from.row, col: from.col },
        to: { row: to.row, col: to.col },
        piece: piece,
        captured: captured,
        notation: notation
    });
}

// ============================================
// Initialization and Event Listeners
// ============================================

function setupEventListeners() {
    document.getElementById('mcp-btn-new-game').addEventListener('click', async () => {
        const confirmed = await chessGame.dialog.showConfirm(
            'Start a new game? Current progress will be lost.',
            'New Game'
        );

        if (confirmed) {
            await chessGame.createNewGame();

            document.getElementById('blackClockContainer').style.display =
                botDifficulty === 'none' ? 'block' : 'none';

            if (botDifficulty === 'none') { startTimer(); }
        }
    });

    document.getElementById('mcp-btn-save-game').addEventListener('click', saveGame);
    document.getElementById('mcp-btn-load-game').addEventListener('click', loadGame);

    // Take Back button - undo last move(s)
    document.getElementById('mcp-btn-reset-position').addEventListener('click', async () => {
        await chessGame.undoLastMove();
        updateTakeBackButton();
    });

    let isResizing = false;
    let startX, startWidth;

    const resizeHandle = document.getElementById('resizeHandle');

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = document.querySelector('.board-panel').offsetWidth;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const dx = e.clientX - startX;
        const newWidth = Math.max(300, Math.min(window.innerWidth - 350, startWidth + dx));
        document.querySelector('.board-panel').style.flex = `0 0 ${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = '';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { deselectAll(); }
        else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveGame();
        } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            loadGame();
        } else if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();

            chessGame.dialog.showConfirm('Start a new game?', 'New Game')
                .then(confirmed => {
                    if (confirmed) {
                        chessGame.createNewGame();

                        document.getElementById('blackClockContainer').style.display =
                            botDifficulty === 'none' ? 'block' : 'none';

                        if (botDifficulty === 'none') { startTimer(); }
                    }
                });
        }
    });

    const blackClockContainer = document.getElementById('blackClockContainer');

    document.getElementById('mcp-bot-difficulty-select').addEventListener('change', async (e) => {
        botDifficulty = e.target.value;
        
        // Update chessGame.botDifficulty to ensure it reflects current difficulty
        if (chessGame && chessGame.botAI !== null) {
            chessGame.botDifficulty = botDifficulty;
        }

        if (botDifficulty !== 'none') { blackClockContainer.style.display = 'none'; }
        else {
            blackClockContainer.style.display = 'block';
            if (chessGame.gameActive) { startTimer(); }  // Don't start a clock on an already-finished game
        }

        await autoSave();
    });
}

async function init() {
    console.log('[INIT] Starting initialization...');
    
    // Update bot difficulty from dropdown to ensure consistency
    botDifficulty = getCurrentDifficulty();

    console.log('[INIT] Bot difficulty:', botDifficulty);
    setupEventListeners();

    // Capture any saved state BEFORE chessGame.init() — its createNewGame() removes
    // the localStorage key, so it must be read up front to survive the reset.
    const savedState = localStorage.getItem('chessGame');

    console.log('[INIT] Calling chessGame.init...');
    await chessGame.init(botDifficulty);
    console.log('[INIT] chessGame.init completed');

    // Restore any saved game — chessGame.init() always starts fresh, so a saved
    // position (including a finished one) must be re-applied on top of it.
    loadFromLocalStorage(savedState);

    document.getElementById('blackClockContainer').style.display =
        botDifficulty === 'none' ? 'block' : 'none';

    if (botDifficulty === 'none' && chessGame.gameActive) { startTimer(); }  // Not on a restored finished game
}

const initAsync = async () => {
    console.log('[INITASYNC] Starting initialization...');

    try {
        const sharedBoard = new ChessBoard();
        window.board = sharedBoard;

        console.log('[INITASYNC] Created shared board');

        chessGame = new ChessGame();
        window.chessGame = chessGame;

        console.log('[INITASYNC] Created chessGame, calling init()...');
        await init();
        console.log('[INITASYNC] Initialization complete');
    } catch (e) { console.error('[INITASYNC] Error:', e); }
};
initAsync();
