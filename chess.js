// ============================================
// CHESS GAME SPA - Core Classes
// ============================================

class Piece {
    constructor(type, color) { this.type = type; this.color = color; }
    getType() { return this.type; }
    getColor() { return this.color; }
    isValidPosition(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
    getPseudoLegalMoves(board, gameState, row, col) {
        throw new Error('getPseudoLegalMoves must be implemented by subclass');
    }
}

class Pawn extends Piece {
    constructor(color) { super('p', color); }
    getPseudoLegalMoves(board, gameState, row, col) {
        const moves = [];
        const direction = this.color === 'white' ? -1 : 1;
        const startRow = this.color === 'white' ? 6 : 1;

        if (board.isEmpty(row + direction, col)) {
            moves.push({ row: row + direction, col: col });
            if (row === startRow && board.isEmpty(row + direction * 2, col)) {
                moves.push({ row: row + direction * 2, col: col, isDoublePawn: true });
            }
        }

        const captureOffsets = [-1, 1];
        for (const offset of captureOffsets) {
            if (board.isOpponentPiece(row + direction, col + offset, this.color)) {
                moves.push({ row: row + direction, col: col + offset });
            } else if (gameState.enPassantTarget &&
                       gameState.enPassantTarget.row === row + direction &&
                       gameState.enPassantTarget.col === col + offset) {
                moves.push({ row: row + direction, col: col + offset, isEnPassant: true });
            }
        }
        return moves;
    }
}

class Knight extends Piece {
    constructor(color) { super('n', color); }
    getPseudoLegalMoves(board, gameState, row, col) {
        const moves = [];
        const knightOffsets = [
            { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
            { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
            { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
            { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
        ];
        for (const offset of knightOffsets) {
            const targetRow = row + offset.dr;
            const targetCol = col + offset.dc;
            if (this.isValidPosition(targetRow, targetCol)) {
                if (board.isEmpty(targetRow, targetCol) || board.isOpponentPiece(targetRow, targetCol, this.color)) {
                    moves.push({ row: targetRow, col: targetCol });
                }
            }
        }
        return moves;
    }
}

class SlidingPiece extends Piece {
    constructor(type, color) { super(type, color); }
    getSlidingMoves(board, gameState, row, col, directions) {
        const moves = [];
        for (const d of directions) {
            let r = row + d.dr, c = col + d.dc;
            while (this.isValidPosition(r, c)) {
                if (board.isEmpty(r, c)) { moves.push({ row: r, col: c }); }
                else if (board.isOpponentPiece(r, c, this.color)) {
                    moves.push({ row: r, col: c });
                    break;
                } else { break; }
                r += d.dr; c += d.dc;
            }
        }
        return moves;
    }
}

class Rook extends SlidingPiece { constructor(color) { super('r', color); }
    getPseudoLegalMoves(board, gameState, row, col) {
        const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        return this.getSlidingMoves(board, gameState, row, col, directions);
    }
}
class Bishop extends SlidingPiece { constructor(color) { super('b', color); }
    getPseudoLegalMoves(board, gameState, row, col) {
        const directions = [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }];
        return this.getSlidingMoves(board, gameState, row, col, directions);
    }
}
class Queen extends SlidingPiece { constructor(color) { super('q', color); }
    getPseudoLegalMoves(board, gameState, row, col) {
        const directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                            { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }];
        return this.getSlidingMoves(board, gameState, row, col, directions);
    }
}

class King extends Piece {
    constructor(color) { super('k', color); }
    getPseudoLegalMoves(board, gameState, row, col) {
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const targetRow = row + dr, targetCol = col + dc;
                if (this.isValidPosition(targetRow, targetCol)) {
                    if (board.isEmpty(targetRow, targetCol) || board.isOpponentPiece(targetRow, targetCol, this.color)) {
                        moves.push({ row: targetRow, col: targetCol });
                    }
                }
            }
        }

        const colorKey = this.color === 'white' ? 'whiteKingMoved' : 'blackKingMoved';
        if (!gameState.castlingRights[colorKey] &&
            !gameState.isSquareUnderAttack(board, row, col, this.color === 'white' ? 'black' : 'white')) {
            const kingsideRookMoved = this.color === 'white'
                ? gameState.castlingRights.whiteRookKingSideMoved
                : gameState.castlingRights.blackRookKingSideMoved;
            if (!kingsideRookMoved && board.isEmpty(row, 5) && board.isEmpty(row, 6)) {
                if (!gameState.isSquareUnderAttack(board, row, 5, this.color === 'white' ? 'black' : 'white') &&
                    !gameState.isSquareUnderAttack(board, row, 6, this.color === 'white' ? 'black' : 'white')) {
                    moves.push({ row: row, col: 6, isCastling: 'kingside' });
                }
            }

            const queensideRookMoved = this.color === 'white'
                ? gameState.castlingRights.whiteRookQueenSideMoved
                : gameState.castlingRights.blackRookQueenSideMoved;
            if (!queensideRookMoved && board.isEmpty(row, 1) && board.isEmpty(row, 2) && board.isEmpty(row, 3)) {
                if (!gameState.isSquareUnderAttack(board, row, 3, this.color === 'white' ? 'black' : 'white') &&
                    !gameState.isSquareUnderAttack(board, row, 2, this.color === 'white' ? 'black' : 'white')) {
                    moves.push({ row: row, col: 2, isCastling: 'queenside' });
                }
            }
        }
        return moves;
    }
}

function createPiece(type, color) {
    switch (type) {
        case 'p': return new Pawn(color);
        case 'n': return new Knight(color);
        case 'b': return new Bishop(color);
        case 'r': return new Rook(color);
        case 'q': return new Queen(color);
        case 'k': return new King(color);
        default: throw new Error(`Unknown piece type: ${type}`);
    }
}

class ChessBoard {
    constructor() { this.grid = Array(8).fill(null).map(() => Array(8).fill(null)); }
    initializeBoard() {
        for (let row = 0; row < 8; row++) { for (let col = 0; col < 8; col++) { this.grid[row][col] = null; } }
        this.grid[0] = [new Rook('black'), new Knight('black'), new Bishop('black'),
                        new Queen('black'), new King('black'), new Bishop('black'),
                        new Knight('black'), new Rook('black')];
        for (let col = 0; col < 8; col++) { this.grid[1][col] = new Pawn('black'); }
        for (let col = 0; col < 8; col++) { this.grid[6][col] = new Pawn('white'); }
        this.grid[7] = [new Rook('white'), new Knight('white'), new Bishop('white'),
                        new Queen('white'), new King('white'), new Bishop('white'),
                        new Knight('white'), new Rook('white')];
    }
    getPiece(row, col) { return this.isValidPosition(row, col) ? this.grid[row][col] : null; }
    setPiece(row, col, piece) { if (this.isValidPosition(row, col)) { this.grid[row][col] = piece; } }
    isEmpty(row, col) { return !this.getPiece(row, col); }
    isValidPosition(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
    isOwnPiece(row, col, color) { const piece = this.getPiece(row, col); return piece && piece.color === color; }
    isOpponentPiece(row, col, color) { const piece = this.getPiece(row, col); return piece && piece.color !== color; }
    copyGrid() { return this.grid.map(row => row.map(piece => piece ? { type: piece.type, color: piece.color } : null)); }
}

class GameState {
    constructor(board) {
        this.board = board;
        this.currentTurn = 'white';
        this.enPassantTarget = null;
        this.castlingRights = {
            whiteKingMoved: false, blackKingMoved: false,
            whiteRookKingSideMoved: false, whiteRookQueenSideMoved: false,
            blackRookKingSideMoved: false, blackRookQueenSideMoved: false
        };
        this.lastMove = null;
        this.whiteKingPos = { row: 7, col: 4 };
        this.blackKingPos = { row: 0, col: 4 };
    }
    switchTurn() { this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white'; }
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board.grid[row][col];
                if (piece && piece.type === 'k' && piece.color === color) { return { row, col }; }
            }
        }
        return null;
    }
    isSquareUnderAttack(board, row, col, attackerColor) {
        const pawnDirection = attackerColor === 'white' ? -1 : 1;
        if (board.isValidPosition(row + pawnDirection, col - 1)) {
            const piece = board.getPiece(row + pawnDirection, col - 1);
            if (piece && piece.color === attackerColor && piece.type === 'p') return true;
        }
        if (board.isValidPosition(row + pawnDirection, col + 1)) {
            const piece = board.getPiece(row + pawnDirection, col + 1);
            if (piece && piece.color === attackerColor && piece.type === 'p') return true;
        }

        const knightMoves = [
            { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
            { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
            { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
            { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
        ];
        for (const move of knightMoves) {
            if (board.isValidPosition(row + move.dr, col + move.dc)) {
                const piece = board.getPiece(row + move.dr, col + move.dc);
                if (piece && piece.color === attackerColor && piece.type === 'n') return true;
            }
        }

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                if (board.isValidPosition(row + dr, col + dc)) {
                    const piece = board.getPiece(row + dr, col + dc);
                    if (piece && piece.color === attackerColor && piece.type === 'k') return true;
                }
            }
        }

        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
        ];
        for (let i = 0; i < directions.length; i++) {
            const d = directions[i];
            let r = row + d.dr, c = col + d.dc;
            let distance = 0;
            while (board.isValidPosition(r, c)) {
                distance++;
                const piece = board.getPiece(r, c);
                if (piece) {
                    if (piece.color === attackerColor) {
                        const isRookLike = i < 4;
                        if (piece.type === 'q' || (isRookLike && piece.type === 'r') ||
                            (!isRookLike && piece.type === 'b')) return true;
                        if (piece.type === 'k' && distance === 1) return true;
                    }
                    break;
                }
                r += d.dr; c += d.dc;
            }
        }
        return false;
    }
    getPseudoLegalMoves(row, col) {
        const piece = this.board.getPiece(row, col);
        if (!piece || piece.color !== this.currentTurn) return [];
        return piece.getPseudoLegalMoves(this.board, this, row, col);
    }
    getLegalMoves(board, row, col) {
        const piece = board.getPiece(row, col);
        if (!piece || piece.color !== this.currentTurn) return [];
        const pseudoMoves = this.getPseudoLegalMoves(row, col);
        const legalMoves = [];
        const opponentColor = this.currentTurn === 'white' ? 'black' : 'white';

        for (const move of pseudoMoves) {
            const savedTarget = board.grid[move.row][move.col];
            const savedSource = board.grid[row][col];

            board.setPiece(move.row, move.col, savedSource);
            this.board.setPiece(row, col, null);

            let originalKingPos = null;
            if (piece.type === 'k') {
                originalKingPos = piece.color === 'white' ? this.whiteKingPos : this.blackKingPos;
            }

            const kingInCheck = this.isSquareUnderAttack(
                this.board,
                piece.type === 'k' ? move.row : (piece.color === 'white' ? this.whiteKingPos.row : this.blackKingPos.row),
                piece.type === 'k' ? move.col : (piece.color === 'white' ? this.whiteKingPos.col : this.blackKingPos.col),
                opponentColor
            );

            this.board.setPiece(row, col, savedSource);
            this.board.setPiece(move.row, move.col, savedTarget);

            if (originalKingPos) {
                piece.color === 'white' ? this.whiteKingPos = originalKingPos : this.blackKingPos = originalKingPos;
            }

            let validCastling = true;
            if (move.isCastling === 'kingside') {
                const backRow = piece.color === 'white' ? 7 : 0;
                validCastling = !this.isSquareUnderAttack(this.board, backRow, 5, opponentColor);
            } else if (move.isCastling === 'queenside') {
                const backRow = piece.color === 'white' ? 7 : 0;
                validCastling = !this.isSquareUnderAttack(this.board, backRow, 3, opponentColor);
            }

            if (!kingInCheck && validCastling) { legalMoves.push(move); }
        }
        return legalMoves;
    }
    isCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        const opponentColor = color === 'white' ? 'black' : 'white';
        return this.isSquareUnderAttack(this.board, kingPos.row, kingPos.col, opponentColor);
    }
    
    hasLegalMoves(board, color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board.getPiece(row, col);
                if (piece && piece.color === color) { 
                    // Temporarily set currentTurn to check moves for this color
                    const originalTurn = this.currentTurn;
                    this.currentTurn = color;
                    const legalMoves = this.getLegalMoves(board, row, col);
                    this.currentTurn = originalTurn;  // Restore
                    if (legalMoves.length > 0) return true;
                }
            }
        }
        return false;
    }
    
    isCheckmate() { 
        const currentColor = this.currentTurn;
        return this.isCheck(currentColor) && !this.hasLegalMoves(this.board, currentColor);
    }
    
    isStalemate() { 
        const currentColor = this.currentTurn;
        return !this.isCheck(currentColor) && !this.hasLegalMoves(this.board, currentColor);
    }
}

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
        
        // Undo the last move(s)
        let undoneCount = 0;
        while (undoneCount < minMovesNeeded && this.moveHistory.length > 0) {
            const lastMove = this.moveHistory.pop();
            const piece = lastMove.piece;
            const targetPiece = lastMove.captured || null;
            
            // Check for castling - disable undo if any castling occurred
            const movedToCastling = lastMove.to.isCastling === 'kingside' || lastMove.to.isCastling === 'queenside';
            
            if (piece.type === 'k' || piece.type === 'r' || movedToCastling) {
                console.log('[ChessGame.undoLastMove] Castling detected - cannot undo, restoring move');
                this.moveHistory.push(lastMove);  // Restore the move
                return;  // Don't allow castling to be undone
            }
            
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
        
        await autoSave();
        renderBoard();
        renderMoveHistory();  // Update move history display
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
        
        console.log('[ChessGame.canUndo] Checking...');
        console.log('  moveHistory.length:', this.moveHistory.length);
        
        if (this.moveHistory.length === 0) { 
            console.log('  NO: no moves'); return false; 
        }
        
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        console.log('  lastMove.piece.type:', lastMove.piece.type, 'isCastling:', lastMove.to.isCastling);
        
        // Check for castling or rook/knight moves that affect rights
        if (lastMove.piece.type === 'k' || lastMove.piece.type === 'r') { 
            console.log('  NO: king/rook moved'); return false; 
        }
        if (lastMove.to.isCastling === 'kingside' || lastMove.to.isCastling === 'queenside') { 
            console.log('  NO: castling move'); return false; 
        }
        
        // For bot games, check if we have at least 2 moves to undo
        const isBotGame = this.botAI !== null && this.botDifficulty !== 'none';
        console.log('  isBotGame:', isBotGame);
        if (isBotGame && this.moveHistory.length < 2) { 
            console.log('  NO: bot game but not enough moves'); return false; 
        }
        
        console.log('  YES: can undo');
        return true;
    }
    async executeMove(from, to) {
        const piece = this.board.grid[from.row][from.col];
        const targetPiece = this.board.grid[to.row][to.col];

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
        } else {
            this.gameState.switchTurn();
            updateStatus();
        }

        try { await autoSave(); } catch (e) { console.error('[executeMove] AutoSave error:', e); }
        
        deselectAll();
        renderMoveHistory();

        if (!this.botAI) { startTimer(); }

        // Read current dropdown value at move time to handle difficulty changes during game
        const currentBotDiffSelect = document.getElementById('mcp-bot-difficulty-select');
        const currentDifficulty = initialBotDifficulties[currentBotDiffSelect?.value] || 'medium';
        
        if (currentDifficulty !== 'none' && this.gameState.currentTurn === 'black' && this.gameActive) {
            // Create a new BotAI instance with the current difficulty to ensure it uses updated settings
            const bot = new BotAI(currentDifficulty);
            
            const self = this;
            setTimeout(() => {
                const result = bot.makeMove(self);
                console.log('[ChessGame.executeMove] Bot result:', result);

                if (result.type === 'checkmate') { this.gameActive = false; updateStatus(); }
                else if (result.type === 'stalemate') { this.gameActive = false; updateStatus(); }
                else if (result.from && result.to) {
                    console.log('[ChessGame.executeMove] Executing bot move');
                    self.executeMove(result.from, result.to);
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