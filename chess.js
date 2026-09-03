// ============================================
// CHESS GAME SPA - Game + UI
// Core engine classes (Piece, ChessBoard, GameState, createPiece) now live in
// chess-core.js, which is loaded before this file. This file keeps the ChessGame
// class and all DOM/UI logic.
// ============================================

class MCPDialog {
    constructor() { this.overlay = null; this.container = null; this.resolvePromise = null; this.rejectPromise = null; }
    showConfirm(message, title) {
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            if (!this.overlay) {
                this.overlay = document.createElement('div');
                this.overlay.className = 'mcp-dialog-overlay';
                this.container = document.createElement('div');
                this.container.className = 'mcp-dialog-container';
                const header = document.createElement('div'); header.className = 'mcp-dialog-header';
                const titleEl = document.createElement('h2'); titleEl.className = 'mcp-dialog-title';
                const messageEl = document.createElement('p'); messageEl.className = 'mcp-dialog-message';
                const actions = document.createElement('div'); actions.className = 'mcp-dialog-actions';
                const btnYes = document.createElement('button'); btnYes.className = 'btn btn-primary'; btnYes.textContent = 'Yes';
                btnYes.onclick = () => this.close(true);
                const btnNo = document.createElement('button'); btnNo.className = 'btn btn-danger'; btnNo.textContent = 'No';
                btnNo.onclick = () => this.close(false);
                actions.appendChild(btnYes); actions.appendChild(btnNo);
                header.appendChild(titleEl); header.appendChild(messageEl);
                this.container.appendChild(header); this.container.appendChild(actions);
                this.overlay.appendChild(this.container);
                document.body.appendChild(this.overlay);
            }
            const titleEl = this.container.querySelector('.mcp-dialog-title');
            const messageEl = this.container.querySelector('.mcp-dialog-message');
            if (title) { titleEl.textContent = title; } else { titleEl.style.display = 'none'; }
            messageEl.textContent = message;
            this.overlay.style.display = 'flex';
        });
    }
    close(result) {
        if (this.resolvePromise) { this.resolvePromise(result); this.resolvePromise = null; }
        if (this.overlay) { this.overlay.style.display = 'none'; }
    }
    showPromotionChoice(color) {
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            if (!this.overlay) {
                this.overlay = document.createElement('div'); this.overlay.className = 'mcp-dialog-overlay';
                this.container = document.createElement('div'); this.container.className = 'mcp-dialog-container';
                const header = document.createElement('div'); header.className = 'mcp-dialog-header';
                const titleEl = document.createElement('h2'); titleEl.className = 'mcp-dialog-title'; titleEl.textContent = 'Choose Promotion';
                const messageEl = document.createElement('p'); messageEl.className = 'mcp-dialog-message';
                const optionsContainer = document.createElement('div'); optionsContainer.className = 'promotion-options';

                ['q', 'r', 'b', 'n'].forEach(type => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'promotion-option piece ' + color;
                    const piecesMap = { white: { q: '♕', r: '♖', b: '♗', n: '♘' }, black: { q: '♛', r: '♜', b: '♝', n: '♞' } };
                    optionDiv.textContent = piecesMap[color][type];
                    optionDiv.onclick = () => this.closePromotion(type);
                    optionsContainer.appendChild(optionDiv);
                });

                const actions = document.createElement('div'); actions.className = 'mcp-dialog-actions';
                const btnCancel = document.createElement('button'); btnCancel.className = 'btn btn-secondary'; btnCancel.textContent = 'Cancel';
                btnCancel.onclick = () => this.closePromotion(null);

                header.appendChild(titleEl); header.appendChild(messageEl);
                this.container.appendChild(header); this.container.appendChild(optionsContainer); this.container.appendChild(actions);
                this.overlay.appendChild(this.container);
                document.body.appendChild(this.overlay);
            }
            this.overlay.style.display = 'flex';
        });
    }
    closePromotion(choice) {
        if (this.resolvePromise) { this.resolvePromise(choice); this.resolvePromise = null; }
        if (this.overlay) { this.overlay.style.display = 'none'; }
    }
}

class ChessGame {
    constructor(board) {
        this.board = board || (window.board || new ChessBoard());
        this.gameState = new GameState(this.board);
        this.dialog = new MCPDialog();
        this.botAI = null;
        this._botWorker = null;
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => { this._terminateBotWorker(); });
        }
        this.selectedSquare = null;
        this.legalMoves = [];
        this.moveHistory = [];
        this.gameActive = true;
        this.lastMove = null;
        this.currentTurnTime = null;
        this.currentTime = { white: 0, black: 0 };
        this.timerInterval = null;
        this.botDifficulty = 'medium';
    }

    async init(botDifficulty) {
        console.log('[ChessGame.init] Starting...');
        try {
            await this.createNewGame();
            this.botAI = new BotAI(botDifficulty);
            this.botDifficulty = botDifficulty;
            console.log('[ChessGame.init] Completed');
        } catch (e) { console.error('[ChessGame.init] Error:', e); }
    }

    async createNewGame() {
        console.log('[ChessGame.createNewGame] Starting...');
        try {
            this._terminateBotWorker();
            localStorage.removeItem('chessGame');
            this.board.initializeBoard();
            this.gameState = new GameState(this.board);
            this.selectedSquare = null;
            this.legalMoves = [];
            this.moveHistory = [];
            this.gameActive = true;
            this.lastMove = null;

            this.currentTime = { white: 0, black: 0 };
            this.currentTurnTime = null;
            stopTimer();

            await autoSave();
            renderBoard();
            renderMoveHistory();
            updateStatus();
        } catch (e) { console.error('[ChessGame.createNewGame] Error:', e); }
    }

    // ============================================
    // Bot AI Web Worker (off-thread 'hard' search)
    // ============================================

    _getBotWorker() {
        if (this._botWorker) return this._botWorker;
        this._botWorker = new Worker('bot-worker.js');
        this._botWorker.onerror = (e) => {
            console.error('[ChessGame] Bot worker error:', e.message);
            this._botWorker = null;
        };
        return this._botWorker;
    }

    _terminateBotWorker() {
        if (this._botWorker) {
            try { this._botWorker.terminate(); } catch (e) { /* ignore */ }
            this._botWorker = null;
        }
    }

    /**
     * Ask the off-thread worker for the best 'hard' move. Resolves to
     * { type:'move', from, to, _depth, _ms, _nodes } or rejects (worker unavailable,
     * timeout, or illegal move) so the caller can fall back to the synchronous engine.
     */
    _searchWithWorker() {
        return new Promise((resolve, reject) => {
            let worker;
            try { worker = this._getBotWorker(); } catch (e) { reject(e); return; }
            if (!worker) { reject(new Error('worker unavailable')); return; }

            const self = this;
            const payload = {
                cmd: 'search',
                board: this.board.copyGrid(),
                turn: this.gameState.currentTurn,
                castlingRights: this.gameState.castlingRights,
                enPassantTarget: this.gameState.enPassantTarget,
                whiteKingPos: this.gameState.whiteKingPos,
                blackKingPos: this.gameState.blackKingPos,
                moveHistory: this.moveHistory,
                maxDepth: 4,
                timeBudgetMs: 400
            };

            const timeout = setTimeout(() => {
                self._terminateBotWorker();
                reject(new Error('worker search timed out'));
            }, 2500);

            const onMessage = (ev) => {
                const d = ev.data;
                worker.removeEventListener('message', onMessage);
                clearTimeout(timeout);
                if (d && d.cmd === 'result' && d.from && d.to) {
                    // Validate the move is actually legal before applying it.
                    const legal = self.gameState.getLegalMoves(self.board, d.from.row, d.from.col);
                    const ok = legal.some(m => m.row === d.to.row && m.col === d.to.col);
                    if (ok) {
                        resolve({ type: 'move', from: d.from, to: d.to, _depth: d.depth, _ms: d.ms, _nodes: d.nodes });
                    } else {
                        self._terminateBotWorker();
                        reject(new Error('worker returned illegal move'));
                    }
                } else {
                    self._terminateBotWorker();
                    reject(new Error((d && d.message) ? d.message : 'no result from worker'));
                }
            };

            worker.addEventListener('message', onMessage);
            worker.postMessage(payload);
        });
    }

    async resetToStartingPosition() {
        console.log('[ChessGame.resetToStartingPosition] Starting...');
        try {
            localStorage.removeItem('chessGame');
            this.moveHistory = [];
            this.board.initializeBoard();
            this.gameState.enPassantTarget = null;
            this.gameState.castlingRights = {
                whiteKingMoved: false, blackKingMoved: false,
                whiteRookKingSideMoved: false, whiteRookQueenSideMoved: false,
                blackRookKingSideMoved: false, blackRookQueenSideMoved: false
            };
            this.gameState.whiteKingPos = { row: 7, col: 4 };
            this.gameState.blackKingPos = { row: 0, col: 4 };

            this.currentTime = { white: 0, black: 0 };
            this.currentTurnTime = null;
            stopTimer();

            await autoSave();
            renderBoard();
        } catch (e) { console.error('[ChessGame.resetToStartingPosition] Error:', e); }
    }

    async undoLastMove() {
        console.log('[ChessGame.undoLastMove] Starting...');
        
        if (this.moveHistory.length === 0) return;
        
        // For bot games, check if we have at least 2 moves to undo
        const isBotGame = this.botAI !== null && this.botDifficulty !== 'none';
        const minMovesNeeded = isBotGame ? 2 : 1;
        
        if (this.moveHistory.length < minMovesNeeded) {
            console.log('[ChessGame.undoLastMove] Not enough moves to undo');
            return;
        }
        
        // Pre-validate every move that would be undone so the undo is all-or-nothing
        // (canUndo() already gates the button, but undoLastMove() can be called directly)
        for (let i = this.moveHistory.length - minMovesNeeded; i < this.moveHistory.length; i++) {
            const move = this.moveHistory[i];
            if (move.piece.type === 'k' || move.piece.type === 'r' ||
                move.to.isCastling === 'kingside' || move.to.isCastling === 'queenside') {
                console.log('[ChessGame.undoLastMove] King/rook/castling in moves to undo - aborting');
                return;
            }
        }
        
        // Clock: the in-flight seconds belong to the side that was to move when
        // the take-back was pressed (take-back does not roll time back).
        const pendingTurn = this.gameState.currentTurn;

        // Undo the last move(s)
        let undoneCount = 0;
        while (undoneCount < minMovesNeeded && this.moveHistory.length > 0) {
            const lastMove = this.moveHistory.pop();
            const piece = lastMove.piece;
            const targetPiece = lastMove.captured || null;
            
            // Move piece back to source square
            this.board.grid[lastMove.from.row][lastMove.from.col] = piece;
            this.board.grid[lastMove.to.row][lastMove.to.col] = targetPiece;
            
            // Handle en passant - restore captured pawn
            if (lastMove.to.isEnPassant) {
                const capturedPawnRow = lastMove.color === 'white' ? lastMove.to.row + 1 : lastMove.to.row - 1;
                this.board.grid[capturedPawnRow][lastMove.to.col] = new Pawn(lastMove.color === 'white' ? 'black' : 'white');
            }
            
            // Restore castling rights for the moved piece
            if (piece.type === 'r') {
                const colorKey = piece.color === 'white' ? 
                    (lastMove.from.row === 7 && lastMove.from.col === 0 ? 'whiteRookQueenSideMoved' : 'whiteRookKingSideMoved') :
                    (lastMove.from.row === 0 && lastMove.from.col === 0 ? 'blackRookQueenSideMoved' : 'blackRookKingSideMoved');
                this.gameState.castlingRights[colorKey] = false;
            }
            
            // Restore king position
            if (piece.type === 'k') {
                const colorKey = piece.color === 'white' ? 'whiteKingPos' : 'blackKingPos';
                this.gameState.whiteKingPos = { row: 7, col: 4 };
                this.gameState.blackKingPos = { row: 0, col: 4 };
            }
            
            // Restore enPassantTarget
            if (lastMove.to.isDoublePawn) {
                this.gameState.enPassantTarget = { 
                    row: Math.floor((lastMove.from.row + lastMove.to.row) / 2), 
                    col: lastMove.from.col 
                };
            } else {
                this.gameState.enPassantTarget = null;
            }
            
            // Switch turn back
            this.gameState.switchTurn();
            undoneCount++;
        }
        
        this.lastMove = null;
        this.gameActive = true;

        // Settle the in-flight seconds to the side that was to move before the
        // take-back (their time is not rolled back); the taking side starts a
        // fresh 00:00 turn.
        settleClockTurn(pendingTurn);
        
        await autoSave();
        renderBoard();
        renderMoveHistory();  // Update move history display
        updateStatus();  // Refresh status (e.g. clears a stale "Checkmate!" banner after take-back)
        updateChessClockActive();  // Highlight the side to move after the turn flipped back
        // The clock's running tick (started by init) resumes automatically since
        // gameActive is true again; no timer restart needed here.
    }

    canUndo() {
        // For bot games, disable Take Back while bot is thinking
        if (this.botAI !== null && this.botDifficulty !== 'none') {
            const currentTurn = this.gameState.currentTurn;
            if (currentTurn === 'black') { 
                console.log('[ChessGame.canUndo] Bot is thinking - disabled');
                return false; 
            }
        }
        
        if (this.moveHistory.length === 0) { 
            console.log('  NO: no moves'); return false; 
        }
        
        // For bot games, the undo covers the bot's move AND the human's previous move,
        // so every move that would be undone must be undoable (no king/rook moves or castling)
        const isBotGame = this.botAI !== null && this.botDifficulty !== 'none';
        const movesToCheck = isBotGame ? 2 : 1;
        console.log('[ChessGame.canUndo] Checking...', this.moveHistory.length, 'moves (need', movesToCheck + ')');
        
        if (this.moveHistory.length < movesToCheck) { 
            console.log('  NO: not enough moves'); return false; 
        }
        
        for (let i = this.moveHistory.length - movesToCheck; i < this.moveHistory.length; i++) {
            const move = this.moveHistory[i];
            if (move.piece.type === 'k' || move.piece.type === 'r' ||
                move.to.isCastling === 'kingside' || move.to.isCastling === 'queenside') {
                console.log('  NO: king/rook/castling move at index', i);
                return false;
            }
        }
        
        console.log('  YES: can undo');
        return true;
    }
    async executeMove(from, to) {
        const piece = this.board.grid[from.row][from.col];
        const targetPiece = this.board.grid[to.row][to.col];
        const mover = this.gameState.currentTurn;  // the side whose clock is running right now

        if (to.isEnPassant) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            this.board.grid[capturedPawnRow][to.col] = null;
        }

        if (to.isCastling === 'kingside') {
            const rookRow = from.row;
            this.board.grid[rookRow][5] = this.board.grid[rookRow][7];
            this.board.grid[rookRow][7] = null;
            const colorKey = piece.color === 'white' ? 'whiteRookKingSideMoved' : 'blackRookKingSideMoved';
            this.gameState.castlingRights[colorKey] = true;
        } else if (to.isCastling === 'queenside') {
            const rookRow = from.row;
            this.board.grid[rookRow][3] = this.board.grid[rookRow][0];
            this.board.grid[rookRow][0] = null;
            const colorKey = piece.color === 'white' ? 'whiteRookQueenSideMoved' : 'blackRookQueenSideMoved';
            this.gameState.castlingRights[colorKey] = true;
        }

        if (piece.type === 'r') {
            const whiteQueenside = piece.color === 'white' && from.row === 7 && from.col === 0;
            const whiteKingside = piece.color === 'white' && from.row === 7 && from.col === 7;
            const blackQueenside = piece.color === 'black' && from.row === 0 && from.col === 0;
            const blackKingside = piece.color === 'black' && from.row === 0 && from.col === 7;

            if (piece.color === 'white') {
                this.gameState.castlingRights.whiteRookQueenSideMoved |= whiteQueenside;
                this.gameState.castlingRights.whiteRookKingSideMoved |= whiteKingside;
            } else {
                this.gameState.castlingRights.blackRookQueenSideMoved |= blackQueenside;
                this.gameState.castlingRights.blackRookKingSideMoved |= blackKingside;
            }
        }

        if (piece.type === 'k') {
            const colorKey = piece.color === 'white' ? 'whiteKingMoved' : 'blackKingMoved';
            this.gameState.castlingRights[colorKey] = true;
            if (piece.color === 'white') { this.gameState.whiteKingPos = { row: to.row, col: to.col }; }
            else { this.gameState.blackKingPos = { row: to.row, col: to.col }; }
        }

        this.board.grid[to.row][to.col] = piece;
        this.board.grid[from.row][from.col] = null;

        if (piece.type === 'p') {
            const lastRowWhite = 0;
            const lastRowBlack = 7;
            
            if (to.row === lastRowWhite || to.row === lastRowBlack) {
                this.board.grid[to.row][to.col] = new Queen(piece.color);
            }
        }

        if (to.isDoublePawn) {
            this.gameState.enPassantTarget = { row: Math.floor((from.row + to.row) / 2), col: from.col };
        } else { this.gameState.enPassantTarget = null; }

        // Settle the clock: credit the in-flight seconds to the side that just
        // moved. If this move ends the game, the tick (gated on gameActive)
        // stops, so the mated/stalemated side never accrues further time.
        settleClockTurn(mover);

        // Switch turn before recordMove and game over checks
        this.gameState.switchTurn();

        recordMove(from, to, piece, targetPiece);
        this.lastMove = { from, to };

        if (this.checkKingCapture()) {
            this.gameActive = false;
            updateStatus();
        } else if (this.gameState.isCheckmate()) {
            this.gameActive = false;
            updateStatus();
        } else if (this.gameState.isStalemate()) {
            this.gameActive = false;
            updateStatus();
        }

        // Sync the clock right after the turn flip (the interval tick would
        // otherwise refresh the active highlight up to a second later).
        updateChessClockDisplay();
        updateChessClockActive();

        try { await autoSave(); } catch (e) { console.error('[executeMove] AutoSave error:', e); }
        
        deselectAll();
        renderMoveHistory();

        // Clock lifecycle: one interval is started by init()/the difficulty handler;
        // its tick is gated on chessGame.gameActive, so the clock freezes automatically
        // when this move ends the game. (Note: chessGame.botAI is never null — even in
        // 'none' mode — so key clock decisions off botDifficulty, not botAI.)

        // Read current dropdown value at move time to handle difficulty changes during game
        const currentDifficulty = getCurrentDifficulty();

        if (currentDifficulty !== 'none' && this.gameState.currentTurn === 'black' && this.gameActive) {
            const self = this;
            const useWorker = currentDifficulty === 'hard' && typeof Worker !== 'undefined';
            setTimeout(() => {
                const finish = (result) => {
                    console.log('[ChessGame.executeMove] Bot result:', result);
                    if (result.type === 'checkmate') { self.gameActive = false; updateStatus(); updateTakeBackButton(); }
                    else if (result.type === 'stalemate') { self.gameActive = false; updateStatus(); updateTakeBackButton(); }
                    else if (result.from && result.to) {
                        const detail = (result._depth !== undefined) ? ` (depth=${result._depth}, ${result._ms}ms)` : '';
                        console.log('[ChessGame.executeMove] Executing bot move' + detail);
                        self.executeMove(result.from, result.to);
                    }
                };
                const runSynchronous = () => {
                    const bot = new BotAI(currentDifficulty);
                    finish(bot.makeMove(self));
                };
                if (useWorker) {
                    self._searchWithWorker().then(finish).catch((e) => {
                        console.warn('[ChessGame.executeMove] Worker search failed, falling back:', (e && e.message) || e);
                        runSynchronous();
                    });
                } else {
                    runSynchronous();
                }
            }, 500);
        }
    }

    checkKingCapture() {
        const whiteKingPos = this.gameState.findKing('white');
        const blackKingPos = this.gameState.findKing('black');

        if (!whiteKingPos) return 'black';
        if (!blackKingPos) return 'white';
        return null;
    }

    getLegalMoves(board, row, col) { return this.gameState.getLegalMoves(board, row, col); }
}
