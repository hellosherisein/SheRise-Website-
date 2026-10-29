export default function handler(
  req: { method?: string },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (value: number) => unknown;
    json: (body: unknown) => unknown;
    end: () => unknown;
  },
): Promise<void>;
