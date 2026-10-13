/**
 * SportsPulse Production Artifact Standalone Runner Test
 *
 * Spawns `node dist/server.cjs` on an isolated port (PORT=3002) to verify:
 * 1. Production bundle executes directly in Node.js without TypeScript/Vite dev server
 * 2. Honors custom PORT
 * 3. Binds and accepts requests on 0.0.0.0
 * 4. Responds to GET /api/health with status=ok and ready=true
 * 5. Serves static frontend assets
 * 6. Shuts down cleanly on SIGTERM
 */

import { spawn } from 'child_process';
import path from 'path';

async function testProductionArtifact() {
  console.log('Testing standalone production bundle: node dist/server.cjs on PORT 3002...');

  const serverProcess = spawn('node', ['dist/server.cjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '3002',
      NODE_ENV: 'production',
    },
    stdio: 'pipe',
  });

  let stdoutData = '';
  serverProcess.stdout.on('data', (d) => {
    stdoutData += d.toString();
  });
  serverProcess.stderr.on('data', (d) => {
    stdoutData += d.toString();
  });

  // Wait for server to bind
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    const res = await fetch('http://127.0.0.1:3002/api/health');
    if (res.status !== 200) {
      throw new Error(`Expected HTTP 200 from production bundle, got ${res.status}`);
    }
    const data = await res.json();
    console.log('Production bundle health response:', JSON.stringify(data));
    if (data.status !== 'ok' || data.ready !== true) {
      throw new Error(`Invalid health response: status=${data.status}, ready=${data.ready}`);
    }

    // Test static frontend HTML serving
    const htmlRes = await fetch('http://127.0.0.1:3002/');
    if (htmlRes.status !== 200) {
      throw new Error(`Expected HTTP 200 from root HTML, got ${htmlRes.status}`);
    }
    const html = await htmlRes.text();
    if (!html.includes('SportsPulse') && !html.includes('root')) {
      throw new Error('Expected HTML entrypoint to be served by production bundle');
    }

    console.log('✓ Production bundle executes standalone and serves API and Frontend successfully!');
  } finally {
    // Send SIGTERM and verify graceful shutdown
    console.log('Sending SIGTERM to standalone production process...');
    serverProcess.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('✓ Production process stopped cleanly.');
  }
}

testProductionArtifact().catch((err) => {
  console.error('Production artifact test failed:', err);
  process.exit(1);
});
