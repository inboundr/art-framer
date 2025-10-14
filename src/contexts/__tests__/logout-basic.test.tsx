import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LazyAuthProvider, useLazyAuth } from '../LazyAuthProvider';
import { supabase } from '../../lib/supabase/client';

// Mock Supabase client
jest.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}));

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: 'supabase-auth-token=test-token; other-cookie=value'
});

describe('Logout Functionality - Basic Tests', () => {
  const mockSupabaseSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.signOut as jest.Mock).mockImplementation(mockSupabaseSignOut);
    
    // Reset storage mocks
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
  });

  const TestComponent = () => {
    const { signOut, user, profile, session } = useLazyAuth();
    const [result, setResult] = React.useState(null);
    const [state, setState] = React.useState({ user, profile, session });
    
    React.useEffect(() => {
      setState({ user, profile, session });
    }, [user, profile, session]);
    
    const handleLogout = async () => {
      const res = await signOut();
      setResult(res);
    };

    return (
      <div>
        <button onClick={handleLogout}>Logout</button>
        {result && <div data-testid="result">{JSON.stringify(result)}</div>}
        <div data-testid="user">{JSON.stringify(state.user)}</div>
        <div data-testid="profile">{JSON.stringify(state.profile)}</div>
        <div data-testid="session">{JSON.stringify(state.session)}</div>
      </div>
    );
  };

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <LazyAuthProvider>
      {children}
    </LazyAuthProvider>
  );

  describe('Basic Logout Functionality', () => {
    it('should call Supabase signOut when logout is triggered', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      mockSupabaseSignOut.mockResolvedValue({ error: null });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockSupabaseSignOut).toHaveBeenCalledWith({ scope: 'local' });
      });
    });

    it('should handle successful logout', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      mockSupabaseSignOut.mockResolvedValue({ error: null });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('{"error":null}');
      });
    });

    it('should clear localStorage items on logout', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      mockSupabaseSignOut.mockResolvedValue({ error: null });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        const expectedKeys = [
          'art-framer-welcome-seen',
          'pending-generation',
          'supabase.auth.token',
          'sb-access-token',
          'sb-refresh-token',
          'supabase.auth.refresh_token'
        ];

        expectedKeys.forEach(key => {
          expect(localStorageMock.removeItem).toHaveBeenCalledWith(key);
          expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(key);
        });
      });
    });

    it('should handle logout errors gracefully', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const logoutError = new Error('Logout failed');
      mockSupabaseSignOut.mockResolvedValue({ error: logoutError });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('{"error":null}');
      });
    });

    it('should handle network errors during logout', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      mockSupabaseSignOut.mockRejectedValue(new Error('Network error'));

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('{"error":null}');
      });
    });
  });

  describe('Logout State Management', () => {
    it('should clear user state on logout', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      mockSupabaseSignOut.mockResolvedValue({ error: null });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('profile')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
      });
    });
  });

  describe('Logout Edge Cases', () => {
    it('should handle multiple rapid logout attempts', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      mockSupabaseSignOut.mockResolvedValue({ error: null });

      const logoutButton = screen.getByText('Logout');
      
      // Click multiple times rapidly
      fireEvent.click(logoutButton);
      fireEvent.click(logoutButton);
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockSupabaseSignOut).toHaveBeenCalledTimes(3);
      });
    });

    it('should handle logout when Supabase is unavailable', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Mock Supabase to throw error
      (supabase.auth.signOut as jest.Mock).mockImplementation(() => {
        throw new Error('Supabase unavailable');
      });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('{"error":null}');
      });
    });

    it('should clear state even if localStorage operations fail', async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Mock localStorage to throw errors
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      mockSupabaseSignOut.mockResolvedValue({ error: null });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('{"error":null}');
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('profile')).toHaveTextContent('null');
        expect(screen.getByTestId('session')).toHaveTextContent('null');
      });
    });
  });
});
