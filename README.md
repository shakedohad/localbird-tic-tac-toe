# localbird-tic-tac-toe

Realtime multiplayer tic-tac-toe.

## How to run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies API and WebSocket traffic to the backend on port 3000.

**Production**

```bash
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

**Tests**

```bash
npm test
```

## What's Done

**Baseline**
- Game creation with a unique shareable URL
- Two players join and play in realtime via WebSockets
- Server-authoritative move validation — illegal moves, wrong turn, and token spoofing are rejected
- Win and draw detection with clear end state

**Requirements**
- Reconnection — a player who refreshes reclaims their seat via seat token stored in `localStorage`
- Concurrent games — each game is fully isolated, no cross-talk
- Spectators — anyone beyond the two players can watch live but cannot move
- Persistence — games survive a server restart via SQLite

**Infrastructure**
- React + TypeScript frontend served by the Node.js server
- Fastify backend with WebSocket support
- SQLite persistence
- Monorepo structure with npm workspaces

---

## What I'd Do Next

**Testing**
- Integration tests covering the full request lifecycle — client sends move, server validates, state updates, broadcast fires
- Concurrency tests: two moves arriving simultaneously on the same game

**Architecture / Scalability**
- Replace SQLite + in-memory state with Redis (pub/sub for events, key-value for state) and Postgres for durable storage — enabling horizontal scaling across multiple server instances
- Evaluate Socket.io or similar libraries for managing rooms and reconnection rather than the current hand-rolled approach
- Background worker for cleaning up abandoned or finished games

**Product**
- Player profiles: display names, game history
- Rematch flow after a game ends
- Seat expiry mechanism — free a seat if a player abandons without reconnecting
- UI polish, especially mobile
