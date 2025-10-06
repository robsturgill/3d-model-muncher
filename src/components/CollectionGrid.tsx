import { useMemo } from 'react';
import { Model } from '../types/model';
import { ModelCard } from './ModelCard';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import type { AppConfig } from '../types/config';

interface CollectionGridProps {
  name: string;
  modelIds: string[];
  models: Model[];
  onBack: () => void;
  onModelClick: (model: Model) => void;
  config?: AppConfig | null;
}

export default function CollectionGrid({ name, modelIds, models, onBack, onModelClick, config }: CollectionGridProps) {
  const items = useMemo(() => {
    const set = new Set(modelIds);
    return models.filter(m => set.has(m.id));
  }, [modelIds, models]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 lg:p-6 border-b bg-card shadow-sm shrink-0 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2" title="Back">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-sm text-muted-foreground">{items.length} item(s) in</div>
        <div className="font-semibold">{name}</div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 lg:p-6 pb-8 lg:pb-12">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h2 className="font-semibold text-lg">Collection is empty</h2>
              <p className="text-muted-foreground text-sm">Return and add items to this collection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {items.map((model) => (
                <ModelCard key={model.id} model={model} onClick={(_e) => onModelClick(model)} config={config || undefined} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
