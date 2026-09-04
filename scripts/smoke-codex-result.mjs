import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as pause } from 'node:timers/promises';

// Only synthetic text and a disposable, unpaired database. No push recipient is registered.
const binary = resolve(process.argv[2] ?? 'target/release/vibeping.exe');
const temporary = await mkdtemp(join(tmpdir(), 'vibeping-result-smoke-'));
assert(temporary.startsWith(resolve(tmpdir()) + sep));
const data = join(temporary, 'data');
const origin = 'http://127.0.0.1:8797';
const execute = promisify(execFile);
let running = false;
const abort = new AbortController();
let reader;
const events = [];
let streamTask;

async function command(args, env = process.env) {
  return execute(binary, [...args, '--data-dir', data], { windowsHide: true, timeout: 15000, env });
}
async function read(path) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200);
  return response.json();
}
async function ingest(payload) {
  // Prevent probing installed Codex or forwarding any pre-existing notifier during this fixture.
  await command(['integrations', 'codex', 'ingest-notify', JSON.stringify(payload)], { ...process.env, LOCALAPPDATA: temporary, PATH: '' });
}
try {
  await command(['start', '--port', '8797']);
  running = true;
  const stream = await fetch(origin + '/api/v1/stream', { signal: abort.signal });
  assert.equal(stream.status, 200);
  reader = stream.body.getReader();
  streamTask = (async () => {
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return;
      buffer += decoder.decode(chunk.value, { stream: true }).replaceAll('\r', '');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (block.startsWith('event: activity')) {
          const line = block.split('\n').find(value => value.startsWith('data:'));
          events.push(JSON.parse(line.slice(5).trim()));
        }
      }
    }
  })().catch(() => {});
  const payload = { type: 'agent-turn-complete', 'thread-id': 'fixture-thread', 'turn-id': 'fixture-turn', cwd: 'Sample' };
  await ingest(payload);
  let feed;
  for (let attempt = 0; attempt < 20; attempt++) {
    feed = await read('/api/v1/events');
    if (feed.events.length) break;
    await pause(100);
  }
  assert.equal(feed.events.length, 1);
  const id = feed.events[0].id;
  const result = 'Đã sửa bộ lọc hoạt động.\n\n- Kiểm thử bộ lọc đã qua.';
  await ingest({ ...payload, 'last-assistant-message': result, 'input-messages': ['PROMPT_MUST_NOT_PERSIST'], 'tool-output': 'TOOL_LOG_MUST_NOT_PERSIST' });
  let detail;
  for (let attempt = 0; attempt < 20; attempt++) {
    detail = await read('/api/v1/events/' + id);
    if (detail.result) break;
    await pause(100);
  }
  assert.equal(detail.result.text, result);
  assert.equal(detail.result.truncated, false);
  assert.equal(detail.resultExcerpt, 'Đã sửa bộ lọc hoạt động.');
  assert(!JSON.stringify(detail).includes('MUST_NOT_PERSIST'));
  feed = await read('/api/v1/events');
  assert.equal(feed.events.length, 1);
  assert.equal(feed.events[0].id, id);
  assert.equal(feed.events[0].result, undefined);
  for (let attempt = 0; attempt < 20 && !events.some(event => event.resultExcerpt); attempt++) await pause(100);
  assert(events.some(event => event.id === id && event.resultExcerpt === detail.resultExcerpt));
  await ingest({ ...payload, 'last-assistant-message': result });
  assert.equal((await read('/api/v1/events')).events.length, 1);
  abort.abort();
  await reader.cancel().catch(() => {});
  await streamTask;
  await command(['stop']);
  running = false;
  await command(['start', '--port', '8797']);
  running = true;
  assert.equal((await read('/api/v1/events/' + id)).result.text, result);
  console.log('Result package smoke passed: notify -> durable detail + excerpt SSE, late enrichment without duplicate, no prompt/tool log, result survives restart.');
} finally {
  abort.abort();
  await reader?.cancel().catch(() => {});
  if (running) await command(['stop']);
  await rm(temporary, { recursive: true, force: true });
}
