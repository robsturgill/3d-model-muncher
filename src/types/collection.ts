export interface CollectionGroup {
  id: string;
  name: string;
  description?: string;
  modelIds: string[];
  created?: string;
  lastModified?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  // Model IDs included in this collection
  modelIds: string[];
  // Optional named subsets used to collapse variants inside a collection
  groups?: CollectionGroup[];
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
