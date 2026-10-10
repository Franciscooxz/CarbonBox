export class CreateUploadCommand {
  constructor(
    readonly fileName: string,
    readonly content: Buffer,
    readonly userId: string,
  ) {}
}
