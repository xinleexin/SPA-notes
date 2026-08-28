// ============================================
// CHESS GAME SPA - Bot AI Class (Refactored)
// ============================================

class BotAI {
    constructor(difficulty) {
        this.difficulty = difficulty || 'medium';
        this.pieceValues = PIECE_VALUES;
        
        // Log level configuration - only logs below or equal to this level will be shown
        // Levels: 'error' (only errors), 'warn' (warnings + errors), 'info' (all)
        // Default is 'warn' so the synchronous bot path stays quiet (no per-move/per-node
        // console spam). Set botAI.logLevel = 'info' to restore verbose debug logging.
        this.logLevel = 'warn';

        // Search engine config (negamax + iterative deepening, used by 'hard' mode)
        this.MATE_SCORE = 100000;
        this._timeoutSentinel = {};

        // Positional tables are single-sourced in chess-core.js (loaded before this file).
        this.pawnTable = PIECE_TABLES.p;
        this.knightTable = PIECE_TABLES.n;
        this.bishopTable = PIECE_TABLES.b;
        this.rookTable = PIECE_TABLES.r;
        this.queenTable = PIECE_TABLES.q;
        this.kingTable = PIECE_TABLES.k;
    }

    // ============================================
    // UTILITY FUNCTIONS - Shared across all modes
    // ============================================

    /**
     * Check if a specific piece can attack a destination square
     */
    canPieceAttack(board, gameState, row, col, destRow, destCol) {
        const piece = board.getPiece(row, col);
        if (!piece || !gameState) return false;
        
        // Get pseudo-legal moves for this piece
        const pseudoMoves = piece.getPseudoLegalMoves(board, gameState, row, col);
        
        // Check if destination is in the move list (without checking for check)
        for (const move of pseudoMoves) {
            if (move.row === destRow && move.col === destCol) {
                return true;
            }
        }
        return false;
    }

    // ============================================
    // LOGGING HELPERS
    // ============================================

    logInfo(message, ...args) {
        if (this.logLevel === 'info') {
            console.log(message, ...args);
        }
    }

    logWarning(message, ...args) {
        if (this.logLevel !== 'error') {  // warn or info level
            console.warn(message, ...args);
        }
    }

    logError(message, ...args) {
        console.error(message, ...args);
    }

    getAllLegalMovesForColor(game, color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.board.grid[row][col];
                if (piece && piece.color === color) {
                    const legalMoves = game.gameState.getLegalMoves(game.board, row, col);
                    for (const move of legalMoves) {
                        moves.push({ from: { row, col }, to: move, isEnPassant: !!move.isEnPassant });
                    }
                }
            }
        }
        this.logInfo(`[BotAI.getAllLegalMovesForColor] ${color} has ${moves.length} total legal move(s)`);
        return moves;
    }

    cloneGameForEvaluation(game) {
        const clonedBoard = new ChessBoard();
        clonedBoard.grid = game.board.copyGrid().map((row, rIdx) => 
            row.map((pieceData, cIdx) => {
                if (!pieceData) return null;
                return createPiece(pieceData.type, pieceData.color);
            })
        );
        
        const clonedGameState = new GameState(clonedBoard);
        clonedGameState.currentTurn = game.gameState.currentTurn;
        clonedGameState.enPassantTarget = game.gameState.enPassantTarget ? {...game.gameState.enPassantTarget} : null;
        clonedGameState.castlingRights = {
            whiteKingMoved: game.gameState.castlingRights.whiteKingMoved,
            blackKingMoved: game.gameState.blackKingMoved,
            whiteRookKingSideMoved: game.gameState.castlingRights.whiteRookKingSideMoved,
            whiteRookQueenSideMoved: game.gameState.castlingRights.whiteRookQueenSideMoved,
            blackRookKingSideMoved: game.gameState.castlingRights.blackRookKingSideMoved,
            blackRookQueenSideMoved: game.gameState.castlingRights.blackRookQueenSideMoved
        };
        clonedGameState.lastMove = game.gameState.lastMove ? {...game.gameState.lastMove} : null;
        clonedGameState.whiteKingPos = {...game.gameState.whiteKingPos};
        clonedGameState.blackKingPos = {...game.gameState.blackKingPos};
        
        return { 
            board: clonedBoard, 
            gameState: clonedGameState,
            moveHistory: game.moveHistory ? [...game.moveHistory] : []
        };
    }

    makeMoveOnClonedGame(clonedGame, from, to) {
        const piece = clonedGame.board.grid[from.row][from.col];
        const targetPiece = clonedGame.board.grid[to.row][to.col];

        if (to.isEnPassant) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            clonedGame.board.grid[capturedPawnRow][to.col] = null;
        }

        if (to && to.isCastling === 'kingside') {
            const rookRow = from.row;
            clonedGame.board.grid[rookRow][5] = clonedGame.board.grid[rookRow][7];
            clonedGame.board.grid[rookRow][7] = null;
            const colorKey = piece.color === 'white' ? 'whiteRookKingSideMoved' : 'blackRookKingSideMoved';
            clonedGame.gameState.castlingRights[colorKey] = true;
        } else if (to && to.isCastling === 'queenside') {
            const rookRow = from.row;
            clonedGame.board.grid[rookRow][3] = clonedGame.board.grid[rookRow][0];
            clonedGame.board.grid[rookRow][0] = null;
            const colorKey = piece.color === 'white' ? 'whiteRookQueenSideMoved' : 'blackRookQueenSideMoved';
            clonedGame.gameState.castlingRights[colorKey] = true;
        }

        if (piece.type === 'r') {
            const whiteQueenside = piece.color === 'white' && from.row === 7 && from.col === 0;
            const whiteKingside = piece.color === 'white' && from.row === 7 && from.col === 7;
            const blackQueenside = piece.color === 'black' && from.row === 0 && from.col === 0;
            const blackKingside = piece.color === 'black' && from.row === 0 && from.col === 7;

            if (piece.color === 'white') {
                clonedGame.gameState.castlingRights.whiteRookQueenSideMoved |= whiteQueenside;
                clonedGame.gameState.castlingRights.whiteRookKingSideMoved |= whiteKingside;
            } else {
                clonedGame.gameState.castlingRights.blackRookQueenSideMoved |= blackQueenside;
                clonedGame.gameState.castlingRights.blackRookKingSideMoved |= blackKingside;
            }
        }

        if (piece.type === 'k') {
            const colorKey = piece.color === 'white' ? 'whiteKingMoved' : 'blackKingMoved';
            clonedGame.gameState.castlingRights[colorKey] = true;
            if (piece.color === 'white') { clonedGame.gameState.whiteKingPos = { row: to.row, col: to.col }; }
            else { clonedGame.gameState.blackKingPos = { row: to.row, col: to.col }; }
        }

        clonedGame.board.grid[to.row][to.col] = piece;
        clonedGame.board.grid[from.row][from.col] = null;

        if (piece.type === 'p') {
            const lastRowWhite = 0;
            const lastRowBlack = 7;
            
            if (to.row === lastRowWhite || to.row === lastRowBlack) {
                clonedGame.board.grid[to.row][to.col] = new Queen(piece.color);
            }
        }

        if (to.isDoublePawn) {
            clonedGame.gameState.enPassantTarget = { row: Math.floor((from.row + to.row) / 2), col: from.col };
        } else { clonedGame.gameState.enPassantTarget = null; }
        
        const notation = this.generateMoveNotation(piece, from, to, targetPiece);
        clonedGame.moveHistory.push({
            turn: clonedGame.moveHistory.length + 1,
            color: piece.color,
            from: { row: from.row, col: from.col },
            to: { row: to.row, col: to.col },
            piece: piece,
            captured: targetPiece || null,
            notation: notation
        });
    }

    generateMoveNotation(piece, from, to, targetPiece) {
        let notation = '';
        if (piece.type !== 'p') { notation += piece.type.toUpperCase(); }
        
        const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
        
        if (to.isEnPassant) {
            notation += columns[from.col] + '×' + columns[to.col] + rows[to.row];
        } else if (to.isCastling === 'kingside') {
            notation = 'O-O';
        } else if (to.isCastling === 'queenside') {
            notation = 'O-O-O';
        } else {
            if (targetPiece || to.isEnPassant) {
                if (piece.type === 'p') notation += columns[from.col];
                notation += '×' + columns[to.col] + rows[to.row];
            } else {
                notation += columns[to.col] + rows[to.row];
            }
        }
        return notation;
    }

    getPseudoLegalMovesForPiece(board, gameState, row, col) {
        const piece = board.getPiece(row, col);
        if (!piece || !gameState) return [];
        const tempGameState = new GameState(board);
        return piece.getPseudoLegalMoves(board, tempGameState, row, col);
    }

    isRepetition(game, move) {
        const history = game.moveHistory || [];
        
        if (history.length >= 2) {
            const lastMove = history[history.length - 1];
            
            if (move.from.row === lastMove.to.row &&
                move.from.col === lastMove.to.col &&
                move.to.row === lastMove.from.row &&
                move.to.col === lastMove.from.col) {
                return true;
            }
        }

        const fromPos = `${move.from.row},${move.from.col}`;
        const toPos = `${move.to.row},${move.to.col}`;
        
        let matchCount = 0;
        for (let i = 0; i < history.length; i++) {
            if (`${history[i].from.row},${history[i].from.col}` === fromPos &&
                `${history[i].to.row},${history[i].to.col}` === toPos) {
                matchCount++;
            }
        }
        
        if (matchCount >= 2) return true;
        
        const fromPosRev = `${move.to.row},${move.to.col}`;
        const toPosRev = `${move.from.row},${move.from.col}`;
        
        let reverseMatchCount = 0;
        for (let i = 0; i < history.length; i++) {
            if (`${history[i].from.row},${history[i].from.col}` === fromPosRev &&
                `${history[i].to.row},${history[i].to.col}` === toPosRev) {
                reverseMatchCount++;
            }
        }
        
        if (reverseMatchCount >= 1) return true;
        
        return false;
    }

    /**
     * Get all safe moves (not putting king in check)
     */
    filterSafeMoves(game, botColor, allMoves) {
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        return allMoves.filter(move => {
            const clonedGame = this.cloneGameForEvaluation(game);
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            // Update turn after the move
            clonedGame.gameState.switchTurn();
            
            const piece = clonedGame.board.grid[move.to.row][move.to.col];
            if (piece && !move.to.isCastling) {
                const kingPos = botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos;
                return !clonedGame.gameState.isSquareUnderAttack(clonedGame.board, kingPos.row, kingPos.col, opponentColor);
            }
            return true;
        });
    }

}

// Expose BotAI as a global so the Web Worker (importScripts('bot-ai.js')) can use it.
if (typeof self !== 'undefined') { self.BotAI = BotAI; }