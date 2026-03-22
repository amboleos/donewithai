// src/lib/smart-filter.ts

export interface FilteredFile {
  path: string;
  additions: number;
  deletions: number;
  content: string;
  isExcluded: boolean;
  excludeReason?: string;
  language: string;
}

export interface DiffStats {
  totalFiles: number;
  includedFiles: number;
  excludedFiles: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
}

// Patterns for files to exclude from AI analysis
const EXCLUDE_PATTERNS = {
  config: [
    /package\.json$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.env$/,
    /\.env\./,
    /tsconfig\.json$/,
    /tsconfig\..*\.json$/,
    /jsconfig\.json$/,
    /manifest\.json$/,
    /\.eslintrc/,
    /\.prettierrc/,
    /tailwind\.config/,
    /postcss\.config/,
    /vite\.config/,
    /next\.config/,
    /vercel\.json/,
  ],
  generated: [
    /\/dist\//,
    /\/build\//,
    /\/node_modules\//,
    /\/.next\//,
    /\/.turbo\//,
    /\.min\.js$/,
    /\.min\.css$/,
    /\.d\.ts$/,
    /\.d\.map$/,
    /__generated__\//,
    /\.generated\./,
  ],
  nonCode: [
    /\.(png|jpg|jpeg|gif|svg|ico|webp|avif)$/,
    /\.(woff|woff2|ttf|eot|otf)$/,
    /\.(mp4|mp3|wav|ogg|webm)$/,
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/,
    /\.(zip|tar|gz|rar|7z)$/,
    /\.(sqlite|db|sql)$/,
  ],
  binary: [
    /\.wasm$/,
    /\.so$/,
    /\.dll$/,
    /\.dylib$/,
    /\.exe$/,
    /\.bin$/,
  ],
};

// Language detection from file extension
const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  vue: 'vue',
  svelte: 'svelte',
  scss: 'scss',
  css: 'css',
  html: 'html',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
};

function getFileExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function detectLanguage(path: string): string {
  const ext = getFileExtension(path);
  return LANGUAGE_MAP[ext] || 'unknown';
}

function shouldExclude(path: string): { exclude: boolean; reason?: string } {
  // Check each category
  for (const [category, patterns] of Object.entries(EXCLUDE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(path)) {
        return { exclude: true, reason: `${category} file` };
      }
    }
  }

  // Also exclude if file extension is not a known code language
  const ext = getFileExtension(path);
  if (ext && !LANGUAGE_MAP[ext]) {
    // Allow files without extensions (like Makefile, Dockerfile)
    if (!ext) return { exclude: false };
    // Exclude unknown extensions that are likely not code
    if (ext.length > 5) {
      return { exclude: true, reason: 'unknown file type' };
    }
  }

  return { exclude: false };
}

/**
 * Filter and categorize files from a diff
 */
export function filterDiffFiles(
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
    content?: string;
  }>
): { filtered: FilteredFile[]; stats: DiffStats } {
  const filtered: FilteredFile[] = [];
  const stats: DiffStats = {
    totalFiles: files.length,
    includedFiles: 0,
    excludedFiles: 0,
    totalLinesAdded: 0,
    totalLinesRemoved: 0,
  };

  for (const file of files) {
    const { exclude, reason } = shouldExclude(file.path);

    const filteredFile: FilteredFile = {
      path: file.path,
      additions: file.additions,
      deletions: file.deletions,
      content: file.content || '',
      isExcluded: exclude,
      excludeReason: reason,
      language: detectLanguage(file.path),
    };

    filtered.push(filteredFile);

    if (exclude) {
      stats.excludedFiles++;
    } else {
      stats.includedFiles++;
      stats.totalLinesAdded += file.additions;
      stats.totalLinesRemoved += file.deletions;
    }
  }

  return { filtered, stats };
}

/**
 * Format filtered diff for LLM analysis
 * Returns a string with only the relevant code changes
 */
export function formatDiffForLLM(filtered: FilteredFile[], maxTokens: number = 8000): string {
  const included = filtered.filter(f => !f.isExcluded);

  if (included.length === 0) {
    return 'No code files to analyze (all files were excluded).';
  }

  const parts: string[] = [];
  let estimatedTokens = 0;

  // Rough token estimation: ~4 chars per token
  const estimateTokens = (str: string) => Math.ceil(str.length / 4);

  for (const file of included) {
    const header = `\n--- ${file.path} (${file.language}) +${file.additions}/-${file.deletions} ---\n`;
    const headerTokens = estimateTokens(header);
    const contentTokens = estimateTokens(file.content);

    if (estimatedTokens + headerTokens + contentTokens > maxTokens) {
      // Include file info but truncate content
      parts.push(header);
      parts.push('[Content truncated due to size limits]\n');
      break;
    }

    parts.push(header);
    if (file.content) {
      parts.push(file.content.substring(0, 3000)); // Max 3k chars per file
    }
    parts.push('\n');

    estimatedTokens += headerTokens + contentTokens;
  }

  return parts.join('');
}
