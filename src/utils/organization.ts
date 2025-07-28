/**
 * Organization utility functions
 * Used by organization-related components for validation and formatting
 */

/**
 * Validate domain format
 */
export const isValidDomain = (domain: string): boolean => {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
};

/**
 * Extract domain from email address
 */
export const getEmailDomain = (email: string): string => {
  return email.split('@')[1]?.toLowerCase() || '';
};

/**
 * Generate initials from first and last name
 */
export const generateInitials = (firstName: string, lastName: string): string => {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  
  if (!first && !last) return '?';
  if (!last) return first.charAt(0).toUpperCase();
  
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
};

/**
 * Generate initials from full name
 */
export const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format organization member count display
 */
export const formatMemberCount = (current: number, max: number): string => {
  return `${current} / ${max} members`;
};

/**
 * Calculate organization capacity percentage
 */
export const calculateCapacityPercentage = (current: number, max: number): number => {
  return Math.round((current / max) * 100);
};

/**
 * Check if organization has capacity for new members
 */
export const hasCapacityForNewMembers = (current: number, max: number): boolean => {
  return current < max;
};

/**
 * Format organization plan display name
 */
export const formatPlanName = (plan: string): string => {
  switch (plan.toLowerCase()) {
    case 'free':
      return 'Free Plan';
    case 'starter':
      return 'Starter Plan';
    case 'pro':
      return 'Pro Plan';
    case 'enterprise':
      return 'Enterprise Plan';
    default:
      return plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
  }
}; 