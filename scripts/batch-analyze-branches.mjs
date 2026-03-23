import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = process.argv[2];

async function analyzeBranch(repoId, branchId) {
  const res = await fetch(`${API_BASE}/api/ai/code-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      repoId,
      sourceType: 'branch',
      sourceId: branchId,
    }),
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  
  return res.json();
}

async function getAllBranches() {
  const result = await db.execute(`
    SELECT id, name, repo_id FROM branches ORDER BY name
  `);
  return result.rows;
}

async function main() {
  const mode = process.argv[3] || 'status';
  
  if (mode === 'status') {
    const total = await db.execute(`SELECT COUNT(*) as count FROM branches`);
    const analyzed = await db.execute(`
      SELECT COUNT(*) as count FROM code_analyses WHERE source_type = 'branch'
    `);
    console.log(`Branches: ${total.rows[0].count}, Analyzed: ${analyzed.rows[0].count}`);
    return;
  }
  
  if (mode === 'analyze') {
    const branches = await getAllBranches();
    
    // Get already analyzed branch IDs
    const analyzedResult = await db.execute(`
      SELECT source_id FROM code_analyses WHERE source_type = 'branch'
    `);
    const analyzedIds = new Set(analyzedResult.rows.map(r => r.source_id));
    
    const toAnalyze = branches.filter(b => !analyzedIds.has(b.id));
    console.log(`Total: ${branches.length}, Already analyzed: ${analyzedIds.size}, To analyze: ${toAnalyze.length}`);
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < toAnalyze.length; i++) {
      const branch = toAnalyze[i];
      console.log(`\n[${i + 1}/${toAnalyze.length}] Analyzing ${branch.name}...`);
      
      try {
        const start = Date.now();
        const result = await analyzeBranch(branch.repo_id, branch.id);
        const duration = (Date.now() - start) / 1000;
        
        if (result.success) {
          success++;
          const label = result.analysis.isAgentic ? '🤖 AGENTIC' : '👤 HUMAN';
          console.log(`  ${label} (${Math.round(result.analysis.confidence * 100)}%) - ${duration.toFixed(1)}s ${result.cached ? '[CACHED]' : ''}`);
        } else {
          failed++;
          console.log(`  ❌ Failed: ${result.error}`);
        }
      } catch (err) {
        failed++;
        console.log(`  ❌ Error: ${err.message}`);
      }
      
      // Small delay to avoid rate limits
      if (i < toAnalyze.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    console.log(`\n=== Complete ===`);
    console.log(`Success: ${success}, Failed: ${failed}`);
  }
}

main().catch(console.error);
