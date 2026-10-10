import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import type { IMessageConsumer, ReceivedMessage } from '../../../shared/application/messaging/IMessageConsumer';

export class SqsMessageConsumer implements IMessageConsumer<unknown> {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;
  private readonly waitTimeSeconds: number;

  constructor({ sqsClient, queueUrl, waitTimeSeconds }: { sqsClient: SQSClient; queueUrl: string; waitTimeSeconds: number }) {
    this.sqsClient = sqsClient;
    this.queueUrl = queueUrl;
    this.waitTimeSeconds = waitTimeSeconds;
  }

  async receive(signal?: AbortSignal): Promise<ReceivedMessage<unknown>[]> {
    // Long polling: la petición espera hasta waitTimeSeconds a que llegue algo, en vez de
    // preguntar en bucle cada pocos milisegundos (menos peticiones y menos costo en AWS).
    const response = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: this.waitTimeSeconds,
        MessageSystemAttributeNames: ['ApproximateReceiveCount'],
      }),
      { abortSignal: signal },
    );

    return (response.Messages ?? []).flatMap((message) => {
      if (!message.ReceiptHandle) return [];
      return [
        {
          body: this.parseBody(message.Body),
          receiptHandle: message.ReceiptHandle,
          receiveCount: Number(message.Attributes?.ApproximateReceiveCount ?? '1'),
        },
      ];
    });
  }

  async acknowledge(message: ReceivedMessage<unknown>): Promise<void> {
    await this.sqsClient.send(new DeleteMessageCommand({ QueueUrl: this.queueUrl, ReceiptHandle: message.receiptHandle }));
  }

  async retryLater(message: ReceivedMessage<unknown>, delaySeconds: number): Promise<void> {
    // Cambiar el visibility timeout de ESTE mensaje decide cuándo reaparece en la cola.
    await this.sqsClient.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.receiptHandle,
        VisibilityTimeout: delaySeconds,
      }),
    );
  }

  private parseBody(body: string | undefined): unknown {
    try {
      return JSON.parse(body ?? '');
    } catch {
      // El worker valida la forma del mensaje; un JSON roto llega como null y se descarta allí.
      return null;
    }
  }
}
