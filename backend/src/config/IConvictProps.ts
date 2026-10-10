export interface IConvictProps {
  env: 'development' | 'test' | 'production';
  port: number;
  logLevel: string;
  corsOrigin: string;
  databaseUrl: string;
  defaultUserId: string;
  maxFileSizeMb: number;
  storage: {
    dir: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  sqs: {
    endpoint: string;
    queueUrl: string;
    maxReceiveCount: number;
    waitTimeSeconds: number;
    retryBaseDelaySeconds: number;
    retryBackoffFactor: number;
    retryMaxDelaySeconds: number;
  };
}
