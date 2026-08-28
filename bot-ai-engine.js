// ============================================================================
// Bot AI - Search Engine (extension of BotAI.prototype)
// ============================================================================
// Negamax + alpha-beta + iterative deepening. Used by 'hard' mode (via the
// Web Worker) and the synchronous fallback. Loaded after bot-ai.js and
// bot-ai-evaluation.js (negamax depends on evaluatePosition).
// Extends the shared BotAI.prototype; methods are resolved at call-time.

Object.assign(BotAI.prototype, {
    // Legal moves for a specific color, without per-node logging. Returns [{from, to}].
    getLegalMovesForColorQuiet(game, color) {
        const originalTurn = game.gameState.currentTurn;
        game.gameState.currentTurn = color;
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = game.board.grid[row][col];
                if (piece && piece.color === color) {
                    const legal = game.gameState.getLegalMoves(game.board, row, col);
                    for (const m of legal) { moves.push({ from: { row, col }, to: m }); }
                }
            }
        }
        game.gameState.currentTurn = originalTurn;
        return moves;
    },

    // Compact position signature for repetition detection.
    positionSignature(game) {
        let sig = '';
        const grid = game.board.grid;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = grid[r][c];
                sig += p ? (p.color === 'black' ? p.type.toUpperCase() : p.type) : '.';
            }
        }
        sig += ' ' + game.gameState.currentTurn;
        const cr = game.gameState.castlingRights;
        sig += (cr.whiteKingMoved ? '' : 'W') + (cr.blackKingMoved ? '' : 'B') +
               (cr.whiteRookKingSideMoved ? '' : 'w') + (cr.blackRookKingSideMoved ? '' : 'b') +
               (cr.whiteRookQueenSideMoved ? '' : 'Q') + (cr.blackRookQueenSideMoved ? '' : 'q');
        const ep = game.gameState.enPassantTarget;
        sig += ep ? (' ep' + ep.row + ep.col) : ' noep';
        return sig;
    },

    // Move ordering: MVV-LVA captures first, then pawn advances (cheap, no cloning).
    orderMoves(game, color, moves) {
        const scored = moves.map(move => {
            let score = 0;
            const fromPiece = game.board.grid[move.from.row][move.from.col];
            const target = game.board.grid[move.to.row][move.to.col];
            if (target) {
                score += 10 * this.pieceValues[target.type] - this.pieceValues[fromPiece.type];
            }
            if (fromPiece.type === 'p') {
                const dir = color === 'white' ? -1 : 1;
                if (move.to.row === move.from.row + dir * 2) score += 2;
                if (move.to.row === 0 || move.to.row === 7) score += 20; // promotion
            }
            return { move, score };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.map(s => s.move);
    },

    // Abort the search if the time budget is exceeded (checked every 64 nodes).
    _checkTime() {
        if ((this._nodeCount & 0x3F) === 0 && (Date.now() - this._searchStart > this._timeBudget)) {
            throw this._timeoutSentinel;
        }
    },

    // Negamax with alpha-beta. Returns score from `color`'s perspective.
    negamax(game, color, depth, alpha, beta, ply, pathSet) {
        this._nodeCount++;
        this._checkTime();

        const moves = this.getLegalMovesForColorQuiet(game, color);
        if (moves.length === 0) {
            // No legal moves: checkmate (bad for color) or stalemate (draw).
            return game.gameState.isCheck(color) ? -(this.MATE_SCORE - ply) : 0;
        }
        if (depth === 0) {
            return this.evaluatePosition(game, color);
        }

        const opponent = color === 'white' ? 'black' : 'white';
        const ordered = this.orderMoves(game, color, moves);
        let best = -Infinity;
        for (const move of ordered) {
            const cloned = this.cloneGameForEvaluation(game);
            this.makeMoveOnClonedGame(cloned, move.from, move.to);
            cloned.gameState.currentTurn = opponent;
            const sig = this.positionSignature(cloned);
            let score;
            if (pathSet.has(sig)) {
                score = 0; // threefold repetition -> draw
            } else {
                pathSet.add(sig);
                score = -this.negamax(cloned, opponent, depth - 1, -beta, -alpha, ply + 1, pathSet);
                pathSet.delete(sig);
            }
            if (score > best) best = score;
            if (best >= beta) break; // beta cutoff
            if (best > alpha) alpha = best;
        }
        return best;
    },

    // Root search at a fixed depth. Returns { candidates: [{from,to,score}], score }.
    searchBestMove(game, color, depth) {
        const moves = this.getLegalMovesForColorQuiet(game, color);
        if (moves.length === 0) return { candidates: [], score: 0 };
        const ordered = this.orderMoves(game, color, moves);
        const opponent = color === 'white' ? 'black' : 'white';
        const pathSet = new Set([this.positionSignature(game)]);
        let alpha = -Infinity;
        const scored = [];
        for (const move of ordered) {
            this._checkTime();
            const cloned = this.cloneGameForEvaluation(game);
            this.makeMoveOnClonedGame(cloned, move.from, move.to);
            cloned.gameState.currentTurn = opponent;
            const score = -this.negamax(cloned, opponent, depth - 1, -Infinity, -alpha, 1, pathSet);
            scored.push({ from: move.from, to: move.to, score });
            if (score > alpha) alpha = score;
        }
        scored.sort((a, b) => b.score - a.score);
        return { candidates: scored, score: scored[0].score };
    },

    // Iterative deepening: search depth 1..maxDepth, keeping the best result from the
    // deepest depth that completed within the time budget.
    searchBestMoveIterative(game, color, maxDepth, timeBudgetMs) {
        const start = Date.now();
        this._searchStart = start;
        this._timeBudget = timeBudgetMs;
        this._nodeCount = 0;
        let best = null;
        let lastDepth = 0;
        for (let depth = 1; depth <= maxDepth; depth++) {
            try {
                const result = this.searchBestMove(game, color, depth);
                if (result.candidates.length > 0) {
                    best = result;
                    lastDepth = depth;
                }
                if (best && best.score >= this.MATE_SCORE - 10) break; // found a forced mate
            } catch (e) {
                if (e === this._timeoutSentinel) break; // time exceeded; keep previous depth
                throw e;
            }
        }
        return {
            candidates: best ? best.candidates : [],
            best: best ? best.candidates[0] : null,
            depth: lastDepth,
            nodes: this._nodeCount,
            ms: Date.now() - start
        };
    },
});