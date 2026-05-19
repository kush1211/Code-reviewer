'use client';

import { useState } from 'react';
import { File, ExternalLink } from 'lucide-react';
import { FILES } from '@/lib/data';
import { FileTree } from './file-tree';
import { FileDiff } from './diff-viewer';

interface JumpTarget { file: string; line: number; key?: number }

interface FilesTabProps {
  activeFile: string;
  setActiveFile: (f: string) => void;
  jumpToLine: JumpTarget | null;
}

export function FilesTab({ activeFile, setActiveFile, jumpToLine }: FilesTabProps) {
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>('unified');
  const file = FILES.find(f => f.path === activeFile) ?? FILES[0];

  return (
    <div className="files-tab">
      <FileTree files={FILES} active={activeFile} setActive={setActiveFile} />
      <div className="diff-pane">
        <div className="diff-pane-head">
          <div className="row" style={{ gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <File size={14} className="muted" />
            <span className="mono" style={{ fontSize: 13 }}>{file.path}</span>
            <span className="badge success mono" style={{ marginLeft: 4 }}>+{file.adds}</span>
            <span className="badge critical mono">−{file.dels}</span>
          </div>
          <div className="seg">
            <button
              className={diffMode === 'unified' ? 'active' : ''}
              onClick={() => setDiffMode('unified')}
            >
              Unified
            </button>
            <button
              className={diffMode === 'split' ? 'active' : ''}
              onClick={() => setDiffMode('split')}
            >
              Split
            </button>
          </div>
          <button className="btn sm"><ExternalLink size={11} /> View file</button>
        </div>

        <FileDiff path={file.path} jumpToLine={jumpToLine} />
      </div>
    </div>
  );
}
