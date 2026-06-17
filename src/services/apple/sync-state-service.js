function decorateSyncState(domains) {
  return {
    ok: true,
    mode: "watermark",
    overlap_hours: 48,
    domains: Object.fromEntries(Object.entries(domains).map(([key, value]) => {
      return [key, { ...value, recommended_since: recommendedSince(value.latest_record_at) }];
    })),
    instructions: {
      client: "query HealthKit after recommended_since per domain; if no HealthKit samples are returned, skip incremental-sync",
      write_endpoint: "/api/v1/apple-health/incremental-sync"
    }
  };
}

function recommendedSince(value) {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Date(date.getTime() - 48 * 60 * 60 * 1000).toISOString();
}

module.exports = { decorateSyncState };
