export class ListUploadsQuery {
  constructor(
    readonly userId: string,
    readonly page: number,
    readonly limit: number,
  ) {}
}
