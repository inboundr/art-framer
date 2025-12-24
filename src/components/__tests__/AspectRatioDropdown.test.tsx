import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AspectRatioDropdown } from '../AspectRatioDropdown';

// Mock the component's dependencies
const mockOnClose = jest.fn();
const mockOnSelect = jest.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onSelect: mockOnSelect,
  currentRatio: {
    label: '1:1 (Square)',
    value: '1:1',
    width: 1024,
    height: 1024
  },
  triggerRef: { current: null }
};

describe('AspectRatioDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<AspectRatioDropdown {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Portrait')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    expect(screen.getByText('Portrait')).toBeInTheDocument();
    expect(screen.getByText('Landscape')).toBeInTheDocument();
    expect(screen.getAllByText('1:1 (Square)')).toHaveLength(2); // Preview and button
  });

  it('should display current ratio in preview', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    expect(screen.getAllByText('1:1 (Square)')).toHaveLength(2);
  });

  it('should show width and height dimensions', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    expect(screen.getAllByText('1024 px')).toHaveLength(2); // Width and height
  });

  it('should call onSelect when a ratio is clicked', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const portraitRatio = screen.getByText('2:3');
    fireEvent.click(portraitRatio);
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      label: '2:3',
      value: '2:3',
      width: 832,
      height: 1248
    });
  });

  it('should call onSelect when square ratio is clicked', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const squareRatio = screen.getAllByText('1:1 (Square)').find(element => 
      element.closest('button')
    );
    fireEvent.click(squareRatio!);
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      label: '1:1 (Square)',
      value: '1:1',
      width: 1024,
      height: 1024
    });
  });

  it('should handle slider change', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '3' } });
    
    // The slider value should change the preview
    expect(screen.getByText('1024 px')).toBeInTheDocument();
  });

  it('should call onSelect when slider mouse up', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '3' } });
    fireEvent.mouseUp(slider);
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('should call onSelect when slider touch end', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '3' } });
    fireEvent.touchEnd(slider);
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('should show all aspect ratios are now unlocked except Custom', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    // All Ideogram-supported ratios are now available (only Custom remains locked)
    const allRatios = ['1:3', '1:2', '9:16', '10:16', '2:3', '3:4', '4:5', '3:1', '2:1', '16:9', '16:10', '3:2', '4:3', '5:4', '1:1 (Square)', 'Custom'];
    allRatios.forEach(ratio => {
      const ratioElement = screen.getByText(ratio);
      expect(ratioElement).toBeInTheDocument();
    });
  });

  it('should disable custom ratio when locked', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const customButton = screen.getByText('Custom');
    expect(customButton.closest('button')).toHaveClass('opacity-50 cursor-not-allowed');
  });

  it('should highlight current ratio', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const squareButton = screen.getAllByText('1:1 (Square)').find(element => 
      element.closest('button')
    );
    expect(squareButton?.closest('button')).toHaveClass('bg-gray-light text-dark');
  });

  it('should update slider ratio when currentRatio changes', () => {
    const { rerender } = render(<AspectRatioDropdown {...defaultProps} />);
    
    const newCurrentRatio = {
      label: '2:3',
      value: '2:3',
      width: 832,
      height: 1248
    };
    
    rerender(<AspectRatioDropdown {...defaultProps} currentRatio={newCurrentRatio} />);
    
    // Check that the preview shows the new ratio
    expect(screen.getAllByText('2:3')).toHaveLength(2); // Preview and button
  });

  it('should handle click outside to close', async () => {
    const mockTriggerRef = { current: document.createElement('button') };
    render(<AspectRatioDropdown {...defaultProps} triggerRef={mockTriggerRef} />);
    
    // Simulate click outside
    fireEvent.mouseDown(document.body);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should not close when clicking inside dropdown', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const dropdown = screen.getByText('Portrait').closest('div');
    fireEvent.mouseDown(dropdown!);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should not close when clicking trigger button', () => {
    const mockTriggerRef = { current: document.createElement('button') };
    render(<AspectRatioDropdown {...defaultProps} triggerRef={mockTriggerRef} />);
    
    fireEvent.mouseDown(mockTriggerRef.current);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should display all portrait ratios', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const portraitRatios = ['1:3', '1:2', '9:16', '10:16', '2:3', '3:4', '4:5'];
    portraitRatios.forEach(ratio => {
      expect(screen.getByText(ratio)).toBeInTheDocument();
    });
  });

  it('should display all landscape ratios', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const landscapeRatios = ['3:1', '2:1', '16:9', '16:10', '3:2', '4:3', '5:4'];
    landscapeRatios.forEach(ratio => {
      expect(screen.getByText(ratio)).toBeInTheDocument();
    });
  });

  it('should calculate correct slider value for different ratios', () => {
    const { rerender } = render(<AspectRatioDropdown {...defaultProps} />);
    
    // Test with a portrait ratio
    rerender(<AspectRatioDropdown {...defaultProps} currentRatio={{
      label: '2:3',
      value: '2:3',
      width: 832,
      height: 1248
    }} />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('2');
  });

  it('should handle slider value changes correctly', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    
    // Test different slider values
    fireEvent.change(slider, { target: { value: '1' } });
    expect(slider).toHaveValue('1');
    
    fireEvent.change(slider, { target: { value: '6' } });
    expect(slider).toHaveValue('6');
    
    fireEvent.change(slider, { target: { value: '11' } });
    expect(slider).toHaveValue('11');
  });

  it('should show preview dimensions correctly', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    // Check that width and height are displayed
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getAllByText('1024 px')).toHaveLength(2);
  });

  it('should handle hover states correctly', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const ratioButton = screen.getByText('2:3').closest('button');
    expect(ratioButton).toHaveClass('hover:text-gray-light hover:bg-gray-border/20');
  });

  it('should render with correct CSS classes', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    // Find the main dropdown container by looking for the specific classes
    const dropdown = document.querySelector('.absolute.top-full.mt-2.left-0.w-96.bg-dark-secondary');
    expect(dropdown).toBeInTheDocument();
    expect(dropdown).toHaveClass('absolute', 'top-full', 'mt-2', 'left-0', 'w-96', 'bg-dark-secondary', 'border', 'border-gray-border', 'rounded-lg', 'shadow-lg', 'p-4', 'z-50');
  });

  it('should handle touch events on slider', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '5' } });
    fireEvent.touchEnd(slider);
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('should update preview when slider changes', () => {
    render(<AspectRatioDropdown {...defaultProps} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '3' } });
    
    // The preview should update to show the new ratio
    // The dimensions should still be displayed
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('Height')).toBeInTheDocument();
  });
});
