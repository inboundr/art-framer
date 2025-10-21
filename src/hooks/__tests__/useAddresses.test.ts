import { renderHook, act } from '@testing-library/react';
import { useAddresses, SavedAddress } from '../useAddresses';

// Mock useAuth
jest.mock('../useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useAddresses', () => {
  const mockUseAuth = jest.requireMock('../useAuth').useAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with empty addresses', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useAddresses());

    expect(result.current.addresses).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should load addresses from localStorage when user is present', () => {
    const mockUser = { id: 'user-123' };
    const mockAddresses: SavedAddress[] = [
      {
        id: 'addr-1',
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
        phone: '555-1234',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockUseAuth.mockReturnValue({ user: mockUser });
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAddresses));

    const { result } = renderHook(() => useAddresses());

    expect(result.current.addresses).toEqual(mockAddresses);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('addresses_user-123');
  });

  it('should handle invalid JSON in localStorage', () => {
    const mockUser = { id: 'user-123' };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockUseAuth.mockReturnValue({ user: mockUser });
    localStorageMock.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => useAddresses());

    expect(result.current.addresses).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith('Error loading saved addresses:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should save new address', () => {
    const mockUser = { id: 'user-123' };
    mockUseAuth.mockReturnValue({ user: mockUser });

    const { result } = renderHook(() => useAddresses());

    const newAddress = {
      firstName: 'Jane',
      lastName: 'Smith',
      address1: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90210',
      country: 'US',
      phone: '555-5678',
    };

    act(() => {
      result.current.saveAddress(newAddress);
    });

    expect(result.current.addresses).toHaveLength(1);
    expect(result.current.addresses[0]).toMatchObject(newAddress);
    expect(result.current.addresses[0].id).toBeDefined();
    expect(result.current.addresses[0].createdAt).toBeDefined();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'addresses_user-123',
      JSON.stringify(result.current.addresses)
    );
  });

  it('should not save address when user is not present', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useAddresses());

    const newAddress = {
      firstName: 'Jane',
      lastName: 'Smith',
      address1: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90210',
      country: 'US',
      phone: '555-5678',
    };

    act(() => {
      result.current.saveAddress(newAddress);
    });

    expect(result.current.addresses).toEqual([]);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should update existing address', () => {
    const mockUser = { id: 'user-123' };
    const existingAddress: SavedAddress = {
      id: 'addr-1',
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
      phone: '555-1234',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockUseAuth.mockReturnValue({ user: mockUser });
    localStorageMock.getItem.mockReturnValue(JSON.stringify([existingAddress]));

    const { result } = renderHook(() => useAddresses());

    act(() => {
      result.current.updateAddress('addr-1', { firstName: 'Johnny' });
    });

    expect(result.current.addresses[0].firstName).toBe('Johnny');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should delete address', () => {
    const mockUser = { id: 'user-123' };
    const existingAddress: SavedAddress = {
      id: 'addr-1',
      firstName: 'John',
      lastName: 'Doe',
      address1: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
      phone: '555-1234',
      createdAt: '2024-01-01T00:00:00Z',
    };

    mockUseAuth.mockReturnValue({ user: mockUser });
    localStorageMock.getItem.mockReturnValue(JSON.stringify([existingAddress]));

    const { result } = renderHook(() => useAddresses());

    act(() => {
      result.current.deleteAddress('addr-1');
    });

    expect(result.current.addresses).toEqual([]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'addresses_user-123',
      JSON.stringify([])
    );
  });

  it('should get default address', () => {
    const mockUser = { id: 'user-123' };
    const addresses: SavedAddress[] = [
      {
        id: 'addr-1',
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
        phone: '555-1234',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'addr-2',
        firstName: 'Jane',
        lastName: 'Smith',
        address1: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90210',
        country: 'US',
        phone: '555-5678',
        isDefault: true,
        createdAt: '2024-01-02T00:00:00Z',
      },
    ];

    mockUseAuth.mockReturnValue({ user: mockUser });
    localStorageMock.getItem.mockReturnValue(JSON.stringify(addresses));

    const { result } = renderHook(() => useAddresses());

    const defaultAddress = result.current.getDefaultAddress();
    expect(defaultAddress).toEqual(addresses[1]); // The one with isDefault: true
  });

  it('should return first address when no default is set', () => {
    const mockUser = { id: 'user-123' };
    const addresses: SavedAddress[] = [
      {
        id: 'addr-1',
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
        phone: '555-1234',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockUseAuth.mockReturnValue({ user: mockUser });
    localStorageMock.getItem.mockReturnValue(JSON.stringify(addresses));

    const { result } = renderHook(() => useAddresses());

    const defaultAddress = result.current.getDefaultAddress();
    expect(defaultAddress).toEqual(addresses[0]);
  });

  it('should return null when no addresses exist', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

    const { result } = renderHook(() => useAddresses());

    const defaultAddress = result.current.getDefaultAddress();
    expect(defaultAddress).toBeNull();
  });

  it('should not perform operations when user is not present', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useAddresses());

    act(() => {
      result.current.updateAddress('addr-1', { firstName: 'Johnny' });
      result.current.deleteAddress('addr-1');
    });

    expect(result.current.addresses).toEqual([]);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});
