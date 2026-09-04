/**
 * Single source of truth for which data is real vs mock.
 *
 * `USE_MOCK` toggles the whole UI into demo mode (everything mocked). A handful
 * of domains are not yet backed by the backend, so they keep serving mock data
 * even when `USE_MOCK === false`; those are listed in `MOCK_ONLY_DOMAINS`.
 */

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/** Domains still served from mock data even when the backend is enabled. */
export const MOCK_ONLY_DOMAINS = ["robotics", "storage", "tasks"] as const;

export type MockOnlyDomain = (typeof MOCK_ONLY_DOMAINS)[number];

/** True when a given domain is currently served from mock data. */
export function isMockDomain(domain: MockOnlyDomain): boolean {
  return USE_MOCK || MOCK_ONLY_DOMAINS.includes(domain);
}