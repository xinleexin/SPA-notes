// ============================================
// CHESS GAME SPA - Bot AI Class (Refactored)
// ============================================

class BotAI {
    constructor(difficulty) {
        this.difficulty = difficulty || 'medium';
        this.pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
        
        // Log level configuration - only logs below or equal to this level will be shown
        // Levels: 'error' (only errors), 'warn' (warnings + errors), 'info' (all)
        this.logLevel = 'info';

        this.pawnTable = [
            [  0,  0,  0,  0,  0,  0,  0,  0],
            [ 50, 50, 50, 50, 50, 50, 50, 50],
            [ 10, 10, 20, 30, 30, 20, 10, 10],
            [  5,  5, 10, 25, 25, 10,  5,  5],
            [  0,  0,  0, 20, 20,  0,  0,  0],
            [  5, -5,-10,  0,  0,-10, -5,  5],
            [  5, 10, 10,-20,-20, 10, 10,  5],
            [  0,  0,  0,  0,  0,  0,  0,  0]
        ];

        this.knightTable = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];

        this.bishopTable = [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ];

        this.rookTable = [
            [  0,  0,  0,  0,  0,  0,  0,  0],
            [  5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [  0,  0,  0,  5,  5,  0,  0,  0]
        ];

        this.queenTable = [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [-5,  0,  5,  5,  5,  5,  0, -5],
            [  0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ];

        this.kingTable = [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [ 20, 20,  0,  0,  0,  0, 20, 20],
            [ 20, 30, 10,  0,  0, 10, 30, 20]
        ];
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
                    this.logInfo(`[BotAI.getAllLegalMoves] ${color} ${piece.type.toUpperCase()} at (${row},${col}) has ${legalMoves.length} legal move(s):`, 
                        JSON.stringify(legalMoves.map(m => `(${m.row},${m.col})`)));
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

    evaluateBoard(game, botColor) {
        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.board.grid[row][col];
                if (!piece) continue;

                let value = this.pieceValues[piece.type];
                let posBonus = 0;

                switch (piece.type) {
                    case 'p':
                        posBonus = piece.color === 'white' ? this.pawnTable[row][col] : this.pawnTable[7 - row][col];
                        break;
                    case 'n':
                        posBonus = piece.color === 'white' ? this.knightTable[row][col] : this.knightTable[7 - row][col];
                        break;
                    case 'b':
                        posBonus = piece.color === 'white' ? this.bishopTable[row][col] : this.bishopTable[7 - row][col];
                        break;
                    case 'r':
                        posBonus = piece.color === 'white' ? this.rookTable[row][col] : this.rookTable[7 - row][col];
                        break;
                    case 'q':
                        posBonus = piece.color === 'white' ? this.queenTable[row][col] : this.queenTable[7 - row][col];
                        break;
                    case 'k':
                        posBonus = piece.color === 'white' ? this.kingTable[row][col] : this.kingTable[7 - row][col];
                        break;
                }

                if (piece.color === 'black') { score += value + posBonus; }
                else { score -= value + posBonus; }
            }
        }
        return score;
    }

    evaluatePieceSafety(clonedGame, destRow, destCol, botColor) {
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        let attackers = 0;
        let defenders = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = clonedGame.board.grid[row][col];
                
                // Check if this specific opponent piece can attack the destination
                if (piece && piece.color === opponentColor) {
                    if (this.canPieceAttack(clonedGame.board, clonedGame.gameState, row, col, destRow, destCol)) {
                        attackers++;
                    }
                } 
                // Check if this specific defender piece can protect the destination
                else if (piece && piece.color === botColor) {
                    if (this.canPieceAttack(clonedGame.board, clonedGame.gameState, row, col, destRow, destCol)) {
                        defenders++;
                    }
                }
            }
        }
        
        // Penalty for being under attack: -100 per attacker beyond defenders
        if (attackers > defenders) {
            return -(attackers - defenders) * this.pieceValues['p'];
        } else if (attackers === 0 && defenders === 0) {
            return 0;
        }
        // Small bonus for having more defenders than attackers
        return 5;
    }

    evaluatePieceTrade(clonedGame, fromRow, fromCol, destRow, destCol, botColor) {
        const piece = clonedGame.board.grid[fromRow][fromCol];
        const targetPiece = clonedGame.board.grid[destRow][destCol];
        
        if (!targetPiece || !piece) return 0;
        
        const attackerValue = this.pieceValues[piece.type];
        const targetValue = this.pieceValues[targetPiece.type];
        
        let defenderCount = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = clonedGame.board.grid[row][col];
                if (p && p.color !== botColor) { 
                    if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, destRow, destCol, p.color)) {
                        defenderCount++;
                    }
                }
            }
        }
        
        if (attackerValue <= targetValue) {
            return targetValue - attackerValue;
        } else if (defenderCount === 0) {
            return targetValue - attackerValue;
        }
        
        const loss = attackerValue - targetValue;
        return -loss * (1 + defenderCount);
    }

    getThreateningOpponentPieces(clonedGame, botColor) {
        const threateningPieces = [];
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = clonedGame.board.grid[row][col];
                if (piece && piece.color === botColor) {
                    if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, row, col, opponentColor)) {
                        this.logInfo(`    [THREAT] Bot ${piece.type} at (${row},${col}) is under attack`);
                        
                        for (let r = 0; r < 8; r++) {
                            for (let c = 0; c < 8; c++) {
                                const attacker = clonedGame.board.grid[r][c];
                                if (attacker && attacker.color === opponentColor) {
                                    if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, row, col, attacker.color)) {
                                        threateningPieces.push({
                                            from: {row: r, col: c},
                                            to: {row: row, col: col},
                                            piece: attacker,
                                            threatValue: this.pieceValues[piece.type]
                                        });
                                        this.logInfo(`      [THREAT] Found ${attacker.type} at (${r},${c}) threatening bot's ${piece.type}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return threateningPieces;
    }

    evaluateMoveProtectsVulnerablePiece(clonedGame, fromRow, fromCol, destRow, destCol, botColor) {
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        const threats = this.getThreateningOpponentPieces(clonedGame, botColor);
        
        if (threats.length === 0) return 0;
        
        let protectionBonus = 0;
        
        for (const threat of threats) {
            const pseudoMoves = this.getPseudoLegalMovesForPiece(clonedGame.board, clonedGame.gameState, fromRow, fromCol);
            
            for (const move of pseudoMoves) {
                if (move.row === threat.from.row && move.col === threat.from.col) {
                    const protectionValue = this.pieceValues[threat.piece.type];
                    
                    if (protectionValue > this.pieceValues['p']) {
                        protectionBonus += protectionValue * 0.5;
                        this.logInfo(`    [PROTECT] Moving to attack ${threat.piece.type.toUpperCase()} at (${threat.from.row},${threat.from.col}) - protecting piece worth ${protectionValue}`);
                    }
                }
            }
        }
        
        return protectionBonus;
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

    // ============================================
    // COMMON EVALUATION FRAMEWORK - Shared by all modes
    // ============================================

    /**
     * Calculate complete move score with all components
     * Returns an object with all scoring components for detailed logging
     */
    calculateMoveScore(clonedGame, botColor, fromRow, fromCol, toRow, toCol, targetPiece) {
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        // Base board evaluation
        const baseScore = this.evaluateBoard(clonedGame, botColor);
        
        // Piece safety at destination
        const pieceSafety = this.evaluatePieceSafety(clonedGame, toRow, toCol, botColor);
        
        // Trade bonus (capture value considering defenders)
        let tradeBonus = 0;
        if (targetPiece) {
            const attackerValue = this.pieceValues[clonedGame.board.grid[fromRow][fromCol]?.type || 'p'];
            const targetValue = this.pieceValues[targetPiece.type];
            
            let defenderCount = 0;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const p = clonedGame.board.grid[row][col];
                    if (p && p.color !== botColor) { 
                        if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, toRow, toCol, p.color)) {
                            defenderCount++;
                        }
                    }
                }
            }
            
            const isGoodTrade = attackerValue <= targetValue;
            
            if (isGoodTrade || defenderCount === 0) {
                tradeBonus = targetValue - attackerValue;
            } else {
                const loss = attackerValue - targetValue;
                tradeBonus = -loss * (1 + defenderCount);
            }
        }
        
        // Protection bonus
        const protectionBonus = this.evaluateMoveProtectsVulnerablePiece(clonedGame, fromRow, fromCol, toRow, toCol, botColor);
        
        // Create a temporary move object for repetition check
        const tempMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
        let repetitionPenalty = 0;
        if (this.isRepetition(clonedGame, tempMove)) { 
            repetitionPenalty = -300; 
        }
        
        // Early game king penalty
        const isEarlyGame = clonedGame.moveHistory.length < 15;
        const pieceAtDestination = clonedGame.board.grid[toRow][toCol];
        const pieceType = pieceAtDestination ? pieceAtDestination.type : '';
        let earlyKingPenalty = 0;
        if (pieceType === 'k' && isEarlyGame) {
            const startRow = botColor === 'white' ? 7 : 0;
            // Check if king moved from starting position
            const originalPiece = clonedGame.board.grid[fromRow][fromCol];
            const pieceAtFrom = originalPiece || { type: '', color: '' };
            if (pieceAtFrom.type !== 'k') {
                earlyKingPenalty = -200;
            }
        }
        
        // Rook on starting squares penalty
        let rookStartPenalty = 0;
        if (pieceType === 'r' && 
           ((toRow === 0 && toCol === 0) || (toRow === 7 && toCol === 7))) {
            rookStartPenalty = -50;
        }
        
        // Check penalty
        const checkPenalty = clonedGame.gameState.isSquareUnderAttack(clonedGame.board, 
            botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos,
            opponentColor) ? -500 : 0;
        
        return {
            baseScore,
            pieceSafety,
            tradeBonus,
            protectionBonus,
            repetitionPenalty,
            earlyKingPenalty,
            rookStartPenalty,
            checkPenalty,
            total: baseScore + pieceSafety + tradeBonus + protectionBonus - Math.abs(repetitionPenalty) + earlyKingPenalty + rookStartPenalty + checkPenalty
        };
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

    // ============================================
    // DIFFICULTY-SPECIFIC MODES
    // ============================================

    getRandomMove(game, allMoves) {
        const botColor = game.gameState.currentTurn === 'white' ? 'black' : 'white';
        const opponentColor = botColor === 'white' ? 'black' : 'white';

        this.logInfo('[BotAI.getRandomMove] Evaluating random safe moves...');
        
        // Filter safe moves (not putting king in check)
        let safeMoves = [];
        for (const move of allMoves) {
            const clonedGame = this.cloneGameForEvaluation(game);
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            // Update turn after the move
            clonedGame.gameState.switchTurn();
            
            const piece = clonedGame.board.grid[move.to.row][move.to.col];
            let kingInCheck = false;
            if (piece && !move.to.isCastling) {
                const kingPos = botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos;
                kingInCheck = clonedGame.gameState.isSquareUnderAttack(clonedGame.board, kingPos.row, kingPos.col, opponentColor);
            }
            
            if (!kingInCheck) {
                safeMoves.push(move);
            } else {
                this.logInfo(`  [CHECK] ${this.formatMovePosition(move.from)} -> ${this.formatMovePosition(move.to)}`);
            }
        }
        
        // Fallback: If no valid moves found, use ALL legal moves
        const candidates = safeMoves.length > 0 ? safeMoves : allMoves;
        
        this.logInfo(`[getRandomMove] Safe moves: ${safeMoves.length}/${allMoves.length}, Candidates: ${candidates.length}`);
        if (candidates.length === 0) {
            this.logWarning('[getRandomMove] WARNING: No candidate moves found!');
            return null;
        }
        
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        this.logInfo(`[BotAI.getRandomMove] Selected: ${this.formatMovePosition(selected.from)} -> ${this.formatMovePosition(selected.to)}`);
        return { from: selected.from, to: selected.to };
    }

    getMediumMove(game, botColor, allMoves) {
        if (!allMoves || !Array.isArray(allMoves) || allMoves.length === 0) {
            this.logError('[BotAI.getMediumMove] Invalid or empty allMoves:', allMoves);
            return null;
        }
        
        let bestScore = -Infinity;
        let bestScoreMoves = [];
        
        const opponentColor = botColor === 'white' ? 'black' : 'white';

        this.logInfo('[BotAI.getMediumMove] Evaluating', allMoves.length, 'moves...');
        for (const move of allMoves) {
            // Clone game state safely
            const clonedGame = this.cloneGameForEvaluation(game);
            
            // Get target piece BEFORE making the move
            const targetPiece = clonedGame.board.grid[move.to.row][move.to.col];
            
            // Make the test move on the clone
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            let kingInCheck = false;
            const piece = clonedGame.board.grid[move.to.row][move.to.col];
            if (piece && !move.to.isCastling) {
                const kingPos = botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos;
                kingInCheck = clonedGame.gameState.isSquareUnderAttack(clonedGame.board, kingPos.row, kingPos.col, opponentColor);
            }

            if (!kingInCheck) {
                // Use common evaluation framework
                const scores = this.calculateMoveScore(clonedGame, botColor, move.from.row, move.from.col, move.to.row, move.to.col, targetPiece);
                
                this.logInfo(`[BotAI.getMediumMove] ${this.formatMovePosition(move.from)} -> ${this.formatMovePosition(move.to)}: score=${scores.total.toFixed(1)} ` +
                    `(base=${scores.baseScore} safety=${scores.pieceSafety} trade=${scores.tradeBonus} protection=${scores.protectionBonus})`);
                
                if (scores.repetitionPenalty < 0) this.logInfo(`    [REPEATING] repetition penalty applied`);
                if (scores.earlyKingPenalty < 0) this.logInfo(`    [EARLY_KING] early king move penalty applied`);
                if (scores.rookStartPenalty < 0) this.logInfo(`    [ROOK_START] rook on start squares penalty applied`);

                // Add protection bonus to total
                scores.total += scores.protectionBonus;
                
                if (scores.total > bestScore) { 
                    bestScore = scores.total; 
                    bestScoreMoves = [move]; 
                } else if (scores.total === bestScore) { 
                    bestScoreMoves.push(move); 
                }
            } else {
                this.logInfo(`[BotAI.getMediumMove] ${this.formatMovePosition(move.from)} -> ${this.formatMovePosition(move.to)}: kingInCheck (skipped)`);
            }
        }
        
        this.logInfo(`[BotAI.getMediumMove] Best score: ${bestScore}, Options count: ${bestScoreMoves.length}`);

        const result = bestScoreMoves.length > 0
            ? bestScoreMoves[Math.floor(Math.random() * bestScoreMoves.length)]
            : (allMoves && allMoves.length > 0) ? allMoves[0] : null;
            
        this.logInfo('[BotAI.getMediumMove] Result:', result ? 'valid move' : 'null');
        return result;
    }

    getHardMove(game, botColor, allMoves) {
        if (!allMoves || !Array.isArray(allMoves) || allMoves.length === 0) {
            this.logError('[BotAI.getHardMove] Invalid or empty allMoves:', allMoves);
            return null;
        }
        
        const safeMoves = [];
        
        // First pass: filter safe moves and calculate basic scores
        for (const move of allMoves) {
            const clonedGame = this.cloneGameForEvaluation(game);
            
            // Get target piece BEFORE making the move
            const targetPiece = clonedGame.board.grid[move.to.row][move.to.col];
            
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            let kingInCheck = false;
            if (!move.to.isCastling) {
                const opponentColor = botColor === 'white' ? 'black' : 'white';
                const kingPos = botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos;
                kingInCheck = clonedGame.gameState.isSquareUnderAttack(clonedGame.board, kingPos.row, kingPos.col, opponentColor);
            }
            
            if (!kingInCheck) {
                // Calculate move score
                const scores = this.calculateMoveScore(clonedGame, botColor, move.from.row, move.from.col, move.to.row, move.to.col, targetPiece);
                
                // Use scores.total directly (tradeBonus is already included in total)
                const overallScore = scores.total;
                
                // Accept moves where gain outweighs safety loss by at least 2 pawns worth (-200)
                if (overallScore >= -200) {
                    safeMoves.push({ move, scores });
                    this.logInfo(`[getHardMove] Safe: ${this.formatMovePosition(move.from)} -> ${this.formatMovePosition(move.to)}: score=${scores.total.toFixed(0)}`);
                } else {
                    this.logInfo(`[getHardMove] Unsafe (skipped): ${this.formatMovePosition(move.from)} -> ${this.formatMovePosition(move.to)}: score=${overallScore.toFixed(0)}`);
                }
            }
        }

        const candidates = safeMoves.length > 0 ? safeMoves : allMoves.map(m => ({ move: m, scores: null }));

        if (!candidates || candidates.length === 0) {
            return null;
        }

        let bestMove = null;
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            const move = candidate.move;
            
            // Clone game state for minimax
            const clonedGame = this.cloneGameForEvaluation(game);
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            const opponentColor = botColor === 'white' ? 'black' : 'white';
            let oppScore = this.minimax(clonedGame, opponentColor, 1);
            
            // Get full evaluation - pass targetPiece if available
            const scores = candidate.scores || this.calculateMoveScore(clonedGame, botColor, move.from.row, move.from.col, move.to.row, move.to.col, null);
            
            // Create temporary move for repetition check
            const tempMove = { from: { row: move.from.row, col: move.from.col }, to: { row: move.to.row, col: move.to.col } };
            let score = -oppScore + scores.total;
            if (this.isRepetition(clonedGame, tempMove)) { 
                score -= 300; 
                this.logInfo(`    [REPEATING] ${this.formatMovePosition(move.from)} -> ${this.formatMovePosition(move.to)}: repetition penalty applied`);
            }
            
            const pieceAtDestination = clonedGame.board.grid[move.to.row][move.to.col];
            if (pieceAtDestination && pieceAtDestination.type === 'k' && clonedGame.moveHistory.length < 15) {
                score -= 200;
            }

            this.logInfo(`[getHardMove] ${this.formatMovePosition(move.from)} -> ${this.formatMovePosition(move.to)}: total=${score.toFixed(0)} (oppScore=${-oppScore})`);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove || candidates[0].move;
    }

    // ============================================
    // MINIMAX ALGORITHM - Hard mode
    // ============================================

    minimax(game, color, depth, alpha = -Infinity, beta = Infinity) {
        const moves = this.getAllLegalMovesForColor(game, color);

        if (moves.length === 0 || depth === 0) {
            let score;
            if (moves.length === 0) {
                score = game.gameState.isCheck(color)
                    ? (color === 'black' ? -100000 : 100000)
                    : 0;
            } else {
                score = this.evaluateBoardWithCaptures(game, color);
            }
            return score;
        }

        const scoredMoves = moves.map(move => ({
            move,
            captureValue: this.pieceValues[game.board.grid[move.to.row][move.to.col]?.type || 0] * 10 + (move.isEnPassant ? 50 : 0)
        }));

        if (color === 'black') { scoredMoves.sort((a, b) => b.captureValue - a.captureValue); }
        else { scoredMoves.sort((a, b) => a.captureValue - b.captureValue); }

        let bestScore;

        if (color === 'black') {
            bestScore = alpha;
            for (const item of scoredMoves) {
                const clonedGame = this.cloneGameForEvaluation(game);
                this.makeMoveOnClonedGame(clonedGame, item.move.from, item.move.to);
                
                const score = this.minimax(clonedGame, 'white', depth - 1, bestScore, beta);
                bestScore = Math.max(bestScore, score);
                if (bestScore >= beta) { break; }
            }
        } else {
            bestScore = beta;
            for (const item of scoredMoves) {
                const clonedGame = this.cloneGameForEvaluation(game);
                this.makeMoveOnClonedGame(clonedGame, item.move.from, item.move.to);
                
                const score = this.minimax(clonedGame, 'black', depth - 1, alpha, bestScore);
                bestScore = Math.min(bestScore, score);
                if (bestScore <= alpha) { break; }
            }
        }

        return bestScore;
    }

    evaluateBoardWithCaptures(game, color) {
        const moves = this.getAllLegalMovesForColor(game, color);
        let bestCaptureValue = 0;

        for (const move of moves) {
            if (game.board.grid[move.to.row][move.to.col] || move.isEnPassant) {
                let capturedPieceType = game.board.grid[move.to.row][move.to.col]?.type || 'p';
                const captureValue = this.pieceValues[capturedPieceType];
                if (captureValue > bestCaptureValue) { bestCaptureValue = captureValue; }
            }
        }

        const baseScore = this.evaluateBoard(game, color);
        return baseScore + (color === 'black'
            ? Math.min(bestCaptureValue, 500)
            : -Math.min(bestCaptureValue, 500));
    }

    // ============================================
    // MOVE SELECTION
    // ============================================

    formatMovePosition(pos) {
        const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
        return `${columns[pos.col]}${rows[pos.row]}`;
    }

    makeMove(game) {
        const botColor = 'black';
        this.logInfo(`\n=== [BotAI.makeMove] Black's Turn ===`);
        this.logInfo('[BotAI.makeMove] Bot difficulty:', this.difficulty);
        
        const allMoves = this.getAllLegalMovesForColor(game, botColor);

        if (allMoves.length === 0) {
            if (game.gameState.isCheck(botColor)) { return { type: 'checkmate', winner: game.gameState.currentTurn }; }
            else { return { type: 'stalemate' }; }
        }

        this.logInfo(`[BotAI.makeMove] All ${allMoves.length} legal moves:`);
        allMoves.forEach((m, i) => {
            this.logInfo(`  [${i}] ${this.formatMovePosition(m.from)} -> ${this.formatMovePosition(m.to)}`);
        });

        let bestMove = null;

        switch (this.difficulty) {
            case 'easy': 
                bestMove = this.getRandomMove(game, allMoves);
                break;
            case 'medium': 
                bestMove = this.getMediumMove(game, botColor, allMoves); 
                this.logInfo('[BotAI.makeMove] Medium difficulty selected move');
                break;
            case 'hard': 
                bestMove = this.getHardMove(game, botColor, allMoves); 
                this.logInfo('[BotAI.makeMove] Hard difficulty selected move');
                break;
        }

        if (!bestMove || !bestMove.from || !bestMove.to) {
            this.logWarning('[BotAI.makeMove] No valid move found, using first available');
            bestMove = allMoves[0];
        }

        this.logInfo(`[BotAI.makeMove] SELECTED: ${this.formatMovePosition(bestMove.from)} -> ${this.formatMovePosition(bestMove.to)}\n`);

        return { type: 'move', from: bestMove.from, to: bestMove.to };
    }
}