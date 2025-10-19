import { render, screen } from '@testing-library/react';
import { Toaster } from '../sonner';

// Mock the sonner library
jest.mock('sonner', () => ({
  Toaster: ({ theme, position, richColors, expand, closeButton, duration, visibleToasts, toastOptions, offset, dir, hotkey, invert, gap, loadingIcon, pauseWhenPageIsHidden, ...props }: any) => (
    <div 
      data-testid="toaster" 
      data-theme={theme}
      data-position={position}
      data-rich-colors={richColors}
      data-expand={expand}
      data-close-button={closeButton}
      data-duration={duration}
      data-visible-toasts={visibleToasts}
      data-toast-options={toastOptions ? JSON.stringify(toastOptions) : undefined}
      data-offset={offset}
      data-dir={dir}
      data-hotkey={hotkey}
      data-invert={invert}
      data-gap={gap}
      data-loading-icon={loadingIcon ? 'true' : undefined}
      data-pause-when-page-is-hidden={pauseWhenPageIsHidden}
      {...props}
    >
      Toaster Component
    </div>
  ),
}));

describe('Toaster Component', () => {
  it('should render with default props', () => {
    render(<Toaster data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toBeInTheDocument();
    expect(toaster).toHaveTextContent('Toaster Component');
  });

  it('should render with custom className', () => {
    render(<Toaster className="custom-toaster" data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveClass('custom-toaster');
  });

  it('should render with custom theme', () => {
    render(<Toaster theme="dark" data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-theme', 'dark');
  });

  it('should render with custom position', () => {
    render(<Toaster position="top-right" data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-position', 'top-right');
  });

  it('should render with custom richColors', () => {
    render(<Toaster richColors data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-rich-colors', 'true');
  });

  it('should render with custom expand', () => {
    render(<Toaster expand data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-expand', 'true');
  });

  it('should render with custom closeButton', () => {
    render(<Toaster closeButton data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-close-button', 'true');
  });

  it('should render with custom duration', () => {
    render(<Toaster duration={5000} data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-duration', '5000');
  });

  it('should render with custom visibleToasts', () => {
    render(<Toaster visibleToasts={3} data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-visible-toasts', '3');
  });

  it('should render with custom toastOptions', () => {
    const toastOptions = { duration: 3000, style: { background: 'red' } };
    render(<Toaster toastOptions={toastOptions} data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-toast-options', JSON.stringify(toastOptions));
  });

  it('should render with custom offset', () => {
    render(<Toaster offset="10px" data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-offset', '10px');
  });

  it('should render with custom dir', () => {
    render(<Toaster dir="rtl" data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-dir', 'rtl');
  });

  it('should render with custom hotkey', () => {
    render(<Toaster hotkey="ctrl+d" data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-hotkey', 'ctrl+d');
  });

  it('should render with custom invert', () => {
    render(<Toaster invert data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-invert', 'true');
  });

  it('should render with custom gap', () => {
    render(<Toaster gap={8} data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-gap', '8');
  });

  it('should render with custom loadingIcon', () => {
    render(<Toaster loadingIcon={<div>Loading...</div>} data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-loading-icon', 'true');
  });

  it('should render with custom pauseWhenPageIsHidden', () => {
    render(<Toaster pauseWhenPageIsHidden data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-pause-when-page-is-hidden', 'true');
  });

  it('should render with custom style', () => {
    render(<Toaster style={{ zIndex: 9999 }} data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveStyle('z-index: 9999');
  });

  it('should render with custom id', () => {
    render(<Toaster id="custom-toaster" data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('id', 'custom-toaster');
  });

  it('should render with custom data attributes', () => {
    render(<Toaster data-custom="value" data-testid="toaster" />);
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toHaveAttribute('data-custom', 'value');
  });

  it('should render with multiple custom props', () => {
    render(
      <Toaster
        theme="light"
        position="bottom-center"
        richColors
        expand
        closeButton
        duration={4000}
        visibleToasts={5}
        offset="20px"
        dir="ltr"
        hotkey="alt+t"
        invert={false}
        gap={12}
        pauseWhenPageIsHidden
        className="custom-toaster"
        style={{ position: 'fixed' }}
        data-testid="toaster"
      />
    );
    
    const toaster = screen.getByTestId('toaster');
    expect(toaster).toBeInTheDocument();
    expect(toaster).toHaveClass('custom-toaster');
    expect(toaster).toHaveAttribute('data-theme', 'light');
    expect(toaster).toHaveAttribute('data-position', 'bottom-center');
    expect(toaster).toHaveAttribute('data-rich-colors', 'true');
    expect(toaster).toHaveAttribute('data-expand', 'true');
    expect(toaster).toHaveAttribute('data-close-button', 'true');
    expect(toaster).toHaveAttribute('data-duration', '4000');
    expect(toaster).toHaveAttribute('data-visible-toasts', '5');
    expect(toaster).toHaveAttribute('data-offset', '20px');
    expect(toaster).toHaveAttribute('data-dir', 'ltr');
    expect(toaster).toHaveAttribute('data-hotkey', 'alt+t');
    expect(toaster).toHaveAttribute('data-invert', 'false');
    expect(toaster).toHaveAttribute('data-gap', '12');
    expect(toaster).toHaveAttribute('data-pause-when-page-is-hidden', 'true');
    expect(toaster).toHaveStyle('position: fixed');
  });
});
