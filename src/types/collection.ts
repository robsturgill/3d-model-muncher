export interface Collection {
  id: string;
  name: string;
  description?: string;
  
  // Model IDs included in this collection
  modelIds: string[];
  
  // NEW: IDs of child collections nested inside this one
  childCollectionIds?: string[];
  // NEW: ID of the parent collection (if any)
  parentId?: string | null;

  // Optional: choose a model to represent the collection cover
  coverModelId?: string;
  // Optional: user categorization and tags for the collection itself
  category?: string;
  tags?: string[];
  // Optional gallery images for the collection (data URLs)
  images?: string[];
  created?: string;
  lastModified?: string;
}