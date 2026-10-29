import type { IncomingMessage } from "node:http";
export type NodeApiResponse = {
  setHeader: (name: string, value: string) => unknown;
  status: (code: number) => NodeApiResponse;
  json: (body: unknown) => unknown;
  end: () => unknown;
};
export default function handler(req: IncomingMessage, res: NodeApiResponse): Promise<void>;
