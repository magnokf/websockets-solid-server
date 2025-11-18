import { ILogger } from '../../interfaces/ILogger';

/**
 * Implementação de logger que escreve no console
 *
 * Implementa ILogger (Dependency Inversion Principle)
 * Pode ser facilmente substituído por WinstonLogger, FileLogger, etc.
 */
export class ConsoleLogger implements ILogger {
    /**
     * Registra mensagem informativa
     */
    info(message: string, meta?: any): void {
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        console.log(`[INFO] ${message}${metaStr}`);
    }

    /**
     * Registra mensagem de erro
     */
    error(message: string, meta?: any): void {
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        console.error(`[ERROR] ${message}${metaStr}`);
    }

    /**
     * Registra mensagem de aviso
     */
    warn(message: string, meta?: any): void {
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        console.warn(`[WARN] ${message}${metaStr}`);
    }
}