// Organization Management Types

export interface Organization {
  id: string
  name: string
  domain: string
  created_at: string
  updated_at: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  member_count: number
  max_members: number
}

export interface OrganizationMember {
  id: string
  user_id: string
  organization_id: string
  role: 'admin' | 'user'
  status: 'active' | 'pending' | 'deactivated'
  invited_by: string | null
  joined_at?: string | null // Made optional since column doesn't exist in DB
  created_at: string
  updated_at: string
  // User details (from profile/auth)
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    avatar_url?: string
    initials: string
  }
}

export interface OrganizationInvitation {
  id: string
  organization_id: string
  email: string
  role: 'admin' | 'user'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  updated_at: string
  token?: string // Added for invitation link
  message?: string // Personal message from inviter
  // Invited by user details
  inviter: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}

export interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string
  current_organization_id: string | null
  created_at: string
  updated_at: string
  initials: string
}

// API Response Types
export interface OrganizationWithMembers extends Organization {
  members: OrganizationMember[]
  pending_invitations: OrganizationInvitation[]
}

// Form Types
export interface InviteUserForm {
  emails: string[]
  role: 'admin' | 'user'
  message?: string
}

export interface UpdateMemberRoleForm {
  member_id: string
  role: 'admin' | 'user'
}

// State Types
export interface OrganizationState {
  currentOrganization: Organization | null
  members: OrganizationMember[]
  invitations: OrganizationInvitation[]
  loading: boolean
  error: string | null
}

// Action Types for mock API
export type OrganizationAction =
  | { type: 'LOAD_ORGANIZATION_START' }
  | { type: 'LOAD_ORGANIZATION_SUCCESS'; payload: OrganizationWithMembers }
  | { type: 'LOAD_ORGANIZATION_ERROR'; payload: string }
  | { type: 'INVITE_USERS_START' }
  | { type: 'INVITE_USERS_SUCCESS'; payload: OrganizationInvitation[] }
  | { type: 'INVITE_USERS_ERROR'; payload: string }
  | { type: 'UPDATE_MEMBER_ROLE_SUCCESS'; payload: OrganizationMember }
  | { type: 'REMOVE_MEMBER_SUCCESS'; payload: string }
  | { type: 'RESEND_INVITATION_SUCCESS'; payload: OrganizationInvitation }
  | { type: 'CANCEL_INVITATION_SUCCESS'; payload: string }
