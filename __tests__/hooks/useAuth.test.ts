import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

// Mock the auth context
const mockAuthContext = {
  user: null,
  session: null,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  updateProfile: jest.fn(),
};

jest.mock('@/contexts/CentralizedAuthProvider', () => ({
  useCentralizedAuth: () => mockAuthContext,
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return auth context values', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual(mockAuthContext);
  });

  it('should provide user when authenticated', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    };

    mockAuthContext.user = mockUser;

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
  });

  it('should provide session when authenticated', () => {
    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000,
    };

    mockAuthContext.session = mockSession;

    const { result } = renderHook(() => useAuth());

    expect(result.current.session).toEqual(mockSession);
  });

  it('should handle loading state', () => {
    mockAuthContext.loading = true;

    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
  });

  it('should provide auth methods', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.resetPassword).toBe('function');
    expect(typeof result.current.updateProfile).toBe('function');
  });

  it('should handle sign in', async () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    mockAuthContext.signIn.mockResolvedValue({ user: mockAuthContext.user, session: mockAuthContext.session });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn(mockCredentials);
    });

    expect(mockAuthContext.signIn).toHaveBeenCalledWith(mockCredentials);
  });

  it('should handle sign up', async () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    mockAuthContext.signUp.mockResolvedValue({ user: mockAuthContext.user, session: mockAuthContext.session });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp(mockCredentials);
    });

    expect(mockAuthContext.signUp).toHaveBeenCalledWith(mockCredentials);
  });

  it('should handle sign out', async () => {
    mockAuthContext.signOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuthContext.signOut).toHaveBeenCalled();
  });

  it('should handle password reset', async () => {
    const email = 'test@example.com';
    mockAuthContext.resetPassword.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.resetPassword(email);
    });

    expect(mockAuthContext.resetPassword).toHaveBeenCalledWith(email);
  });

  it('should handle profile update', async () => {
    const updates = {
      full_name: 'Updated Name',
    };

    mockAuthContext.updateProfile.mockResolvedValue({ user: mockAuthContext.user });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.updateProfile(updates);
    });

    expect(mockAuthContext.updateProfile).toHaveBeenCalledWith(updates);
  });
});