import { ILogger } from '../interfaces/ILogger';
import { IMessageHandler } from '../interfaces/IMessageHandler';
import { IMessageRouter } from '../interfaces/IMessageRouter';

/**
 * Centraliza o roteamento de mensagens WebSocket
 *
 * Responsabilidade (SRP): Mapear eventos para handlers específicos
 * Open/Closed: novos eventos são adicionados registrando handlers
 */
export class MessageRouter implements IMessageRouter {
  private handlers = new Map<string, IMessageHandler>();

  constructor(private readonly logger: ILogger) {}

  /**
   * Registra um handler para um evento específico
   */
  registerHandler(eventName: string, handler: IMessageHandler): void {
    this.handlers.set(eventName, handler);
  }

  /**
   * Encaminha mensagem para o handler apropriado
   */
  async route(socketId: string, eventName: string, data: unknown): Promise<void> {
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
