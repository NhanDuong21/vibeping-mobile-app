import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, dirname } from 'node:path';
import { promisify } from 'node:util';

const binary = resolve(process.argv[2] ?? 'target/release/vibeping.exe');
const data = await mkdtemp(join(tmpdir(), 'vibeping-ready-smoke-'));
const port = 8797;
const execute = promisify(execFile);
const options = { windowsHide:true, timeout:35_000 };
const cli = (...args) => execute(binary,[...args,'--data-dir',data],options);
const configPath = join(data,'always-ready.json');
const status = async () => JSON.parse((await cli('always-ready','status')).stdout);
let companion;
const sleep = ms => new Promise(r => setTimeout(r,ms));
async function until(check, message, milliseconds = 45_000) {
  const end = Date.now()+milliseconds;
  while (Date.now()<end) { try { if (await check()) return; } catch { /* recovery in progress */ } await sleep(500); }
  assert.fail(message);
}

try {
  let occupied = false;
  try { occupied = (await fetch('http://127.0.0.1:'+port+'/api/v1/health')).ok; } catch { /* unused */ }
  assert(!occupied,'The isolated smoke port is occupied.');
  const launcher = await readFile(join(dirname(binary),'vibeping-ready.exe'));
  const pe = launcher.readUInt32LE(0x3c);
  assert.equal(launcher.readUInt16LE(pe+24+68),2,'Logon launcher must use the Windows GUI subsystem.');
  await cli('start','--port',String(port));
  await writeFile(configPath,JSON.stringify({ enabled:true,auto_start:false,port }));
  companion = spawn(binary,['always-ready','watch','--port',String(port),'--data-dir',data],{ windowsHide:true,stdio:'ignore' });
  await until(async () => { const s = await status(); return s.state === 'healthy' && s.trayAvailable; },'Tray or initial health check failed.');
  const duplicate = await cli('always-ready','watch');
  assert.match(duplicate.stdout,/đã chạy/);
  console.log('Windowless launcher, tray registration, health and single companion passed.');

  const metadata = JSON.parse(await readFile(join(data,'runtime.json'),'utf8'));
  const crashScript = join(data,'crash-owned-host.ps1');
  await writeFile(crashScript,[
    'param([int]$TargetProcessId,[string]$ExpectedExecutable)',
    "$ErrorActionPreference = 'Stop'",
    '$owned = Get-Process -Id $TargetProcessId',
    "if ($owned.Path -ne $ExpectedExecutable) { throw 'Not the test-owned executable' }",
    '$owned | Stop-Process -Force',
  ].join('\r\n'));
  await execute('powershell.exe',['-NoProfile','-File',crashScript,'-TargetProcessId',String(metadata.processId),'-ExpectedExecutable',binary],options);
  await until(async () => {
    const s = await status();
    const current = JSON.parse(await readFile(join(data,'runtime.json'),'utf8'));
    return s.state === 'healthy' && s.recoveryCount >= 1 && current.processId !== metadata.processId;
  },'Crashed host was not recovered.');
  console.log('Actual host crash recovered without changing the data directory.');

  await cli('stop');
  await until(async () => (await status()).state === 'stopped','Manual Stop did not reach the companion.');
  await sleep(22_000);
  assert.equal((await status()).state,'stopped');
  const intent = JSON.parse(await readFile(join(data,'intent.json'),'utf8'));
  assert.equal(intent.enabled,false);
  console.log('Explicit Stop remained stopped through two health-check intervals.');

  await writeFile(configPath,JSON.stringify({ enabled:false,auto_start:false,port }));
  await until(async () => companion.exitCode !== null,'Companion did not exit after disabling.');
  assert.equal((await status()).state,'disabled');
  console.log('Disabling removed the companion; no startup registry entries were changed by this test.');
} finally {
  await writeFile(configPath,JSON.stringify({ enabled:false,auto_start:false,port })).catch(() => {});
  await cli('stop').catch(() => {});
  if (companion && companion.exitCode === null) {
    await until(async () => companion.exitCode !== null,'Companion cleanup timed out.',15_000).catch(() => companion.kill());
  }
  const prefix = resolve(tmpdir())+sep;
  assert(data.startsWith(prefix) && data.includes('vibeping-ready-smoke-'),'Cleanup target is outside the test root.');
  await rm(data,{ recursive:true,force:true,maxRetries:5,retryDelay:500 });
}
