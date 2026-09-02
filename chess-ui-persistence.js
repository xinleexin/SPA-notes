// ============================================
// Persistence Functions
// ============================================

const STORAGE_KEY = 'chessGame';

async function autoSave() {
    // Reuse getGameState() as the single serializer for the save format.
    const state = getGameState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function saveGame() {
    const state = await getGameState();

    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `chess-game-${timestamp}.json`;

    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{ description: 'Chess Game', accept: { 'application/json': ['.json'] } }]
            });

            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            URL.revokeObjectURL(url);
            return;
        } catch (err) {
            // User canceled or API not available, fall back to blob download
        }
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

async function loadGame() {
    if (window.showOpenFilePicker) {
        try {
            const handles = await window.showOpenFilePicker({
                multiple: false,
                types: [{ description: 'Chess Game', accept: { 'application/json': ['.json'] } }]
            });

            if (handles.length > 0) {
                const handle = handles[0];
                const file = await handle.getFile();
                const text = await file.text();

                loadFromSaved(text);
                renderBoard();
                renderMoveHistory();
                updateStatus();
            }
        } catch (err) {
            // User canceled or API error
        }

        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
        const file = e.target.files[0];

        if (file) {
            const text = await file.text();
            loadFromSaved(text);

            renderBoard();
            renderMoveHistory();
            updateStatus();
        }
    };

    input.click();
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
        loadFromSaved(saved);
        renderBoard();
        renderMoveHistory();
        updateStatus();
    } else {
        chessGame.init(botDifficulty);

        document.getElementById('blackClockContainer').style.display = 'block';

        if (botDifficulty === 'none') { startTimer(); }
    }
}

function loadFromSaved(savedData) {
    const state = JSON.parse(savedData);

    chessGame.board.grid = state.board.map(row =>
        row.map(pieceData => pieceData ? createPiece(pieceData.type, pieceData.color) : null)
    );

    chessGame.gameState.currentTurn = state.gameState.currentTurn;
    chessGame.gameState.enPassantTarget = state.gameState.enPassantTarget;
    chessGame.gameState.castlingRights = { ...state.gameState.castlingRights };
    chessGame.gameState.whiteKingPos = { ...state.gameState.whiteKingPos };
    chessGame.gameState.blackKingPos = { ...state.gameState.blackKingPos };

    chessGame.selectedSquare = state.selectedSquare;
    chessGame.legalMoves = state.legalMoves;
    chessGame.moveHistory = state.moveHistory;
    chessGame.gameActive = state.gameActive;
    chessGame.lastMove = state.lastMove;

    botDifficulty = state.botDifficulty !== undefined ? state.botDifficulty : 'medium';
    
    // Update dropdown to match loaded difficulty
    const selectElement = document.getElementById('mcp-bot-difficulty-select');
    if (selectElement) {
        selectElement.value = botDifficulty;
    }
    
    chessGame.currentTime = { ...state.currentTime };
    chessGame.currentTurnTime = null;

    stopTimer();
    
    updateTakeBackButton();
}

function getGameState() {
    return {
        board: chessGame.board.copyGrid(),
        gameState: {
            currentTurn: chessGame.gameState.currentTurn,
            enPassantTarget: chessGame.gameState.enPassantTarget,
            castlingRights: { ...chessGame.gameState.castlingRights },
            whiteKingPos: { ...chessGame.gameState.whiteKingPos },
            blackKingPos: { ...chessGame.gameState.blackKingPos }
        },
        selectedSquare: chessGame.selectedSquare,
        legalMoves: chessGame.legalMoves,
        moveHistory: chessGame.moveHistory,
        gameActive: chessGame.gameActive,
        lastMove: chessGame.lastMove,
        botDifficulty: botDifficulty,
        currentTime: { ...chessGame.currentTime },
        currentTurnTime: chessGame.currentTurnTime
    };
}
