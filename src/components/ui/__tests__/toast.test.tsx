import { render, screen } from '@testing-library/react';
import { Toast, ToastProvider, ToastViewport } from '../toast';

// Mock the ToastPrimitive components
jest.mock('@radix-ui/react-toast', () => ({
  Provider: ({ children, ...props }: any) => <div data-testid="toast-provider" {...props}>{children}</div>,
  Root: ({ children, ...props }: any) => <div data-testid="toast-root" {...props}>{children}</div>,
  Viewport: ({ ...props }: any) => <div data-testid="toast-viewport" {...props} />,
  Action: ({ children, ...props }: any) => <button data-testid="toast-action" {...props}>{children}</button>,
  Close: ({ children, ...props }: any) => <button data-testid="toast-close" {...props}>{children}</button>,
  Title: ({ children, ...props }: any) => <div data-testid="toast-title" {...props}>{children}</div>,
  Description: ({ children, ...props }: any) => <div data-testid="toast-description" {...props}>{children}</div>,
}));

// Mock the displayName properties
const mockToastPrimitives = jest.requireMock('@radix-ui/react-toast');
mockToastPrimitives.Provider.displayName = 'ToastProvider';
mockToastPrimitives.Root.displayName = 'ToastRoot';
mockToastPrimitives.Viewport.displayName = 'ToastViewport';
mockToastPrimitives.Action.displayName = 'ToastAction';
mockToastPrimitives.Close.displayName = 'ToastClose';
mockToastPrimitives.Title.displayName = 'ToastTitle';
mockToastPrimitives.Description.displayName = 'ToastDescription';

describe('Toast Components', () => {
  describe('Toast', () => {
    it('should render with default classes', () => {
      render(<Toast data-testid="toast" />);
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('group', 'pointer-events-auto', 'relative', 'flex', 'w-full', 'items-center', 'justify-between', 'space-x-4', 'overflow-hidden', 'rounded-md', 'border', 'p-6', 'pr-8', 'shadow-lg', 'transition-all', 'data-[swipe=cancel]:translate-x-0', 'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]', 'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]', 'data-[swipe=move]:transition-none', 'data-[state=open]:animate-in', 'data-[state=closed]:animate-out', 'data-[swipe=end]:animate-out', 'data-[state=closed]:fade-out-80', 'data-[state=closed]:slide-out-to-right-full', 'data-[state=open]:slide-in-from-top-full', 'data-[state=open]:sm:slide-in-from-bottom-full');
    });

    it('should apply custom className', () => {
      render(<Toast className="custom-toast" data-testid="toast" />);
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('custom-toast');
    });

    it('should render with custom variant', () => {
      render(<Toast variant="destructive" data-testid="toast" />);
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('destructive', 'group', 'border-destructive', 'bg-destructive', 'text-destructive-foreground');
    });

    it('should render with custom variant', () => {
      render(<Toast variant="default" data-testid="toast" />);
      
      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('bg-background', 'text-foreground');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<Toast ref={ref} data-testid="toast" />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('ToastProvider', () => {
    it('should render with default props', () => {
      render(<ToastProvider data-testid="toast-provider" />);
      
      const provider = screen.getByTestId('toast-provider');
      expect(provider).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<ToastProvider className="custom-provider" data-testid="toast-provider" />);
      
      const provider = screen.getByTestId('toast-provider');
      expect(provider).toHaveClass('custom-provider');
    });

    it('should render with custom swipeDirection', () => {
      render(<ToastProvider swipeDirection="left" data-testid="toast-provider" />);
      
      const provider = screen.getByTestId('toast-provider');
      expect(provider).toBeInTheDocument();
    });

    it('should render with custom duration', () => {
      render(<ToastProvider duration={5000} data-testid="toast-provider" />);
      
      const provider = screen.getByTestId('toast-provider');
      expect(provider).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<ToastProvider label="Notification" data-testid="toast-provider" />);
      
      const provider = screen.getByTestId('toast-provider');
      expect(provider).toBeInTheDocument();
    });

    it('should render with custom description', () => {
      render(<ToastProvider description="Toast description" data-testid="toast-provider" />);
      
      const provider = screen.getByTestId('toast-provider');
      expect(provider).toBeInTheDocument();
    });

    it('should render with custom hotkey', () => {
      render(<ToastProvider hotkey="alt+t" data-testid="toast-provider" />);
      
      const provider = screen.getByTestId('toast-provider');
      expect(provider).toBeInTheDocument();
    });

    it('should render with custom viewportClassName', () => {
      render(<ToastProvider viewportClassName="custom-viewport" data-testid="toast-provider" />);
      
      const provider = screen.getByTestId('toast-provider');
      expect(provider).toBeInTheDocument();
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<ToastProvider ref={ref} data-testid="toast-provider" />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('ToastViewport', () => {
    it('should render with default classes', () => {
      render(<ToastViewport data-testid="toast-viewport" />);
      
      const viewport = screen.getByTestId('toast-viewport');
      expect(viewport).toHaveClass('fixed', 'top-0', 'z-[100]', 'flex', 'max-h-screen', 'w-full', 'flex-col-reverse', 'p-4', 'sm:bottom-0', 'sm:right-0', 'sm:top-auto', 'sm:flex-col', 'md:max-w-[420px]');
    });

    it('should apply custom className', () => {
      render(<ToastViewport className="custom-viewport" data-testid="toast-viewport" />);
      
      const viewport = screen.getByTestId('toast-viewport');
      expect(viewport).toHaveClass('custom-viewport');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<ToastViewport ref={ref} data-testid="toast-viewport" />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Complete Toast Structure', () => {
    it('should render a complete toast structure', () => {
      render(
        <ToastProvider data-testid="toast-provider">
          <Toast data-testid="toast">
            <div>Toast content</div>
          </Toast>
          <ToastViewport data-testid="toast-viewport" />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByTestId('toast-viewport')).toBeInTheDocument();
    });

    it('should render toast with custom styling', () => {
      render(
        <ToastProvider className="custom-provider" data-testid="toast-provider">
          <Toast className="custom-toast" variant="destructive" data-testid="toast">
            <div>Error message</div>
          </Toast>
          <ToastViewport className="custom-viewport" data-testid="toast-viewport" />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-provider')).toHaveClass('custom-provider');
      expect(screen.getByTestId('toast')).toHaveClass('custom-toast');
      expect(screen.getByTestId('toast-viewport')).toHaveClass('custom-viewport');
    });

    it('should render toast with multiple custom props', () => {
      render(
        <ToastProvider
          swipeDirection="left"
          duration={3000}
          label="Notification"
          description="Toast description"
          hotkey="alt+t"
          viewportClassName="custom-viewport"
          className="custom-provider"
          data-testid="toast-provider"
        >
          <Toast
            variant="default"
            className="custom-toast"
            data-testid="toast"
          >
            <div>Toast content</div>
          </Toast>
          <ToastViewport className="custom-viewport" data-testid="toast-viewport" />
        </ToastProvider>
      );

      const provider = screen.getByTestId('toast-provider');
      expect(provider).toHaveClass('custom-provider');
      expect(provider).toBeInTheDocument();

      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('custom-toast');
      expect(toast).toHaveClass('bg-background', 'text-foreground');

      const viewport = screen.getByTestId('toast-viewport');
      expect(viewport).toHaveClass('custom-viewport');
    });
  });
});
