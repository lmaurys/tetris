# Copilot instructions (Tetris)

## Big picture
- This repo is a single-page, no-build, vanilla JS Tetris.
- UI is in `index.html` (stats panel + `<canvas id="board">`); styling is in `style.css`.
- All game logic lives in `script.js` inside an IIFE (`(() => { "use strict"; ... })();`) to avoid globals.

## Core architecture (script.js)
- **State** is plain variables: `board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`.
- **Board model**: `board[y][x]` is either `null` (empty) or a **color string** (occupied). See `createBoard()`, `merge()`.
- **Piece model**: `{ type, matrix, color, x, y }` where `matrix` is a 2D 0/1 array. Spawn uses `y: -2` to allow entry above the visible board (`randomPiece()`, `drawPiece()`).
- **Game loop**: `requestAnimationFrame(frame)` + `dropAccumulator` to step gravity based on `computeDropMs(level)`.
- **Collision** is centralized in `collides(board, piece, offsetX, offsetY, testMatrix)`; prefer using it instead of duplicating bounds checks.
- **Lock/line clear**: `softDrop()` triggers `lockAndSpawn()` when blocked; scoring/leveling happens in `lockAndSpawn()` via `clearLines()`.

## Input & controls
- Keyboard handling is in `onKeyDown(e)` and uses `e.code` (not `e.key`).
- Keybinds (see `index.html` help panel):
  - `ArrowLeft`/`ArrowRight`: move (`move(dx)`)
  - `ArrowUp`: rotate (`rotate()` with simple wall kicks `[0,-1,1,-2,2]`)
  - `ArrowDown`: manual soft drop (+1 score per cell)
  - `Space`: hard drop (`hardDrop()`; +1 per cell while falling)
  - `KeyP`: toggle pause
  - `KeyR`: restart
- When handling arrows/space, call `e.preventDefault()` to avoid page scrolling.

## Scoring & pacing conventions
- Line clear scoring table is classic: 1→100, 2→300, 3→500, 4→800, multiplied by `level`.
- `level = floor(lines / 10) + 1`; gravity speed decreases with level (`computeDropMs`).
- If you change scoring or pacing, keep `updateUI()` calls consistent (score/lines/level are displayed in the left panel).

## Rendering conventions
- Canvas size is fixed to `300x600` (10x20 with `BLOCK = 30`).
- Draw order each frame: `drawBoard(board)` (clears + draws subtle grid + locked cells), then `drawPiece(current)`.
- Coordinate system: (0,0) is top-left; Y increases downward.

## Dev workflow
- No dependencies/build steps.
- Run by opening `index.html` directly or serving the folder (recommended):
  - `python3 -m http.server 5173` then open `http://localhost:5173/`
- Debug with browser DevTools (breakpoints in `onKeyDown`, `frame`, `collides`, `lockAndSpawn`).

## Change guidelines (project-specific)
- Keep everything in `script.js` unless there’s a strong reason to split; this project is intentionally minimal.
- Preserve the Spanish UI strings (e.g., status text, help labels) and existing keybind behavior.
- When adding new behavior, route it through existing primitives (`collides`, `merge`, `clearLines`, `lockAndSpawn`) to avoid desync between visuals, collisions, and scoring.
