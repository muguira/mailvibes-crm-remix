// Google Services - Gmail OAuth2 Integration
export * from "./pkceService";
export * from "./tokenService";
export * from "./authService";

// Re-export commonly used functions with cleaner names
export {
  generatePKCEParams as generatePKCE,
  validateCodeChallenge as validatePKCE,
  isPKCESupported as supportsPKCE,
} from "./pkceService";

export {
  saveTokens as saveGmailTokens,
  getValidToken as getGmailToken,
  getConnectedAccounts as getGmailAccounts,
  hasConnectedAccounts as hasGmailAccounts,
} from "./tokenService";

export {
  initiateOAuthFlow as startGmailAuth,
  handleOAuthCallback as completeGmailAuth,
  disconnectGmailAccount as disconnectGmail,
  validateOAuthConfig as validateGmailConfig,
} from "./authService";
