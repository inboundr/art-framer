import { render, screen } from '@testing-library/react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render with default classes', () => {
      render(<Card data-testid="card">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    });

    it('should apply custom className', () => {
      render(<Card className="custom-class" data-testid="card">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<Card ref={ref} data-testid="card">Card content</Card>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should pass through additional props', () => {
      render(<Card data-testid="card" data-custom="value">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('data-custom', 'value');
    });
  });

  describe('CardHeader', () => {
    it('should render with default classes', () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>);
      
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('should apply custom className', () => {
      render(<CardHeader className="custom-header" data-testid="header">Header content</CardHeader>);
      
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<CardHeader ref={ref} data-testid="header">Header content</CardHeader>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardTitle', () => {
    it('should render as h3 with default classes', () => {
      render(<CardTitle data-testid="title">Card Title</CardTitle>);
      
      const title = screen.getByTestId('title');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('should apply custom className', () => {
      render(<CardTitle className="custom-title" data-testid="title">Card Title</CardTitle>);
      
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('custom-title');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<CardTitle ref={ref} data-testid="title">Card Title</CardTitle>);
      
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('CardDescription', () => {
    it('should render with default classes', () => {
      render(<CardDescription data-testid="description">Card description</CardDescription>);
      
      const description = screen.getByTestId('description');
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should apply custom className', () => {
      render(<CardDescription className="custom-description" data-testid="description">Card description</CardDescription>);
      
      const description = screen.getByTestId('description');
      expect(description).toHaveClass('custom-description');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<CardDescription ref={ref} data-testid="description">Card description</CardDescription>);
      
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('CardContent', () => {
    it('should render with default classes', () => {
      render(<CardContent data-testid="content">Card content</CardContent>);
      
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('should apply custom className', () => {
      render(<CardContent className="custom-content" data-testid="content">Card content</CardContent>);
      
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('custom-content');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<CardContent ref={ref} data-testid="content">Card content</CardContent>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardFooter', () => {
    it('should render with default classes', () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>);
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('should apply custom className', () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer content</CardFooter>);
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<CardFooter ref={ref} data-testid="footer">Footer content</CardFooter>);
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Card composition', () => {
    it('should render complete card structure', () => {
      render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle data-testid="title">Card Title</CardTitle>
            <CardDescription data-testid="description">Card description</CardDescription>
          </CardHeader>
          <CardContent data-testid="content">
            Card content goes here
          </CardContent>
          <CardFooter data-testid="footer">
            Footer content
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('title')).toBeInTheDocument();
      expect(screen.getByTestId('description')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render card with only required parts', () => {
      render(
        <Card data-testid="card">
          <CardContent data-testid="content">
            Simple card content
          </CardContent>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Simple card content')).toBeInTheDocument();
    });
  });
});
