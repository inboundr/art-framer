import { renderHook, act } from '@testing-library/react';
import { useToast } from '../use-toast';

describe('useToast Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return toast function and toasts array', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.toast).toBe('function');
    expect(Array.isArray(result.current.toasts)).toBe(true);
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('should add toast when called', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({
        title: 'Success',
        description: 'Operation completed successfully',
      });
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Success',
      description: 'Operation completed successfully',
      open: true,
    });
  });

  it('should add multiple toasts (limited by TOAST_LIMIT)', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({
        title: 'First Toast',
        description: 'First message',
      });
      result.current.toast({
        title: 'Second Toast',
        description: 'Second message',
      });
    });
    
    // TOAST_LIMIT is set to 1, so only the latest toast is kept
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Second Toast',
      description: 'Second message',
    });
  });

  it('should dismiss toast', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'Test message',
      });
    });
    
    expect(result.current.toasts).toHaveLength(1);
    
    act(() => {
      result.current.dismiss(result.current.toasts[0].id);
    });
    
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should handle toast with variant', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.toast({
        title: 'Error Toast',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Error Toast',
      description: 'Something went wrong',
      variant: 'destructive',
    });
  });

  it('should handle toast with action', () => {
    const { result } = renderHook(() => useToast());
    const mockAction = { label: 'Undo', onClick: jest.fn() };
    
    act(() => {
      result.current.toast({
        title: 'Action Toast',
        description: 'Toast with action',
        action: mockAction,
      });
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Action Toast',
      description: 'Toast with action',
      action: mockAction,
    });
  });
});
