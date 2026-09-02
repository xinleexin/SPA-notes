// ============================================
// CHESS GAME SPA - Bot AI Web Worker
// Runs the 'hard' search off the main thread. Loads the shared DOM-free engine
// (chess-core.js) and the BotAI class (bot-ai.js), then performs iterative-deepening
// negamax and posts the best move back.
// ============================================

importScripts('chess-core.js?v=3', 'bot-ai.js?v=3', 'bot-ai-evaluation.js?v=3', 'bot-ai-engine.js?v=3', 'bot-ai-moves.js?v=3');

function buildGameFromMessage(msg) {
    const board = new ChessBoard();
    board.grid = msg.board.map(row => row.map(cell => cell ? createPiece(cell.type, cell.color) : null));
    const gameState = new GameState(board);
    gameState.currentTurn = msg.turn;
    if (msg.castlingRights) { gameState.castlingRights = msg.castlingRights; }
    gameState.enPassantTarget = msg.enPassantTarget || null;
    if (msg.whiteKingPos) { gameState.whiteKingPos = msg.whiteKingPos; }
    if (msg.blackKingPos) { gameState.blackKingPos = msg.blackKingPos; }
    return { board, gameState, moveHistory: msg.moveHistory || [] };
}

self.onmessage = function (event) {
    const msg = event.data;
    if (!msg || msg.cmd !== 'search') {
        self.postMessage({ cmd: 'error', message: 'Unknown message: ' + JSON.stringify(msg) });
        return;
    }
    try {
        const game = buildGameFromMessage(msg);
        const bot = new BotAI('hard');
        const maxDepth = msg.maxDepth || 4;
        const timeBudgetMs = msg.timeBudgetMs || 400;
        const result = bot.searchBestMoveIterative(game, msg.turn, maxDepth, timeBudgetMs);

        if (!result || !result.best) {
            self.postMessage({ cmd: 'error', message: 'No legal move found' });
            return;
        }
        self.postMessage({
            cmd: 'result',
            from: result.best.from,
            to: result.best.to,
            depth: result.depth,
            nodes: result.nodes,
            ms: result.ms
        });
    } catch (err) {
        self.postMessage({ cmd: 'error', message: (err && err.message) ? err.message : String(err) });
    }
};
