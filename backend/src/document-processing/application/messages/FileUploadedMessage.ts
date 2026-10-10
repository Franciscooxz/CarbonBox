// Contrato del mensaje en la cola. Solo viaja el id: el worker lee el estado actual desde la DB,
// así un mensaje viejo o duplicado nunca trae datos desactualizados.
export interface FileUploadedMessage {
  uploadId: string;
}

export const isFileUploadedMessage = (value: unknown): value is FileUploadedMessage =>
  typeof value === 'object' &&
  value !== null &&
  'uploadId' in value &&
  typeof value.uploadId === 'string' &&
  value.uploadId.length > 0;
