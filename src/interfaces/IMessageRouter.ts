import { IMessageHandler } from './IMessageHandler';

/**
 * Interface para roteamento de mensagens WebSocket.
 *
 * Responsabilidade: manter o mapa de handlers e delegar eventos.
 */
export interface IMessageRouter {
  /**
   * Registra um handler responsável por um evento específico.
   */
  registerHandler(eventName: string, handler: IMessageHandler): void;

  /**
   * Encaminha o evento recebido para o handler registrado.
   */
  route(socketId: string, eventName: string, data: unknown): Promise<void>;
}
