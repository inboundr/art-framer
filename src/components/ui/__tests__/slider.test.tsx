import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from '../slider';

// Mock the SliderPrimitive components
jest.mock('@radix-ui/react-slider', () => ({
  Root: ({ children, ...props }: any) => <div data-testid="slider-root" {...props}>{children}</div>,
  Track: ({ children, ...props }: any) => <div data-testid="slider-track" {...props}>{children}</div>,
  Range: ({ ...props }: any) => <div data-testid="slider-range" {...props} />,
  Thumb: ({ ...props }: any) => <div data-testid="slider-thumb" {...props} />,
}));

describe('Slider Component', () => {
  it('should render with default props', () => {
    render(<Slider data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<Slider className="custom-slider" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveClass('custom-slider');
  });

  it('should render with value prop', () => {
    render(<Slider value={[50]} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render with defaultValue prop', () => {
    render(<Slider defaultValue={[25, 75]} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render with min and max props', () => {
    render(<Slider min={0} max={100} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render with step prop', () => {
    render(<Slider step={5} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render with disabled prop', () => {
    render(<Slider disabled data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render with orientation prop', () => {
    render(<Slider orientation="vertical" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render with multiple values', () => {
    render(<Slider value={[20, 40, 60, 80]} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should handle onValueChange callback', () => {
    const handleValueChange = jest.fn();
    render(<Slider onValueChange={handleValueChange} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
    // Note: Actual value change testing would require more complex interaction simulation
  });

  it('should handle onValueCommit callback', () => {
    const handleValueCommit = jest.fn();
    render(<Slider onValueCommit={handleValueCommit} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
  });

  it('should render with custom aria-label', () => {
    render(<Slider aria-label="Volume control" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('aria-label', 'Volume control');
  });

  it('should render with custom aria-labelledby', () => {
    render(<Slider aria-labelledby="volume-label" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('aria-labelledby', 'volume-label');
  });

  it('should render with custom aria-valuetext', () => {
    render(<Slider aria-valuetext="50 percent" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('aria-valuetext', '50 percent');
  });

  it('should render with custom name prop', () => {
    render(<Slider name="volume" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('name', 'volume');
  });

  it('should render with custom id prop', () => {
    render(<Slider id="volume-slider" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('id', 'volume-slider');
  });

  it('should render with custom data attributes', () => {
    render(<Slider data-custom="value" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('data-custom', 'value');
  });

  it('should render with custom style', () => {
    render(<Slider style={{ width: '200px' }} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveStyle('width: 200px');
  });

  it('should render with custom tabIndex', () => {
    render(<Slider tabIndex={0} data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('tabIndex', '0');
  });

  it('should render with custom role', () => {
    render(<Slider role="slider" data-testid="slider" />);
    
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('role', 'slider');
  });

  it('should render with multiple custom props', () => {
    render(
      <Slider
        value={[30, 70]}
        min={0}
        max={100}
        step={10}
        disabled={false}
        orientation="horizontal"
        className="custom-slider"
        aria-label="Range slider"
        data-testid="slider"
      />
    );
    
    const slider = screen.getByTestId('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveClass('custom-slider');
    expect(slider).toHaveAttribute('aria-label', 'Range slider');
  });
});
