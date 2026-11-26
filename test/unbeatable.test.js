// 窮舉玩家（先手 X）所有可能下法，驗證電腦（後手 O）從不落敗
// 執行：node test/unbeatable.test.js
const { getResult, bestMove, HUMAN, AI } = require('../script.js');

let games = 0, losses = 0, draws = 0, aiWins = 0;
const tieBreaks = [0, 0.26, 0.51, 0.76, 0.999]; // 涵蓋同分好棋的不同挑選

function play(board, r) {
  const res = getResult(board);
  if (res) {
    games++;
    if (res.winner === HUMAN) { losses++; console.error('電腦輸了：', board.join(',')); }
    else if (res.winner === AI) aiWins++;
    else draws++;
    return;
  }
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const b = board.slice();
    b[i] = HUMAN;
    if (!getResult(b)) b[bestMove(b.slice(), () => r)] = AI;
    play(b, r);
  }
}

for (const r of tieBreaks) play(Array(9).fill(null), r);
console.log(`共 ${games} 局：電腦勝 ${aiWins}、平手 ${draws}、電腦敗 ${losses}`);
if (losses) process.exit(1);
console.log('✅ 電腦後手不敗');
