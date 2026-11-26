/* =========================================================
 * 井字棋 Tic-Tac-Toe（HW06）
 * 玩家 X 先手、電腦 O 後手。
 * 電腦使用 Minimax（含 Alpha-Beta 剪枝與步數權重）搜尋整棵賽局樹，
 * 因此永遠不會輸：玩家最佳結果只能是平手。
 * ========================================================= */

const HUMAN = 'X';
const AI = 'O';
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // 橫
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // 直
  [0, 4, 8], [2, 4, 6],            // 斜
];

/* ---------------- 遊戲邏輯（純函式，可單獨測試） ---------------- */

/** 回傳 { winner: 'X'|'O', line: [a,b,c] }、{ winner: 'draw' } 或 null */
function getResult(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return board.every(Boolean) ? { winner: 'draw' } : null;
}

/**
 * Minimax：電腦得分為正，玩家得分為負。
 * 以 10 - depth 計分，讓電腦優先「快贏」、必要時「慢輸」（實際上不會輸）。
 */
function minimax(board, depth, isAiTurn, alpha, beta) {
  const result = getResult(board);
  if (result) {
    if (result.winner === AI) return 10 - depth;
    if (result.winner === HUMAN) return depth - 10;
    return 0;
  }

  let best = isAiTurn ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = isAiTurn ? AI : HUMAN;
    const score = minimax(board, depth + 1, !isAiTurn, alpha, beta);
    board[i] = null;
    if (isAiTurn) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

/** 找出電腦最佳落子；同分的好棋隨機挑一個，讓每局變化更多 */
function bestMove(board, random = Math.random) {
  let bestScore = -Infinity;
  let candidates = [];
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = AI;
    const score = minimax(board, 1, false, -Infinity, Infinity);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      candidates = [i];
    } else if (score === bestScore) {
      candidates.push(i);
    }
  }
  return candidates[Math.floor(random() * candidates.length)];
}

/* 讓 Node 測試可以 require 這些函式 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getResult, bestMove, HUMAN, AI, LINES };
}

/* ---------------- 畫面與動畫 ---------------- */

if (typeof document !== 'undefined') {
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const historyEl = document.getElementById('history');
  const winSvg = document.getElementById('win-line');
  const winStroke = document.getElementById('win-stroke');
  const confettiEl = document.getElementById('confetti');
  const scoreEls = {
    X: document.getElementById('score-x'),
    O: document.getElementById('score-o'),
    draw: document.getElementById('score-draw'),
  };
  const POS = ['左上', '上', '右上', '左', '中', '右', '左下', '下', '右下'];

  let board, locked, gameOver, moveNo;
  const scores = JSON.parse(localStorage.getItem('ttt-scores') || '{"X":0,"O":0,"draw":0}');

  const xSvg = (cls) =>
    `<svg viewBox="0 0 100 100" class="${cls}">
       <line class="mark x" x1="18" y1="18" x2="82" y2="82" style="--len:91"/>
       <line class="mark x second" x1="82" y1="18" x2="18" y2="82" style="--len:91"/>
     </svg>`;
  const oSvg = () =>
    `<svg viewBox="0 0 100 100" class="pop">
       <circle class="mark o draw-in" cx="50" cy="50" r="34" style="--len:214"
               transform="rotate(-90 50 50)"/>
     </svg>`;

  function buildBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.index = i;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${POS[i]}，空格`);
      cell.innerHTML = xSvg('ghost'); // 懸停預覽
      cell.addEventListener('click', () => onHumanMove(i));
      boardEl.appendChild(cell);
    }
  }

  function placeMark(i, player) {
    board[i] = player;
    const cell = boardEl.children[i];
    cell.classList.add('filled');
    cell.setAttribute('aria-label', `${POS[i]}，${player}`);
    if (player === HUMAN) {
      cell.innerHTML = xSvg('pop');
      cell.querySelectorAll('line').forEach((l) => l.classList.add('draw-in'));
    } else {
      cell.innerHTML = oSvg();
    }
    moveNo++;
    const li = document.createElement('li');
    li.className = player.toLowerCase();
    li.textContent = `${moveNo}. ${player} ${POS[i]}`;
    historyEl.appendChild(li);
  }

  function setStatus(text, cls = '') {
    statusEl.textContent = text;
    statusEl.className = 'status ' + cls;
  }

  function setTurn(player) {
    document.querySelector('.score.x').classList.toggle('active', player === HUMAN);
    document.querySelector('.score.o').classList.toggle('active', player === AI);
  }

  function onHumanMove(i) {
    if (locked || gameOver || board[i]) {
      if (!gameOver && board[i]) {
        boardEl.classList.remove('shake');
        void boardEl.offsetWidth; // 重新觸發動畫
        boardEl.classList.add('shake');
      }
      return;
    }
    placeMark(i, HUMAN);
    if (checkEnd()) return;

    // 電腦「思考」一下再落子，讓動態更自然
    locked = true;
    boardEl.classList.add('locked');
    setTurn(AI);
    setStatus('電腦思考中', 'thinking');
    setTimeout(() => {
      const move = bestMove(board.slice());
      placeMark(move, AI);
      locked = false;
      boardEl.classList.remove('locked');
      if (!checkEnd()) {
        setTurn(HUMAN);
        setStatus('輪到你下棋');
      }
    }, 450 + Math.random() * 350);
  }

  function checkEnd() {
    const result = getResult(board);
    if (!result) return false;
    gameOver = true;
    locked = true;
    boardEl.classList.add('locked');
    setTurn(null);

    if (result.winner === 'draw') {
      setStatus('平手！電腦守住了 🤝', 'draw');
      boardEl.classList.add('shake');
    } else {
      drawWinLine(result.line);
      for (let i = 0; i < 9; i++) {
        boardEl.children[i].classList.add(result.line.includes(i) ? 'highlight' : 'dim');
      }
      if (result.winner === HUMAN) {
        setStatus('你贏了！🎉', 'win');
        confetti();
      } else {
        setStatus('電腦獲勝！再接再厲 🤖', 'lose');
      }
    }
    scores[result.winner]++;
    localStorage.setItem('ttt-scores', JSON.stringify(scores));
    renderScores(result.winner);
    return true;
  }

  function drawWinLine([a, , c]) {
    // 依棋盤 300x300 座標計算格子中心
    const center = (i) => [50 + (i % 3) * 100, 50 + Math.floor(i / 3) * 100];
    const [x1, y1] = center(a);
    const [x2, y2] = center(c);
    // 往外延伸一點，讓線條穿過整排
    const dx = (x2 - x1) * 0.15, dy = (y2 - y1) * 0.15;
    winStroke.setAttribute('x1', x1 - dx);
    winStroke.setAttribute('y1', y1 - dy);
    winStroke.setAttribute('x2', x2 + dx);
    winStroke.setAttribute('y2', y2 + dy);
    winSvg.classList.remove('show');
    void winSvg.getBoundingClientRect();
    winSvg.classList.add('show');
  }

  function confetti() {
    const colors = ['#38bdf8', '#f472b6', '#facc15', '#4ade80', '#a78bfa'];
    for (let k = 0; k < 80; k++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[k % colors.length];
      p.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      p.style.animationDelay = Math.random() * 0.4 + 's';
      confettiEl.appendChild(p);
      setTimeout(() => p.remove(), 4200);
    }
  }

  function renderScores(bumped) {
    for (const k of Object.keys(scoreEls)) scoreEls[k].textContent = scores[k];
    if (bumped) {
      const box = scoreEls[bumped].parentElement;
      box.classList.remove('bump');
      void box.offsetWidth;
      box.classList.add('bump');
    }
  }

  function newGame() {
    board = Array(9).fill(null);
    locked = false;
    gameOver = false;
    moveNo = 0;
    historyEl.innerHTML = '';
    winSvg.classList.remove('show');
    boardEl.classList.remove('locked', 'shake');
    // 重播棋盤進場動畫
    boardEl.style.animation = 'none';
    void boardEl.offsetWidth;
    boardEl.style.animation = '';
    buildBoard();
    setTurn(HUMAN);
    setStatus('輪到你下棋');
  }

  document.getElementById('restart').addEventListener('click', newGame);
  document.getElementById('reset-score').addEventListener('click', () => {
    scores.X = scores.O = scores.draw = 0;
    localStorage.setItem('ttt-scores', JSON.stringify(scores));
    renderScores();
  });

  renderScores();
  newGame();
}
