/**
 * Interface para servidor WebSocket (Dependency Inversion Principle)
 *
 * Permite que handlers dependam de uma abstração ao invés da implementação concreta.
 * Facilita testes (pode criar mock do servidor) e troca de tecnologia (Socket.IO → ws).
 */
export interface IWebSocketServer {
    /**
     * Inicia o servidor WebSocket
     * @param port Porta para escutar
     */
    start(port: number): void;

    /**
     * Envia mensagem para TODOS os clientes conectados
     * @param eventName Nome do evento
     * @param data Dados a enviar
     */
    broadcast(eventName: string, data: any): void;

    /**
     * Envia mensagem para todos em uma sala (com opção de excluir alguém)
     * @param roomId ID da sala
     * @param eventName Nome do evento
     * @param data Dados a enviar
     * @param excludeSocketId ID do socket a excluir (opcional)
     */
    broadcastToRoom(
        roomId: string,
        eventName: string,
        data: any,
        excludeSocketId?: string
    ): void;

    /**
     * Envia mensagem para um usuário específico (todas suas conexões)
     * @param userId ID do usuário
     * @param eventName Nome do evento
     * @param data Dados a enviar
     */
    emitToUser(userId: string, eventName: string, data: any): void;
}