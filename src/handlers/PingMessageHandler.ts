import { BaseMessageHandler } from './BaseMessageHandler';
import { ILogger } from '../interfaces/ILogger';
import { PingSchema, PingMessage } from '../schemas/PingSchema';

/**
 * Handler para ping/pong (health check)
 *
 * Responsabilidade (SRP): Responder a health checks
 * Validação automática via BaseMessageHandler
 */
export class PingMessageHandler extends BaseMessageHandler {
    constructor(logger: ILogger) {
        super(logger, PingSchema);
    }

    /**
     * Executa lógica de ping (apenas registra)
     */
    protected async execute(
        socketId: string,
        _eventName: string,
        data: PingMessage
    ): Promise<void> {
        this.logger.info('Ping received', {
            socketId,
            timestamp: data.timestamp
        });

        // Poderia enviar pong de volta:
        // socket.emit('pong', { timestamp: new Date().toISOString() });
    }
}