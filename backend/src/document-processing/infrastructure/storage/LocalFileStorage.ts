import fs from 'node:fs/promises';
import path from 'node:path';
import type { IFileStorage } from '../../application/ports/IFileStorage';

// Implementación local de IFileStorage (ADR-001). En AWS se reemplaza por una con S3 (PutObject/GetObject).
export class LocalFileStorage implements IFileStorage {
  private readonly baseDir: string;

  constructor({ storageDir }: { storageDir: string }) {
    this.baseDir = path.resolve(storageDir);
  }

  async save(key: string, content: Buffer): Promise<void> {
    const fullPath = this.resolve(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  private resolve(key: string): string {
    const fullPath = path.resolve(this.baseDir, key);
    // Defensa en profundidad: la clave nunca debe salir de la carpeta base.
    if (!fullPath.startsWith(this.baseDir + path.sep)) throw new Error(`Clave de almacenamiento inválida: ${key}`);
    return fullPath;
  }
}
