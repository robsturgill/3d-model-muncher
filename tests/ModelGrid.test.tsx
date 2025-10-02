// @vitest-environment jsdom
import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModelGrid } from '../src/components/ModelGrid';

// Minimal model fixture used by tests
const makeModel = (i: number) => ({
  id: `m${i}`,
  name: `Model ${i}`,
  description: `Description ${i}`,
  tags: [],
  category: 'misc',
  isPrinted: false,
  thumbnail: '',
  filePath: '',
  modelUrl: '',
  printTime: '',
  filamentUsed: '',
  fileSize: '',
  license: 'MIT',
  printSettings: { layerHeight: '', infill: '', nozzle: '' },
});

describe('ModelGrid selection behavior', () => {
  it('calls onModelSelection with index when clicking a card', () => {
    const models = [makeModel(1), makeModel(2), makeModel(3)];
    const onModelSelection = vi.fn();

  // Force list view so ModelGrid renders list rows with click handlers
    const providedConfig = { settings: { defaultView: 'list', defaultGridDensity: 4, showPrintedBadge: true } } as any;

    const { container } = render(
      <ModelGrid
        models={models}
        onModelClick={() => {}}
        isSelectionMode={true}
        selectedModelIds={[]}
        onModelSelection={onModelSelection}
        onToggleSelectionMode={() => {}}
        onSelectAll={() => {}}
        onDeselectAll={() => {}}
        onBulkEdit={() => {}}
        onBulkDelete={() => {}}
        config={providedConfig}
      />
    );

  // Click the list row for Model 2
  const rowsM2 = within(container).getAllByTestId('row-m2');
  const rowM2 = rowsM2.find(r => r.textContent && r.textContent.includes('Model 2')) || rowsM2[0];
  fireEvent.click(rowM2);

    expect(onModelSelection).toHaveBeenCalledTimes(1);
    // first arg id, second arg opts with index 1
    expect(onModelSelection.mock.calls[0][0]).toBe('m2');
  // Assert opts includes index and shiftKey (false by default).
  expect(onModelSelection.mock.calls[0][1]).toEqual({ index: 1, shiftKey: false });
  });

  it('passes shiftKey when shift-clicking a card', () => {
    const models = [makeModel(1), makeModel(2), makeModel(3), makeModel(4)];
    const onModelSelection = vi.fn();

    const providedConfig = { settings: { defaultView: 'list', defaultGridDensity: 4, showPrintedBadge: true } } as any;

    const { container } = render(
      <ModelGrid
        models={models}
        onModelClick={() => {}}
        isSelectionMode={true}
        selectedModelIds={[]}
        onModelSelection={onModelSelection}
        onToggleSelectionMode={() => {}}
        onSelectAll={() => {}}
        onDeselectAll={() => {}}
        onBulkEdit={() => {}}
        onBulkDelete={() => {}}
        config={providedConfig}
      />
    );

  // Click the list row for Model 4 with Shift
  const rowsM4 = within(container).getAllByTestId('row-m4');
  const rowM4 = rowsM4.find(r => r.textContent && r.textContent.includes('Model 4')) || rowsM4[0];
  fireEvent.click(rowM4, { shiftKey: true });

    expect(onModelSelection).toHaveBeenCalledTimes(1);
    expect(onModelSelection.mock.calls[0][0]).toBe('m4');
    expect(onModelSelection.mock.calls[0][1]).toEqual({ index: 3, shiftKey: true });
  });

  it('passes shiftKey when shift-clicking a row', () => {
    const models = [makeModel(1), makeModel(2)];
    const onModelSelection = vi.fn();

    const providedConfig = { settings: { defaultView: 'list', defaultGridDensity: 4, showPrintedBadge: true } } as any;

    const { container } = render(
      <ModelGrid
        models={models}
        onModelClick={() => {}}
        isSelectionMode={true}
        selectedModelIds={[]}
        onModelSelection={onModelSelection}
        onToggleSelectionMode={() => {}}
        onSelectAll={() => {}}
        onDeselectAll={() => {}}
        onBulkEdit={() => {}}
        onBulkDelete={() => {}}
        config={providedConfig}
      />
    );

  // Click the actual list row (safer than clicking Radix internals in jsdom).
  const rows = within(container).getAllByTestId('row-m1');
  const row = rows.find((r) => r.textContent && r.textContent.includes('Model 1'));
  if (!row) throw new Error('Could not find list row for Model 1');

  fireEvent.click(row, { shiftKey: true });

    expect(onModelSelection).toHaveBeenCalledTimes(1);
    expect(onModelSelection.mock.calls[0][0]).toBe('m1');
    // index should be 0 and shiftKey true
    expect(onModelSelection.mock.calls[0][1]).toEqual({ index: 0, shiftKey: true });
  });
});
