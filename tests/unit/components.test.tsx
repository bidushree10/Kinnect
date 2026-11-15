import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { Badge } from '../../src/components/common/Badge';
import { Logo } from '../../src/components/common/Logo';

describe('Design System UI Primitives', () => {
  it('renders Logo with accessible aria-label', () => {
    render(<Logo />);
    const logoEl = screen.getByRole('img', { name: 'Kinnect' });
    expect(logoEl).toBeInTheDocument();
  });

  it('renders Button with patient touch target classes and loading state', () => {
    const { rerender } = render(
      <Button variant="primary" size="patient" fullWidth>
        Mark as Taken
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Mark as Taken' });
    expect(btn).toHaveClass('min-h-[56px]');
    expect(btn).toHaveClass('w-full');
    expect(btn).toHaveClass('bg-[#0F5C5C]');

    // When loading, renders spinner and loadingText
    rerender(
      <Button variant="primary" size="patient" isLoading loadingText="Recording...">
        Mark as Taken
      </Button>
    );
    expect(screen.getByText('Recording...')).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
  });

  it('renders Input with visible label and links error message with aria-describedby', () => {
    render(
      <Input
        id="medicine-name"
        label="Medicine Name"
        error="This field is required"
      />
    );
    const input = screen.getByLabelText('Medicine Name');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'medicine-name-error');

    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Error: This field is required');
  });

  it('renders locked Input with medical safety message and readOnly attribute', () => {
    render(
      <Input
        id="locked-strength"
        label="Strength"
        defaultValue="500mg"
        isLocked
      />
    );
    const input = screen.getByLabelText(/Strength/i);
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveAttribute('aria-disabled', 'true');
    expect(input).toHaveClass('cursor-not-allowed');
    expect(
      screen.getByText('Locked for medical safety. Delete and re-create to modify.')
    ).toBeInTheDocument();
  });

  it('renders status badges with appropriate styles', () => {
    const { rerender } = render(<Badge variant="pending">Unconfirmed</Badge>);
    expect(screen.getByText('Unconfirmed')).toBeInTheDocument();

    rerender(<Badge variant="success">Taken</Badge>);
    expect(screen.getByText('Taken')).toBeInTheDocument();

    rerender(<Badge variant="assisted">Assisted Care</Badge>);
    const textEl = screen.getByText('Assisted Care');
    expect(textEl.parentElement).toHaveClass('bg-[#E3EFEF]');
    expect(textEl.parentElement).toHaveClass('text-[#0A4242]');
  });
});
