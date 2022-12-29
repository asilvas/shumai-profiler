import { jsonParseHandler } from '../util/encode';
import { addStats } from './stats';

export async function processRequest(req: Request): Promise<Response> {
  const body = await req.text();

  const data = JSON.parse(body, jsonParseHandler);

  addStats([data]);

  return new Response('OK');
}
