// Constants
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
  "openid",
  "profile",
  "email",
] as const;

export const GOOGLE_OAUTH_URLS = {
  AUTH: "https://accounts.google.com/o/oauth2/v2/auth",
  TOKEN: "https://oauth2.googleapis.com/token",
  REVOKE: "https://oauth2.googleapis.com/revoke",
  USERINFO: "https://www.googleapis.com/oauth2/v2/userinfo",
} as const;
