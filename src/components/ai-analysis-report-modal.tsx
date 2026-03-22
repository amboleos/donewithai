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
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-slate-900 border-2 border-slate-700 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            {isAgentic ? (
              <div className="p-2 bg-purple-500/20 rounded border border-purple-500/30">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
            ) : (
              <div className="p-2 bg-green-500/20 rounded border border-green-500/30">
                <User className="h-5 w-5 text-green-400" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white font-mono">
                {isAgentic ? 'AGENTIC AI' : 'HUMAN ASSISTED'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {model} - {durationMs ? `${(durationMs / 1000).toFixed(1)}s` : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-white">{confidencePercent}%</div>
              <div className="text-xs text-slate-400 font-mono">confidence</div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          {/* Summary */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
            <h3 className="text-sm font-bold text-green-500 font-mono mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              SUMMARY
            </h3>
            <p className="text-slate-300 text-sm font-mono leading-relaxed">
              {report.summary}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
              <div className="text-2xl font-bold text-white font-mono">{report.filesAnalyzed}</div>
              <div className="text-xs text-slate-400 font-mono">files analyzed</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
              <div className="text-2xl font-bold text-green-400 font-mono">+{report.linesAdded}</div>
              <div className="text-xs text-slate-400 font-mono">lines added</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
              <div className="text-2xl font-bold text-red-400 font-mono">-{report.linesRemoved}</div>
              <div className="text-xs text-slate-400 font-mono">lines removed</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded p-3 text-center">
              <div className="text-2xl font-bold text-amber-400 font-mono">{tokensUsed || 'N/A'}</div>
              <div className="text-xs text-slate-400 font-mono">tokens used</div>
            </div>
          </div>

          {/* Patterns Found */}
          {report.patternsFound.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-green-500 font-mono mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                PATTERNS FOUND
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.patternsFound.map((pattern, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-xs font-mono"
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
              <h3 className="text-sm font-bold text-green-500 font-mono mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                FILE BREAKDOWN
              </h3>
              <div className="space-y-2">
                {report.fileBreakdown.slice(0, 15).map((file, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded border ${
                      file.isExcluded
                        ? 'bg-slate-800/30 border-slate-700 text-slate-500'
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {file.isExcluded ? (
                        <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      )}
                      <span className="text-sm font-mono truncate">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-slate-400">{file.language}</span>
                      <span className="text-xs font-mono text-green-400">+{file.additions}</span>
                      <span className="text-xs font-mono text-red-400">-{file.deletions}</span>
                    </div>
                  </div>
                ))}
                {report.fileBreakdown.length > 15 && (
                  <div className="text-xs text-slate-500 font-mono text-center py-2">
                    +{report.fileBreakdown.length - 15} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-4">
            <h3 className="text-sm font-bold text-green-500 font-mono mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              REASONING
            </h3>
            <p className="text-slate-300 text-sm font-mono leading-relaxed whitespace-pre-wrap">
              {report.reasoning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
