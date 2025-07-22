import { 
  Organization, 
  OrganizationMember, 
  OrganizationInvitation, 
  UserProfile,
  OrganizationWithMembers 
} from '@/types/organization';

// Helper function to generate initials
const generateInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

// Helper function to create dates
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const hoursAgo = (hours: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

// Mock Organization
export const mockOrganization: Organization = {
  id: "org_1",
  name: "Mailvibes CRM",
  domain: "salessheet.com",
  created_at: daysAgo(90),
  updated_at: daysAgo(1),
  plan: "pro",
  member_count: 4,
  max_members: 25
};

// Mock Current User Profile
export const mockCurrentUser: UserProfile = {
  id: "user_1",
  email: "andres@salessheet.com",
  first_name: "Andres",
  last_name: "Rodriguez",
  avatar_url: undefined,
  current_organization_id: "org_1",
  created_at: daysAgo(90),
  updated_at: daysAgo(5),
  initials: generateInitials("Andres", "Rodriguez")
};

// Mock Organization Members
export const mockMembers: OrganizationMember[] = [
  {
    id: "member_1",
    user_id: "user_1",
    organization_id: "org_1",
    role: "admin",
    status: "active",
    invited_by: null, // Founder
    joined_at: daysAgo(90),
    created_at: daysAgo(90),
    updated_at: daysAgo(90),
    user: {
      id: "user_1",
      email: "andres@salessheet.com",
      first_name: "Andres",
      last_name: "Rodriguez",
      avatar_url: undefined,
      initials: generateInitials("Andres", "Rodriguez")
    }
  },
  {
    id: "member_2",
    user_id: "user_2",
    organization_id: "org_1",
    role: "admin",
    status: "active",
    invited_by: "user_1",
    joined_at: daysAgo(45),
    created_at: daysAgo(47),
    updated_at: daysAgo(20),
    user: {
      id: "user_2",
      email: "sarah.chen@salessheet.com",
      first_name: "Sarah",
      last_name: "Chen",
      avatar_url: undefined,
      initials: generateInitials("Sarah", "Chen")
    }
  },
  {
    id: "member_3",
    user_id: "user_3",
    organization_id: "org_1",
    role: "user",
    status: "active",
    invited_by: "user_1",
    joined_at: daysAgo(30),
    created_at: daysAgo(32),
    updated_at: daysAgo(30),
    user: {
      id: "user_3",
      email: "mike.johnson@salessheet.com",
      first_name: "Mike",
      last_name: "Johnson",
      avatar_url: undefined,
      initials: generateInitials("Mike", "Johnson")
    }
  },
  {
    id: "member_4",
    user_id: "user_4",
    organization_id: "org_1",
    role: "user",
    status: "active",
    invited_by: "user_2",
    joined_at: daysAgo(15),
    created_at: daysAgo(17),
    updated_at: daysAgo(15),
    user: {
      id: "user_4",
      email: "emma.davis@salessheet.com",
      first_name: "Emma",
      last_name: "Davis",
      avatar_url: undefined,
      initials: generateInitials("Emma", "Davis")
    }
  }
];

// Mock Pending Invitations
export const mockInvitations: OrganizationInvitation[] = [
  {
    id: "invitation_1",
    organization_id: "org_1",
    email: "james.wilson@example.com",
    role: "user",
    status: "pending",
    invited_by: "user_1",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    accepted_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
    inviter: {
      id: "user_1",
      email: "andres@salessheet.com",
      first_name: "Andres",
      last_name: "Rodriguez"
    }
  },
  {
    id: "invitation_2",
    organization_id: "org_1",
    email: "lisa.martinez@example.com",
    role: "admin",
    status: "pending",
    invited_by: "user_2",
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    accepted_at: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    inviter: {
      id: "user_2",
      email: "sarah.chen@salessheet.com",
      first_name: "Sarah",
      last_name: "Chen"
    }
  }
];

// Mock complete organization data
export const mockOrganizationWithMembers: OrganizationWithMembers = {
  ...mockOrganization,
  members: mockMembers,
  pending_invitations: mockInvitations
};

// Mock API simulation delays
export const MOCK_API_DELAYS = {
  fast: 300,    // Quick operations like role changes
  medium: 800,  // Loading data
  slow: 1500    // Sending invitations
};

// Mock API Responses
export const mockApiResponses = {
  success: {
    invite: {
      message: "Invitations sent successfully",
      data: mockInvitations
    },
    updateRole: {
      message: "User role updated successfully"
    },
    removeMember: {
      message: "User removed from organization"
    }
  },
  errors: {
    network: "Network error. Please try again.",
    unauthorized: "You don't have permission to perform this action.",
    validation: "Please check your input and try again.",
    rateLimit: "Too many requests. Please wait before trying again.",
    serverError: "Something went wrong. Please try again later."
  }
};

// Utility functions for mock data manipulation
export const mockHelpers = {
  // Generate a new mock invitation
  createMockInvitation: (
    email: string, 
    role: 'admin' | 'user', 
    invitedBy: string
  ): OrganizationInvitation => {
    const inviter = mockMembers.find(m => m.user_id === invitedBy)?.user;
    return {
      id: `invitation_${Date.now()}`,
      organization_id: "org_1",
      email,
      role,
      status: "pending",
      invited_by: invitedBy,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      accepted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      inviter: {
        id: invitedBy,
        email: inviter?.email || "",
        first_name: inviter?.first_name || "",
        last_name: inviter?.last_name || ""
      }
    };
  },

  // Find member by ID
  findMemberById: (memberId: string): OrganizationMember | undefined => {
    return mockMembers.find(m => m.id === memberId);
  },

  // Check if email is already invited or member
  isEmailTaken: (email: string): boolean => {
    const isMember = mockMembers.some(m => m.user.email === email);
    const hasInvitation = mockInvitations.some(i => i.email === email && i.status === 'pending');
    return isMember || hasInvitation;
  },

  // Get user's permissions
  getUserPermissions: (userId: string) => {
    const member = mockMembers.find(m => m.user_id === userId);
    return {
      canInviteUsers: member?.role === 'admin',
      canManageRoles: member?.role === 'admin',
      canRemoveMembers: member?.role === 'admin',
      isCurrentUser: userId === mockCurrentUser.id
    };
  }
};

// Export all mock data as default
export default {
  organization: mockOrganization,
  currentUser: mockCurrentUser,
  members: mockMembers,
  invitations: mockInvitations,
  organizationWithMembers: mockOrganizationWithMembers,
  apiDelays: MOCK_API_DELAYS,
  apiResponses: mockApiResponses,
  helpers: mockHelpers
}; 