// Centralized list of license display strings used across the app
export const LICENSES = [
  'Creative Commons - Attribution',
  'Creative Commons - Attribution-ShareAlike',
  'Creative Commons - Attribution-NonCommercial',
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
