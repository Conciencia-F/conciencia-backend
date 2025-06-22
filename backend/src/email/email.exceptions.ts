export class EmailException extends Error {
  constructor(
    public readonly operation: string,
    public readonly recipient: string,
    public readonly originalError?: Error,
  ) {
    super(`Error al enviar email (${operation}) a ${recipient}`);
    this.name = 'EmailException';
  }
}
