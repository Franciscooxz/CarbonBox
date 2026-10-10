export interface ReceivedMessage<TMessage> {
  body: TMessage;
  receiptHandle: string;
  /** Cuántas veces se ha entregado este mensaje (1 = primer intento). */
  receiveCount: number;
}

export interface IMessageConsumer<TMessage> {
  receive(signal?: AbortSignal): Promise<ReceivedMessage<TMessage>[]>;
  acknowledge(message: ReceivedMessage<TMessage>): Promise<void>;
  /** Vuelve a hacer visible el mensaje dentro de `delaySeconds` (reintento con espera controlada). */
  retryLater(message: ReceivedMessage<TMessage>, delaySeconds: number): Promise<void>;
}
