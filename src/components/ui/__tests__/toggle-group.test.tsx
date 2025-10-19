import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleGroup, ToggleGroupItem } from '../toggle-group';

// Mock the ToggleGroupPrimitive components
jest.mock('@radix-ui/react-toggle-group', () => ({
  Root: ({ 
    children, 
    type, 
    value, 
    defaultValue, 
    disabled, 
    orientation, 
    dir, 
    loop, 
    onValueChange, 
    ...props 
  }: any) => (
    <div 
      data-testid="toggle-group-root" 
      data-type={type}
      data-value={Array.isArray(value) ? value.join(',') : value}
      data-default-value={Array.isArray(defaultValue) ? defaultValue.join(',') : defaultValue}
      data-disabled={disabled}
      data-orientation={orientation}
      data-dir={dir}
      data-loop={loop}
      {...props}
    >
      {children}
    </div>
  ),
  Item: ({ children, value, disabled, ...props }: any) => (
    <button 
      data-testid="toggle-group-item" 
      data-value={value}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe('ToggleGroup Components', () => {
  describe('ToggleGroup', () => {
    it('should render with default props', () => {
      render(<ToggleGroup data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<ToggleGroup className="custom-toggle-group" data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveClass('custom-toggle-group');
    });

    it('should render with type prop', () => {
      render(<ToggleGroup type="multiple" data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveAttribute('data-type', 'multiple');
    });

    it('should render with value prop', () => {
      render(<ToggleGroup value={['item1']} data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveAttribute('data-value', 'item1');
    });

    it('should render with defaultValue prop', () => {
      render(<ToggleGroup defaultValue={['item1']} data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveAttribute('data-default-value', 'item1');
    });

    it('should render with disabled prop', () => {
      render(<ToggleGroup disabled data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveAttribute('data-disabled', 'true');
    });

    it('should render with orientation prop', () => {
      render(<ToggleGroup orientation="vertical" data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveAttribute('data-orientation', 'vertical');
    });

    it('should render with dir prop', () => {
      render(<ToggleGroup dir="rtl" data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveAttribute('data-dir', 'rtl');
    });

    it('should render with loop prop', () => {
      render(<ToggleGroup loop data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveAttribute('data-loop', 'true');
    });

    it('should handle onValueChange callback', () => {
      const handleValueChange = jest.fn();
      render(<ToggleGroup onValueChange={handleValueChange} data-testid="toggle-group" />);
      
      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toBeInTheDocument();
      // Note: Actual value change testing would require more complex interaction simulation
    });
  });

  describe('ToggleGroupItem', () => {
    it('should render with default classes', () => {
      render(<ToggleGroupItem value="item1" data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveClass('inline-flex', 'items-center', 'justify-center', 'rounded-md', 'text-sm', 'font-medium', 'ring-offset-background', 'transition-colors', 'hover:bg-muted', 'hover:text-muted-foreground', 'focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2', 'disabled:pointer-events-none', 'disabled:opacity-50', 'data-[state=on]:bg-accent', 'data-[state=on]:text-accent-foreground', 'bg-transparent', 'h-10', 'px-3');
    });

    it('should apply custom className', () => {
      render(<ToggleGroupItem value="item1" className="custom-toggle-group-item" data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveClass('custom-toggle-group-item');
    });

    it('should render with value prop', () => {
      render(<ToggleGroupItem value="item1" data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveAttribute('data-value', 'item1');
    });

    it('should render with disabled prop', () => {
      render(<ToggleGroupItem value="item1" disabled data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toBeDisabled();
    });

    it('should render with custom aria-label', () => {
      render(<ToggleGroupItem value="item1" aria-label="Toggle item 1" data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveAttribute('aria-label', 'Toggle item 1');
    });

    it('should render with custom aria-labelledby', () => {
      render(<ToggleGroupItem value="item1" aria-labelledby="item1-label" data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveAttribute('aria-labelledby', 'item1-label');
    });

    it('should render with custom aria-describedby', () => {
      render(<ToggleGroupItem value="item1" aria-describedby="item1-description" data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveAttribute('aria-describedby', 'item1-description');
    });

    it('should render with custom role', () => {
      render(<ToggleGroupItem value="item1" role="button" data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveAttribute('role', 'button');
    });

    it('should render with custom tabIndex', () => {
      render(<ToggleGroupItem value="item1" tabIndex={0} data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveAttribute('tabIndex', '0');
    });

    it('should render with custom style', () => {
      render(<ToggleGroupItem value="item1" style={{ width: '100px' }} data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveStyle('width: 100px');
    });

    it('should render with custom data attributes', () => {
      render(<ToggleGroupItem value="item1" data-custom="value" data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveAttribute('data-custom', 'value');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<ToggleGroupItem value="item1" ref={ref} data-testid="toggle-group-item">Item 1</ToggleGroupItem>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Complete ToggleGroup Structure', () => {
    it('should render a complete toggle group structure', () => {
      render(
        <ToggleGroup type="multiple" data-testid="toggle-group">
          <ToggleGroupItem value="item1" data-testid="toggle-group-item-1">Item 1</ToggleGroupItem>
          <ToggleGroupItem value="item2" data-testid="toggle-group-item-2">Item 2</ToggleGroupItem>
          <ToggleGroupItem value="item3" data-testid="toggle-group-item-3">Item 3</ToggleGroupItem>
        </ToggleGroup>
      );

      expect(screen.getByTestId('toggle-group')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-group-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-group-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-group-item-3')).toBeInTheDocument();
    });

    it('should render toggle group with custom styling', () => {
      render(
        <ToggleGroup className="custom-toggle-group" data-testid="toggle-group">
          <ToggleGroupItem value="item1" className="custom-toggle-group-item" data-testid="toggle-group-item">Item 1</ToggleGroupItem>
        </ToggleGroup>
      );

      expect(screen.getByTestId('toggle-group')).toHaveClass('custom-toggle-group');
      expect(screen.getByTestId('toggle-group-item')).toHaveClass('custom-toggle-group-item');
    });

    it('should render toggle group with multiple custom props', () => {
      const handleValueChange = jest.fn();
      render(
        <ToggleGroup
          type="single"
          value={['item1']}
          disabled={false}
          orientation="horizontal"
          dir="ltr"
          loop
          className="custom-toggle-group"
          onValueChange={handleValueChange}
          data-testid="toggle-group"
        >
          <ToggleGroupItem
            value="item1"
            disabled={false}
            aria-label="Toggle item 1"
            role="button"
            tabIndex={0}
            style={{ width: '100px' }}
            className="custom-toggle-group-item"
            data-custom="value"
            data-testid="toggle-group-item"
          >
            Item 1
          </ToggleGroupItem>
        </ToggleGroup>
      );

      const toggleGroup = screen.getByTestId('toggle-group');
      expect(toggleGroup).toHaveClass('custom-toggle-group');
      expect(toggleGroup).toHaveAttribute('data-type', 'single');
      expect(toggleGroup).toHaveAttribute('data-value', 'item1');
      expect(toggleGroup).toHaveAttribute('data-disabled', 'false');
      expect(toggleGroup).toHaveAttribute('data-orientation', 'horizontal');
      expect(toggleGroup).toHaveAttribute('data-dir', 'ltr');
      expect(toggleGroup).toHaveAttribute('data-loop', 'true');

      const toggleGroupItem = screen.getByTestId('toggle-group-item');
      expect(toggleGroupItem).toHaveClass('custom-toggle-group-item');
      expect(toggleGroupItem).toHaveAttribute('data-value', 'item1');
      expect(toggleGroupItem).not.toBeDisabled();
      expect(toggleGroupItem).toHaveAttribute('aria-label', 'Toggle item 1');
      expect(toggleGroupItem).toHaveAttribute('role', 'button');
      expect(toggleGroupItem).toHaveAttribute('tabIndex', '0');
      expect(toggleGroupItem).toHaveStyle('width: 100px');
      expect(toggleGroupItem).toHaveAttribute('data-custom', 'value');
    });
  });
});
