
// URL validation utility
export const isValidUrl = (url: string): boolean => {
  // Simple validation for common URL patterns
  const urlPatterns = [
    /^https?:\/\//i, // Starts with http:// or https://
    /\.(com|io|org|net|dev|co|app|ai)($|\/)/i, // Common TLDs
    /^www\./i // Starts with www.
  ];
  
  return urlPatterns.some(pattern => pattern.test(url));
};

// Format URL with proper protocol
export const formatUrl = (url: string): string => {
  if (!url) return url;
  
  // If it doesn't have a protocol but looks like a domain, add https://
  if (!url.match(/^https?:\/\//i) && (url.includes('.') || url.startsWith('www.'))) {
    return `https://${url}`;
  }
  
  return url;
};

// Generate a unique key/slug for new columns
export const generateSlug = (): string => {
  return `col-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};
