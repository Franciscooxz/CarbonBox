// Petición HTTP independiente del framework: los controllers no importan Fastify y se prueban sin servidor.
export interface UploadedFile {
  fileName: string;
  content: Buffer;
}

export interface IHttpRequest {
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  file?: UploadedFile;
}
