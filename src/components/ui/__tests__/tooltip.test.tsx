import { render, screen } from '@testing-library/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';

// Mock the TooltipPrimitive components
jest.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children, delayDuration, skipDelayDuration, disableHoverableContent, ...props }: any) => (
    <div 
      data-testid="tooltip-provider" 
      data-delay-duration={delayDuration}
      data-skip-delay-duration={skipDelayDuration}
      data-disable-hoverable-content={disableHoverableContent}
      {...props}
    >
      {children}
    </div>
  ),
  Root: ({ children, delayDuration, skipDelayDuration, disableHoverableContent, ...props }: any) => (
    <div 
      data-testid="tooltip-root" 
      data-delay-duration={delayDuration}
      data-skip-delay-duration={skipDelayDuration}
      data-disable-hoverable-content={disableHoverableContent}
      {...props}
    >
      {children}
    </div>
  ),
  Trigger: ({ children, asChild, ...props }: any) => (
    <button 
      data-testid="tooltip-trigger" 
      data-as-child={asChild}
      {...props}
    >
      {children}
    </button>
  ),
  Content: ({ 
    children, 
    side, 
    align, 
    sideOffset, 
    alignOffset, 
    avoidCollisions, 
    collisionBoundary, 
    collisionPadding, 
    arrowPadding, 
    sticky, 
    hideWhenDetached, 
    ...props 
  }: any) => (
    <div 
      data-testid="tooltip-content" 
      data-side={side}
      data-align={align}
      data-side-offset={sideOffset}
      data-align-offset={alignOffset}
      data-avoid-collisions={avoidCollisions}
      data-collision-boundary={collisionBoundary}
      data-collision-padding={collisionPadding}
      data-arrow-padding={arrowPadding}
      data-sticky={sticky}
      data-hide-when-detached={hideWhenDetached}
      {...props}
    >
      {children}
    </div>
  ),
}));

describe('Tooltip Components', () => {
  describe('Tooltip', () => {
    it('should render with default props', () => {
      render(<Tooltip data-testid="tooltip" />);
      
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<Tooltip className="custom-tooltip" data-testid="tooltip" />);
      
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass('custom-tooltip');
    });

    it('should render with custom delayDuration', () => {
      render(<Tooltip delayDuration={500} data-testid="tooltip" />);
      
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-delay-duration', '500');
    });

    it('should render with custom skipDelayDuration', () => {
      render(<Tooltip skipDelayDuration={100} data-testid="tooltip" />);
      
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-skip-delay-duration', '100');
    });

    it('should render with custom disableHoverableContent', () => {
      render(<Tooltip disableHoverableContent data-testid="tooltip" />);
      
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-disable-hoverable-content', 'true');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<Tooltip ref={ref} data-testid="tooltip" />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('TooltipTrigger', () => {
    it('should render with default props', () => {
      render(<TooltipTrigger data-testid="tooltip-trigger">Trigger</TooltipTrigger>);
      
      const tooltipTrigger = screen.getByTestId('tooltip-trigger');
      expect(tooltipTrigger).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<TooltipTrigger className="custom-tooltip-trigger" data-testid="tooltip-trigger">Trigger</TooltipTrigger>);
      
      const tooltipTrigger = screen.getByTestId('tooltip-trigger');
      expect(tooltipTrigger).toHaveClass('custom-tooltip-trigger');
    });

    it('should render with asChild prop', () => {
      render(<TooltipTrigger asChild data-testid="tooltip-trigger">Trigger</TooltipTrigger>);
      
      const tooltipTrigger = screen.getByTestId('tooltip-trigger');
      expect(tooltipTrigger).toHaveAttribute('data-as-child', 'true');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TooltipTrigger ref={ref} data-testid="tooltip-trigger">Trigger</TooltipTrigger>);
      
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('TooltipContent', () => {
    it('should render with default classes', () => {
      render(<TooltipContent data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveClass('z-50', 'overflow-hidden', 'rounded-md', 'border', 'bg-popover', 'px-3', 'py-1.5', 'text-sm', 'text-popover-foreground', 'shadow-md', 'animate-in', 'fade-in-0', 'zoom-in-95', 'data-[state=closed]:animate-out', 'data-[state=closed]:fade-out-0', 'data-[state=closed]:zoom-out-95', 'data-[side=bottom]:slide-in-from-top-2', 'data-[side=left]:slide-in-from-right-2', 'data-[side=right]:slide-in-from-left-2', 'data-[side=top]:slide-in-from-bottom-2');
    });

    it('should apply custom className', () => {
      render(<TooltipContent className="custom-tooltip-content" data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveClass('custom-tooltip-content');
    });

    it('should render with custom side', () => {
      render(<TooltipContent side="top" data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-side', 'top');
    });

    it('should render with custom align', () => {
      render(<TooltipContent align="start" data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-align', 'start');
    });

    it('should render with custom sideOffset', () => {
      render(<TooltipContent sideOffset={10} data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-side-offset', '10');
    });

    it('should render with custom alignOffset', () => {
      render(<TooltipContent alignOffset={5} data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-align-offset', '5');
    });

    it('should render with custom avoidCollisions', () => {
      render(<TooltipContent avoidCollisions data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-avoid-collisions', 'true');
    });

    it('should render with custom collisionBoundary', () => {
      render(<TooltipContent collisionBoundary="viewport" data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-collision-boundary', 'viewport');
    });

    it('should render with custom collisionPadding', () => {
      render(<TooltipContent collisionPadding={8} data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-collision-padding', '8');
    });

    it('should render with custom arrowPadding', () => {
      render(<TooltipContent arrowPadding={4} data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-arrow-padding', '4');
    });

    it('should render with custom sticky', () => {
      render(<TooltipContent sticky data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-sticky', 'true');
    });

    it('should render with custom hideWhenDetached', () => {
      render(<TooltipContent hideWhenDetached data-testid="tooltip-content">Content</TooltipContent>);
      
      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-hide-when-detached', 'true');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TooltipContent ref={ref} data-testid="tooltip-content">Content</TooltipContent>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('TooltipProvider', () => {
    it('should render with default props', () => {
      render(<TooltipProvider data-testid="tooltip-provider" />);
      
      const tooltipProvider = screen.getByTestId('tooltip-provider');
      expect(tooltipProvider).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<TooltipProvider className="custom-tooltip-provider" data-testid="tooltip-provider" />);
      
      const tooltipProvider = screen.getByTestId('tooltip-provider');
      expect(tooltipProvider).toHaveClass('custom-tooltip-provider');
    });

    it('should render with custom delayDuration', () => {
      render(<TooltipProvider delayDuration={500} data-testid="tooltip-provider" />);
      
      const tooltipProvider = screen.getByTestId('tooltip-provider');
      expect(tooltipProvider).toHaveAttribute('data-delay-duration', '500');
    });

    it('should render with custom skipDelayDuration', () => {
      render(<TooltipProvider skipDelayDuration={100} data-testid="tooltip-provider" />);
      
      const tooltipProvider = screen.getByTestId('tooltip-provider');
      expect(tooltipProvider).toHaveAttribute('data-skip-delay-duration', '100');
    });

    it('should render with custom disableHoverableContent', () => {
      render(<TooltipProvider disableHoverableContent data-testid="tooltip-provider" />);
      
      const tooltipProvider = screen.getByTestId('tooltip-provider');
      expect(tooltipProvider).toHaveAttribute('data-disable-hoverable-content', 'true');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TooltipProvider ref={ref} data-testid="tooltip-provider" />);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Complete Tooltip Structure', () => {
    it('should render a complete tooltip structure', () => {
      render(
        <TooltipProvider data-testid="tooltip-provider">
          <Tooltip data-testid="tooltip">
            <TooltipTrigger data-testid="tooltip-trigger">Trigger</TooltipTrigger>
            <TooltipContent data-testid="tooltip-content">Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });

    it('should render tooltip with custom styling', () => {
      render(
        <TooltipProvider className="custom-tooltip-provider" data-testid="tooltip-provider">
          <Tooltip className="custom-tooltip" data-testid="tooltip">
            <TooltipTrigger className="custom-tooltip-trigger" data-testid="tooltip-trigger">Trigger</TooltipTrigger>
            <TooltipContent className="custom-tooltip-content" data-testid="tooltip-content">Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(screen.getByTestId('tooltip-provider')).toHaveClass('custom-tooltip-provider');
      expect(screen.getByTestId('tooltip')).toHaveClass('custom-tooltip');
      expect(screen.getByTestId('tooltip-trigger')).toHaveClass('custom-tooltip-trigger');
      expect(screen.getByTestId('tooltip-content')).toHaveClass('custom-tooltip-content');
    });

    it('should render tooltip with multiple custom props', () => {
      render(
        <TooltipProvider
          delayDuration={500}
          skipDelayDuration={100}
          disableHoverableContent
          className="custom-tooltip-provider"
          data-testid="tooltip-provider"
        >
          <Tooltip
            delayDuration={300}
            skipDelayDuration={50}
            disableHoverableContent
            className="custom-tooltip"
            data-testid="tooltip"
          >
            <TooltipTrigger
              asChild
              className="custom-tooltip-trigger"
              data-testid="tooltip-trigger"
            >
              Trigger
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="start"
              sideOffset={10}
              alignOffset={5}
              avoidCollisions
              collisionBoundary="viewport"
              collisionPadding={8}
              arrowPadding={4}
              sticky
              hideWhenDetached
              className="custom-tooltip-content"
              data-testid="tooltip-content"
            >
              Content
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const tooltipProvider = screen.getByTestId('tooltip-provider');
      expect(tooltipProvider).toHaveClass('custom-tooltip-provider');
      expect(tooltipProvider).toHaveAttribute('data-delay-duration', '500');
      expect(tooltipProvider).toHaveAttribute('data-skip-delay-duration', '100');
      expect(tooltipProvider).toHaveAttribute('data-disable-hoverable-content', 'true');

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveClass('custom-tooltip');
      expect(tooltip).toHaveAttribute('data-delay-duration', '300');
      expect(tooltip).toHaveAttribute('data-skip-delay-duration', '50');
      expect(tooltip).toHaveAttribute('data-disable-hoverable-content', 'true');

      const tooltipTrigger = screen.getByTestId('tooltip-trigger');
      expect(tooltipTrigger).toHaveClass('custom-tooltip-trigger');
      expect(tooltipTrigger).toHaveAttribute('data-as-child', 'true');

      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveClass('custom-tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-side', 'top');
      expect(tooltipContent).toHaveAttribute('data-align', 'start');
      expect(tooltipContent).toHaveAttribute('data-side-offset', '10');
      expect(tooltipContent).toHaveAttribute('data-align-offset', '5');
      expect(tooltipContent).toHaveAttribute('data-avoid-collisions', 'true');
      expect(tooltipContent).toHaveAttribute('data-collision-boundary', 'viewport');
      expect(tooltipContent).toHaveAttribute('data-collision-padding', '8');
      expect(tooltipContent).toHaveAttribute('data-arrow-padding', '4');
      expect(tooltipContent).toHaveAttribute('data-sticky', 'true');
      expect(tooltipContent).toHaveAttribute('data-hide-when-detached', 'true');
    });
  });
});
