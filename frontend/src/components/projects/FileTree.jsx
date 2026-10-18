import React, { useMemo, useState } from 'react';
import { HiChevronRight, HiOutlineDocument, HiOutlineFolder, HiOutlineFolderOpen } from 'react-icons/hi2';

/** Build a nested tree { name, path, children?: [] } from flat file paths; folders first. */
const buildTree = (paths) => {
  const root = { children: {} };
  paths.forEach((path) => {
    let node = root;
    path.split('/').forEach((part, i, parts) => {
      const isFile = i === parts.length - 1;
      node.children[part] ??= isFile
        ? { name: part, path }
        : { name: part, path: parts.slice(0, i + 1).join('/'), children: {} };
      node = node.children[part];
    });
  });
  const sort = (node) => Object.values(node.children)
    .sort((a, b) => (!!b.children - !!a.children) || a.name.localeCompare(b.name))
    .map((n) => (n.children ? { ...n, children: sort(n) } : n));
  return sort(root);
};

const Node = ({ node, depth, selected, onSelect, collapsed, toggle }) => {
  const pad = { paddingLeft: `${depth * 14 + 12}px` };
  if (!node.children) {
    return (
      <button
        onClick={() => onSelect(node.path)}
        style={pad}
        className={`flex w-full items-center gap-2 py-1.5 pr-3 text-left text-[13px] transition-colors ${
          selected === node.path ? 'bg-white/[0.08] text-white' : 'text-mute hover:bg-white/5 hover:text-ink'
        }`}
      >
        <HiOutlineDocument className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }
  const isOpen = !collapsed.has(node.path);
  return (
    <div>
      <button onClick={() => toggle(node.path)} style={pad} className="flex w-full items-center gap-1.5 py-1.5 pr-3 text-left text-[13px] text-neutral-300 hover:bg-white/5">
        <HiChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        {isOpen ? <HiOutlineFolderOpen className="w-4 h-4 text-sky-300/80" /> : <HiOutlineFolder className="w-4 h-4 text-sky-300/80" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isOpen && node.children.map((child) => (
        <Node key={child.path} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} collapsed={collapsed} toggle={toggle} />
      ))}
    </div>
  );
};

const FileTree = ({ paths, selected, onSelect }) => {
  const tree = useMemo(() => buildTree(paths), [paths]);
  const [collapsed, setCollapsed] = useState(new Set());
  const toggle = (path) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(path)) next.delete(path); else next.add(path);
    return next;
  });
  return (
    <div className="py-2">
      {tree.map((node) => (
        <Node key={node.path} node={node} depth={0} selected={selected} onSelect={onSelect} collapsed={collapsed} toggle={toggle} />
      ))}
    </div>
  );
};

export default FileTree;
