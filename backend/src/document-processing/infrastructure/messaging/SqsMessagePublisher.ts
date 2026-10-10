import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import type { IMessagePublisher } from '../../../shared/application/messaging/IMessagePublisher';
import type { FileUploadedMessage } from '../../application/messages/FileUploadedMessage';

export class SqsMessagePublisher implements IMessagePublisher<FileUploadedMessage> {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor({ sqsClient, queueUrl }: { sqsClient: SQSClient; queueUrl: string }) {
    this.sqsClient = sqsClient;
    this.queueUrl = queueUrl;
  }

  async publish(message: FileUploadedMessage): Promise<void> {
    await this.sqsClient.send(new SendMessageCommand({ QueueUrl: this.queueUrl, MessageBody: JSON.stringify(message) }));
  }
}
