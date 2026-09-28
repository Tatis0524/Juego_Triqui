[README.md](https://github.com/user-attachments/files/32757805/README.md)
# 🎮 Triqui · Tres en Raya

Juego web completo de **Triqui (Tic-Tac-Toe / Tres en Raya)** construido únicamente con **HTML5, CSS3, Bootstrap 5 y JavaScript vanilla** — sin frameworks, sin backend y sin base de datos. Se ejecuta abriendo `index.html` directamente en el navegador.

![Modo](https://img.shields.io/badge/modo-2%20jugadores%20%7C%20IA-4dd0e1) ![Dificultad](https://img.shields.io/badge/dificultad-f%C3%A1cil%20%7C%20medio%20%7C%20dif%C3%ADcil-ff6b8a) ![Tecnología](https://img.shields.io/badge/Bootstrap%205-CDN-7952b3) ![Sin dependencias](https://img.shields.io/badge/sin%20frameworks-JS%20vanilla-ffd166)

---

## ✨ Características

- **Menú principal** con selección de modo de juego y, en su caso, de dificultad (Fácil / Medio / Difícil).
- **Modo 2 jugadores**: dos personas en el mismo dispositivo (Jugador 1 = **X**, Jugador 2 = **O**).
- **Modo contra la computadora** con 3 niveles:
  - **Fácil** → movimientos totalmente aleatorios.
  - **Medio** → gana en cuanto puede, bloquea *algunas* amenazas y mezcla estrategia con azar (superable).
  - **Difícil** → **algoritmo Minimax** con búsqueda completa: analiza todas las partidas posibles y **nunca pierde**.
- **Tablero 3×3** responsive: casillas grandes, animación al colocar la ficha, efecto hover y bloqueo de casillas ocupadas.
- **Resaltado animado** de las tres casillas ganadoras.
- **Modal de resultado** con 🎉 victoria / 🤝 empate y resumen del marcador.
- **Marcador persistente** (X · O · Empates): se conserva entre rondas y solo se reinicia con el botón *Reiniciar marcador*.
- **Controles**: Nueva partida · Reiniciar marcador · Volver al menú principal.
- **Información de la partida** siempre visible: modo, dificultad, quién juega con X/O, turno actual y resultado.
- **Accesibilidad**: `aria-label` en cada casilla, `aria-live` en el turno, `aria-pressed` en los botones del menú, navegación con flechas + `Enter`, foco visible y soporte de `prefers-reduced-motion`.

---

## 📁 Estructura del proyecto

```
/triqui
│
├── index.html          → Menú, pantalla de juego y modal (Bootstrap 5 + Icons por CDN)
├── css/
│   └── styles.css      → Degradados, glassmorphism, animaciones y diseño responsive
└── js/
    └── app.js          → Estado, tablero, reglas, IA, Minimax, marcador y modal
```

---

## 🚀 Cómo ejecutarlo localmente

### Opción A — Directo en el navegador (la más rápida)

1. Descarga o clona el proyecto.
2. Haz **doble clic en `index.html`**.
3. ¡Listo! No requiere servidor, compilación ni instalación.

### Opción B — Con servidor local

Útil si tu navegador restringe algún recurso en `file://`:

```bash
cd Juego_Triqui

# con Python
python -m http.server 8000

# o con Node
npx serve .
```

Luego abre **http://localhost:8000**.

### Requisitos

- Cualquier navegador moderno (Chrome, Edge, Firefox, Safari).
- Conexión a internet la primera vez: **Bootstrap 5** y **Bootstrap Icons** se cargan por CDN.

---

## 🕹️ Cómo jugar

1. Elige el **modo de juego** (Dos jugadores o Contra la computadora).
2. Si es contra la computadora, selecciona la **dificultad**.
3. Pulsa **Iniciar partida**.
4. **X siempre empieza.** Gana quien consiga **3 fichas en línea** (fila, columna o diagonal); si el tablero se llena sin ganador, hay **empate**.

### Controles

| Acción | Ratón / táctil | Teclado |
|---|---|---|
| Colocar ficha | Clic en la casilla | `Enter` o `Espacio` |
| Mover el foco | — | `←` `→` `↑` `↓` (envuelve en la fila) |
| Nueva partida | Botón *Nueva partida* | Tab hasta el botón y `Enter` |
| Reiniciar marcador | Botón *Reiniciar marcador* | Igual |
| Volver al menú | Botón *Menú principal* | Igual |

---

## 🤖 Niveles de dificultad

| Nivel | Estrategia | Comportamiento |
|---|---|---|
| **Fácil** | `getEasyMove()` | Elige una casilla libre al azar. |
| **Medio** | `getMediumMove()` | 1) **Siempre** gana si tiene la oportunidad. 2) Bloquea tus amenazas solo el **30 %** de las veces. 3) Toma el centro el **50 %** de las veces. 4) El resto: esquinas o azar. |
| **Difícil** | `getHardMove()` + `minimax()` | Evaluación completa de todas las variantes. Puntúa `10 − profundidad` para ganar pronto y `profundidad − 10` para resistir: **no puede perder**. |

### Rendimiento medido

Simulación automática de **300 partidas** contra un jugador casual (toma la victoria si la ve; si no, juega al azar):

| Nivel | Ganas tú | Gana la IA | Empates |
|---|---|---|---|
| Fácil | 82 % | 11 % | 7 % |
| Medio | ≈ 45 % | ≈ 50 % | ≈ 5 % |
| Difícil | **0 %** | 77 % | 23 % |

> 💡 Para ajustar el nivel medio, modifica estas constantes en `js/app.js`:
> `MEDIUM_BLOCK_CHANCE` (mayor = bloquea más), `MEDIUM_CENTER_CHANCE` y `MEDIUM_CORNER_CHANCE`.

---

## 🧩 Arquitectura del código (`js/app.js`)

El archivo está organizado en 12 secciones comentadas dentro de un módulo IIFE (sin variables globales):

| Sección | Funciones principales |
|---|---|
| Estado | `state` → `board`, `currentPlayer`, `mode`, `difficulty`, `scores`, `isRunning`, `isThinking` |
| Pantallas | `selectMode()`, `selectDifficulty()`, `startGame()`, `goToMenu()`, `updateMatchInfo()` |
| Tablero | `createBoard()`, `resetBoard()`, `renderCell()`, `handleCellClick()`, `canPlayInCell()` |
| Reglas | `resolveTurn()`, `getWinningResult()`, `isBoardFull()`, `switchTurn()`, `highlightWinningCombination()` |
| Marcador | `updateScoreboard()`, `resetScore()`, `renderStatus()` |
| Partida | `startRound()`, `endRound()`, `clearPendingTimers()` |
| IA | `scheduleComputerMove()`, `getComputerMove()`, `getEasyMove()`, `getMediumMove()`, `findImmediateMove()` |
| Minimax | `getHardMove()`, `minimax()` |
| Modal | `showResultModal()`, `hideResultModal()` |

**Flujo de cada jugada:** `playMove()` → `resolveTurn()` → ¿ganador? · ¿empate? → `switchTurn()` → si el turno es de la IA, `scheduleComputerMove()`. Así el modo 2 jugadores y el modo contra computadora comparten exactamente el mismo código de reglas.

---

## ✅ Pruebas realizadas

Se ejecutó el juego real (HTML + JS) en un entorno **jsdom** simulando clics y teclado:

- **70 comprobaciones funcionales + 8 de teclado → 0 fallos, 0 errores en consola.**
- Cubren: ambas pantallas, victoria con resaltado, empate, casilla ocupada, persistencia del marcador, modal, las 3 dificultades, bloqueo del turno de la IA y navegación con flechas.
- Minimax verificado en **300 partidas**: 0 derrotas de la IA en el nivel difícil.

---

## 🛠️ Notas técnicas

Tres problemas típicos detectados y resueltos durante el desarrollo (documentados en el código):

1. **Colisión con la utilidad `.mark` de Bootstrap** (pintaba un fondo amarillo detrás de la ficha) → la clase se llama `cell-mark`.
2. **`d-none` + `d-flex` en el mismo elemento** (en Bootstrap `d-flex` gana por orden y el elemento nunca se ocultaba) → el layout flex se define en CSS propio.
3. **Filas del tablero con alturas desiguales** → `grid-template-rows: repeat(3, minmax(0, 1fr))` + `aspect-ratio` garantizan casillas idénticas.

---

## 🔮 Posibles mejoras

- Guardar el marcador con `localStorage`.
- Historial de partidas y estadísticas por sesión.
- Modo "primera jugada aleatoria" o IA que pueda jugar con X.
- Efecto de confeti en la victoria.

---

## 📄 Licencia

Proyecto libre para uso educativo y personal.
