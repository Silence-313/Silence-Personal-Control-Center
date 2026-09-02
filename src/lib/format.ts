/** Format a size in GB, switching to TB above 1000 GB. */
export function formatGb(value: number, decimals = 1): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)} TB`;
  }
  return `${value % 1 === 0 ? value : value.toFixed(decimals)} GB`;
}

/** Format an ISO timestamp as local HH:MM. */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Format a percentage (0-100) with no trailing noise. */
export function formatPct(value: number): string {
  return `${Math.round(value)}%`;
}

/** Format an ISO timestamp as a compact relative age ("2h ago", "30m ago", "now"). */
export function formatRelativeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const minutes = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (minutes <= 0) return "now";
  const hours = Math.floor(minutes / 60);
  if (hours < 1) return `${minutes}m ago`;
  const days = Math.floor(hours / 24);
  if (days < 1) return `${hours}h ago`;
  return `${days}d ago`;
}

/** Format uptime in seconds as a compact human string ("3d 4h", "2h 5m", "9m"). */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}