import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../input';

describe('Input Component', () => {
  it('should render with default classes', () => {
    render(<Input data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass(
      'flex',
      'h-10',
      'w-full',
      'rounded-md',
      'border',
      'border-input',
      'bg-background',
      'px-3',
      'py-2',
      'text-base',
      'ring-offset-background',
      'file:border-0',
      'file:bg-transparent',
      'file:text-sm',
      'file:font-medium',
      'file:text-foreground',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed',
      'disabled:opacity-50',
      'md:text-sm'
    );
  });

  it('should apply custom className', () => {
    render(<Input className="custom-input" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('custom-input');
  });

  it('should forward ref correctly', () => {
    const ref = { current: null };
    render(<Input ref={ref} data-testid="input" />);
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('should handle different input types', () => {
    render(<Input type="email" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should handle placeholder text', () => {
    render(<Input placeholder="Enter your email" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('placeholder', 'Enter your email');
  });

  it('should handle value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="input" />);
    
    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('test value');
  });

  it('should handle disabled state', () => {
    render(<Input disabled data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
  });

  it('should handle required attribute', () => {
    render(<Input required data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toBeRequired();
  });

  it('should pass through additional props', () => {
    render(<Input data-testid="input" data-custom="value" aria-label="Custom input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('data-custom', 'value');
    expect(input).toHaveAttribute('aria-label', 'Custom input');
  });

  it('should handle focus and blur events', () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    
    render(<Input onFocus={handleFocus} onBlur={handleBlur} data-testid="input" />);
    
    const input = screen.getByTestId('input');
    
    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  it('should handle different input types correctly', () => {
    const { rerender } = render(<Input type="text" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'text');
    
    rerender(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    
    rerender(<Input type="number" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number');
  });

  it('should handle controlled input', () => {
    const { rerender } = render(<Input value="initial" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveValue('initial');
    
    rerender(<Input value="updated" data-testid="input" />);
    expect(input).toHaveValue('updated');
  });

  it('should handle uncontrolled input with defaultValue', () => {
    render(<Input defaultValue="default" data-testid="input" />);
    
    const input = screen.getByTestId('input');
    expect(input).toHaveValue('default');
  });
});
