export interface ProducerEvent {
  id?: string;
  type: string;
  data: unknown;
}

export function parseProducerSseBlock(block: string): ProducerEvent | null {
  let id: string | undefined;
  let type = 'message';
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('id:')) id = line.slice(3).trim();
    else if (line.startsWith('event:')) type = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  const text = dataLines.join('\n');
  let data: unknown = text;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    // Plain text SSE payloads are valid.
  }
  return { id, type, data };
}
