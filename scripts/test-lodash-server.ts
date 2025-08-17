#!/usr/bin/env tsx

/**
 * Automated test runner for the generated lodash MCP server
 * - Spawns the server (tsx src/index.ts)
 * - Sends JSON-RPC messages over stdio
 * - Prints concise pass/fail results
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
};

type TestCase = {
  name: string;
  request: JsonRpcRequest;
  expect?: (response: any) => void;
};

const serverDir = resolve(process.cwd(), 'generated-servers', 'lodash-mcp-server');

function send(child: ReturnType<typeof spawn>, obj: any) {
  child.stdin.write(JSON.stringify(obj) + '\n');
}

function isJsonLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}') && trimmed.includes('"jsonrpc"');
}

async function run() {
  console.log('🔧 Starting lodash MCP server tests...');

  const child = spawn('npx', ['--yes', 'tsx', 'src/index.ts'], {
    cwd: serverDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let ready = false;
  const stdoutBuffer: string[] = [];
  const stderrBuffer: string[] = [];

  child.stdout.on('data', (d) => {
    const text = d.toString();
    stdoutBuffer.push(text);
    if (!ready && text.includes('running on stdio')) ready = true;
  });

  child.stderr.on('data', (d) => {
    const text = d.toString();
    stderrBuffer.push(text);
    if (!ready && text.includes('running on stdio')) ready = true;
  });

  const waitForReady = async () => {
    const start = Date.now();
    while (!ready && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!ready) throw new Error('Server did not become ready in time');
  };

  const collectResponse = async (id: number, timeoutMs = 5000) => {
    const start = Date.now();
    let cursor = 0;
    while (Date.now() - start < timeoutMs) {
      // Scan newly added stdout lines for JSON-RPC response with matching id
      for (; cursor < stdoutBuffer.length; cursor++) {
        const chunk = stdoutBuffer[cursor];
        const lines = chunk.split(/\r?\n/);
        for (const line of lines) {
          if (!isJsonLine(line)) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === id) return msg;
          } catch {
            // ignore
          }
        }
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`Timeout waiting for response id=${id}`);
  };

  const tests: TestCase[] = [
    {
      name: 'tools/list',
      request: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      expect: (res) => {
        if (!res.result?.tools || res.result.tools.length < 4) throw new Error('Expected at least 4 tools');
      }
    },
    {
      name: 'get_package_info',
      request: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'get_package_info', arguments: { includeMetadata: true } }
      }
    },
    {
      name: 'get_usage_examples',
      request: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_usage_examples', arguments: { category: 'basic', language: 'js', limit: 1 } }
      }
    },
    {
      name: 'get_api_reference',
      request: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'get_api_reference', arguments: { type: 'interfaces', search: 'LoDash' } }
      }
    },
    {
      name: 'search_package_docs',
      request: {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'search_package_docs', arguments: { query: 'modular', type: 'readme', limit: 2 } }
      }
    },
    {
      name: 'semantic_search: filter arrays',
      request: {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'semantic_search', arguments: { query: 'filter arrays', type: 'all', limit: 3, minSimilarity: 0.1 } }
      }
    },
    {
      name: 'semantic_search: curryRight',
      request: {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'semantic_search', arguments: { query: 'curryRight', type: 'all', limit: 5, minSimilarity: 0.1 } }
      }
    }
  ];

  try {
    await waitForReady();
    console.log('✅ Server is ready');

    for (const t of tests) {
      send(child, t.request);
      const res = await collectResponse(t.request.id);
      if (t.expect) t.expect(res);
      // Detailed logging of responses
      const json = JSON.stringify(res, null, 2);
      const limit = 8000;
      const truncated = json.length > limit ? json.slice(0, limit) + '\n... [truncated]' : json;
      console.log(`\n--- Response: ${t.name} ---\n${truncated}\n`);
      console.log(`✔ ${t.name}`);
    }

    console.log('\n🎉 All tests passed');
  } catch (err) {
    console.error('\n❌ Test run failed:', err);
    console.error('STDERR:', stderrBuffer.join(''));
    process.exitCode = 1;
  } finally {
    try { child.kill(); } catch {}
  }
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});


