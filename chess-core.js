// ============================================
// CHESS GAME SPA - Core Engine (DOM-free)
// Shared by the main thread (chess.js / bot-ai.js) and the Web Worker (bot-worker.js).
// Contains only pure game logic: pieces, board, and game state. No DOM / localStorage.
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

// ============================================
// SHARED EVALUATION DATA (used by bot-ai.js and bot-worker.js)
// ============================================

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PIECE_TABLES = {
    p: [
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [ 50, 50, 50, 50, 50, 50, 50, 50],
        [ 10, 10, 20, 30, 30, 20, 10, 10],
        [  5,  5, 10, 25, 25, 10,  5,  5],
        [  0,  0,  0, 20, 20,  0,  0,  0],
        [  5, -5,-10,  0,  0,-10, -5,  5],
        [  5, 10, 10,-20,-20, 10, 10,  5],
        [  0,  0,  0,  0,  0,  0,  0,  0]
    ],
    n: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    b: [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    r: [
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [  5, 10, 10, 10, 10, 10, 10,  5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [-5,  0,  0,  0,  0,  0,  0, -5],
        [  0,  0,  0,  5,  5,  0,  0,  0]
    ],
    q: [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [-5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    k: [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20]
    ]
};

// Expose core classes as globals so they resolve in Web Workers (importScripts) too.
if (typeof self !== 'undefined') {
    self.Piece = Piece;
    self.Pawn = Pawn;
    self.Knight = Knight;
    self.SlidingPiece = SlidingPiece;
    self.Rook = Rook;
    self.Bishop = Bishop;
    self.Queen = Queen;
    self.King = King;
    self.ChessBoard = ChessBoard;
    self.GameState = GameState;
    self.PIECE_VALUES = PIECE_VALUES;
    self.PIECE_TABLES = PIECE_TABLES;
}



