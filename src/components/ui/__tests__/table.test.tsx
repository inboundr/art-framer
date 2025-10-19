import { render, screen } from '@testing-library/react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableCaption 
} from '../table';

describe('Table Components', () => {
  describe('Table', () => {
    it('should render with default classes', () => {
      render(<Table data-testid="table" />);
      
      const table = screen.getByTestId('table');
      expect(table).toHaveClass('w-full', 'caption-bottom', 'text-sm');
    });

    it('should apply custom className', () => {
      render(<Table className="custom-table" data-testid="table" />);
      
      const table = screen.getByTestId('table');
      expect(table).toHaveClass('custom-table');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<Table ref={ref} data-testid="table" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });

    it('should pass through additional props', () => {
      render(<Table data-testid="table" data-custom="value" />);
      
      const table = screen.getByTestId('table');
      expect(table).toHaveAttribute('data-custom', 'value');
    });
  });

  describe('TableHeader', () => {
    it('should render with default classes', () => {
      render(<TableHeader data-testid="header" />);
      
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('[&_tr]:border-b');
    });

    it('should apply custom className', () => {
      render(<TableHeader className="custom-header" data-testid="header" />);
      
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('custom-header');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TableHeader ref={ref} data-testid="header" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });
  });

  describe('TableBody', () => {
    it('should render with default classes', () => {
      render(<TableBody data-testid="body" />);
      
      const body = screen.getByTestId('body');
      expect(body).toHaveClass('[&_tr:last-child]:border-0');
    });

    it('should apply custom className', () => {
      render(<TableBody className="custom-body" data-testid="body" />);
      
      const body = screen.getByTestId('body');
      expect(body).toHaveClass('custom-body');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TableBody ref={ref} data-testid="body" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });
  });

  describe('TableFooter', () => {
    it('should render with default classes', () => {
      render(<TableFooter data-testid="footer" />);
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('border-t', 'bg-muted/50', 'font-medium', '[&>tr]:last:border-b-0');
    });

    it('should apply custom className', () => {
      render(<TableFooter className="custom-footer" data-testid="footer" />);
      
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('custom-footer');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TableFooter ref={ref} data-testid="footer" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
    });
  });

  describe('TableRow', () => {
    it('should render with default classes', () => {
      render(<TableRow data-testid="row" />);
      
      const row = screen.getByTestId('row');
      expect(row).toHaveClass('border-b', 'transition-colors', 'hover:bg-muted/50', 'data-[state=selected]:bg-muted');
    });

    it('should apply custom className', () => {
      render(<TableRow className="custom-row" data-testid="row" />);
      
      const row = screen.getByTestId('row');
      expect(row).toHaveClass('custom-row');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TableRow ref={ref} data-testid="row" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableRowElement);
    });
  });

  describe('TableHead', () => {
    it('should render with default classes', () => {
      render(<TableHead data-testid="head" />);
      
      const head = screen.getByTestId('head');
      expect(head).toHaveClass('h-12', 'px-4', 'text-left', 'align-middle', 'font-medium', 'text-muted-foreground', '[&:has([role=checkbox])]:pr-0');
    });

    it('should apply custom className', () => {
      render(<TableHead className="custom-head" data-testid="head" />);
      
      const head = screen.getByTestId('head');
      expect(head).toHaveClass('custom-head');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TableHead ref={ref} data-testid="head" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableCellElement);
    });
  });

  describe('TableCell', () => {
    it('should render with default classes', () => {
      render(<TableCell data-testid="cell" />);
      
      const cell = screen.getByTestId('cell');
      expect(cell).toHaveClass('p-4', 'align-middle', '[&:has([role=checkbox])]:pr-0');
    });

    it('should apply custom className', () => {
      render(<TableCell className="custom-cell" data-testid="cell" />);
      
      const cell = screen.getByTestId('cell');
      expect(cell).toHaveClass('custom-cell');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TableCell ref={ref} data-testid="cell" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableCellElement);
    });
  });

  describe('TableCaption', () => {
    it('should render with default classes', () => {
      render(<TableCaption data-testid="caption" />);
      
      const caption = screen.getByTestId('caption');
      expect(caption).toHaveClass('mt-4', 'text-sm', 'text-muted-foreground');
    });

    it('should apply custom className', () => {
      render(<TableCaption className="custom-caption" data-testid="caption" />);
      
      const caption = screen.getByTestId('caption');
      expect(caption).toHaveClass('custom-caption');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<TableCaption ref={ref} data-testid="caption" />);
      
      expect(ref.current).toBeInstanceOf(HTMLTableCaptionElement);
    });
  });

  describe('Complete Table Structure', () => {
    it('should render a complete table with all components', () => {
      render(
        <Table data-testid="table">
          <TableCaption data-testid="caption">A list of your recent invoices.</TableCaption>
          <TableHeader data-testid="header">
            <TableRow data-testid="header-row">
              <TableHead data-testid="head-1">Invoice</TableHead>
              <TableHead data-testid="head-2">Status</TableHead>
              <TableHead data-testid="head-3">Method</TableHead>
              <TableHead data-testid="head-4">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid="body">
            <TableRow data-testid="body-row">
              <TableCell data-testid="cell-1">INV001</TableCell>
              <TableCell data-testid="cell-2">Paid</TableCell>
              <TableCell data-testid="cell-3">Credit Card</TableCell>
              <TableCell data-testid="cell-4">$250.00</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter data-testid="footer">
            <TableRow data-testid="footer-row">
              <TableCell data-testid="footer-cell-1" colSpan={3}>Total</TableCell>
              <TableCell data-testid="footer-cell-2">$2,500.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByTestId('table')).toBeInTheDocument();
      expect(screen.getByTestId('caption')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('body')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByTestId('header-row')).toBeInTheDocument();
      expect(screen.getByTestId('body-row')).toBeInTheDocument();
      expect(screen.getByTestId('footer-row')).toBeInTheDocument();
      expect(screen.getByTestId('head-1')).toBeInTheDocument();
      expect(screen.getByTestId('head-2')).toBeInTheDocument();
      expect(screen.getByTestId('head-3')).toBeInTheDocument();
      expect(screen.getByTestId('head-4')).toBeInTheDocument();
      expect(screen.getByTestId('cell-1')).toBeInTheDocument();
      expect(screen.getByTestId('cell-2')).toBeInTheDocument();
      expect(screen.getByTestId('cell-3')).toBeInTheDocument();
      expect(screen.getByTestId('cell-4')).toBeInTheDocument();
      expect(screen.getByTestId('footer-cell-1')).toBeInTheDocument();
      expect(screen.getByTestId('footer-cell-2')).toBeInTheDocument();
    });

    it('should render table with custom styling', () => {
      render(
        <Table className="custom-table" data-testid="table">
          <TableHeader className="custom-header" data-testid="header">
            <TableRow className="custom-header-row" data-testid="header-row">
              <TableHead className="custom-head" data-testid="head">Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="custom-body" data-testid="body">
            <TableRow className="custom-body-row" data-testid="body-row">
              <TableCell className="custom-cell" data-testid="cell">John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByTestId('table')).toHaveClass('custom-table');
      expect(screen.getByTestId('header')).toHaveClass('custom-header');
      expect(screen.getByTestId('header-row')).toHaveClass('custom-header-row');
      expect(screen.getByTestId('head')).toHaveClass('custom-head');
      expect(screen.getByTestId('body')).toHaveClass('custom-body');
      expect(screen.getByTestId('body-row')).toHaveClass('custom-body-row');
      expect(screen.getByTestId('cell')).toHaveClass('custom-cell');
    });
  });
});
