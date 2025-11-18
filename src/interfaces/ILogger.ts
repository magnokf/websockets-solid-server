/**
 * Interface para logging (Dependency Inversion Principle)
 *
 * Permite trocar a implementação de logger sem afetar o resto do código.
 * Exemplos: ConsoleLogger, FileLogger, WinstonLogger, etc.
 */
export interface ILogger {
    /**
     * Registra mensagem informativa
     * @param message Mensagem a ser registrada
     * @param meta Metadados adicionais (opcional)
     */
    info(message: string, meta?: any): void;

    /**
     * Registra mensagem de erro
     * @param message Mensagem de erro
     * @param meta Metadados adicionais (opcional)
     */
    error(message: string, meta?: any): void;

    /**
     * Registra mensagem de aviso
     * @param message Mensagem de aviso
     * @param meta Metadados adicionais (opcional)
     */
    warn(message: string, meta?: any): void;
}