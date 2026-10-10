// Lo usa el worker cuando se agotan los reintentos, para que el upload no quede en PROCESSING para siempre.
export class FailUploadCommand {
  constructor(
    readonly uploadId: string,
    readonly reason: string,
  ) {}
}
