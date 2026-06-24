## Where game state lives
Each game's authoritative state — the board, whose turn it is, seat assignments, version number, and last updated timestamp - is stored in SQLite as a JSON blob, one row per game. The domain layer is pure functions over that shape, with no I/O or knowledge of WebSockets.
Connection state is kept in memory only: who is a player or spectator, which socket maps to which seat, and open connections with their timers. This is intentionally ephemeral — it doesn't need to survive a restart.

## How server authority is enforced
The client sends intents, not their identity. A move message contains only the cell index — the server resolves whose move it is from the connection record established at join time. A client cannot claim to be a different player.
All game logic — turn order, cell availability, win and draw detection, rejecting moves on finished games — lives in the domain layer. The application layer adds policy on top, then every mutation follows the same path: 
domain transition → save to SQLite → broadcast to clients. 
Clients receive a sanitized view of game state that strips token hashes and other internals.

One known limitation: the write path is read–modify–write without optimistic locking. Node's single-threaded event loop makes races extremely unlikely in practice, but two simultaneous moves on the same game are not formally guarded against. The fix — a version check in the SQL update — is straightforward and would be the first thing added with more time.

## How reconnection and spectators are modeled
When a player joins, the server generates a random seat token, stores only its hash, and returns the raw token once to the client, which saves it in localStorage. On reconnect, the client sends the token, the server verifies the hash, and the seat is restored. This is enough for refresh and same-browser scenarios — it doesn't support cross-device identity.
Each seat allows exactly one active connection. Opening the game in a second tab supersedes the first, which is locked out with a clear message. This prevents two tabs from believing they hold the same seat simultaneously.

On disconnect, the seat is marked offline and state is broadcast. By default the game continues — the online player can keep moving. A pause mode is available via configuration if you'd rather block moves until both players are present.
Spectators are anyone who arrives after both seats are taken. They get no token and no persisted identity — their disconnect has no effect on game state. A configurable cap limits how many spectators can watch simultaneously.

## How persistence works
SQLite (in WAL mode) stores one row per game, written on every state change — seat assignment, each move, connect and disconnect events. There's no batching or deferral, so the worst case on a crash is losing one move.
On startup the server reads all unfinished games back into memory. Stale games are purged by age (default three days) on startup and hourly after that.
The main limitation is that this is a single file on a single process — there's no path to horizontal scaling without replacing the storage layer. The architecture is designed with that in mind: the repository is behind an interface, so swapping SQLite for Redis or Postgres is a contained change.


## Stack: 

React, Node.js, and TypeScript (chosen purely based on familiarity).

Fastify vs. Express: Fastify, for its superior performance and built-in schema validation.

SQLite vs. Redis/PostgreSQL: SQLite. Prioritized simplicity over scalability and complexity (a tough choice, but right for the current scope).

Native WebSockets vs. Socket.io: Native WS, favoring granular control over protocol overhead. (In hindsight, I didn't allocate enough time to fully explore both options).
