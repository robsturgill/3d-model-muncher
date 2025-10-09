import { createContext, useContext, type ReactNode } from 'react';

// Simple global tags context: provide a deduped, sorted list of all known tags
export const TagsContext = createContext<string[]>([]);

export function TagsProvider({ tags, children }: { tags: string[]; children: ReactNode }) {
  return <TagsContext.Provider value={tags}>{children}</TagsContext.Provider>;
}

export function useGlobalTags() {
  return useContext(TagsContext);
}
