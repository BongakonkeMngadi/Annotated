export function formatTimestamp(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return '';
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${secs}`;
  return `${minutes}:${secs}`;
}

export function formatClipRange(annotation) {
  const start = Number(annotation?.mediaStart);
  const end = Number(annotation?.mediaEnd);
  if (!Number.isFinite(start) && !Number.isFinite(end)) return '';
  return `${formatTimestamp(Number.isFinite(start) ? start : 0)}–${Number.isFinite(end) ? formatTimestamp(end) : 'end'}`;
}

export function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value)) return '';
  return formatTimestamp(value);
}

export function formatRelativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'just now';
  const diff = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function boldDurationText(text) {
  const value = String(text || '');
  const splitPattern = /(\b\d{1,2}:\d{2}(?::\d{2})?\s*[–-]\s*\d{1,2}:\d{2}(?::\d{2})?\b|\b\d{1,2}:\d{2}(?::\d{2})?\b)/g;
  const exactPattern = /^(\b\d{1,2}:\d{2}(?::\d{2})?\s*[–-]\s*\d{1,2}:\d{2}(?::\d{2})?\b|\b\d{1,2}:\d{2}(?::\d{2})?\b)$/;
  return value.split(splitPattern).filter(Boolean).map((part, index) => ({
    key: index,
    text: part,
    bold: exactPattern.test(part.trim()),
  }));
}
