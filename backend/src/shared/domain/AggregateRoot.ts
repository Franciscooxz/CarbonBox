import { Entity } from './Entity';

// Raíz de agregado: la única puerta de entrada para modificar el agregado. Sus métodos protegen las invariantes.
export abstract class AggregateRoot<TId = string> extends Entity<TId> {}
