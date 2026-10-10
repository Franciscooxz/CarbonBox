// Either: un resultado es Left (error) o Right (éxito). Obliga a quien llama a revisar el error
// en vez de depender de excepciones que nadie declara.
export class Left<L, R> {
  constructor(readonly value: L) {}

  isLeft(): this is Left<L, R> {
    return true;
  }

  isRight(): this is Right<L, R> {
    return false;
  }
}

export class Right<L, R> {
  constructor(readonly value: R) {}

  isLeft(): this is Left<L, R> {
    return false;
  }

  isRight(): this is Right<L, R> {
    return true;
  }
}

export type Either<L, R> = Left<L, R> | Right<L, R>;

export const left = <L, R = never>(value: L): Either<L, R> => new Left<L, R>(value);
export const right = <R, L = never>(value: R): Either<L, R> => new Right<L, R>(value);

export const Either = { left, right };
