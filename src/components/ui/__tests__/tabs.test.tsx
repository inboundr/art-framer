import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

// Mock the TabsPrimitive components
jest.mock('@radix-ui/react-tabs', () => ({
  Root: ({ children, ...props }: any) => {
    const { defaultValue, value, orientation, dir, activationMode, onValueChange, ...restProps } = props;
    return (
      <div 
        data-testid="tabs-root" 
        data-default-value={defaultValue}
        data-value={value}
        data-orientation={orientation}
        data-dir={dir}
        data-activation-mode={activationMode}
        {...restProps}
      >
        {children}
      </div>
    );
  },
  List: ({ children, ...props }: any) => <div data-testid="tabs-list" {...props}>{children}</div>,
  Trigger: ({ children, ...props }: any) => {
    const { value, disabled, ...restProps } = props;
    return (
      <button 
        data-testid="tabs-trigger" 
        data-value={value}
        disabled={disabled}
        {...restProps}
      >
        {children}
      </button>
    );
  },
  Content: ({ children, ...props }: any) => {
    const { value, forceMount, ...restProps } = props;
    return (
      <div 
        data-testid="tabs-content" 
        data-value={value}
        data-force-mount={forceMount}
        {...restProps}
      >
        {children}
      </div>
    );
  },
}));

describe('Tabs Components', () => {
  describe('Tabs', () => {
    it('should render with default props', () => {
      render(<Tabs data-testid="tabs" />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<Tabs className="custom-tabs" data-testid="tabs" />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveClass('custom-tabs');
    });

    it('should render with defaultValue prop', () => {
      render(<Tabs defaultValue="tab1" data-testid="tabs" />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('data-default-value', 'tab1');
    });

    it('should render with value prop', () => {
      render(<Tabs value="tab2" data-testid="tabs" />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('data-value', 'tab2');
    });

    it('should render with orientation prop', () => {
      render(<Tabs orientation="vertical" data-testid="tabs" />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('data-orientation', 'vertical');
    });

    it('should render with dir prop', () => {
      render(<Tabs dir="rtl" data-testid="tabs" />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('data-dir', 'rtl');
    });

    it('should render with activationMode prop', () => {
      render(<Tabs activationMode="manual" data-testid="tabs" />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('data-activation-mode', 'manual');
    });

    it('should handle onValueChange callback', () => {
      const handleValueChange = jest.fn();
      render(<Tabs onValueChange={handleValueChange} data-testid="tabs" />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs).toBeInTheDocument();
      // Note: Actual value change testing would require more complex interaction simulation
    });
  });

  describe('TabsList', () => {
    it('should render with default classes', () => {
      render(<TabsList data-testid="tabs-list" />);
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('inline-flex', 'h-10', 'items-center', 'justify-center', 'rounded-md', 'bg-muted', 'p-1', 'text-muted-foreground');
    });

    it('should apply custom className', () => {
      render(<TabsList className="custom-tabs-list" data-testid="tabs-list" />);
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('custom-tabs-list');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TabsList ref={ref} data-testid="tabs-list" />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('TabsTrigger', () => {
    it('should render with default classes', () => {
      render(<TabsTrigger value="tab1" data-testid="tabs-trigger">Tab 1</TabsTrigger>);
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass('inline-flex', 'items-center', 'justify-center', 'whitespace-nowrap', 'rounded-sm', 'px-3', 'py-1.5', 'text-sm', 'font-medium', 'ring-offset-background', 'transition-all', 'focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2', 'disabled:pointer-events-none', 'disabled:opacity-50', 'data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow-sm');
    });

    it('should apply custom className', () => {
      render(<TabsTrigger value="tab1" className="custom-tabs-trigger" data-testid="tabs-trigger">Tab 1</TabsTrigger>);
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveClass('custom-tabs-trigger');
    });

    it('should render with value prop', () => {
      render(<TabsTrigger value="tab1" data-testid="tabs-trigger">Tab 1</TabsTrigger>);
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toHaveAttribute('data-value', 'tab1');
    });

    it('should render with disabled prop', () => {
      render(<TabsTrigger value="tab1" disabled data-testid="tabs-trigger">Tab 1</TabsTrigger>);
      
      const tabsTrigger = screen.getByTestId('tabs-trigger');
      expect(tabsTrigger).toBeDisabled();
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TabsTrigger value="tab1" ref={ref} data-testid="tabs-trigger">Tab 1</TabsTrigger>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('TabsContent', () => {
    it('should render with default classes', () => {
      render(<TabsContent value="tab1" data-testid="tabs-content">Content 1</TabsContent>);
      
      const tabsContent = screen.getByTestId('tabs-content');
      expect(tabsContent).toHaveClass('mt-2', 'ring-offset-background', 'focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2');
    });

    it('should apply custom className', () => {
      render(<TabsContent value="tab1" className="custom-tabs-content" data-testid="tabs-content">Content 1</TabsContent>);
      
      const tabsContent = screen.getByTestId('tabs-content');
      expect(tabsContent).toHaveClass('custom-tabs-content');
    });

    it('should render with value prop', () => {
      render(<TabsContent value="tab1" data-testid="tabs-content">Content 1</TabsContent>);
      
      const tabsContent = screen.getByTestId('tabs-content');
      expect(tabsContent).toHaveAttribute('data-value', 'tab1');
    });

    it('should render with forceMount prop', () => {
      render(<TabsContent value="tab1" forceMount data-testid="tabs-content">Content 1</TabsContent>);
      
      const tabsContent = screen.getByTestId('tabs-content');
      expect(tabsContent).toHaveAttribute('data-force-mount', 'true');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TabsContent value="tab1" ref={ref} data-testid="tabs-content">Content 1</TabsContent>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Complete Tabs Structure', () => {
    it('should render a complete tabs structure', () => {
      render(
        <Tabs defaultValue="tab1" data-testid="tabs">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1" data-testid="tabs-trigger-1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" data-testid="tabs-trigger-2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="tabs-content-1">Content 1</TabsContent>
          <TabsContent value="tab2" data-testid="tabs-content-2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-trigger-1')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-trigger-2')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-content-1')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-content-2')).toBeInTheDocument();
    });

    it('should render tabs with custom styling', () => {
      render(
        <Tabs className="custom-tabs" data-testid="tabs">
          <TabsList className="custom-tabs-list" data-testid="tabs-list">
            <TabsTrigger value="tab1" className="custom-tabs-trigger" data-testid="tabs-trigger">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-tabs-content" data-testid="tabs-content">Content 1</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('tabs')).toHaveClass('custom-tabs');
      expect(screen.getByTestId('tabs-list')).toHaveClass('custom-tabs-list');
      expect(screen.getByTestId('tabs-trigger')).toHaveClass('custom-tabs-trigger');
      expect(screen.getByTestId('tabs-content')).toHaveClass('custom-tabs-content');
    });

    it('should render tabs with multiple triggers and contents', () => {
      render(
        <Tabs defaultValue="tab1" data-testid="tabs">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1" data-testid="tabs-trigger-1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" data-testid="tabs-trigger-2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3" data-testid="tabs-trigger-3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="tabs-content-1">Content 1</TabsContent>
          <TabsContent value="tab2" data-testid="tabs-content-2">Content 2</TabsContent>
          <TabsContent value="tab3" data-testid="tabs-content-3">Content 3</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('tabs-trigger-1')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-trigger-2')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-trigger-3')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-content-1')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-content-2')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-content-3')).toBeInTheDocument();
    });
  });
});
