// src/components/ai-analysis-report-modal.tsx
'use client';

import { X, Brain, User, FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import type { CodeAnalysisReport } from '@/lib/db';

interface AnalysisReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: {
    id: number;
    isAgentic: boolean;
    confidence: number;
    report: CodeAnalysisReport;
    model: string;
    durationMs?: number;
    tokensUsed?: number;
  } | null;
}

export default function AnalysisReportModal({ isOpen, onClose, analysis }: AnalysisReportModalProps) {
  if (!isOpen || !analysis) return null;

  const { isAgentic, confidence, report, model, durationMs, tokensUsed } = analysis;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-[var(--card)] border-2 border-[var(--border)] [box-shadow:var(--shadow-brutal-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[var(--border)]">
          <div className="flex items-center gap-3">
            {isAgentic ? (
              <div className="p-2 border-2 border-[var(--accent)] bg-[var(--accent)]/10 [box-shadow:var(--shadow-brutal-sm)]">
                <Brain className="h-5 w-5 text-[var(--accent)]" />
              </div>
            ) : (
              <div className="p-2 border-2 border-[var(--success)] bg-[var(--success)]/10 [box-shadow:var(--shadow-brutal-sm)]">
                <User className="h-5 w-5 text-[var(--success)]" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                {isAgentic ? 'AGENTIC AI' : 'HUMAN ASSISTED'}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] font-mono">
                {model} - {durationMs ? `${(durationMs / 1000).toFixed(1)}s` : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-[var(--foreground)]">{confidencePercent}%</div>
              <div className="text-xs text-[var(--muted-foreground)] font-mono">confidence</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 border-2 border-[var(--border)] bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/10 transition-colors"
            >
              <X className="h-5 w-5 text-[var(--foreground)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          {/* Summary */}
          <div className="p-4 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)]">
            <h3 className="text-sm font-bold text-[var(--primary)] font-mono mb-2 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <FileText className="h-4 w-4" />
              SUMMARY
            </h3>
            <p className="text-[var(--foreground)] text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif' }}>
              {report.summary}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
              <div className="text-2xl font-bold font-mono text-[var(--foreground)]">{report.filesAnalyzed}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-mono">files analyzed</div>
            </div>
            <div className="p-3 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
              <div className="text-2xl font-bold font-mono text-[var(--success)]">+{report.linesAdded}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-mono">lines added</div>
            </div>
            <div className="p-3 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
              <div className="text-2xl font-bold font-mono text-[var(--destructive)]">-{report.linesRemoved}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-mono">lines removed</div>
            </div>
            <div className="p-3 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)] text-center">
              <div className="text-2xl font-bold font-mono text-[var(--warning)]">{tokensUsed || 'N/A'}</div>
              <div className="text-xs text-[var(--muted-foreground)] font-mono">tokens used</div>
            </div>
          </div>

          {/* Patterns Found */}
          {report.patternsFound.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--primary)] font-mono mb-3 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                <TrendingUp className="h-4 w-4" />
                PATTERNS FOUND
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.patternsFound.map((pattern, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 border-2 border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-mono text-xs font-bold uppercase tracking-wider"
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File Breakdown */}
          {report.fileBreakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--primary)] font-mono mb-3 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                <FileText className="h-4 w-4" />
                FILE BREAKDOWN
              </h3>
              <div className="space-y-2">
                {report.fileBreakdown.slice(0, 15).map((file, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 border-2 ${
                      file.isExcluded
                        ? 'bg-[var(--muted)]/50 border-[var(--border)] text-[var(--muted-foreground)]'
                        : 'bg-[var(--muted)] border-[var(--border)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {file.isExcluded ? (
                        <AlertCircle className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-[var(--success)] shrink-0" />
                      )}
                      <span className="text-sm font-mono truncate">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-[var(--muted-foreground)]">{file.language}</span>
                      <span className="text-xs font-mono text-[var(--success)]">+{file.additions}</span>
                      <span className="text-xs font-mono text-[var(--destructive)]">-{file.deletions}</span>
                    </div>
                  </div>
                ))}
                {report.fileBreakdown.length > 15 && (
                  <div className="text-xs text-[var(--muted-foreground)] font-mono text-center py-2">
                    +{report.fileBreakdown.length - 15} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div className="p-4 border-2 border-[var(--border)] bg-[var(--muted)] [box-shadow:var(--shadow-brutal-sm)]">
            <h3 className="text-sm font-bold text-[var(--primary)] font-mono mb-2 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <Brain className="h-4 w-4" />
              REASONING
            </h3>
            <p className="text-[var(--foreground)] text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Sora, sans-serif' }}>
              {report.reasoning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
