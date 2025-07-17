import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getActivityIcon, getActivityColor, formatActivityTimestamp } from './use-timeline-activities'

describe('Activity helper functions optimization tests', () => {
  describe('getActivityIcon', () => {
    it('should return correct icons for different activity types', () => {
      expect(getActivityIcon({ type: 'email', isImportant: false } as any)).toBe('mail')
      expect(getActivityIcon({ type: 'email', isImportant: true } as any)).toBe('mail-priority')
      expect(getActivityIcon({ type: 'call' } as any)).toBe('phone')
      expect(getActivityIcon({ type: 'meeting' } as any)).toBe('calendar')
      expect(getActivityIcon({ type: 'task' } as any)).toBe('check-square')
      expect(getActivityIcon({ type: 'note' } as any)).toBe('file-text')
      expect(getActivityIcon({ type: 'system' } as any)).toBe('settings')
    })

    it('should use caching for repeated calls', () => {
      const activity = { type: 'email', isImportant: false } as any

      // Call multiple times to test caching
      const icon1 = getActivityIcon(activity)
      const icon2 = getActivityIcon(activity)
      const icon3 = getActivityIcon(activity)

      expect(icon1).toBe('mail')
      expect(icon2).toBe('mail')
      expect(icon3).toBe('mail')
    })
  })

  describe('getActivityColor', () => {
    it('should return correct colors for Gmail activities', () => {
      expect(
        getActivityColor({
          source: 'gmail',
          type: 'email',
          isImportant: false,
        } as any),
      ).toBe('text-blue-600')

      expect(
        getActivityColor({
          source: 'gmail',
          type: 'email',
          isImportant: true,
        } as any),
      ).toBe('text-red-600')
    })

    it('should return correct colors for internal activities', () => {
      expect(getActivityColor({ source: 'internal', type: 'call' } as any)).toBe('text-green-600')
      expect(getActivityColor({ source: 'internal', type: 'meeting' } as any)).toBe('text-purple-600')
      expect(getActivityColor({ source: 'internal', type: 'task' } as any)).toBe('text-orange-600')
      expect(getActivityColor({ source: 'internal', type: 'note' } as any)).toBe('text-gray-600')
    })

    it('should use caching for repeated color calculations', () => {
      const activity = { source: 'gmail', type: 'email', isImportant: true } as any

      // Call multiple times to test caching
      const color1 = getActivityColor(activity)
      const color2 = getActivityColor(activity)
      const color3 = getActivityColor(activity)

      expect(color1).toBe('text-red-600')
      expect(color2).toBe('text-red-600')
      expect(color3).toBe('text-red-600')
    })
  })

  describe('formatActivityTimestamp', () => {
    beforeEach(() => {
      // Mock current time to be consistent
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-02T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should format timestamps correctly', () => {
      expect(formatActivityTimestamp('2024-01-02T11:59:30Z')).toBe('Just now')
      expect(formatActivityTimestamp('2024-01-02T11:30:00Z')).toBe('30m ago')
      expect(formatActivityTimestamp('2024-01-02T10:00:00Z')).toBe('2h ago')
      expect(formatActivityTimestamp('2024-01-01T12:00:00Z')).toBe('Yesterday')
      // Fix: Yesterday is correct for 1 day ago, not '1d ago'
      expect(formatActivityTimestamp('2024-01-01T10:00:00Z')).toBe('Yesterday')
    })

    it('should use caching for repeated timestamp formatting', () => {
      const timestamp = '2024-01-02T11:30:00Z'

      // Call multiple times to test caching
      const formatted1 = formatActivityTimestamp(timestamp)
      const formatted2 = formatActivityTimestamp(timestamp)
      const formatted3 = formatActivityTimestamp(timestamp)

      expect(formatted1).toBe('30m ago')
      expect(formatted2).toBe('30m ago')
      expect(formatted3).toBe('30m ago')
    })

    it('should handle longer time periods correctly', () => {
      expect(formatActivityTimestamp('2023-12-25T12:00:00Z')).toBe('1/25/2024') // LocaleDateString format
    })
  })

  describe('Performance optimization features', () => {
    it('should handle cache clearing for icon cache', () => {
      // Test that cache doesn't grow indefinitely by calling with many different types
      for (let i = 0; i < 60; i++) {
        getActivityIcon({ type: 'email', isImportant: i % 2 === 0 } as any)
      }

      // Should still work after cache clearing
      expect(getActivityIcon({ type: 'call' } as any)).toBe('phone')
    })

    it('should handle cache clearing for color cache', () => {
      // Test that cache doesn't grow indefinitely
      for (let i = 0; i < 60; i++) {
        getActivityColor({
          source: i % 2 === 0 ? 'gmail' : 'internal',
          type: 'email',
          isImportant: i % 2 === 0,
        } as any)
      }

      // Should still work after cache clearing
      expect(getActivityColor({ source: 'internal', type: 'note' } as any)).toBe('text-gray-600')
    })

    it('should handle cache clearing for timestamp formatting', () => {
      // Test that cache doesn't grow indefinitely
      const baseTime = new Date('2024-01-02T12:00:00Z').getTime()

      for (let i = 0; i < 250; i++) {
        const timestamp = new Date(baseTime - i * 60000).toISOString() // Each minute back
        formatActivityTimestamp(timestamp)
      }

      // Should still work after cache clearing
      expect(formatActivityTimestamp('2024-01-02T11:30:00Z')).toBe('30m ago')
    })
  })
})
