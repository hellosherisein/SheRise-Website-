import type { IncomingMessage } from "node:http";
import type { NodeApiResponse } from "./login.mjs";
export default function handler(req: IncomingMessage, res: NodeApiResponse): Promise<void>;
