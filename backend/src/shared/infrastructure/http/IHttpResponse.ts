export interface IHttpResponse<TBody = unknown> {
  statusCode: number;
  body: TBody;
}
