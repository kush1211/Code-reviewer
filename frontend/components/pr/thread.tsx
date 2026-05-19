'use client';

import { useState } from 'react';
import { Bot, Check, X, MoreHorizontal, Sparkles, Zap, Code } from 'lucide-react';
import { SeverityBadge } from '@/components/ui/severity-badge';
import type { Severity } from '@/lib/types';

interface ThreadProps {
  severity: Severity;
  line: number;
  title: string;
  body: React.ReactNode;
  suggestion?: string;
  active?: boolean;
  confidence?: number;
}

export function Thread({ severity, line, title, body, suggestion, active, confidence = 0.92 }: ThreadProps) {
  const [copied, setCopied] = useState(false);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (suggestion) {
      navigator.clipboard?.writeText(suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className={`thread sev-${severity} ${active ? 'targeted' : ''}`}>
      <div className="thread-head">
        <div className="thread-avatar"><Bot size={12} /></div>
        <span className="thread-who">Reviewly</span>
        <SeverityBadge level={severity} />
        <span className="faint mono" style={{ fontSize: 11 }}>line {line}</span>
        <span style={{ flex: 1 }} />
        <span className="faint mono" style={{ fontSize: 11 }}>· conf {confidence.toFixed(2)}</span>
        <button className="icon-btn" style={{ width: 22, height: 22 }}><MoreHorizontal size={12} /></button>
      </div>
      <div className="thread-title">{title}</div>
      <div className="thread-body">{body}</div>
      {suggestion && (
        <div className="suggestion-block">
          <div className="suggestion-head">
            <span className="badge accent"><Sparkles size={10} /> Suggested change</span>
            <span style={{ flex: 1 }} />
            <button className="btn sm" onClick={copy}>
              {copied ? <Check size={11} /> : <Code size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn sm primary"><Zap size={11} /> Apply</button>
          </div>
          <pre className="suggestion-code"><code>{suggestion}</code></pre>
        </div>
      )}
      <div className="thread-actions">
        <button className="btn sm ghost"><Check size={11} /> Resolve</button>
        <button className="btn sm ghost"><X size={11} /> Dismiss</button>
        <span style={{ flex: 1 }} />
        <button className="btn sm ghost">Reply</button>
      </div>
    </div>
  );
}
