// ============================================
// CHESS GAME SPA - Bot AI Class
// ============================================

class BotAI {
    constructor(difficulty) {
        this.difficulty = difficulty || 'medium';
        this.pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

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

    getAllLegalMovesForColor(game, color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.board.grid[row][col];
                if (piece && piece.color === color) {
                    const legalMoves = game.gameState.getLegalMoves(game.board, row, col);
                    // LOG: Piece found with its legal moves
                    console.log(`[BotAI.getAllLegalMoves] ${color} ${piece.type.toUpperCase()} at (${row},${col}) has ${legalMoves.length} legal move(s):`, 
                        JSON.stringify(legalMoves.map(m => `(${m.row},${m.col})`)));
                    for (const move of legalMoves) {
                        moves.push({ from: { row, col }, to: move, isEnPassant: !!move.isEnPassant });
                    }
                }
            }
        }
        console.log(`[BotAI.getAllLegalMovesForColor] ${color} has ${moves.length} total legal move(s)`);
        return moves;
    }

    // Board cloning approach for safe move evaluation without mutating original state
    cloneGameForEvaluation(game) {
        const clonedBoard = new ChessBoard();
        
        // Deep copy grid with piece instances (not just data)
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
            moveHistory: game.moveHistory || []  // Include move history for isRepetition checks
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
            const lastRowWhite = 0;   // White reaches row 0
            const lastRowBlack = 7;   // Black reaches row 7
            
            if (to.row === lastRowWhite || to.row === lastRowBlack) {
                clonedGame.board.grid[to.row][to.col] = new Queen(piece.color);
            }
        }

        if (to.isDoublePawn) {
            clonedGame.gameState.enPassantTarget = { row: Math.floor((from.row + to.row) / 2), col: from.col };
        } else { clonedGame.gameState.enPassantTarget = null; }
    }

    evaluateBoardOnCloned(clonedGame, botColor) {
        return this.evaluateBoard(clonedGame, botColor);
    }

    // Evaluate piece trade - checks if capturing is worth it considering defenders
    // Returns positive for good trades (gain material), negative for bad trades where S loses more than A gains
    evaluatePieceTrade(clonedGame, fromRow, fromCol, destRow, destCol, botColor) {
        const piece = clonedGame.board.grid[fromRow][fromCol];
        const targetPiece = clonedGame.board.grid[destRow][destCol];
        
        // Not a capture or en passant
        if (!targetPiece || !piece) return 0;
        
        const attackerValue = this.pieceValues[piece.type];
        const targetValue = this.pieceValues[targetPiece.type];
        
        // Count defenders who can recapture the destination square after capture
        let defenderCount = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = clonedGame.board.grid[row][col];
                // Check if opponent piece can attack this square
                if (p && p.color !== botColor) { 
                    if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, destRow, destCol, p.color)) {
                        defenderCount++;
                    }
                }
            }
        }
        
        // Trade evaluation:
        // Good trade: attackerValue <= targetValue (gain or equal material)
        // Bad trade with defenders: attackerValue > targetValue AND defenders > 0
        if (attackerValue <= targetValue) {
            return targetValue - attackerValue; // Positive bonus for good material gain
        } else if (defenderCount === 0) {
            return targetValue - attackerValue; // Still okay if no defender can recapture
        }
        
        // Bad trade: losing more material with defenders
        const loss = attackerValue - targetValue;
        return -loss * (1 + defenderCount); // Heavily penalize losing more material with multiple defenders
    }

    // Get list of opponent pieces that threaten any of bot's vulnerable pieces (pieces under attack)
    getThreateningOpponentPieces(clonedGame, botColor) {
        const threateningPieces = [];
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = clonedGame.board.grid[row][col];
                // Check if this is a bot's piece under attack
                if (piece && piece.color === botColor) {
                    // Use GameState's isSquareUnderAttack to check if this square would be attacked
                    if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, row, col, opponentColor)) {
                        console.log(`    [THREAT] Bot ${piece.type} at (${row},${col}) is under attack`);
                        
                        // Find all pieces that can attack this square by checking each opponent piece's pseudo moves
                        for (let r = 0; r < 8; r++) {
                            for (let c = 0; c < 8; c++) {
                                const attacker = clonedGame.board.grid[r][c];
                                if (attacker && attacker.color === opponentColor) {
                                    // Use GameState's isSquareUnderAttack to check if this attacker can reach the square
                                    if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, row, col, attacker.color)) {
                                        threateningPieces.push({
                                            from: {row: r, col: c},
                                            to: {row: row, col: col},
                                            piece: attacker,
                                            threatValue: this.pieceValues[piece.type]
                                        });
                                        console.log(`      [THREAT] Found ${attacker.type} at (${r},${c}) threatening bot's ${piece.type}`);
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

    // Evaluate move that protects a vulnerable piece
    evaluateMoveProtectsVulnerablePiece(clonedGame, fromRow, fromCol, destRow, destCol, botColor) {
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        // Get pieces threatening bot's vulnerable pieces
        const threats = this.getThreateningOpponentPieces(clonedGame, botColor);
        
        if (threats.length === 0) return 0;
        
        let protectionBonus = 0;
        
        for (const threat of threats) {
            // Check if moving to destRow/destCol attacks the threatening piece
            const pseudoMoves = this.getPseudoLegalMovesForPiece(clonedGame.board, clonedGame.gameState, fromRow, fromCol);
            
            for (const move of pseudoMoves) {
                if (move.row === threat.from.row && move.col === threat.from.col) {
                    // This move would attack the threatening piece
                    const protectionValue = this.pieceValues[threat.piece.type];
                    
                    // Only bonus if protecting more valuable piece than attacking
                    if (protectionValue > this.pieceValues['p']) { // At least pawn value
                        protectionBonus += protectionValue * 0.5; // Give half the threat value as protection bonus
                        
                        console.log(`    [PROTECT] Moving to attack ${threat.piece.type.toUpperCase()} at (${threat.from.row},${threat.from.col}) - protecting piece worth ${protectionValue}`);
                    }
                }
            }
        }
        
        return protectionBonus;
    }

    getPseudoLegalMovesForPiece(board, gameState, row, col) {
        const piece = board.getPiece(row, col);
        if (!piece || !gameState) return [];
        // Create a minimal GameState for pseudo moves
        const tempGameState = new GameState(board);
        return piece.getPseudoLegalMoves(board, tempGameState, row, col);
    }

    // Evaluate piece safety at a destination square - returns bonus if safe, penalty if unsafe
    evaluatePieceSafety(clonedGame, destRow, destCol, botColor) {
        const opponentColor = botColor === 'white' ? 'black' : 'white';
        
        let attackers = 0;
        let defenders = 0;
        
        // Count opponent pieces that can attack this square
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = clonedGame.board.grid[row][col];
                if (piece && piece.color === opponentColor) {
                    // Use GameState's isSquareUnderAttack to check if this square would be attacked
                    if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, destRow, destCol, opponentColor)) {
                        attackers++;
                    }
                } else if (piece && piece.color === botColor) {
                    defenders++;
                }
            }
        }
        
        // Safety scoring: 
        // - Safe square (no attackers): +0
        // - Equal attackers/defenders: 0
        // - More attackers than defenders: negative score proportional to deficit
        if (attackers > defenders) {
            return -(attackers - defenders) * this.pieceValues['p']; // Penalty for being under attack
        } else if (attackers === 0 && defenders === 0) {
            // Empty square is neutral
            return 0;
        }
        return 5; // Small bonus for having a defender on the square
        
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

    getRandomMove(game, allMoves) {
        const botColor = game.gameState.currentTurn === 'white' ? 'black' : 'white';
        const opponentColor = botColor === 'white' ? 'black' : 'white';

        console.log('[BotAI.getRandomMove] Evaluating random safe moves...');
        
        const safeMoves = [];

        for (const move of allMoves) {
            // Clone game state safely for testing this move
            const clonedGame = this.cloneGameForEvaluation(game);
            
            // LOG: Before making the test move - capture original piece info for trade evaluation
            const fromPosLogRandom = `${columns[move.from.col]}${rows[move.from.row]}`;
            const toPosLogRandom = `${columns[move.to.col]}${rows[move.to.row]}`;
            const originalTargetPieceRandom = clonedGame.board.grid[move.to.row][move.to.col];
            
            // Make the test move on the clone
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            // Update turn after the move
            clonedGame.gameState.switchTurn();
            
            let kingInCheck = false;
            const piece = clonedGame.board.grid[move.to.row][move.to.col];
            if (piece && !move.to.isCastling) {
                const kingPos = botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos;
                kingInCheck = clonedGame.gameState.isSquareUnderAttack(clonedGame.board, kingPos.row, kingPos.col, opponentColor);
            }

            const fromPos = `${columns[move.from.col]}${rows[move.from.row]}`;
            const toPos = `${columns[move.to.col]}${rows[move.to.row]}`;
            
            if (!kingInCheck) { 
                // Add piece trade evaluation for captures
                
                const protectionBonus = this.evaluateMoveProtectsVulnerablePiece(clonedGame, move.from.row, move.from.col, move.to.row, move.to.col, botColor);
                if (protectionBonus > 0) {
                    console.log(`    [PROTECTION] ${fromPos} -> ${toPos}: bonus=${protectionBonus.toFixed(0)}`);
                }
                // Calculate trade bonus directly using original target piece info
                let pieceTradeBonusRandom = 0;
                if (originalTargetPieceRandom) {
                    const attackerValue = this.pieceValues[clonedGame.board.grid[move.from.row][move.from.col]?.type || 'p'];
                    const targetValue = this.pieceValues[originalTargetPieceRandom.type];
                    const isGoodTrade = attackerValue <= targetValue;
                    
                    // Count defenders who can recapture the destination square
                    let defenderCount = 0;
                    for (let row = 0; row < 8; row++) {
                        for (let col = 0; col < 8; col++) {
                            const p = clonedGame.board.grid[row][col];
                            if (p && p.color !== botColor) { 
                                if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, move.to.row, move.to.col, p.color)) {
                                    defenderCount++;
                                }
                            }
                        }
                    }
                    
                    // Calculate trade bonus
                    if (isGoodTrade || defenderCount === 0) {
                        pieceTradeBonusRandom = targetValue - attackerValue;
                    } else {
                        const loss = attackerValue - targetValue;
                        pieceTradeBonusRandom = -loss * (1 + defenderCount);
                    }
                    
                    console.log(`    [TRADE] ${fromPosLogRandom} -> ${toPosLogRandom}: captured ${originalTargetPieceRandom.type}, defenders=${defenderCount}, value=${pieceTradeBonusRandom.toFixed(0)}`);
                } else {
                    console.log(`    [TRADE] ${fromPosLogRandom} -> ${toPosLogRandom}: no capture`);
                }
                
                // Get piece safety for the moved piece
                const pieceSafety = this.evaluatePieceSafety(clonedGame, move.to.row, move.to.col, botColor);
                
                const fromPosRandom = `${columns[move.from.col]}${rows[move.from.row]}`;
                const toPosRandom = `${columns[move.to.col]}${rows[move.to.row]}`;

                // Include trade bonus in overall score
                const moveScore = pieceSafety + pieceTradeBonusRandom;
                
                // Accept move if: safe OR has any trade gain (not just negative)
                const isValidMove = pieceSafety >= 0; // Safe square
                const isGainTrade = pieceTradeBonusRandom > 0; // Positive material gain
                
                if (!isValidMove && !isGainTrade) {
                    console.log(`  [UNSAFE/NO_GAIN] ${fromPosRandom} -> ${toPosRandom}: safety=${pieceSafety.toFixed(0)} trade=${pieceTradeBonusRandom.toFixed(0)} (skipped - no material gain to offset loss)`);
                } else if (isValidMove && isGainTrade) {
                    // Safe and has gain
                    console.log(`  [SAFE/GAIN] ${fromPosRandom} -> ${toPosRandom}: safety=${pieceSafety.toFixed(0)} trade=${pieceTradeBonusRandom.toFixed(0)}`);
                    safeMoves.push(move);
                } else if (isValidMove) {
                    // Just safe (no capture)
                    console.log(`  [SAFE/NO_CAPTURE] ${fromPosRandom} -> ${toPosRandom}: safety=${pieceSafety.toFixed(0)}`);
                    safeMoves.push(move);
                } else {
                    // Unsafe but has gain - accept it anyway for Easy mode
                    const actualScore = pieceSafety + pieceTradeBonusRandom;
                    console.log(`  [UNSAFE/GAIN] ${fromPosRandom} -> ${toPosRandom}: safety=${pieceSafety.toFixed(0)} trade=${pieceTradeBonusRandom.toFixed(0)}`);
                    safeMoves.push(move);
                }
            } else {
                console.log(`  [CHECK] ${fromPos} -> ${toPos}`);
            }
        }
        
        // Edge case: If no moves passed our filter but we have legal moves, add all to candidates
        if (safeMoves.length === 0 && allMoves.length > 0) {
            console.warn(`[getRandomMove] No valid moves found after filtering - using ALL ${allMoves.length} legal moves as fallback`);
            safeMoves.push(...allMoves);
        }
        // Fallback: If no valid moves found, use ALL legal moves as fallback to prevent bot from getting stuck
        const candidates = safeMoves.length > 0 ? safeMoves : allMoves;
        
        console.log(`[getRandomMove] Candidates after filtering: ${candidates.length}/${allMoves.length}`);
        if (candidates.length === 0) {
            console.warn('[getRandomMove] WARNING: No candidate moves found! This should not happen.');
            return null;
        }
        
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        console.log(`[BotAI.getRandomMove] Selected: ${columns[selected.from.col]}${rows[selected.from.row]} -> ${columns[selected.to.col]}${rows[selected.to.row]}`);
        return { from: selected.from, to: selected.to };
    }

    isRepetition(game, move) {
        const history = game.moveHistory || [];
        if (history.length >= 2) {
            const lastMove = history[history.length - 1];
            const secondLastMove = history.length >= 2 ? history[history.length - 2] : null;

            if (secondLastMove &&
                move.from.row === secondLastMove.to.row &&
                move.from.col === secondLastMove.to.col &&
                move.to.row === secondLastMove.from.row &&
                move.to.col === secondLastMove.from.col) {
                return true;
            }

            for (let i = 0; i < history.length - 1; i++) {
                if (history[i].from.row === move.to.row &&
                    history[i].from.col === move.to.col &&
                    history[i].to.row === move.from.row &&
                    history[i].to.col === move.from.col) {
                    return true;
                }
            }
        }
        return false;
    }

    getMediumMove(game, botColor, allMoves) {
        // Defensive: ensure allMoves is valid
        if (!allMoves || !Array.isArray(allMoves) || allMoves.length === 0) {
            console.error('[BotAI.getMediumMove] Invalid or empty allMoves:', allMoves);
            return null;
        }
        
        let bestScore = -Infinity;
        let bestScoreMoves = [];
        
        const opponentColor = botColor === 'white' ? 'black' : 'white';

        console.log('[BotAI.getMediumMove] Evaluating', allMoves.length, 'moves...');
        for (const move of allMoves) {
            // Clone game state safely for testing this move
            const clonedGame = this.cloneGameForEvaluation(game);
            
            // LOG: Before making the test move - capture original piece info for trade evaluation
            const fromPosLog = `(${move.from.row},${move.from.col})`;
            const toPosLog = `(${move.to.row},${move.to.col})`;
            const originalTargetPiece = clonedGame.board.grid[move.to.row][move.to.col];
            
            // Make the test move on the clone
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            let kingInCheck = false;
            const piece = clonedGame.board.grid[move.to.row][move.to.col];
            if (piece && !move.to.isCastling) {
                const kingPos = botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos;
                kingInCheck = clonedGame.gameState.isSquareUnderAttack(clonedGame.board, kingPos.row, kingPos.col, opponentColor);
            }

            // Initialize score first (needed for both paths)
            let score;
            const fromPos = `(${move.from.row},${move.from.col})`;
            const toPos = `(${move.to.row},${move.to.col})`;
            
            if (!kingInCheck) {
                // Evaluate the board state after this move
                const baseScore = this.evaluateBoard(clonedGame, botColor);
                
                // Add piece safety bonus/penalty to the score
                score = baseScore;
                const pieceSafety = this.evaluatePieceSafety(clonedGame, move.to.row, move.to.col, botColor);
                
                // Add piece trade evaluation for captures
                let pieceTradeBonus = 0;
                if (originalTargetPiece) {
                    const attackerValue = this.pieceValues[clonedGame.board.grid[move.from.row][move.from.col]?.type || 'p'];
                    const targetValue = this.pieceValues[originalTargetPiece.type];
                    const isGoodTrade = attackerValue <= targetValue;
                    
                    // Count defenders who can recapture the destination square
                    let defenderCount = 0;
                    for (let row = 0; row < 8; row++) {
                        for (let col = 0; col < 8; col++) {
                            const p = clonedGame.board.grid[row][col];
                            if (p && p.color !== botColor) { 
                                if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, move.to.row, move.to.col, p.color)) {
                                    defenderCount++;
                                }
                            }
                        }
                    }
                    
                    // Calculate trade bonus
                    if (isGoodTrade || defenderCount === 0) {
                        pieceTradeBonus = targetValue - attackerValue;
                    } else {
                        const loss = attackerValue - targetValue;
                        pieceTradeBonus = -loss * (1 + defenderCount);
                    }
                    
                    console.log(`  [TRADE] ${fromPosLog} -> ${toPosLog}: captured ${originalTargetPiece.type}, defenders=${defenderCount}, value=${pieceTradeBonus.toFixed(0)}`);
                } else {
                    console.log(`  [TRADE] ${fromPosLog} -> ${toPosLog}: no capture`);
                }
                
                score += pieceSafety + pieceTradeBonus;
                
                // Add protection bonus for moves that attack threatening pieces
                const protectionBonus = this.evaluateMoveProtectsVulnerablePiece(clonedGame, move.from.row, move.from.col, move.to.row, move.to.col, botColor);
                if (protectionBonus > 0) {
                    score += protectionBonus;
                    console.log(`    [PROTECTION] ${fromPos} -> ${toPos}: bonus=${protectionBonus.toFixed(0)}`);
                }
                const reasons = [];
                
                // Check for repetition in cloned game's history (we need to simulate it)
                if (this.isRepetition(clonedGame, move)) { 
                    score -= 200; 
                    reasons.push('repetition(-200)');
                }

                const isEarlyGame = clonedGame.moveHistory.length < 15;
                const pieceType = piece ? piece.type : '';
                if (pieceType === 'k' && isEarlyGame) {
                    const startRow = botColor === 'white' ? 7 : 0;
                    if (move.from.row !== startRow || move.to.row !== startRow) {
                        score -= 300;
                        reasons.push('earlyKing(-300)');
                    }
                }

                // Check for rook on starting squares
                const pieceTypeForRook = piece ? piece.type : '';
                if (pieceTypeForRook === 'r' && 
                   ((move.to.row === 0 && move.to.col === 0) || (move.to.row === 7 && move.to.col === 7))) {
                    score -= 50;
                    reasons.push('rookStart(-50)');
                }

                console.log(`[BotAI.getMediumMove] ${fromPos} -> ${toPos}: score=${score.toFixed(1)} (${reasons.join(', ')})`);
            } else {
                // King in check - this move is invalid, give very low score
                let pieceTradeBonusKingCheck = 0;
                if (originalTargetPiece) {
                    const attackerValue = this.pieceValues[clonedGame.board.grid[move.from.row][move.from.col]?.type || 'p'];
                    const targetValue = this.pieceValues[originalTargetPiece.type];
                    const isGoodTrade = attackerValue <= targetValue;
                    
                    // Count defenders who can recapture the destination square
                    let defenderCount = 0;
                    for (let row = 0; row < 8; row++) {
                        for (let col = 0; col < 8; col++) {
                            const p = clonedGame.board.grid[row][col];
                            if (p && p.color !== botColor) { 
                                if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, move.to.row, move.to.col, p.color)) {
                                    defenderCount++;
                                }
                            }
                        }
                    }
                    
                    // Calculate trade bonus
                    if (isGoodTrade || defenderCount === 0) {
                        pieceTradeBonusKingCheck = targetValue - attackerValue;
                    } else {
                        const loss = attackerValue - targetValue;
                        pieceTradeBonusKingCheck = -loss * (1 + defenderCount);
                    }
                    
                    console.log(`    [TRADE] ${fromPosLog} -> ${toPosLog}: captured ${originalTargetPiece.type}, defenders=${defenderCount}, value=${pieceTradeBonusKingCheck.toFixed(0)}`);
                } else {
                    console.log(`    [TRADE] ${fromPosLog} -> ${toPosLog}: no capture`);
                }
                
                score = -Infinity + pieceTradeBonusKingCheck; // Still consider trade value for logging
                console.log(`[BotAI.getMediumMove] ${fromPosLog} -> ${toPosLog}: kingInCheck (skipped)`);
            }

            if (score > bestScore) { 
                bestScore = score; 
                bestScoreMoves = [move]; 
            } else if (score === bestScore) { 
                bestScoreMoves.push(move); 
            }
        }
        
        console.log(`[BotAI.getMediumMove] Best score: ${bestScore}, Options count: ${bestScoreMoves.length}`);

        // Return move or null if none found
        const result = bestScoreMoves.length > 0
            ? bestScoreMoves[Math.floor(Math.random() * bestScoreMoves.length)]
            : (allMoves && allMoves.length > 0) ? allMoves[0] : null;
            
        console.log('[BotAI.getMediumMove] Result:', result ? 'valid move' : 'null');
        return result;
    }

    getHardMove(game, botColor, allMoves) {
        // Defensive: ensure allMoves is valid
        if (!allMoves || !Array.isArray(allMoves) || allMoves.length === 0) {
            console.error('[BotAI.getHardMove] Invalid or empty allMoves:', allMoves);
            return null;
        }
        
        const safeMoves = [];
        
        for (const move of allMoves) {
            // Clone game state safely
            const clonedGame = this.cloneGameForEvaluation(game);
            
            // LOG: Before making the test move - capture original piece info for trade evaluation
            const fromPosLogHard = `(${move.from.row},${move.from.col})`;
            const toPosLogHard = `(${move.to.row},${move.to.col})`;
            const originalTargetPieceHard = clonedGame.board.grid[move.to.row][move.to.col];
            
            // Make the test move on clone
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            let kingInCheck = false;
            const piece = clonedGame.board.grid[move.to.row][move.to.col];
            if (piece && !move.to.isCastling) {
                const opponentColor = botColor === 'white' ? 'black' : 'white';
                const kingPos = botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos;
                kingInCheck = clonedGame.gameState.isSquareUnderAttack(clonedGame.board, kingPos.row, kingPos.col, opponentColor);
            }
            
            if (!kingInCheck) {
                // Add piece trade evaluation for captures
                
                const fromPos = `${columns[move.from.col]}${rows[move.from.row]}`;
                const toPos = `${columns[move.to.col]}${rows[move.to.row]}`;
                
                const protectionBonus = this.evaluateMoveProtectsVulnerablePiece(clonedGame, move.from.row, move.from.col, move.to.row, move.to.col, botColor);
                if (protectionBonus > 0) {
                    console.log(`    [PROTECTION] ${fromPos} -> ${toPos}: bonus=${protectionBonus.toFixed(0)}`);
                }
                
                // Calculate piece trade bonus directly using original target piece info
                let pieceTradeBonus = 0;
                if (originalTargetPieceHard) {
                    const attackerValue = this.pieceValues[clonedGame.board.grid[move.from.row][move.from.col]?.type || 'p'];
                    const targetValue = this.pieceValues[originalTargetPieceHard.type];
                    const isGoodTrade = attackerValue <= targetValue;
                    
                    // Count defenders who can recapture the destination square
                    let defenderCount = 0;
                    for (let row = 0; row < 8; row++) {
                        for (let col = 0; col < 8; col++) {
                            const p = clonedGame.board.grid[row][col];
                            if (p && p.color !== botColor) { 
                                if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, move.to.row, move.to.col, p.color)) {
                                    defenderCount++;
                                }
                            }
                        }
                    }
                    
                    // Calculate trade bonus
                    if (isGoodTrade || defenderCount === 0) {
                        pieceTradeBonus = targetValue - attackerValue;
                    } else {
                        const loss = attackerValue - targetValue;
                        pieceTradeBonus = -loss * (1 + defenderCount);
                    }
                    
                    console.log(`    [TRADE] ${fromPosLogHard} -> ${toPosLogHard}: captured ${originalTargetPieceHard.type}, defenders=${defenderCount}, value=${pieceTradeBonus.toFixed(0)}`);
                } else {
                    console.log(`    [TRADE] ${fromPosLogHard} -> ${toPosLogHard}: no capture`);
                }
                
                // Check piece safety - don't move to a square where piece will be attacked immediately
                const pieceSafety = this.evaluatePieceSafety(clonedGame, move.to.row, move.to.col, botColor);
                
                const fromPosLog = `${columns[move.from.col]}${rows[move.from.row]}`;
                const toPosLog = `${columns[move.to.col]}${rows[move.to.row]}`;
                
                // Include trade bonus in safety check - accept moves with pieceTradeBonus that offset negative safety by at least 2 pawns worth
            const overallScore = pieceSafety + pieceTradeBonus;
            if (overallScore >= -200) { // Allow trades where gain outweighs safety loss by at least 2 pawns worth
                    safeMoves.push(move);
                    console.log(`[getHardMove] Safe: ${fromPosLog} -> ${toPosLog}: safety=${pieceSafety.toFixed(0)} trade=${pieceTradeBonus.toFixed(0)}`);
                } else {
                    console.log(`[getHardMove] Unsafe (skipped): ${fromPosLog} -> ${toPosLog}: safety=${pieceSafety.toFixed(0)} trade=${pieceTradeBonus.toFixed(0)}`);
                }
            }
        }

        const candidates = safeMoves.length > 0 ? safeMoves : allMoves;

        if (!candidates || candidates.length === 0) {
            return null;
        }

        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of candidates) {
            // Clone game state safely
            const clonedGame = this.cloneGameForEvaluation(game);
            
            // Make the test move on clone
            this.makeMoveOnClonedGame(clonedGame, move.from, move.to);
            
            const opponentColor = botColor === 'white' ? 'black' : 'white';
            let oppScore = this.minimax(clonedGame, opponentColor, 1);
            
            // Calculate check penalty based on cloned game state
            let checkPenalty = 0;
            if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, 
                botColor === 'white' ? clonedGame.gameState.whiteKingPos : clonedGame.gameState.blackKingPos,
                opponentColor)) {
                checkPenalty = -500;
            }
            
            // Add piece safety and protection bonus to Hard mode evaluation
            const fromPos = `${columns[move.from.col]}${rows[move.from.row]}`;
            const toPos = `${columns[move.to.col]}${rows[move.to.row]}`;
            
            const protectionBonus = this.evaluateMoveProtectsVulnerablePiece(clonedGame, move.from.row, move.from.col, move.to.row, move.to.col, botColor);
                
            if (protectionBonus > 0) {
                console.log(`    [PROTECTION] ${fromPos} -> ${toPos}: bonus=${protectionBonus.toFixed(0)}`);
            }
                
            const pieceSafety = this.evaluatePieceSafety(clonedGame, move.to.row, move.to.col, botColor);
            
            // Calculate piece trade bonus for Hard mode evaluation
            let pieceTradeBonusHard = 0;
            const targetPieceAtDestination = clonedGame.board.grid[move.to.row][move.to.col];
            if (targetPieceAtDestination) {
                const attackerValue = this.pieceValues[clonedGame.board.grid[move.from.row][move.from.col]?.type || 'p'];
                const targetValue = this.pieceValues[targetPieceAtDestination.type];
                const isGoodTrade = attackerValue <= targetValue;
                
                // Count defenders who can recapture the destination square
                let defenderCountHard = 0;
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const p = clonedGame.board.grid[row][col];
                        if (p && p.color !== botColor) { 
                            if (clonedGame.gameState.isSquareUnderAttack(clonedGame.board, move.to.row, move.to.col, p.color)) {
                                defenderCountHard++;
                            }
                        }
                    }
                }
                
                // Calculate trade bonus
                if (isGoodTrade || defenderCountHard === 0) {
                    pieceTradeBonusHard = targetValue - attackerValue;
                } else {
                    const loss = attackerValue - targetValue;
                    pieceTradeBonusHard = -loss * (1 + defenderCountHard);
                }
            }
            
            const score = -oppScore + checkPenalty + pieceSafety + pieceTradeBonusHard + protectionBonus;
            let repetitionPenalty = 0;
            if (this.isRepetition(clonedGame, move)) { repetitionPenalty = -300; }

            const isEarlyGame = clonedGame.moveHistory.length < 15;
            const pieceType = clonedGame.board.grid[move.to.row][move.to.col] ? clonedGame.board.grid[move.to.row][move.to.col].type : '';
            if (pieceType === 'k' && isEarlyGame) {
                score -= 200;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove || candidates[0];
    }

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
                // Clone game state safely
                const clonedGame = this.cloneGameForEvaluation(game);
                
                // Make the test move on clone
                this.makeMoveOnClonedGame(clonedGame, item.move.from, item.move.to);
                
                // After making a move, it's white's turn next
                const score = this.minimax(clonedGame, 'white', depth - 1, bestScore, beta);
                bestScore = Math.max(bestScore, score);
                if (bestScore >= beta) { break; }
            }
        } else {
            bestScore = beta;
            for (const item of scoredMoves) {
                // Clone game state safely
                const clonedGame = this.cloneGameForEvaluation(game);
                
                // Make the test move on clone
                this.makeMoveOnClonedGame(clonedGame, item.move.from, item.move.to);
                
                // After making a move, it's black's turn next
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

    makeMove(game) {
        const botColor = 'black';
        console.log(`\n=== [BotAI.makeMove] Black's Turn ===`);
        console.log('[BotAI.makeMove] Bot difficulty:', this.difficulty);
        
        const allMoves = this.getAllLegalMovesForColor(game, botColor);

        if (allMoves.length === 0) {
            if (game.gameState.isCheck(botColor)) { return { type: 'checkmate', winner: game.gameState.currentTurn }; }
            else { return { type: 'stalemate' }; }
        }

        console.log(`[BotAI.makeMove] All ${allMoves.length} legal moves:`);
        allMoves.forEach((m, i) => {
            const fromPos = `${columns[m.from.col]}${rows[m.from.row]}`;
            const toPos = `${columns[m.to.col]}${rows[m.to.row]}`;
            console.log(`  [${i}] ${fromPos} -> ${toPos}`);
        });

        let bestMove = null;

        switch (this.difficulty) {
            case 'easy': 
                bestMove = this.getRandomMove(game, allMoves);
                break;
            case 'medium': 
                bestMove = this.getMediumMove(game, botColor, allMoves); 
                console.log('[BotAI.makeMove] Medium difficulty selected move');
                break;
            case 'hard': 
                bestMove = this.getHardMove(game, botColor, allMoves); 
                console.log('[BotAI.makeMove] Hard difficulty selected move');
                break;
        }

        if (!bestMove || !bestMove.from || !bestMove.to) {
            console.warn('[BotAI.makeMove] No valid move found, using first available');
            bestMove = allMoves[0];
        }

        const fromPosBest = `${columns[bestMove.from.col]}${rows[bestMove.from.row]}`;
        const toPosBest = `${columns[bestMove.to.col]}${rows[bestMove.to.row]}`;
        console.log(`[BotAI.makeMove] SELECTED: ${fromPosBest} -> ${toPosBest}\n`);

        return { type: 'move', from: bestMove.from, to: bestMove.to };
    }
}