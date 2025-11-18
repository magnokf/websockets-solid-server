import { IWebSocketServer } from '../interfaces/IWebSocketServer';
import { ConsoleLogger } from '../core/logger/ConsoleLogger';
import { ConnectionManager } from '../core/connection/ConnectionManager';
import { RoomManager } from '../core/room/RoomManager';
import { ReactionManager } from '../core/reaction/ReactionManager';
import { MessageRouter } from '../router/MessageRouter';
import { WebSocketServer } from '../core/server/WebSocketServer';
import { JoinRoomHandler } from '../handlers/JoinRoomHandler';
import { LeaveRoomHandler } from '../handlers/LeaveRoomHandler';
import { ChatMessageHandler } from '../handlers/ChatMessageHandler';
import { MessageReactionHandler } from '../handlers/MessageReactionHandler';
import { PingMessageHandler } from '../handlers/PingMessageHandler';
import { TypingIndicatorHandler } from '../handlers/TypingIndicatorHandler';

/**
 * Composição da aplicação e registro de handlers.
 */
export class Application {
  private readonly server: IWebSocketServer;

  constructor() {
    const logger = new ConsoleLogger();
    const connectionManager = new ConnectionManager();
    const roomManager = new RoomManager(logger);
    const reactionManager = new ReactionManager(logger);
    const messageRouter = new MessageRouter(logger);

    const server = new WebSocketServer(
      connectionManager,
      roomManager,
      messageRouter,
      logger
    );

    messageRouter.registerHandler(
      'join:room',
      new JoinRoomHandler(logger, roomManager, server)
    );
    messageRouter.registerHandler(
      'leave:room',
      new LeaveRoomHandler(logger, roomManager, server)
    );
    messageRouter.registerHandler(
      'chat:message',
      new ChatMessageHandler(logger, roomManager, server)
    );
    messageRouter.registerHandler(
      'message:reaction',
      new MessageReactionHandler(logger, roomManager, reactionManager, server)
    );
    messageRouter.registerHandler('ping', new PingMessageHandler(logger));
    messageRouter.registerHandler(
      'room:typing',
      new TypingIndicatorHandler(logger, roomManager, server)
    );

    this.server = server;
  }

  start(port = 3000): void {
    this.server.start(port);
  }
}
