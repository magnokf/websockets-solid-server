import { IMessageHandler } from '../interfaces/IMessageHandler';
import { ILogger } from '../interfaces/ILogger';
import { ValidationError } from '../errors/ValidationError';
import { z } from 'zod';

/**
 * Handler base abstrato (Template Method Pattern)
 *
 * Implementa validação comum e força handlers filhos a implementar execute()
 * Princípio: Open/Closed - Fechado para modificação, aberto para extensão
 */
export abstract class BaseMessageHandler implements IMessageHandler {
    /**
     * @param logger Logger para registrar eventos
     * @param schema Schema Zod opcional para validação
     */
    protected constructor(
        protected logger: ILogger,
        protected schema?: z.ZodSchema
    ) {}

    /**
     * Método público que valida e delega para execute()
     * Template Method Pattern
     */
    async handle(socketId: string, eventName: string, data: any): Promise<void> {
        // Se tem schema, validar
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

            // Passar dados validados para execute
            return this.execute(socketId, eventName, result.data);
        }

        // Sem validação, passar direto
        return this.execute(socketId, eventName, data);
    }

    /**
     * Método abstrato que cada handler deve implementar
     * @param socketId ID do socket
     * @param eventName Nome do evento
     * @param data Dados já validados
     */
    protected abstract execute(
        socketId: string,
        eventName: string,
        data: any
    ): Promise<void>;
}