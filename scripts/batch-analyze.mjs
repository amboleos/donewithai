import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const API_BASE = 'http://localhost:3000';
const AUTH_TOKEN = process.argv[2];

async function analyzeCommit(repoId, commitId) {
  const res = await fetch(`${API_BASE}/api/ai/code-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      repoId,
      sourceType: 'commit',
      sourceId: commitId,
    }),
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  
  return res.json();
}

async function get2026Commits() {
  const result = await db.execute(`
    SELECT id, sha, message, date 
    FROM commits 
    WHERE date >= '2026-01-01'
    ORDER BY date DESC
  `);
  return result.rows;
}

async function getAnalysisProgress() {
  const total = await db.execute(`SELECT COUNT(*) as count FROM commits WHERE date >= '2026-01-01'`);
  const analyzed = await db.execute(`
    SELECT COUNT(DISTINCT ca.source_id) as count 
    FROM code_analyses ca 
    WHERE ca.source_type = 'commit'
  `);
  return { total: total.rows[0].count, analyzed: analyzed.rows[0].count };
}

async function main() {
  const mode = process.argv[3] || 'status';
  
  if (mode === 'status') {
    const progress = await getAnalysisProgress();
    console.log(`Progress: ${progress.analyzed}/${progress.total} commits analyzed`);
    console.log(`Remaining: ${progress.total - progress.analyzed}`);
    return;
  }
  
  if (mode === 'analyze') {
    const commits = await get2026Commits();
    const progress = await getAnalysisProgress();
    
    // Get already analyzed commit IDs
    const analyzedResult = await db.execute(`
      SELECT source_id FROM code_analyses WHERE source_type = 'commit'
    `);
    const analyzedIds = new Set(analyzedResult.rows.map(r => r.source_id));
    
    const toAnalyze = commits.filter(c => !analyzedIds.has(c.id));
    console.log(`Total: ${commits.length}, Already analyzed: ${analyzedIds.size}, To analyze: ${toAnalyze.length}`);
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < toAnalyze.length; i++) {
      const commit = toAnalyze[i];
      console.log(`\n[${i + 1}/${toAnalyze.length}] Analyzing ${commit.sha.substring(0, 7)} - ${commit.message.substring(0, 40)}...`);
      
      try {
        const start = Date.now();
        const result = await analyzeCommit(1, commit.id);
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
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    console.log(`\n=== Complete ===`);
    console.log(`Success: ${success}, Failed: ${failed}`);
  }
}

main().catch(console.error);
