import { render, screen } from '@testing-library/react';
import { Toaster } from '../toaster';

// Mock the useToast hook
const mockUseToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => mockUseToast(),
}));

// Mock the toast components
jest.mock('@/components/ui/toast', () => ({
  ToastProvider: ({ children, ...props }: any) => <div data-testid="toast-provider" {...props}>{children}</div>,
  Toast: ({ children, ...props }: any) => <div data-testid="toast" {...props}>{children}</div>,
  ToastTitle: ({ children, ...props }: any) => <div data-testid="toast-title" {...props}>{children}</div>,
  ToastDescription: ({ children, ...props }: any) => <div data-testid="toast-description" {...props}>{children}</div>,
  ToastClose: ({ ...props }: any) => <button data-testid="toast-close" {...props} />,
  ToastViewport: ({ ...props }: any) => <div data-testid="toast-viewport" {...props} />,
}));

describe('Toaster Component', () => {
  beforeEach(() => {
    mockUseToast.mockReturnValue({
      toasts: [],
    });
  });

  it('should render with empty toasts', () => {
    render(<Toaster />);
    
    const provider = screen.getByTestId('toast-provider');
    const viewport = screen.getByTestId('toast-viewport');
    
    expect(provider).toBeInTheDocument();
    expect(viewport).toBeInTheDocument();
  });

  it('should render with toasts', () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: '1',
          title: 'Test Toast',
          description: 'Test Description',
          action: null,
        },
      ],
    });

    render(<Toaster />);
    
    const provider = screen.getByTestId('toast-provider');
    const viewport = screen.getByTestId('toast-viewport');
    const toast = screen.getByTestId('toast');
    const title = screen.getByTestId('toast-title');
    const description = screen.getByTestId('toast-description');
    const close = screen.getByTestId('toast-close');
    
    expect(provider).toBeInTheDocument();
    expect(viewport).toBeInTheDocument();
    expect(toast).toBeInTheDocument();
    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(close).toBeInTheDocument();
  });

  it('should render multiple toasts', () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: '1',
          title: 'First Toast',
          description: 'First Description',
          action: null,
        },
        {
          id: '2',
          title: 'Second Toast',
          description: 'Second Description',
          action: null,
        },
      ],
    });

    render(<Toaster />);
    
    const toasts = screen.getAllByTestId('toast');
    const titles = screen.getAllByTestId('toast-title');
    const descriptions = screen.getAllByTestId('toast-description');
    const closes = screen.getAllByTestId('toast-close');
    
    expect(toasts).toHaveLength(2);
    expect(titles).toHaveLength(2);
    expect(descriptions).toHaveLength(2);
    expect(closes).toHaveLength(2);
  });

  it('should render toast without title', () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: '1',
          title: null,
          description: 'Test Description',
          action: null,
        },
      ],
    });

    render(<Toaster />);
    
    const toast = screen.getByTestId('toast');
    const description = screen.getByTestId('toast-description');
    
    expect(toast).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(screen.queryByTestId('toast-title')).not.toBeInTheDocument();
  });

  it('should render toast without description', () => {
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: '1',
          title: 'Test Toast',
          description: null,
          action: null,
        },
      ],
    });

    render(<Toaster />);
    
    const toast = screen.getByTestId('toast');
    const title = screen.getByTestId('toast-title');
    
    expect(toast).toBeInTheDocument();
    expect(title).toBeInTheDocument();
    expect(screen.queryByTestId('toast-description')).not.toBeInTheDocument();
  });

  it('should render toast with action', () => {
    const mockAction = <button data-testid="toast-action">Action</button>;
    mockUseToast.mockReturnValue({
      toasts: [
        {
          id: '1',
          title: 'Test Toast',
          description: 'Test Description',
          action: mockAction,
        },
      ],
    });

    render(<Toaster />);
    
    const toast = screen.getByTestId('toast');
    const action = screen.getByTestId('toast-action');
    
    expect(toast).toBeInTheDocument();
    expect(action).toBeInTheDocument();
  });
});