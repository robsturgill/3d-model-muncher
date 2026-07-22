// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ModelDetailsDrawer } from '../../src/components/ModelDetailsDrawer';
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
  price: 9.99,
};

const baseProps = {
  model: mockModel,
  isOpen: true,
  onClose: vi.fn(),
  onModelUpdate: vi.fn(),
  categories: [],
};

beforeEach(() => {
  // @ts-ignore
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, collections: [] }),
  });
});

describe('ModelDetailsDrawer currency symbol', () => {
  it('displays $ before price by default', () => {
    render(<ModelDetailsDrawer {...baseProps} currencySymbol="$" />);
    expect(screen.getByText('$9.99')).toBeInTheDocument();
  });

  it('displays € before price when currencySymbol is €', () => {
    render(<ModelDetailsDrawer {...baseProps} currencySymbol="€" />);
    expect(screen.getByText('€9.99')).toBeInTheDocument();
  });

  it('does not show price section when price is 0', () => {
    const modelNoPrice = { ...mockModel, price: 0 };
    render(<ModelDetailsDrawer {...baseProps} model={modelNoPrice} currencySymbol="$" />);
    expect(screen.queryByText('Price')).not.toBeInTheDocument();
  });
});

describe('ModelDetailsDrawer collection actions', () => {
  it('opens the shared collection drawer even when no collections exist yet', async () => {
    render(<ModelDetailsDrawer {...baseProps} />);

    const button = await screen.findByRole('button', { name: /add current to collection/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Collection' })).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Collection name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Existing' })).toBeInTheDocument();
  });
});
