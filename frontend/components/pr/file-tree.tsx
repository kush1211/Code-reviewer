'use client';

import { useState } from 'react';
import { File, Folder, ChevronDown, ChevronRight } from 'lucide-react';
import type { FileChange } from '@/lib/types';

interface TreeNode {
  [key: string]: TreeNode | { __file: FileChange };
}

function buildTree(files: FileChange[]): TreeNode {
  const tree: TreeNode = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    let node = tree;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) {
        node[p] = { __file: f } as { __file: FileChange };
      } else {
        if (!node[p]) node[p] = {};
        node = node[p] as TreeNode;
      }
    });
  });
  return tree;
}

function isFileLeaf(val: unknown): val is { __file: FileChange } {
  return typeof val === 'object' && val !== null && '__file' in val;
}

function TreeLeaf({ name, file, active, setActive, depth }: {
  name: string;
  file: FileChange;
  active: string;
  setActive: (p: string) => void;
  depth: number;
}) {
  const total = file.findings.critical + file.findings.warning + file.findings.suggestion + file.findings.nitpick;
  const badgeCls = file.findings.critical > 0 ? 'crit' : file.findings.warning > 0 ? 'warn' : 'note';
  return (
    <button
      className={`tree-row file ${active === file.path ? 'active' : ''}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={() => setActive(file.path)}
    >
      <File size={12} className="tree-ico" />
      <span className="tree-name">{name}</span>
      <span className="tree-stats">
        <span className="diff-add-num">+{file.adds}</span>
        <span className="diff-del-num">−{file.dels}</span>
      </span>
      {total > 0 && <span className={`tree-badge ${badgeCls}`}>{total}</span>}
    </button>
  );
}

function TreeFolder({ name, node, active, setActive, depth }: {
  name: string;
  node: TreeNode;
  active: string;
  setActive: (p: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button
        className="tree-row folder"
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown size={11} className="tree-chev" /> : <ChevronRight size={11} className="tree-chev" />}
        <Folder size={12} className="tree-ico" />
        <span className="tree-name folder-name">{name}</span>
      </button>
      {open && <TreeNodes node={node} active={active} setActive={setActive} depth={depth + 1} />}
    </>
  );
}

function TreeNodes({ node, active, setActive, depth }: {
  node: TreeNode;
  active: string;
  setActive: (p: string) => void;
  depth: number;
}) {
  return (
    <>
      {Object.entries(node).map(([name, val]) =>
        isFileLeaf(val)
          ? <TreeLeaf key={name} name={name} file={val.__file} active={active} setActive={setActive} depth={depth} />
          : <TreeFolder key={name} name={name} node={val as TreeNode} active={active} setActive={setActive} depth={depth} />
      )}
    </>
  );
}

export function FileTree({ files, active, setActive }: {
  files: FileChange[];
  active: string;
  setActive: (p: string) => void;
}) {
  const tree = buildTree(files);
  return (
    <aside className="file-tree">
      <div className="file-tree-head">
        <span style={{ fontWeight: 500 }}>Files</span>
        <span className="badge mono" style={{ marginLeft: 'auto' }}>{files.length}</span>
      </div>
      <div className="file-tree-body">
        <TreeNodes node={tree} active={active} setActive={setActive} depth={0} />
      </div>
    </aside>
  );
}
