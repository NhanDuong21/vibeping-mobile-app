import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as pause } from 'node:timers/promises';

// Exercise the packaged hook/notify boundary with synthetic data and no push recipient.
const binary = resolve(process.argv[2] ?? 'target/release/vibeping.exe');
const previous = process.argv[3] ? resolve(process.argv[3]) : binary;
const root = await mkdtemp(join(tmpdir(), 'vibeping-session-smoke-'));
assert(root.startsWith(resolve(tmpdir()) + sep));
const data = join(root, 'data');
const origin = 'http://127.0.0.1:8798';
const execute = promisify(execFile);
const env = { ...process.env, LOCALAPPDATA: root, PATH: '' };
let active = previous;
let running = false;
const identity = { session_id: 'synthetic-thread', turn_id: 'synthetic-turn', cwd: 'Sample' };

const command = (args) => execute(active, [...args, '--data-dir', data], { windowsHide: true, timeout: 20_000, env });
async function read(path) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200);
  return response.json();
}
async function hook(hook_event_name, extra = {}) {
  const child = spawn(active, ['integrations', 'codex', 'ingest-hook', '--source', 'vibeping-hook-v1', '--data-dir', data],
    { windowsHide: true, env, stdio: ['pipe', 'ignore', 'pipe'] });
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error('Synthetic hook failed')));
  });
  child.stdin.end(JSON.stringify({ ...identity, hook_event_name, ...extra }));
  await done;
}
async function eventually(check) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await check()) return;
    await pause(100);
  }
  assert.fail('Session did not reach expected state');
}

try {
  await command(['start', '--port', '8798']);
  running = true;
  await hook('UserPromptSubmit');
  await hook('PermissionRequest');
  await eventually(async () => (await read('/api/v1/events')).events.length === 2);
  const legacy = await read('/api/v1/events');
  await command(['stop']); running = false;
  active = binary;
  await command(['start', '--port', '8798']); running = true;
  let grouped = await read('/api/v1/events?grouped=true');
  assert.equal(grouped.events.length, 1);
  const id = grouped.events[0].id;
  assert.equal(grouped.events[0].session.state, 'waiting');
  await hook('PostToolUse', { tool_name: 'exec_command', tool_input: { cmd: 'pnpm test' }, tool_response: { exit_code: 1 } });
  await hook('PostToolUse', { tool_name: 'exec_command', tool_input: { cmd: 'synthetic edit' }, tool_response: { exit_code: 0 } });
  await hook('PostToolUse', { tool_name: 'exec_command', tool_input: { cmd: 'pnpm test' }, tool_response: { exit_code: 0 } });
  const answer = 'Đã sửa bộ lọc. Kiểm thử đã qua.';
  await command(['integrations', 'codex', 'ingest-notify', JSON.stringify({ type: 'agent-turn-complete',
    'thread-id': identity.session_id, 'turn-id': identity.turn_id, cwd: 'Sample', 'last-assistant-message': answer })]);
  await eventually(async () => (await read('/api/v1/events/' + id)).result?.text === answer);
  grouped = await read('/api/v1/events?grouped=true');
  assert.equal(grouped.events.length, 1);
  assert.equal(grouped.events[0].id, id);
  assert.equal(grouped.events[0].session.state, 'completed');
  assert.equal(grouped.events[0].session.failedTestCount, 1);
  assert.equal(grouped.events[0].result, undefined);
  for (const old of legacy.events) {
    const detail = await read('/api/v1/events/' + old.id);
    assert.equal(detail.id, id);
    assert.equal(detail.timeline.length, 6);
    assert.equal(detail.result.text, answer);
  }
  await command(['stop']); running = false;
  await command(['start', '--port', '8798']); running = true;
  assert.equal((await read('/api/v1/events/' + id)).result.text, answer);
  console.log('Session package smoke passed: upgrade/backfill, hook lifecycle, stable grouped card, old links, final answer, restart.');
} finally {
  if (running) await command(['stop']);
  await rm(root, { recursive: true, force: true });
}
