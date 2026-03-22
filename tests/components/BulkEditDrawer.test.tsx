// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { BulkEditDrawer } from '../../src/components/BulkEditDrawer';
import type { Model } from '../../src/types/model';

const mockModel: Model = {
  id: 'test-model-1',
  name: 'Test Model',
  fileName: 'test.stl',
  fileType: 'stl',
  filePath: '/models/test.stl',
  tags: [],
  isPrinted: false,
  hidden: false,
};

const baseProps = {
  models: [mockModel],
  isOpen: true,
  onClose: vi.fn(),
  onBulkUpdate: vi.fn(),
  categories: [],
};

describe('BulkEditDrawer currency symbol', () => {
  it('displays default $ symbol in price label', () => {
    render(<BulkEditDrawer {...baseProps} currencySymbol="$" />);
    const labels = screen.getAllByText('$');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('displays custom € symbol in price label', () => {
    render(<BulkEditDrawer {...baseProps} currencySymbol="€" />);
    const labels = screen.getAllByText('€');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('shows currency symbol in price input prefix when price field is enabled', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BulkEditDrawer {...baseProps} currencySymbol="£" />);

    // Enable price field via checkbox (Radix Checkbox is mocked as a button)
    const priceCheckbox = screen.getByRole('button', { name: /price/i });
    await user.click(priceCheckbox);

    // Re-render to settle any pending state
    rerender(<BulkEditDrawer {...baseProps} currencySymbol="£" />);

    // Currency symbol should appear in the input prefix area (label + input prefix = 2+)
    const symbols = screen.getAllByText('£');
    expect(symbols.length).toBeGreaterThan(1);
  });
});
