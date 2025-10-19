import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../switch';

// Mock the SwitchPrimitive components
jest.mock('@radix-ui/react-switch', () => ({
  Root: ({ children, ...props }: any) => {
    const { checked, defaultChecked, onCheckedChange, ...restProps } = props;
    const isChecked = checked !== undefined ? checked : defaultChecked;
    return (
      <button 
        data-testid="switch-root" 
        data-state={isChecked ? 'checked' : 'unchecked'}
        data-checked={isChecked}
        onClick={() => onCheckedChange && onCheckedChange(!isChecked)}
        {...restProps}
      >
        {children}
      </button>
    );
  },
  Thumb: ({ ...props }: any) => <span data-testid="switch-thumb" {...props} />,
}));

describe('Switch Component', () => {
  it('should render with default props', () => {
    render(<Switch data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<Switch className="custom-switch" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveClass('custom-switch');
  });

  it('should render with checked prop', () => {
    render(<Switch checked data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('data-state', 'checked');
  });

  it('should render with defaultChecked prop', () => {
    render(<Switch defaultChecked data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('data-state', 'checked');
  });

  it('should render with disabled prop', () => {
    render(<Switch disabled data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toBeDisabled();
  });

  it('should render with required prop', () => {
    render(<Switch required data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('required');
  });

  it('should render with name prop', () => {
    render(<Switch name="notifications" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('name', 'notifications');
  });

  it('should render with value prop', () => {
    render(<Switch value="enabled" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('value', 'enabled');
  });

  it('should render with id prop', () => {
    render(<Switch id="notification-switch" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('id', 'notification-switch');
  });

  it('should render with custom aria-label', () => {
    render(<Switch aria-label="Toggle notifications" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('aria-label', 'Toggle notifications');
  });

  it('should render with custom aria-labelledby', () => {
    render(<Switch aria-labelledby="switch-label" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('aria-labelledby', 'switch-label');
  });

  it('should render with custom aria-describedby', () => {
    render(<Switch aria-describedby="switch-description" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('aria-describedby', 'switch-description');
  });

  it('should render with custom role', () => {
    render(<Switch role="switch" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('role', 'switch');
  });

  it('should render with custom tabIndex', () => {
    render(<Switch tabIndex={0} data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('tabIndex', '0');
  });

  it('should render with custom style', () => {
    render(<Switch style={{ width: '60px' }} data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveStyle('width: 60px');
  });

  it('should render with custom data attributes', () => {
    render(<Switch data-custom="value" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('data-custom', 'value');
  });

  it('should handle onCheckedChange callback', () => {
    const handleCheckedChange = jest.fn();
    render(<Switch onCheckedChange={handleCheckedChange} data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    fireEvent.click(switchElement);
    
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
  });

  it('should handle onCheckedChange callback with false value', () => {
    const handleCheckedChange = jest.fn();
    render(<Switch checked onCheckedChange={handleCheckedChange} data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    fireEvent.click(switchElement);
    
    expect(handleCheckedChange).toHaveBeenCalledWith(false);
  });

  it('should handle onCheckedChange callback with disabled state', () => {
    const handleCheckedChange = jest.fn();
    render(<Switch disabled onCheckedChange={handleCheckedChange} data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    fireEvent.click(switchElement);
    
    expect(handleCheckedChange).not.toHaveBeenCalled();
  });

  it('should render with custom form attributes', () => {
    render(<Switch form="settings-form" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('form', 'settings-form');
  });

  it('should render with custom autoFocus', () => {
    render(<Switch autoFocus data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveFocus();
  });

  it('should render with custom dir', () => {
    render(<Switch dir="rtl" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('dir', 'rtl');
  });

  it('should render with custom lang', () => {
    render(<Switch lang="en" data-testid="switch" />);
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toHaveAttribute('lang', 'en');
  });

  it('should render with multiple custom props', () => {
    const handleCheckedChange = jest.fn();
    render(
      <Switch
        checked
        disabled={false}
        required
        name="notifications"
        value="enabled"
        id="notification-switch"
        aria-label="Toggle notifications"
        role="switch"
        tabIndex={0}
        style={{ width: '60px' }}
        className="custom-switch"
        onCheckedChange={handleCheckedChange}
        data-custom="value"
        data-testid="switch"
      />
    );
    
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toHaveClass('custom-switch');
    expect(switchElement).toHaveAttribute('data-state', 'checked');
    expect(switchElement).not.toBeDisabled();
    expect(switchElement).toHaveAttribute('required');
    expect(switchElement).toHaveAttribute('name', 'notifications');
    expect(switchElement).toHaveAttribute('value', 'enabled');
    expect(switchElement).toHaveAttribute('id', 'notification-switch');
    expect(switchElement).toHaveAttribute('aria-label', 'Toggle notifications');
    expect(switchElement).toHaveAttribute('role', 'switch');
    expect(switchElement).toHaveAttribute('tabIndex', '0');
    expect(switchElement).toHaveStyle('width: 60px');
    expect(switchElement).toHaveAttribute('data-custom', 'value');
  });
});
