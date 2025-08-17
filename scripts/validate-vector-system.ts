#!/usr/bin/env tsx

/**
 * Vector System Validation (Task 10.7)
 * - Compares text-based docs search vs vector semantic search for representative queries
 * - Measures response times and reports bundle size
 * - Outputs a JSON summary to demo-output/enhanced-metrics.json
 */

import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { promises as fs } from 'node:fs';

type JsonRpcRequest = { jsonrpc: '2.0'; id: number; method: string; params?: any };

const projectRoot = resolve(process.cwd());
const serverDir = resolve(projectRoot, 'generated-servers', 'lodash-mcp-server');
const embeddingsPath = join(serverDir, 'src', 'embeddings.js');
const outputPath = resolve(projectRoot, 'demo-output', 'enhanced-metrics.json');

const QUERIES = ['curryRight', 'filter arrays', 'map', 'debounce', 'throttle'];

function send(child: ReturnType<typeof spawn>, obj: any) {
  child.stdin.write(JSON.stringify(obj) + '\n');
}

function isJsonLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('{') && t.endsWith('}') && t.includes('"jsonrpc"');
}

async function run() {
  await fs.mkdir(resolve(projectRoot, 'demo-output'), { recursive: true });

  const child = spawn('npx', ['--yes', 'tsx', 'src/index.ts'], {
    cwd: serverDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let ready = false;
  const stdoutBuf: string[] = [];
  const stderrBuf: string[] = [];

  child.stdout.on('data', (d) => {
    const s = d.toString();
    stdoutBuf.push(s);
    if (!ready && s.includes('running on stdio')) ready = true;
  });
  child.stderr.on('data', (d) => {
    const s = d.toString();
    stderrBuf.push(s);
    if (!ready && s.includes('running on stdio')) ready = true;
  });

  const waitForReady = async () => {
    const start = Date.now();
    while (!ready && Date.now() - start < 5000) await new Promise((r) => setTimeout(r, 50));
    if (!ready) throw new Error('Server did not become ready in time');
  };

  const collect = async (id: number, timeoutMs = 5000) => {
    const start = Date.now();
    let cursor = 0;
    while (Date.now() - start < timeoutMs) {
      for (; cursor < stdoutBuf.length; cursor++) {
        const chunk = stdoutBuf[cursor];
        for (const line of chunk.split(/\r?\n/)) {
          if (!isJsonLine(line)) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === id) return msg;
          } catch {}
        }
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error('Timeout waiting for id=' + id);
  };

  const metrics: any = {
    timestamp: new Date().toISOString(),
    embeddings: {},
    queries: [] as any[]
  };

  // Embeddings file size
  try {
    const st = await fs.stat(embeddingsPath);
    metrics.embeddings.sizeBytes = st.size;
    metrics.embeddings.sizeMB = +(st.size / 1024 / 1024).toFixed(2);
  } catch {}

  try {
    await waitForReady();
    // List tools once (optional warmup)
    send(child, { jsonrpc: '2.0', id: 1, method: 'tools/list' } as JsonRpcRequest);
    await collect(1);

    let id = 10;
    for (const q of QUERIES) {
      // Baseline: text-only by forcing readme type (hybrid returns empty for type readme → fallback to text search)
      const t0 = Date.now();
      send(child, {
        jsonrpc: '2.0',
        id: ++id,
        method: 'tools/call',
        params: { name: 'search_package_docs', arguments: { query: q, type: 'readme', limit: 3 } }
      } as JsonRpcRequest);
      const textRes = await collect(id);
      const textMs = Date.now() - t0;
      const textContent: string = textRes?.result?.content?.[0]?.text || '';

      // Vector: semantic search
      const v0 = Date.now();
      send(child, {
        jsonrpc: '2.0',
        id: ++id,
        method: 'tools/call',
        params: { name: 'semantic_search', arguments: { query: q, type: 'all', limit: 3, minSimilarity: 0.1 } }
      } as JsonRpcRequest);
      const vecRes = await collect(id);
      const vecMs = Date.now() - v0;
      const vecContent: string = vecRes?.result?.content?.[0]?.text || '';

      const extractTop = (s: string) => {
        const m = s.match(/^##\s+\d+\.\s+(.+)$/m);
        return m ? m[1] : null;
      };

      metrics.queries.push({
        query: q,
        baseline: { ms: textMs, length: textContent.length, top: extractTop(textContent) },
        vector: { ms: vecMs, length: vecContent.length, top: extractTop(vecContent) }
      });
    }

    await fs.writeFile(outputPath, JSON.stringify(metrics, null, 2));
    console.log('✅ Wrote metrics to', outputPath);
  } catch (e) {
    console.error('❌ Validation failed:', e);
    console.error(stderrBuf.join(''));
    process.exitCode = 1;
  } finally {
    try { child.kill(); } catch {}
  }
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});


