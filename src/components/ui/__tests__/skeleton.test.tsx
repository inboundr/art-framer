import { render, screen } from '@testing-library/react';
import { Skeleton } from '../skeleton';

describe('Skeleton Component', () => {
  it('should render with default classes', () => {
    render(<Skeleton data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted');
  });

  it('should apply custom className', () => {
    render(<Skeleton className="custom-skeleton" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('custom-skeleton');
  });

  it('should forward ref correctly', () => {
    const ref = { current: null };
    render(<Skeleton ref={ref} data-testid="skeleton" />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('should pass through additional props', () => {
    render(<Skeleton data-testid="skeleton" data-custom="value" aria-label="Loading" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('data-custom', 'value');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading');
  });

  it('should render with custom dimensions', () => {
    render(<Skeleton className="w-32 h-8" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('w-32', 'h-8');
  });

  it('should render with different shapes', () => {
    const { rerender } = render(<Skeleton className="rounded-full" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full');
    
    rerender(<Skeleton className="rounded-lg" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-lg');
    
    rerender(<Skeleton className="rounded-none" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-none');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<Skeleton className="w-4 h-4" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('w-4', 'h-4');
    
    rerender(<Skeleton className="w-8 h-8" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('w-8', 'h-8');
    
    rerender(<Skeleton className="w-12 h-12" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('w-12', 'h-12');
  });

  it('should render with custom background', () => {
    render(<Skeleton className="bg-gray-200" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('bg-gray-200');
  });

  it('should render with custom animation', () => {
    render(<Skeleton className="animate-bounce" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-bounce');
  });

  it('should render multiple skeletons', () => {
    render(
      <div>
        <Skeleton data-testid="skeleton-1" />
        <Skeleton data-testid="skeleton-2" />
        <Skeleton data-testid="skeleton-3" />
      </div>
    );

    expect(screen.getByTestId('skeleton-1')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-2')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-3')).toBeInTheDocument();
  });

  it('should render with children content', () => {
    render(
      <Skeleton data-testid="skeleton">
        <div>Loading content</div>
      </Skeleton>
    );
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveTextContent('Loading content');
  });

  it('should handle role and accessibility attributes', () => {
    render(<Skeleton role="status" aria-label="Loading content" data-testid="skeleton" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
  });
});
