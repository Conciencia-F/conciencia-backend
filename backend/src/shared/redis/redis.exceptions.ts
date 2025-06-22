export class RedisException extends Error {
  constructor(
    public readonly operation: string,
    public readonly key: string,
    public readonly originalError?: Error,
  ) {
    super(`Error de Redis en operación ${operation} para clave ${key}`);
    this.name = 'RedisException';
  }
}
