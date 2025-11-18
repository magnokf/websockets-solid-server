import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer } from 'http';
import { z } from 'zod';

// ============================================
// 1. SCHEMAS DE VALIDAÇÃO (Zod)
// ============================================

const ChatMessageSchema = z.object({
    message: z.string().min(1).max(500),
    roomId: z.string().min(1),
    messageId: z.string().min(1), // ID único da mensagem
    timestamp: z.iso.datetime().optional()
});

const MessageReactionSchema = z.object({
    messageId: z.string().min(1),
    roomId: z.string().min(1),
    emoji: z.enum(['👍', '❤️', '😂', '😮', '😢', '🔥']) // Emojis permitidos
});

const JoinRoomSchema = z.object({
    roomId: z.string().min(1),
    username: z.string().min(1).max(50)
});

const LeaveRoomSchema = z.object({
    roomId: z.string().min(1)
});

const PingSchema = z.object({
    timestamp: z.iso.datetime()
});

const TypingSchema = z.object({
    roomId: z.string(),
    isTyping: z.boolean()
});

// Tipos TypeScript
type ChatMessage = z.infer<typeof ChatMessageSchema>;
type MessageReaction = z.infer<typeof MessageReactionSchema>;
type JoinRoom = z.infer<typeof JoinRoomSchema>;
type LeaveRoom = z.infer<typeof LeaveRoomSchema>;
type PingMessage = z.infer<typeof PingSchema>;
type TypingIndicator = z.infer<typeof TypingSchema>;


// ============================================
// 2. TYPES E INTERFACES DE DOMÍNIO
// ============================================

interface RoomUser {
    socketId: string;
    userId: string;
    username: string;
    joinedAt: Date;
}

interface Room {
    id: string;
    users: Map<string, RoomUser>;
    createdAt: Date;
}

interface Reaction {
    userId: string;
    username: string;
    emoji: string;
    timestamp: Date;
}

class ValidationError extends Error {
    constructor(
        message: string,
        public zodError: z.ZodError
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

// ============================================
// 3. INTERFACES (DIP)
// ============================================

interface ILogger {
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
}

interface IConnectionManager {
    addConnection(socketId: string, userId: string): void;
    removeConnection(socketId: string): void;
    getConnectionsByUser(userId: string): string[];
    getUserBySocket(socketId: string): string | undefined;
}

interface IRoomManager {
    createRoom(roomId: string): void;
    joinRoom(roomId: string, user: RoomUser): void;
    leaveRoom(roomId: string, socketId: string): void;
    leaveAllRooms(socketId: string): void;
    getRoomUsers(roomId: string): RoomUser[];
    getUserRooms(socketId: string): string[];
    roomExists(roomId: string): boolean;
    isUserInRoom(roomId: string, socketId: string): boolean;
}

interface IReactionManager {
    addReaction(messageId: string, reaction: Reaction): void;
    removeReaction(messageId: string, userId: string, emoji: string): void;
    getReactions(messageId: string): Map<string, Reaction[]>;
    hasUserReacted(messageId: string, userId: string, emoji: string): boolean;
}

interface IMessageHandler {
    handle(socketId: string, eventName: string, data: any): Promise<void>;
}

interface IWebSocketServer {
    start(port: number): void;
    broadcast(eventName: string, data: any): void;
    broadcastToRoom(roomId: string, eventName: string, data: any, excludeSocketId?: string): void;
    emitToUser(userId: string, eventName: string, data: any): void;
}

// ============================================
// 4. IMPLEMENTAÇÕES CORE
// ============================================

class ConsoleLogger implements ILogger {
    info(message: string, meta?: any): void {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    }

    error(message: string, meta?: any): void {
        console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta) : '');
    }

    warn(message: string, meta?: any): void {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    }
}

class ConnectionManager implements IConnectionManager {
    private socketToUser: Map<string, string> = new Map();
    private userToSockets: Map<string, Set<string>> = new Map();

    addConnection(socketId: string, userId: string): void {
        this.socketToUser.set(socketId, userId);

        if (!this.userToSockets.has(userId)) {
            this.userToSockets.set(userId, new Set());
        }
        this.userToSockets.get(userId)!.add(socketId);
    }

    removeConnection(socketId: string): void {
        const userId = this.socketToUser.get(socketId);
        if (userId) {
            this.userToSockets.get(userId)?.delete(socketId);
            if (this.userToSockets.get(userId)?.size === 0) {
                this.userToSockets.delete(userId);
            }
        }
        this.socketToUser.delete(socketId);
    }

    getConnectionsByUser(userId: string): string[] {
        return Array.from(this.userToSockets.get(userId) || []);
    }

    getUserBySocket(socketId: string): string | undefined {
        return this.socketToUser.get(socketId);
    }
}

class RoomManager implements IRoomManager {
    private rooms: Map<string, Room> = new Map();
    private socketToRooms: Map<string, Set<string>> = new Map();

    constructor(private logger: ILogger) {}

    createRoom(roomId: string): void {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                users: new Map(),
                createdAt: new Date()
            });
            this.logger.info('Room created', { roomId });
        }
    }

    joinRoom(roomId: string, user: RoomUser): void {
        if (!this.rooms.has(roomId)) {
            this.createRoom(roomId);
        }

        const room = this.rooms.get(roomId)!;
        room.users.set(user.socketId, user);

        if (!this.socketToRooms.has(user.socketId)) {
            this.socketToRooms.set(user.socketId, new Set());
        }
        this.socketToRooms.get(user.socketId)!.add(roomId);

        this.logger.info('User joined room', {
            roomId,
            socketId: user.socketId,
            username: user.username
        });
    }

    leaveRoom(roomId: string, socketId: string): void {
        const room = this.rooms.get(roomId);
        if (room) {
            room.users.delete(socketId);
            this.logger.info('User left room', { roomId, socketId });

            if (room.users.size === 0) {
                this.rooms.delete(roomId);
                this.logger.info('Room deleted (empty)', { roomId });
            }
        }

        this.socketToRooms.get(socketId)?.delete(roomId);
    }

    leaveAllRooms(socketId: string): void {
        const rooms = this.socketToRooms.get(socketId);
        if (rooms) {
            rooms.forEach(roomId => {
                this.leaveRoom(roomId, socketId);
            });
            this.socketToRooms.delete(socketId);
        }
    }

    getRoomUsers(roomId: string): RoomUser[] {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.users.values()) : [];
    }

    getUserRooms(socketId: string): string[] {
        return Array.from(this.socketToRooms.get(socketId) || []);
    }

    roomExists(roomId: string): boolean {
        return this.rooms.has(roomId);
    }

    isUserInRoom(roomId: string, socketId: string): boolean {
        return this.rooms.get(roomId)?.users.has(socketId) || false;
    }
}


class ReactionManager implements IReactionManager {
    // messageId -> emoji -> [Reaction]
    private reactions: Map<string, Map<string, Reaction[]>> = new Map();

    constructor(private logger: ILogger) {}

    addReaction(messageId: string, reaction: Reaction): void {
        if (!this.reactions.has(messageId)) {
            this.reactions.set(messageId, new Map());
        }

        const messageReactions = this.reactions.get(messageId)!;

        if (!messageReactions.has(reaction.emoji)) {
            messageReactions.set(reaction.emoji, []);
        }

        const emojiReactions = messageReactions.get(reaction.emoji)!;

        // Verificar se usuário já reagiu com esse emoji
        const existingIndex = emojiReactions.findIndex(r => r.userId === reaction.userId);

        if (existingIndex === -1) {
            emojiReactions.push(reaction);
            this.logger.info('Reaction added', {
                messageId,
                userId: reaction.userId,
                emoji: reaction.emoji
            });
        }
    }

    removeReaction(messageId: string, userId: string, emoji: string): void {
        const messageReactions = this.reactions.get(messageId);
        if (!messageReactions) return;

        const emojiReactions = messageReactions.get(emoji);
        if (!emojiReactions) return;

        const index = emojiReactions.findIndex(r => r.userId === userId);
        if (index !== -1) {
            emojiReactions.splice(index, 1);
            this.logger.info('Reaction removed', { messageId, userId, emoji });

            // Limpar se não houver mais reações desse tipo
            if (emojiReactions.length === 0) {
                messageReactions.delete(emoji);
            }

            // Limpar se não houver mais reações na mensagem
            if (messageReactions.size === 0) {
                this.reactions.delete(messageId);
            }
        }
    }

    getReactions(messageId: string): Map<string, Reaction[]> {
        return this.reactions.get(messageId) || new Map();
    }

    hasUserReacted(messageId: string, userId: string, emoji: string): boolean {
        const messageReactions = this.reactions.get(messageId);
        if (!messageReactions) return false;

        const emojiReactions = messageReactions.get(emoji);
        if (!emojiReactions) return false;

        return emojiReactions.some(r => r.userId === userId);
    }
}

// ============================================
// 5. HANDLERS COM VALIDAÇÃO (OCP + SRP)
// ============================================

abstract class BaseMessageHandler implements IMessageHandler {
    protected constructor(
        protected logger: ILogger,
        protected schema?: z.ZodSchema
    ) {}

    async handle(socketId: string, eventName: string, data: any): Promise<void> {
        if (this.schema) {
            const result = this.schema.safeParse(data);

            if (!result.success) {
                this.logger.warn('Validation failed', {
                    socketId,
                    eventName,
                    errors: result.error.issues
                });
                throw new ValidationError('Invalid data format', result.error);
            }

            return this.execute(socketId, eventName, result.data);
        }

        return this.execute(socketId, eventName, data);
    }

    protected abstract execute(
        socketId: string,
        eventName: string,
        data: any
    ): Promise<void>;
}

class JoinRoomHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, JoinRoomSchema);
    }

    protected async execute(
        socketId: string,
        _eventName: string,
        data: JoinRoom
    ): Promise<void> {
        const user: RoomUser = {
            socketId,
            userId: socketId,
            username: data.username,
            joinedAt: new Date()
        };

        this.roomManager.joinRoom(data.roomId, user);

        const users = this.roomManager.getRoomUsers(data.roomId);
        this.server.broadcastToRoom(data.roomId, 'room:user_joined', {
            roomId: data.roomId,
            user: {
                userId: user.userId,
                username: user.username
            },
            users: users.map(u => ({
                userId: u.userId,
                username: u.username
            }))
        });
    }
}

class LeaveRoomHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, LeaveRoomSchema);
    }

    protected async execute(
        socketId: string,
        _eventName: string,
        data: LeaveRoom
    ): Promise<void> {
        const users = this.roomManager.getRoomUsers(data.roomId);
        const leavingUser = users.find(u => u.socketId === socketId);

        this.roomManager.leaveRoom(data.roomId, socketId);

        if (leavingUser) {
            this.server.broadcastToRoom(data.roomId, 'room:user_left', {
                roomId: data.roomId,
                user: {
                    userId: leavingUser.userId,
                    username: leavingUser.username
                },
                users: this.roomManager.getRoomUsers(data.roomId).map(u => ({
                    userId: u.userId,
                    username: u.username
                }))
            });
        }
    }
}

class ChatMessageHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, ChatMessageSchema);
    }

    protected async execute(
        socketId: string,
        _eventName: string,
        data: ChatMessage
    ): Promise<void> {
        if (!this.roomManager.isUserInRoom(data.roomId, socketId)) {
            throw new Error('User not in room');
        }

        const users = this.roomManager.getRoomUsers(data.roomId);
        const sender = users.find(u => u.socketId === socketId);

        if (!sender) {
            throw new Error('Sender not found');
        }

        this.logger.info('Chat message in room', {
            roomId: data.roomId,
            messageId: data.messageId,
            username: sender.username,
            message: data.message
        });

        this.server.broadcastToRoom(data.roomId, 'chat:message', {
            messageId: data.messageId,
            roomId: data.roomId,
            sender: {
                userId: sender.userId,
                username: sender.username
            },
            message: data.message,
            timestamp: new Date().toISOString(),
            reactions: {} // Inicialmente sem reações
        });
    }
}

class MessageReactionHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private reactionManager: IReactionManager,
        private server: IWebSocketServer
    ) {
        super(logger, MessageReactionSchema);
    }

    protected async execute(
        socketId: string,
        _eventName: string,
        data: MessageReaction
    ): Promise<void> {
        // Verificar se usuário está na sala
        if (!this.roomManager.isUserInRoom(data.roomId, socketId)) {
            throw new Error('User not in room');
        }

        const users = this.roomManager.getRoomUsers(data.roomId);
        const user = users.find(u => u.socketId === socketId);

        if (!user) {
            throw new Error('User not found');
        }

        // Verificar se já reagiu com esse emoji
        const hasReacted = this.reactionManager.hasUserReacted(
            data.messageId,
            user.userId,
            data.emoji
        );

        if (hasReacted) {
            // Remover reação (toggle)
            this.reactionManager.removeReaction(data.messageId, user.userId, data.emoji);
        } else {
            // Adicionar reação
            const reaction: Reaction = {
                userId: user.userId,
                username: user.username,
                emoji: data.emoji,
                timestamp: new Date()
            };
            this.reactionManager.addReaction(data.messageId, reaction);
        }

        // Buscar todas as reações da mensagem
        const messageReactions = this.reactionManager.getReactions(data.messageId);

        // Transformar em formato para enviar ao cliente
        const reactionsFormatted: Record<string, Array<{ userId: string; username: string }>> = {};
        messageReactions.forEach((reactions, emoji) => {
            reactionsFormatted[emoji] = reactions.map(r => ({
                userId: r.userId,
                username: r.username
            }));
        });

        // Broadcast para toda a sala
        this.server.broadcastToRoom(data.roomId, 'message:reaction_updated', {
            messageId: data.messageId,
            roomId: data.roomId,
            reactions: reactionsFormatted
        });
    }
}

class TypingIndicatorHandler extends BaseMessageHandler {
    constructor(
        logger: ILogger,
        private roomManager: IRoomManager,
        private server: IWebSocketServer
    ) {
        super(logger, TypingSchema);
    }

    protected async execute(
        socketId: string,
        _eventName: string,
        data: TypingIndicator
    ): Promise<void> {
        if (!this.roomManager.isUserInRoom(data.roomId, socketId)) {
            throw new Error('User not in room');
        }

        const users = this.roomManager.getRoomUsers(data.roomId);
        const typer = users.find(u => u.socketId === socketId);

        if (!typer) {
            throw new Error('Typer not found');
        }

        // Broadcast para todos na sala, exceto o próprio remetente
        this.server.broadcastToRoom(data.roomId, 'room:typing', {
            roomId: data.roomId,
            userId: typer.userId,
            username: typer.username,
            isTyping: data.isTyping
        }, socketId);
    }

}

class PingMessageHandler extends BaseMessageHandler {
    constructor(logger: ILogger) {
        super(logger, PingSchema);
    }

    protected async execute(
        socketId: string,
        _eventName: string,
        data: PingMessage
    ): Promise<void> {
        this.logger.info('Ping received', { socketId, timestamp: data.timestamp });
    }
}

// ============================================
// 6. MESSAGE ROUTER (OCP)
// ============================================

class MessageRouter {
    private handlers: Map<string, IMessageHandler> = new Map();

    constructor(private logger: ILogger) {}

    registerHandler(eventName: string, handler: IMessageHandler): void {
        this.handlers.set(eventName, handler);
    }

    async route(socketId: string, eventName: string, data: any): Promise<void> {
        const handler = this.handlers.get(eventName);

        if (!handler) {
            this.logger.warn('No handler found for event', { eventName });
            throw new Error(`No handler registered for event: ${eventName}`);
        }

        try {
            await handler.handle(socketId, eventName, data);
        } catch (error) {
            this.logger.error('Handler error', { eventName, error });
            throw error;
        }
    }
}

// ============================================
// 7. WEBSOCKET SERVER
// ============================================

class WebSocketServer implements IWebSocketServer {
    private io: SocketIOServer | null = null;

    constructor(
        private connectionManager: IConnectionManager,
        private roomManager: IRoomManager,
        private messageRouter: MessageRouter,
        private logger: ILogger
    ) {}

    start(port: number): void {
        const httpServer = createServer();
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.setupEventHandlers();

        httpServer.listen(port, () => {
            this.logger.info(`WebSocket server running on port ${port}`);
        });
    }

    private setupEventHandlers(): void {
        if (!this.io) return;

        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });
    }

    private handleConnection(socket: Socket): void {
        const userId = socket.handshake.auth.userId || socket.id;

        this.connectionManager.addConnection(socket.id, userId);
        this.logger.info('Client connected', { socketId: socket.id, userId });

        socket.onAny(async (eventName: string, data: any) => {
            try {
                await this.messageRouter.route(socket.id, eventName, data);

                socket.emit('message:ack', {
                    eventName,
                    status: 'success',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                if (error instanceof ValidationError) {
                    socket.emit('validation:error', {
                        eventName,
                        message: 'Dados inválidos',
                        errors: error.zodError.issues.map(err => ({
                            field: err.path.join('.'),
                            message: err.message
                        }))
                    });
                } else if (error instanceof Error) {
                    socket.emit('error', {
                        eventName,
                        message: error.message
                    });
                }
            }
        });

        socket.on('disconnect', () => {
            const rooms = this.roomManager.getUserRooms(socket.id);
            rooms.forEach(roomId => {
                const users = this.roomManager.getRoomUsers(roomId);
                const leavingUser = users.find(u => u.socketId === socket.id);

                this.roomManager.leaveRoom(roomId, socket.id);

                if (leavingUser) {
                    this.broadcastToRoom(roomId, 'room:user_left', {
                        roomId,
                        user: {
                            userId: leavingUser.userId,
                            username: leavingUser.username
                        },
                        users: this.roomManager.getRoomUsers(roomId).map(u => ({
                            userId: u.userId,
                            username: u.username
                        }))
                    });
                }
            });

            this.connectionManager.removeConnection(socket.id);
            this.logger.info('Client disconnected', { socketId: socket.id });
        });
    }

    broadcast(eventName: string, data: any): void {
        this.io?.emit(eventName, data);
    }

    broadcastToRoom(roomId: string, eventName: string, data: any, excludeSocketId?: string): void {
        const users = this.roomManager.getRoomUsers(roomId);
        users.forEach(user => {
            if (user.socketId !== excludeSocketId) {
                this.io?.to(user.socketId).emit(eventName, data);
            }
        });
    }

    emitToUser(userId: string, eventName: string, data: any): void {
        const socketIds = this.connectionManager.getConnectionsByUser(userId);
        socketIds.forEach(socketId => {
            this.io?.to(socketId).emit(eventName, data);
        });
    }
}

// ============================================
// 8. APPLICATION (DI Container)
// ============================================

class Application {
    private server: IWebSocketServer;

    constructor() {
        const logger = new ConsoleLogger();
        const connectionManager = new ConnectionManager();
        const roomManager = new RoomManager(logger);
        const reactionManager = new ReactionManager(logger); // NOVA dependência
        const messageRouter = new MessageRouter(logger);

        const server = new WebSocketServer(
            connectionManager,
            roomManager,
            messageRouter,
            logger
        );

        // Registrar handlers
        messageRouter.registerHandler('join:room', new JoinRoomHandler(logger, roomManager, server));
        messageRouter.registerHandler('leave:room', new LeaveRoomHandler(logger, roomManager, server));
        messageRouter.registerHandler('chat:message', new ChatMessageHandler(logger, roomManager, server));
        messageRouter.registerHandler('message:reaction', new MessageReactionHandler(logger, roomManager, reactionManager, server)); // NOVO handler
        messageRouter.registerHandler('ping', new PingMessageHandler(logger));
        messageRouter.registerHandler('room:typing', new TypingIndicatorHandler(logger, roomManager, server));


        this.server = server;
    }

    start(port: number = 3000): void {
        this.server.start(port);
    }
}

// ============================================
// 9. INICIALIZAÇÃO
// ============================================

const app = new Application();
app.start(3000);