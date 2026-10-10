// Puerto de almacenamiento: hoy filesystem local, en AWS sería S3. La aplicación no nota la diferencia.
export interface IFileStorage {
  save(key: string, content: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
}
