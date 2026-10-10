// Puerto de salida: la aplicación publica mensajes sin saber si detrás hay SQS, ElasticMQ u otra cosa.
export interface IMessagePublisher<TMessage> {
  publish(message: TMessage): Promise<void>;
}
