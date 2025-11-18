/**
 * Interface para handlers de mensagens (Open/Closed Principle)
 *
 * Permite adicionar novos tipos de mensagens sem modificar código existente.
 * Cada handler é responsável por processar um tipo específico de evento.
 *
 * Exemplos: ChatMessageHandler, JoinRoomHandler, ReactionHandler, etc.
 */
export interface IMessageHandler {
    /**
     * Processa uma mensagem/evento
     * @param socketId ID do socket que enviou a mensagem
     * @param eventName Nome do evento
     * @param data Dados da mensagem
     */
    handle(socketId: string, eventName: string, data: any): Promise<void>;
}