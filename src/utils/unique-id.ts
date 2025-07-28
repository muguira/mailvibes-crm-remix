/**
 * Generate a unique identifier for auto-created organizations
 * Combines timestamp and random string for uniqueness
 */
export const generateUniqueId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomNum = Math.random().toString(36).substr(2, 5);
  return `${timestamp}${randomNum}`.toUpperCase();
};

/**
 * Generate a user-friendly organization name from email domain
 * e.g., "tudashboard.com" -> "TuDashboard"
 */
export const generateOrgNameFromDomain = (domain: string): string => {
  return domain
    .split('.')[0] // Remove .com/.net etc
    .split('-')
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
};

/**
 * Generate a fallback organization name for auto-creation
 */
export const generateAutoOrgName = (): string => {
  const uniqueId = generateUniqueId();
  return `Workspace-${uniqueId}`;
}; 