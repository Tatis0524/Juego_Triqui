/* ==========================================================================
   Triqui · Tres en Raya — Lógica del juego (JavaScript vanilla)
   --------------------------------------------------------------------------
   Estructura del archivo:
     1. Constantes
     2. Estado del juego
     3. Referencias al DOM
     4. Inicialización y eventos
     5. Pantallas (menú / juego)
     6. Tablero y jugadas
     7. Reglas (ganador / empate / turno)
     8. Marcador
     9. Modo contra computadora y niveles de dificultad
    10. Algoritmo Minimax (nivel difícil)
    11. Modal de resultado
   ========================================================================== */

(function () {
  'use strict';

  /* ======================================================================
     1. CONSTANTES
     ====================================================================== */

  // Todas las combinaciones que otorgan la victoria (3 en línea)
  const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
    [0, 4, 8], [2, 4, 6]             // diagonales
  ];

  const PLAYER_X = 'X';
  const PLAYER_O = 'O';

  const MODE_TWO_PLAYERS = '2p';
  const MODE_VS_COMPUTER = 'cpu';

  const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' };

  const DIFFICULTY_HINTS = {
    easy: 'La computadora elige sus casillas al azar: es el nivel ideal para empezar.',
    medium: 'Busca ganar en cuanto puede y a veces bloquea tus amenazas; el resto de sus jugadas es aleatorio, así que es superable.',
    hard: 'Usa el algoritmo Minimax: analiza todas las jugadas posibles. Con un juego perfecto el resultado es empate.'
  };

  const MODE_LABELS = { '2p': '2 jugadores', cpu: 'Contra la computadora' };

  // Nivel MEDIO: siempre aprovecha una victoria inmediata, pero bloquea y
  // controla el centro solo *a veces*, por lo que es superable (a diferencia
  // del nivel difícil, que nunca pierde).
  const MEDIUM_BLOCK_CHANCE = 0.3;
  const MEDIUM_CENTER_CHANCE = 0.5;
  const MEDIUM_CORNER_CHANCE = 0.35;

  const COMPUTER_MOVE_DELAY = 450;  // pausa antes de que "piense" la IA
  const RESULT_MODAL_DELAY = 850;   // espera para mostrar el modal (se ve la animación de victoria)

  /* ======================================================================
     2. ESTADO DEL JUEGO
     ====================================================================== */

  const state = {
    board: Array(9).fill(''),   // casillas del tablero ('' = vacía)
    currentPlayer: PLAYER_X,    // jugador que tiene el turno (X siempre empieza)
    mode: MODE_TWO_PLAYERS,     // '2p' | 'cpu'
    difficulty: 'medium',       // 'easy' | 'medium' | 'hard'
    isRunning: false,           // hay una partida en curso
    isThinking: false,          // la IA está calculando su jugada
    resultMessage: '',          // mensaje final mostrado en la barra de estado
    scores: { X: 0, O: 0, draw: 0 }, // marcador (solo se reinicia con el botón correspondiente)
    moveTimer: null,            // id del temporizador de la IA
    modalTimer: null            // id del temporizador del modal
  };

  /* ======================================================================
     3. REFERENCIAS AL DOM
     ====================================================================== */

  const byId = (id) => document.getElementById(id);

  const dom = {
    // Pantallas
    menuScreen: byId('menu-screen'),
    gameScreen: byId('game-screen'),

    // Menú
    modeButtons: Array.from(document.querySelectorAll('[data-mode]')),
    difficultyButtons: Array.from(document.querySelectorAll('[data-difficulty]')),
    difficultyBlock: byId('difficulty-block'),
    difficultyHint: byId('difficulty-hint').querySelector('span'),
    cpuInfo: byId('cpu-info'),
    btnStart: byId('btn-start'),

    // Juego
    badgeMode: byId('badge-mode'),
    badgeDifficulty: byId('badge-difficulty'),
    playerInfo: byId('player-info'),
    scoreboard: document.querySelector('.scoreboard'),
    scoreX: byId('score-x'),
    scoreO: byId('score-o'),
    scoreDraw: byId('score-draw'),
    status: byId('status'),
    board: byId('board'),
    cells: [],

    // Controles
    btnNewRound: byId('btn-new-round'),
    btnResetScore: byId('btn-reset-score'),
    btnMenu: byId('btn-menu'),

    // Modal
    resultModal: byId('result-modal'),
    resultIcon: byId('result-icon'),
    resultTitle: byId('result-title'),
    resultText: byId('result-text'),
    btnPlayAgain: byId('btn-play-again'),
    btnModalMenu: byId('btn-modal-menu')
  };

  /* ======================================================================
     4. INICIALIZACIÓN Y EVENTOS
     ====================================================================== */

  function init() {
    createBoard();
    bindMenuEvents();
    bindGameEvents();
    bindBoardKeyboardNavigation();

    // Estado inicial del menú
    selectMode(state.mode);
    selectDifficulty(state.difficulty);
    updateScoreboard();
  }

  function bindMenuEvents() {
    dom.modeButtons.forEach((button) => {
      button.addEventListener('click', () => selectMode(button.dataset.mode));
    });

    dom.difficultyButtons.forEach((button) => {
      button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
    });

    dom.btnStart.addEventListener('click', startGame);
  }

  function bindGameEvents() {
    dom.btnNewRound.addEventListener('click', startRound);
    dom.btnResetScore.addEventListener('click', resetScore);
    dom.btnMenu.addEventListener('click', goToMenu);
    dom.btnPlayAgain.addEventListener('click', startRound);
    dom.btnModalMenu.addEventListener('click', goToMenu);
  }

  /* ======================================================================
     5. PANTALLAS (menú / juego)
     ====================================================================== */

  function selectMode(mode) {
    state.mode = mode;

    dom.modeButtons.forEach((button) => {
      const isActive = button.dataset.mode === mode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    const vsComputer = mode === MODE_VS_COMPUTER;
    dom.difficultyBlock.classList.toggle('d-none', !vsComputer);
    dom.cpuInfo.classList.toggle('d-none', !vsComputer);
  }

  function selectDifficulty(difficulty) {
    state.difficulty = difficulty;

    dom.difficultyButtons.forEach((button) => {
      const isActive = button.dataset.difficulty === difficulty;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    dom.difficultyHint.textContent = DIFFICULTY_HINTS[difficulty];
  }

  // Cambia de la pantalla de menú a la de juego y arranca la primera ronda
  function startGame() {
    updateMatchInfo();
    dom.menuScreen.classList.add('d-none');
    dom.gameScreen.classList.remove('d-none');

    // Reinicia la animación de entrada de la pantalla
    dom.gameScreen.style.animation = 'none';
    void dom.gameScreen.offsetWidth;
    dom.gameScreen.style.animation = '';

    updateScoreboard();
    startRound();

    if (dom.cells.length) {
      dom.cells[0].focus({ preventScroll: true });
    }
  }

  // Vuelve al menú principal (permite cambiar modo y dificultad)
  function goToMenu() {
    clearPendingTimers();
    state.isRunning = false;
    state.isThinking = false;

    hideResultModal();
    dom.gameScreen.classList.add('d-none');
    dom.menuScreen.classList.remove('d-none');
    dom.btnStart.focus({ preventScroll: true });
  }

  // Actualiza los "chips" con el modo, la dificultad y quién usa cada ficha
  function updateMatchInfo() {
    const vsComputer = state.mode === MODE_VS_COMPUTER;

    dom.badgeMode.innerHTML = vsComputer
      ? '<i class="bi bi-cpu-fill me-1"></i><span>' + MODE_LABELS.cpu + '</span>'
      : '<i class="bi bi-people-fill me-1"></i><span>' + MODE_LABELS['2p'] + '</span>';

    dom.badgeDifficulty.classList.toggle('d-none', !vsComputer);
    if (vsComputer) {
      const icons = { easy: 'bi-dice-5', medium: 'bi-lightning-fill', hard: 'bi-cpu-fill' };
      dom.badgeDifficulty.innerHTML =
        '<i class="bi ' + icons[state.difficulty] + ' me-1"></i><span>' +
        DIFFICULTY_LABELS[state.difficulty] + '</span>';
    }

    dom.playerInfo.classList.toggle('d-none', !vsComputer);
  }

  /* ======================================================================
     6. TABLERO Y JUGADAS
     ====================================================================== */

  // Crea las 9 casillas del tablero (botones accesibles)
  function createBoard() {
    dom.board.innerHTML = '';
    dom.cells = [];

    for (let index = 0; index < 9; index += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(index);
      cell.setAttribute('aria-disabled', 'false');
      cell.setAttribute('aria-label', buildCellLabel(index, ''));

      cell.addEventListener('click', handleCellClick);

      dom.board.appendChild(cell);
      dom.cells.push(cell);
    }
  }

  // Vacía el tablero visualmente (se usa al iniciar o reiniciar una ronda)
  function resetBoard() {
    state.board = Array(9).fill('');

    dom.cells.forEach((cell, index) => {
      cell.className = 'cell';
      cell.textContent = '';
      cell.setAttribute('aria-disabled', 'false');
      cell.setAttribute('aria-label', buildCellLabel(index, ''));
    });

    dom.board.classList.remove('board--finished', 'board--locked');
  }

  function buildCellLabel(index, mark) {
    const row = Math.floor(index / 3) + 1;
    const column = (index % 3) + 1;
    const content = mark ? 'marcada con ' + mark : 'vacía';
    return 'Casilla fila ' + row + ', columna ' + column + ': ' + content;
  }

  function handleCellClick(event) {
    const index = Number(event.currentTarget.dataset.index);

    if (!canPlayInCell(index)) return;

    playMove(index, state.currentPlayer);
    resolveTurn();
  }

  // Evita jugadas fuera de turno, en casillas ocupadas o durante el turno de la IA
  function canPlayInCell(index) {
    if (!state.isRunning || state.isThinking) return false;
    if (state.board[index] !== '') return false;
    if (state.mode === MODE_VS_COMPUTER && state.currentPlayer === PLAYER_O) return false;
    return true;
  }

  // Coloca una ficha en el tablero y la dibuja con su animación
  function playMove(index, player) {
    state.board[index] = player;
    renderCell(index);
  }

  function renderCell(index) {
    const cell = dom.cells[index];
    const mark = state.board[index];

    cell.className = 'cell' + (mark === PLAYER_X ? ' cell--x' : mark === PLAYER_O ? ' cell--o' : '');
    cell.innerHTML = mark ? '<span class="cell-mark">' + mark + '</span>' : '';
    cell.setAttribute('aria-disabled', mark ? 'true' : 'false');
    cell.setAttribute('aria-label', buildCellLabel(index, mark));
  }

  // Navegación con las flechas del teclado dentro del tablero
  function bindBoardKeyboardNavigation() {
    dom.board.addEventListener('keydown', (event) => {
      const currentIndex = dom.cells.indexOf(document.activeElement);
      if (currentIndex === -1) return;

      const row = Math.floor(currentIndex / 3);
      const column = currentIndex % 3;
      let nextIndex = null;

      switch (event.key) {
        case 'ArrowRight': nextIndex = row * 3 + ((column + 1) % 3); break;
        case 'ArrowLeft':  nextIndex = row * 3 + ((column + 2) % 3); break;
        case 'ArrowDown':  nextIndex = ((row + 1) % 3) * 3 + column; break;
        case 'ArrowUp':    nextIndex = ((row + 2) % 3) * 3 + column; break;
        default: return;
      }

      event.preventDefault();
      dom.cells[nextIndex].focus();
    });
  }

  /* ======================================================================
     7. REGLAS (ganador / empate / turno)
     ====================================================================== */

  // Devuelve { winner, combination } si hay tres en línea; de lo contrario null
  function getWinningResult(board) {
    for (let i = 0; i < WINNING_COMBINATIONS.length; i += 1) {
      const [a, b, c] = WINNING_COMBINATIONS[i];
      if (board[a] !== '' && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], combination: WINNING_COMBINATIONS[i] };
      }
    }
    return null;
  }

  function isBoardFull(board) {
    return board.every((cell) => cell !== '');
  }

  function getEmptyCells(board) {
    return board.reduce((empty, mark, index) => {
      if (mark === '') empty.push(index);
      return empty;
    }, []);
  }

  // Comprueba ganador, empate o cambia de turno después de cada jugada
  function resolveTurn() {
    const win = getWinningResult(state.board);

    if (win) {
      endRound({ type: 'win', winner: win.winner, combination: win.combination });
      return;
    }

    if (isBoardFull(state.board)) {
      endRound({ type: 'draw' });
      return;
    }

    switchTurn();
    renderStatus();

    // En modo computadora, si el turno le toca a O se lanza su jugada
    if (state.mode === MODE_VS_COMPUTER && state.currentPlayer === PLAYER_O) {
      scheduleComputerMove();
    }
  }

  function switchTurn() {
    state.currentPlayer = state.currentPlayer === PLAYER_X ? PLAYER_O : PLAYER_X;
  }

  // Destaca visualmente las tres casillas de la combinación ganadora
  function highlightWinningCombination(combination) {
    combination.forEach((index) => dom.cells[index].classList.add('cell--win'));
    dom.board.classList.add('board--finished');
  }

  function lockBoard(locked) {
    dom.board.classList.toggle('board--locked', locked);
  }

  /* ======================================================================
     8. MARCADOR Y MENSAJES
     ====================================================================== */

  function updateScoreboard() {
    dom.scoreX.textContent = String(state.scores.X);
    dom.scoreO.textContent = String(state.scores.O);
    dom.scoreDraw.textContent = String(state.scores.draw);

    // Pequeña animación al actualizar
    dom.scoreboard.classList.remove('score-bump');
    void dom.scoreboard.offsetWidth;
    dom.scoreboard.classList.add('score-bump');
  }

  // Solo se reinicia cuando el usuario lo pide explícitamente
  function resetScore() {
    state.scores = { X: 0, O: 0, draw: 0 };
    updateScoreboard();
  }

  function renderStatus() {
    dom.status.classList.toggle('is-win', !state.isRunning && state.resultMessage !== '');

    if (!state.isRunning) {
      dom.status.textContent = state.resultMessage;
      return;
    }

    if (state.isThinking) {
      dom.status.innerHTML =
        '<i class="bi bi-cpu-fill"></i> Turno de <span class="mark-o">O</span> · la computadora está pensando…';
      return;
    }

    const mark = state.currentPlayer;
    const markClass = mark === PLAYER_X ? 'mark-x' : 'mark-o';
    let icon = 'bi-people-fill';
    let who = mark === PLAYER_X ? 'Jugador 1' : 'Jugador 2';

    if (state.mode === MODE_VS_COMPUTER) {
      const isHuman = mark === PLAYER_X;
      icon = isHuman ? 'bi-person-fill' : 'bi-cpu-fill';
      who = isHuman ? 'tú' : 'computadora';
    }

    dom.status.innerHTML =
      '<i class="bi ' + icon + '"></i> Turno de <span class="' + markClass + '">' + mark +
      '</span> · ' + who;
  }

  /* ======================================================================
     9. CICLO DE LA PARTIDA
     ====================================================================== */

  function clearPendingTimers() {
    if (state.moveTimer) {
      window.clearTimeout(state.moveTimer);
      state.moveTimer = null;
    }
    if (state.modalTimer) {
      window.clearTimeout(state.modalTimer);
      state.modalTimer = null;
    }
  }

  // Inicia una ronda nueva (el marcador NO se toca)
  function startRound() {
    clearPendingTimers();
    hideResultModal();

    resetBoard();

    state.currentPlayer = PLAYER_X;
    state.isRunning = true;
    state.isThinking = false;
    state.resultMessage = '';

    renderStatus();
    lockBoard(false);
  }

  // Finaliza la ronda: victoria o empate
  function endRound(result) {
    state.isRunning = false;
    state.isThinking = false;

    if (result.type === 'win') {
      highlightWinningCombination(result.combination);
      state.scores[result.winner] += 1;
      state.resultMessage = '🎉 ¡' + result.winner + ' ha ganado!';
    } else {
      state.scores.draw += 1;
      state.resultMessage = '🤝 ¡Empate!';
    }

    lockBoard(true);
    updateScoreboard();
    renderStatus();

    // Pequeña pausa para apreciar la animación de victoria antes del modal
    state.modalTimer = window.setTimeout(() => {
      state.modalTimer = null;
      showResultModal(result);
    }, RESULT_MODAL_DELAY);
  }

  /* ======================================================================
     10. MODO CONTRA COMPUTADORA Y NIVELES DE DIFICULTAD
     ====================================================================== */

  function scheduleComputerMove() {
    state.isThinking = true;
    lockBoard(true);
    renderStatus();

    state.moveTimer = window.setTimeout(() => {
      state.moveTimer = null;
      if (!state.isRunning) return;

      const move = getComputerMove();

      state.isThinking = false;
      lockBoard(false);

      if (move === -1) return;

      playMove(move, PLAYER_O);
      resolveTurn();

      // Si la ronda sigue viva, el tablero se vuelve a habilitar para el jugador
      if (state.isRunning) lockBoard(false);
    }, COMPUTER_MOVE_DELAY);
  }

  function getComputerMove() {
    switch (state.difficulty) {
      case 'easy':
        return getEasyMove();
      case 'hard':
        return getHardMove(state.board.slice()); // copia: Minimax modifica el tablero
      case 'medium':
      default:
        return getMediumMove();
    }
  }

  // FÁCIL: elección totalmente aleatoria entre las casillas libres
  function getEasyMove() {
    const emptyCells = getEmptyCells(state.board);
    if (!emptyCells.length) return -1;
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  // MEDIO: gana siempre que pueda, pero bloquea/defiende sólo algunas veces
  function getMediumMove() {
    const board = state.board.slice();

    // 1) Oportunidad inmediata de ganar → siempre la aprovecha
    const winningMove = findImmediateMove(board, PLAYER_O);
    if (winningMove !== -1) return winningMove;

    // 2) Bloquea la amenaza inmediata del rival... solo una parte de las veces
    const blockingMove = findImmediateMove(board, PLAYER_X);
    if (blockingMove !== -1 && Math.random() < MEDIUM_BLOCK_CHANCE) {
      return blockingMove;
    }

    // 3) Prefiere el centro, pero tampoco siempre
    if (board[4] === '' && Math.random() < MEDIUM_CENTER_CHANCE) return 4;

    // 4) Resto: esquinas con cierta preferencia y, si no, casilla libre al azar
    const emptyCells = getEmptyCells(board);
    const corners = emptyCells.filter((index) => [0, 2, 6, 8].includes(index));
    if (corners.length && Math.random() < MEDIUM_CORNER_CHANCE) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  // Devuelve la casilla con la que `player` ganaría en esta jugada (-1 si no existe)
  function findImmediateMove(board, player) {
    for (let index = 0; index < board.length; index += 1) {
      if (board[index] !== '') continue;
      board[index] = player;
      const wins = getWinningResult(board) !== null;
      board[index] = '';
      if (wins) return index;
    }
    return -1;
  }

  /* ======================================================================
     11. ALGORITMO MINIMAX (nivel difícil)
     ====================================================================== */

  // Recorre todas las jugadas posibles y elige la de mayor puntuación.
  // Con un juego óptimo la IA nunca pierde (máximo empata).
  function getHardMove(board) {
    let bestScore = -Infinity;
    let bestMoves = [];

    for (let index = 0; index < board.length; index += 1) {
      if (board[index] !== '') continue;

      board[index] = PLAYER_O;
      const score = minimax(board, false, 0);
      board[index] = '';

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [index];
      } else if (score === bestScore) {
        bestMoves.push(index);
      }
    }

    if (!bestMoves.length) return -1;
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  /**
   * Minimax con poda por profundidad.
   * @param {string[]} board     estado del tablero
   * @param {boolean}  isMaximizing true si le toca maximizar (la computadora)
   * @param {number}   depth    profundidad actual (premiaba las victorias rápidas)
   * @returns {number} puntuación de la posición
   */
  function minimax(board, isMaximizing, depth) {
    const result = getWinningResult(board);

    if (result) {
      // La computadora suma (10 - profundidad): prefiere ganar cuanto antes.
      // El jugador suma (profundidad - 10): la IA resiste alargando la derrota.
      return result.winner === PLAYER_O ? 10 - depth : depth - 10;
    }

    if (isBoardFull(board)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let index = 0; index < board.length; index += 1) {
        if (board[index] !== '') continue;
        board[index] = PLAYER_O;
        bestScore = Math.max(bestScore, minimax(board, false, depth + 1));
        board[index] = '';
      }
      return bestScore;
    }

    let bestScore = Infinity;
    for (let index = 0; index < board.length; index += 1) {
      if (board[index] !== '') continue;
      board[index] = PLAYER_X;
      bestScore = Math.min(bestScore, minimax(board, true, depth + 1));
      board[index] = '';
    }
    return bestScore;
  }

  /* ======================================================================
     12. MODAL DE RESULTADO
     ====================================================================== */

  function showResultModal(result) {
    const vsComputer = state.mode === MODE_VS_COMPUTER;

    if (result.type === 'win') {
      dom.resultIcon.className = 'result-icon';
      dom.resultIcon.innerHTML = '<i class="bi bi-trophy-fill"></i>';
      dom.resultTitle.textContent = '🎉 ¡' + result.winner + ' ha ganado!';

      if (vsComputer) {
        dom.resultText.textContent = result.winner === PLAYER_X
          ? '¡Ganaste a la computadora! Sigue así.'
          : 'La computadora ganó esta ronda. ¡Inténtalo de nuevo!';
      } else {
        dom.resultText.textContent = 'El ' + (result.winner === PLAYER_X ? 'jugador 1 (X)' : 'jugador 2 (O)') +
          ' se lleva la victoria.';
      }
    } else {
      dom.resultIcon.className = 'result-icon is-draw';
      dom.resultIcon.innerHTML = '<i class="bi bi-emoji-neutral-fill"></i>';
      dom.resultTitle.textContent = '🤝 ¡Empate!';
      dom.resultText.textContent = 'Nadie ganó esta ronda: el tablero quedó completo.';
    }

    dom.resultText.textContent += ' Marcador: X ' + state.scores.X + ' · O ' + state.scores.O +
      ' · Empates ' + state.scores.draw + '.';

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(dom.resultModal).show();
    } else {
      // Respaldo por si el CDN de Bootstrap no está disponible
      dom.resultModal.classList.add('d-block', 'show');
      dom.resultModal.setAttribute('aria-hidden', 'false');
    }
  }

  function hideResultModal() {
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const instance = bootstrap.Modal.getInstance(dom.resultModal);
      if (instance) instance.hide();
    } else {
      dom.resultModal.classList.remove('d-block', 'show');
      dom.resultModal.setAttribute('aria-hidden', 'true');
    }
  }

  /* --------------------------- arranque --------------------------- */
  init();
})();
