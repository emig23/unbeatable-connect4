# Connect 4 vs AI

Play Connect 4 in your browser against an AI with three difficulty levels. On Unbeatable, it solves the game as it plays: when it moves first, it cannot lose.

**[Play it here](https://emig23.github.io/unbeatable-connect4/)**

## Features

- **Three difficulty levels.** Easy looks two moves ahead and picks loosely. Medium searches about nine moves ahead. Unbeatable plays perfectly.
- **Win chance bar.** A bar beside the board shows who is likely to win after every move: an estimate from simulated games early on, and the exact result once the position can be solved.
- **Moves until the AI wins.** When the AI has solved the game, it says how many moves it needs.
- **Runs entirely in the browser.** Plain JavaScript, no framework and no server. The AI runs in background threads (Web Workers), so the page never freezes while it thinks.
- **Works on phones**, with keyboard controls (keys 1 to 7) on desktop.
- **About box.** An About button at the top right explains the project and links back to this repository.

## How the AI works

### Easy and Medium: search with a best guess

Both levels use **negamax with alpha-beta pruning**. The AI tries every move, assumes you answer with your best reply, and repeats several moves deep. Alpha-beta pruning skips moves that can't change the decision, and searching center columns first makes that pruning much more effective.

When the search stops, the AI scores the position with a rule of thumb: open threes, open twos and stones in the center. That guess is why these levels can be beaten. A trap that takes more moves to spring than the AI can see goes unnoticed.

### Unbeatable: solving the game

Connect 4 is a solved game: the first player can always win by starting in the center (Allis and Allen, 1988). The Unbeatable AI doesn't guess. It searches every position to the end of the game and knows the true result. Making that fast enough takes several techniques:

- **Bitboards.** Each player's stones are stored as bits, one per cell. Checking for four in a row takes a few shifts and ANDs instead of loops. The board needs 49 bits and JavaScript's bitwise operators work on 32, so each board is split across two numbers.
- **Transposition table.** Different move orders often reach the same position, so results are cached instead of solved again.
- **Null-window search.** Rather than asking "what is this position worth?", the solver asks a series of yes-or-no questions ("is it at least a draw?") that prune much more.
- **Smarter pruning and move ordering.** Forced blocks are played without searching alternatives, moves that hand the opponent a win are skipped, and moves that create the most threats are searched first.
- **Opening book.** The first moves are the slowest to solve, so the answers for every position the AI can face in the opening (2,626 positions, 24 KB) are computed ahead of time and shipped with the page.

### Win chance

A separate background worker works out the bar. Early in the game, it plays hundreds of quick simulated games from the current position and counts who wins. In those games the AI plays a faster version of its difficulty, and you are modeled as a decent player, so early numbers are estimates. Once the solver can answer (usually from around move 10), the bar shows the exact result instead, marked like `#7` for "wins in 7".

## Is it really unbeatable?

When the AI moves first, yes. This was checked three ways:

- The solver matches a well-known reference solver ([Pascal Pons' C++ solver](https://github.com/PascalPons/connect4)) on 900 random positions, with no mismatches.
- Moving first, the AI won 30 of 30 games against random and greedy opponents. Its opening book moves were re-checked with the solver during those games.
- It won 12 of 12 games against a perfect defender that always picks the move that delays its loss the longest.

When you move first, a perfect player would win. Nobody can stop that, but very few people can play that well.

## Benchmarks

Exact solves of random positions with an empty cache (`node tools/benchmark.mjs`):

| Stage | Mean time | Slowest | Positions searched (mean) |
| --- | --- | --- | --- |
| End game (moves 28-36) | 26 µs | 723 µs | 3 |
| Middle game (moves 18-27) | 656 µs | 16.0 ms | 914 |
| Late opening (moves 12-17) | 26.5 ms | 529.9 ms | 128,050 |

Each step back toward the start of the game costs roughly 100 times more work, which is why the opening book exists.

## Run it locally

The page uses JavaScript modules, which browsers only load over HTTP, so opening `index.html` straight from disk won't work. From the project folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Tests

Needs Node.js 18 or newer:

```
npm test
```

The tests cover the game rules, all three AI levels, the solver's scores against the reference solver, the opening book, the moves-until-win count and the win chance.

## Rebuild the opening book

```
node tools/generate-book.mjs ai-first      # about 15 minutes
node tools/generate-book.mjs human-first   # about 25 minutes, in a second terminal
node tools/generate-book.mjs merge
```

## Project layout

| File | What it does |
| --- | --- |
| `index.html`, `style.css` | The page |
| `js/main.js` | Draws the board, handles input, shows results and the win chance bar |
| `js/game.js` | Board state, rules, win and draw detection, undo |
| `js/basic-ai.js` | Easy and Medium: negamax with alpha-beta pruning |
| `js/solver.js` | The perfect solver: bitboards, transposition table, null-window search |
| `js/ai.js` | Unbeatable: opening book first, then the solver |
| `js/book.json` | The opening book |
| `js/stats.js` | Win chance: simulated games and solved results |
| `js/labels.js` | The "moves until AI wins" count |
| `js/worker.js`, `js/stats-worker.js` | Run the AI and the win chance in the background |
| `tools/` | Opening book generator and solver benchmark |
| `tests/` | Tests for every part above |

## Credits

The solver's design follows Pascal Pons' tutorial [Solving Connect 4: how to build a perfect AI](http://blog.gamesolver.org). The first-player win was proven by Victor Allis and James Allen in 1988.