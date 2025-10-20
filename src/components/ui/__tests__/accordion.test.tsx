import { render, screen, fireEvent } from '@testing-library/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../accordion';

describe('Accordion Components', () => {
  it('should render accordion with items', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should expand and collapse accordion items', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger = screen.getByText('Item 1');
    const content = screen.queryByText('Content 1');
    expect(content).toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByText('Content 1')).toBeVisible();

    fireEvent.click(trigger);
    const contentAfterCollapse = screen.queryByText('Content 1');
    expect(contentAfterCollapse).toBeNull();
  });

  it('should support multiple accordion type', () => {
    render(
      <Accordion type="multiple">
        <AccordionItem value="item-1">
          <AccordionTrigger>Item 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Item 2</AccordionTrigger>
          <AccordionContent>Content 2</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger1 = screen.getByText('Item 1');
    const trigger2 = screen.getByText('Item 2');

    fireEvent.click(trigger1);
    fireEvent.click(trigger2);

    expect(screen.getByText('Content 1')).toBeVisible();
    expect(screen.getByText('Content 2')).toBeVisible();
  });

  it('should handle disabled accordion items', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" disabled>
          <AccordionTrigger>Disabled Item</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger = screen.getByText('Disabled Item');
    expect(trigger).toBeDisabled();
  });
});
