// ============================================================================
// Bot AI - Difficulty Modes & Move Selection (extension of BotAI.prototype)
// ============================================================================
// The public entry point makeMove() picks a move per difficulty:
//   easy   -> getRandomMove()
//   medium -> getMediumMove() (uses the evaluation framework)
//   hard   -> getHardMove()   (uses the search engine)
// Loaded after bot-ai.js, bot-ai-evaluation.js and bot-ai-engine.js.
// Extends the shared BotAI.prototype; methods are resolved at call-time.

Object.assign(BotAI.prototype, {
    // Convert a {row, col} position to algebraic notation (e.g. d4).
    formatMovePosition(pos) {
        const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
        return `${columns[pos.col]}${rows[pos.row]}`;
    },

    // Easy mode: a random move that doesn't leave the king in check.
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
    },

    // Medium mode: score every legal move with the evaluation framework and
    // pick randomly among the top-scored moves.
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
    },

    // Hard mode: iterative-deepening negamax search (via the Web Worker, or the
    // synchronous fallback). Prefers the best move that isn't an immediate reversal.
    getHardMove(game, botColor, allMoves) {
        if (!allMoves || !Array.isArray(allMoves) || allMoves.length === 0) {
            this.logError('[BotAI.getHardMove] Invalid or empty allMoves:', allMoves);
            return null;
        }
        this.logInfo('[BotAI.getHardMove] Iterative-deepening search (bounded fallback)...');
        const result = this.searchBestMoveIterative(game, botColor, 3, 250);
        if (result && result.candidates.length > 0) {
            // Prefer the best move that isn't an immediate reversal of the last move
            // (preserves the proven anti-repetition fix for the Rb8/Ra8 cycling).
            let chosen = result.candidates.find(c => !this.isRepetition(game, c));
            if (!chosen) chosen = result.candidates[0];
            this.logInfo(`[BotAI.getHardMove] Chosen: ${this.formatMovePosition(chosen.from)} -> ${this.formatMovePosition(chosen.to)} ` +
                `(depth=${result.depth}, nodes=${result.nodes}, ${result.ms}ms, score=${chosen.score.toFixed(0)})`);
            return chosen;
        }
        this.logWarning('[BotAI.getHardMove] Search found no move; falling back to random safe move');
        const safeMoves = this.filterSafeMoves(game, botColor, allMoves);
        const candidates = safeMoves.length > 0 ? safeMoves : allMoves;
        return candidates[Math.floor(Math.random() * candidates.length)];
    },

    // Public entry point: pick a move for the bot (always black) and return it.
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
    },
});