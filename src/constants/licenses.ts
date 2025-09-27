// Centralized list of license display strings used across the app
export const LICENSES = [
  'BY',
  'BY-SA',
  'BY-NC',
  'BY-NC-ND',
  'BY-NC-SA',
  'BY-ND',
  'CC0',
  'MIT License',
  'GNU GPL v3',
  'Apache License 2.0',
  'BSD 3-Clause License',
  'Public Domain',
  'Standard Digital File License',
] as const;

// Strongly-typed union of the known license strings
export type License = typeof LICENSES[number];

export const isKnownLicense = (s?: string): s is License => !!s && (LICENSES as readonly string[]).includes(s);
