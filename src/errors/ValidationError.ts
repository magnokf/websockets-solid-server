import { z } from 'zod';

/**
 * Erro customizado para falhas de validação Zod
 *
 * Encapsula o ZodError original e adiciona informações úteis
 * para o tratamento de erros no WebSocketServer
 */
export class ValidationError extends Error {
    /**
     * Erro original do Zod contendo detalhes das validações que falharam
     */
    public zodError: z.ZodError;

    /**
     * Nome do erro para identificação
     */
    public name: string = 'ValidationError';

    constructor(message: string, zodError: z.ZodError) {
        super(message);
        this.zodError = zodError;

        // Necessário para instanceof funcionar corretamente no TypeScript
        Object.setPrototypeOf(this, ValidationError.prototype);
    }

    getFormattedErrors(): Array<{ field: string; message: string }> {
        return this.zodError.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
        }));
    }
}