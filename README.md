# WebSockets SOLID Server

Real-time collaboration server built with Socket.IO and TypeScript while keeping SOLID boundaries explicit. Each capability (rooms, chat messages, reactions, typing indicators, and health pings) lives behind dedicated managers and handlers, making behavior easy to extend without breaking the core transport.

## Features
- **SOLID-oriented modules** — `core/`, `application/`, `handlers/`, and `router/` isolate concerns for predictable composition.
- **Runtime validation** — every inbound payload flows through `zod` schemas before reaching handlers.
- **Message routing** — a central `MessageRouter` wires join/leave, chat, reaction, typing, and ping handlers to Socket.IO events.
- **Room + reaction management** — dedicated managers keep state about room membership, connection lifecycle, and emoji reactions.
- **Console-based observability** — the `ConsoleLogger` surfaces connection lifecycle, payload parsing issues, and handler errors.

## Getting Started
1. Install dependencies: `npm install`.
2. Start the development server with hot reload: `npm run dev`.
3. Optionally create a `.env` (e.g., `PORT=4000`) to override defaults.
4. Use the bundled `client.html` (open it in a browser) and point it to `ws://localhost:<PORT>` to interact with the server manually.

### NPM Scripts
- `npm run dev` — watches `src/` with `tsx` and restarts on change.
- `npm run build` — compiles TypeScript into `dist/` via `tsc`.
- `npm start` — runs the compiled output (`dist/index.js`).
- `npm test` — executes the Jest test suite; use `npm test -- --watch` while iterating on handlers.

## Architecture Overview
- `src/application/Application.ts` bootstraps the server, composes managers, and registers Socket.IO handlers.
- `src/core/` houses pure domain services like `ConnectionManager`, `RoomManager`, `ReactionManager`, `WebSocketServer`, and `ConsoleLogger`.
- `src/router/MessageRouter.ts` exposes a single entry point for routing events to handlers after schema validation.
- `src/handlers/` includes:
  - `JoinRoomHandler` / `LeaveRoomHandler` — manage room membership lifecycle.
  - `ChatMessageHandler` — broadcasts validated chat payloads to a room.
  - `MessageReactionHandler` — records and emits emoji reactions.
  - `TypingIndicatorHandler` — announces typing start/stop events.
  - `PingMessageHandler` — keeps connections healthy.
- `src/schemas/` offers `zod` validators for DTOs, imported by handlers to avoid duplicated guards.
- `src/interfaces/` and `src/types/` define the DTO contracts consumed throughout the app.

## Socket Events
The router currently wires these events:

| Event Name       | Handler                    | Description |
| ---------------- | -------------------------- | ----------- |
| `join:room`      | `JoinRoomHandler`          | Validates a join request and adds the socket to the requested room. |
| `leave:room`     | `LeaveRoomHandler`         | Removes a socket from a room and notifies remaining members. |
| `chat:message`   | `ChatMessageHandler`       | Broadcasts a validated chat payload to all room participants. |
| `message:reaction` | `MessageReactionHandler` | Tracks emoji reactions and emits the aggregated state. |
| `room:typing`    | `TypingIndicatorHandler`   | Emits typing start/stop updates scoped to a room. |
| `ping`           | `PingMessageHandler`       | Responds with a pong to keep the client connection healthy. |

Each handler uses the relevant schema from `src/schemas/` plus the managers it needs to mutate internal state.

## Testing & Quality
- Run `npm test` to execute the Jest suite; add specs alongside handlers (`src/handlers/__tests__`).
- Run `npm run build` prior to pushing to catch type regressions (tsconfig disallows implicit `any`).
- Consider `npm audit` when upgrading Socket.IO or other dependencies for real-time transport security fixes.

## Manual Verification
After `npm run dev` or `npm start`:
1. Open `client.html` in your browser.
2. Connect to `http://localhost:<PORT>`.
3. Use the UI to join a room, send messages, react, and trigger typing indicators; watch the server logs for handler traces.

## Deployment Notes
- Keep secrets (e.g., production origins or admin tokens) in a `.env` that is never committed.
- Use process managers such as PM2 or systemd to run `node dist/index.js` in production.
- Monitor server logs for validation failures — they typically indicate schema drift between clients and the server.

Happy hacking on your SOLID WebSocket server!
