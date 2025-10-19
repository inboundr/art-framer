import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '../textarea';

describe('Textarea Component', () => {
  it('should render with default classes', () => {
    render(<Textarea data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('flex', 'min-h-[80px]', 'w-full', 'rounded-md', 'border', 'border-input', 'bg-background', 'px-3', 'py-2', 'text-sm', 'ring-offset-background', 'placeholder:text-muted-foreground', 'focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2', 'disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('should apply custom className', () => {
    render(<Textarea className="custom-textarea" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('custom-textarea');
  });

  it('should render with placeholder', () => {
    render(<Textarea placeholder="Enter your message" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('placeholder', 'Enter your message');
  });

  it('should render with disabled state', () => {
    render(<Textarea disabled data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeDisabled();
  });

  it('should render with value', () => {
    render(<Textarea value="Hello world" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveValue('Hello world');
  });

  it('should handle onChange event', () => {
    const handleChange = jest.fn();
    render(<Textarea onChange={handleChange} data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('should forward ref correctly', () => {
    const ref = { current: null };
    render(<Textarea ref={ref} data-testid="textarea" />);
    
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('should render with custom rows', () => {
    render(<Textarea rows={5} data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('should render with custom cols', () => {
    render(<Textarea cols={50} data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('cols', '50');
  });

  it('should render with custom maxLength', () => {
    render(<Textarea maxLength={100} data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('maxLength', '100');
  });

  it('should render with custom name', () => {
    render(<Textarea name="message" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('name', 'message');
  });

  it('should render with custom id', () => {
    render(<Textarea id="message-textarea" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('id', 'message-textarea');
  });

  it('should render with custom aria-label', () => {
    render(<Textarea aria-label="Message input" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('aria-label', 'Message input');
  });

  it('should render with custom required attribute', () => {
    render(<Textarea required data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('required');
  });

  it('should render with custom readOnly attribute', () => {
    render(<Textarea readOnly data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('readOnly');
  });

  it('should render with custom autoFocus attribute', () => {
    render(<Textarea autoFocus data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveFocus();
  });

  it('should render with custom spellCheck attribute', () => {
    render(<Textarea spellCheck={false} data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('spellCheck', 'false');
  });

  it('should render with custom wrap attribute', () => {
    render(<Textarea wrap="soft" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('wrap', 'soft');
  });

  it('should render with custom dir attribute', () => {
    render(<Textarea dir="rtl" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('dir', 'rtl');
  });

  it('should render with custom lang attribute', () => {
    render(<Textarea lang="en" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('lang', 'en');
  });

  it('should render with custom style', () => {
    render(<Textarea style={{ height: '200px' }} data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveStyle('height: 200px');
  });

  it('should render with custom data attributes', () => {
    render(<Textarea data-custom="value" data-testid="textarea" />);
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('data-custom', 'value');
  });

  it('should render with multiple custom props', () => {
    const handleChange = jest.fn();
    render(
      <Textarea
        value="Initial text"
        placeholder="Enter your message"
        disabled={false}
        required
        readOnly={false}
        autoFocus
        spellCheck={true}
        wrap="soft"
        dir="ltr"
        lang="en"
        rows={4}
        cols={40}
        maxLength={500}
        name="message"
        id="message-textarea"
        aria-label="Message input"
        className="custom-textarea"
        style={{ height: '150px' }}
        onChange={handleChange}
        data-custom="value"
        data-testid="textarea"
      />
    );
    
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('custom-textarea');
    expect(textarea).toHaveValue('Initial text');
    expect(textarea).toHaveAttribute('placeholder', 'Enter your message');
    expect(textarea).not.toBeDisabled();
    expect(textarea).toHaveAttribute('required');
    expect(textarea).not.toHaveAttribute('readOnly');
    expect(textarea).toHaveFocus();
    expect(textarea).toHaveAttribute('spellCheck', 'true');
    expect(textarea).toHaveAttribute('wrap', 'soft');
    expect(textarea).toHaveAttribute('dir', 'ltr');
    expect(textarea).toHaveAttribute('lang', 'en');
    expect(textarea).toHaveAttribute('rows', '4');
    expect(textarea).toHaveAttribute('cols', '40');
    expect(textarea).toHaveAttribute('maxLength', '500');
    expect(textarea).toHaveAttribute('name', 'message');
    expect(textarea).toHaveAttribute('id', 'message-textarea');
    expect(textarea).toHaveAttribute('aria-label', 'Message input');
    expect(textarea).toHaveStyle('height: 150px');
    expect(textarea).toHaveAttribute('data-custom', 'value');
  });
});
