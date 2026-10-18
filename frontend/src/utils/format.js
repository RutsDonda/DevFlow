export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

export const timeAgo = (iso) => {
  if (!iso) return '';
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/** Trigger a browser download for a Blob. */
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const LANGUAGES = {
  py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  json: 'json', md: 'markdown', html: 'xml', xml: 'xml', css: 'css', scss: 'scss',
  yml: 'yaml', yaml: 'yaml', sh: 'bash', bash: 'bash', java: 'java', go: 'go', rs: 'rust',
  rb: 'ruby', php: 'php', sql: 'sql', toml: 'ini', ini: 'ini', env: 'bash', dockerfile: 'dockerfile',
  c: 'c', h: 'c', cpp: 'cpp', cs: 'csharp', kt: 'kotlin', swift: 'swift', txt: 'plaintext',
};

export const languageFor = (path) => {
  const name = path.split('/').pop().toLowerCase();
  if (name === 'dockerfile') return 'dockerfile';
  if (name.startsWith('.env') || name === '.gitignore') return 'bash';
  return LANGUAGES[name.split('.').pop()] || 'plaintext';
};
