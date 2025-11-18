import { z } from 'zod';

/**
 * Schema de validação para typing indicator
 *
 * Valida que roomId e estado de digitação foram fornecidos
 */
export const TypingSchema = z.object({
    /**
     * ID da sala onde o usuário está digitando
     */
    roomId: z.string().min(1, 'Room ID is required'),

    /**
     * Se o usuário está digitando ou parou
     * true = digitando
     * false = parou de digitar
     */
    isTyping: z.boolean({
        required_error: 'isTyping is required',
        invalid_type_error: 'isTyping must be a boolean'
    })
});

/**
 * Tipo TypeScript inferido do schema
 */
export type TypingIndicator = z.infer<typeof TypingSchema>;