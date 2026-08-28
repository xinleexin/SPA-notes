// ============================================================================
// Bot AI - Evaluation (extension of BotAI.prototype)
// ============================================================================
// Position and move evaluation. Loaded after bot-ai.js (which defines the
// BotAI class) and before bot-ai-engine.js / bot-ai-moves.js.
// Extends the shared BotAI.prototype; methods are resolved at call-time.

Object.assign(BotAI.prototype, {
    // Main board evaluation: material + positional tables (black-positive).
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
    },

    // Safety of the destination square: attackers vs defenders after the move.
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
    },

    // All opponent pieces that attack a bot piece (used for protection bonus).
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
    },

    // Bonus if the move attacks (thereby protecting against) a threatened piece.
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
    },

    // Calculate complete move score with all components.
    // Returns an object with all scoring components for detailed logging.
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
    },

    // Position evaluation from a given color's perspective (positive = good for forColor).
    evaluatePosition(game, forColor) {
        const s = this.evaluateBoard(game);
        return forColor === 'black' ? s : -s;
    },
});