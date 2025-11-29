import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder in test environment
global.TextEncoder = global.TextEncoder || class TextEncoder {
  encode(input) {
    return new Uint8Array(Buffer.from(input, 'utf8'))
  }
}

global.TextDecoder = global.TextDecoder || class TextDecoder {
  decode(input) {
    return Buffer.from(input).toString('utf8')
  }
}

// Polyfill for ReadableStream in test environment (required for LangChain/LangGraph)
if (typeof ReadableStream === 'undefined') {
  try {
    global.ReadableStream = require('stream/web').ReadableStream
  } catch (e) {
    // Fallback polyfill if stream/web is not available
    global.ReadableStream = class ReadableStream {
      constructor() {
        this.locked = false
      }
      getReader() {
        return {
          read: async () => ({ done: true, value: undefined }),
          releaseLock: () => {},
        }
      }
      cancel() {
        return Promise.resolve()
      }
    }
  }
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123'

// Mock fetch
global.fetch = jest.fn()

// Polyfill for Request in test environment
global.Request = global.Request || class Request {
  constructor(input, init = {}) {
    // Use Object.defineProperty to make url read-only like the real Request
    Object.defineProperty(this, 'url', {
      value: input,
      writable: false,
      enumerable: true,
      configurable: false
    });
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers);
    this.body = init.body;
  }
}

// Polyfill for Response in test environment
global.Response = global.Response || class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Headers(init.headers);
  }
  
  static json(data, init = {}) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      }
    });
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Suppress console warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    const message = args[0]?.toString() || ''
    if (
      message.includes('Warning: ReactDOM.render is deprecated') ||
      message.includes('Error details:') ||
      message.includes('Session retrieval failed') ||
      message.includes('Shipping calculation failed') ||
      message.includes('Error fetching Prodigi') ||
      message.includes('Failed to fetch product') ||
      message.includes('Error in POST /api/cart') ||
      message.includes('Error in GET /api/orders') ||
      message.includes('Error in GET /api/cart') ||
      message.includes('Error in health check') ||
      message.includes('Error calculating shipping cost') ||
      message.includes('Error creating checkout session') ||
      message.includes('Error in GET /api/products') ||
      message.includes('Error in GET /api/products/[id]') ||
      message.includes('Error processing webhook') ||
      message.includes('Error processing Prodigi CloudEvent') ||
      message.includes('Error saving image') ||
      message.includes('Prodigi test error') ||
      message.includes('cookies was called outside a request scope') ||
      message.includes('request.json is not a function') ||
      message.includes('request.text is not a function')
    ) {
      return
    }
    if (originalError && typeof originalError.call === 'function') {
      originalError.call(console, ...args)
    }
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test to prevent test interference
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks()
  
  // Reset fetch mock
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear()
  }
  
  // Clear localStorage and sessionStorage
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }
})
