import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInstantContacts } from './use-instant-contacts';
import { useContactsStore } from '@/stores/contactsStore';

// Mock the dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } })
}));

vi.mock('@/stores/contactsStore');
vi.mock('@/components/stream/sample-data', () => ({
  mockContactsById: {}
}));

describe('useInstantContacts', () => {
  it('should filter contacts by name (case-insensitive)', () => {
    // Mock the store state
    const mockCache = {
      '1': { id: '1', name: 'Maria Smith', email: 'maria@example.com', company: 'ABC Corp', phone: '123-456-7890' },
      '2': { id: '2', name: 'John Doe', email: 'john@example.com', company: 'XYZ Inc', phone: '098-765-4321' },
      '3': { id: '3', name: 'MARIA JONES', email: 'mjones@example.com', company: 'Tech Co', phone: '555-555-5555' }
    };
    
    const mockOrderedIds = ['1', '2', '3'];
    
    (useContactsStore as any).mockReturnValue({
      cache: mockCache,
      orderedIds: mockOrderedIds,
      loading: false,
      hasMore: false,
      totalCount: 3,
      loadedCount: 3,
      fetchNext: vi.fn(),
      initialize: vi.fn()
    });
    
    const { result } = renderHook(() => 
      useInstantContacts({
        searchTerm: 'maria',
        pageSize: 10,
        currentPage: 1
      })
    );
    
    // Should find both Maria Smith and MARIA JONES (case-insensitive)
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows[0].name).toBe('Maria Smith');
    expect(result.current.rows[1].name).toBe('MARIA JONES');
    expect(result.current.totalCount).toBe(2);
  });
  
  it('should filter contacts by email', () => {
    const mockCache = {
      '1': { id: '1', name: 'Test User', email: 'test@example.com', company: 'ABC Corp', phone: '123-456-7890' },
      '2': { id: '2', name: 'Another User', email: 'another@example.com', company: 'XYZ Inc', phone: '098-765-4321' },
      '3': { id: '3', name: 'Third User', email: 'third@different.com', company: 'Tech Co', phone: '555-555-5555' }
    };
    
    const mockOrderedIds = ['1', '2', '3'];
    
    (useContactsStore as any).mockReturnValue({
      cache: mockCache,
      orderedIds: mockOrderedIds,
      loading: false,
      hasMore: false,
      totalCount: 3,
      loadedCount: 3,
      fetchNext: vi.fn(),
      initialize: vi.fn()
    });
    
    const { result } = renderHook(() => 
      useInstantContacts({
        searchTerm: 'example.com',
        pageSize: 10,
        currentPage: 1
      })
    );
    
    // Should find contacts with example.com in email
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
  });
  
  it('should paginate filtered results', () => {
    const mockCache: Record<string, any> = {};
    const mockOrderedIds: string[] = [];
    
    // Create 25 contacts
    for (let i = 1; i <= 25; i++) {
      const id = i.toString();
      mockCache[id] = {
        id,
        name: `Contact ${i}`,
        email: `contact${i}@example.com`,
        company: 'Test Corp',
        phone: '555-0000'
      };
      mockOrderedIds.push(id);
    }
    
    (useContactsStore as any).mockReturnValue({
      cache: mockCache,
      orderedIds: mockOrderedIds,
      loading: false,
      hasMore: false,
      totalCount: 25,
      loadedCount: 25,
      fetchNext: vi.fn(),
      initialize: vi.fn()
    });
    
    // First page with page size 10
    const { result: page1Result } = renderHook(() => 
      useInstantContacts({
        searchTerm: '',
        pageSize: 10,
        currentPage: 1
      })
    );
    
    expect(page1Result.current.rows).toHaveLength(10);
    expect(page1Result.current.rows[0].name).toBe('Contact 1');
    expect(page1Result.current.rows[9].name).toBe('Contact 10');
    
    // Second page
    const { result: page2Result } = renderHook(() => 
      useInstantContacts({
        searchTerm: '',
        pageSize: 10,
        currentPage: 2
      })
    );
    
    expect(page2Result.current.rows).toHaveLength(10);
    expect(page2Result.current.rows[0].name).toBe('Contact 11');
    expect(page2Result.current.rows[9].name).toBe('Contact 20');
  });
}); 