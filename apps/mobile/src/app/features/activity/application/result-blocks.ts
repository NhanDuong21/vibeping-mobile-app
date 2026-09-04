export interface ResultBlock {
  kind: 'paragraph' | 'heading' | 'list' | 'code';
  lines: string[];
}

/** A small text-only reader: never interpret HTML, images, or execute linked content. */
export function resultBlocks(text: string): ResultBlock[] {
  const blocks: ResultBlock[] = [];
  let code: string[] | null = null;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      if (code) blocks.push({ kind: 'code', lines: code });
      code = code ? null : [];
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!line.trim()) continue;
    const heading = /^\s*#{1,6}\s+(.+)/.exec(line);
    const bullet = /^\s*(?:[-*+] |\d+\. )(.+)/.exec(line);
    const kind = heading ? 'heading' : bullet ? 'list' : 'paragraph';
    const content = plainInline(heading?.[1] ?? bullet?.[1] ?? line);
    const previous = blocks.at(-1);
    if (kind === 'list' && previous?.kind === 'list') previous.lines.push(content);
    else blocks.push({ kind, lines: [content] });
  }
  if (code) blocks.push({ kind: 'code', lines: code });
  return blocks;
}

function plainInline(value: string): string {
  return value
    .replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}
