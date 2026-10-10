export abstract class Entity<TId = string> {
  protected constructor(readonly id: TId) {}

  equals(other: Entity<TId>): boolean {
    return this.id === other.id;
  }
}
