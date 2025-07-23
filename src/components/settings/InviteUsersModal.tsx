import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Mail, Users, AlertCircle, Check, Plus, Keyboard } from 'lucide-react';
import { InviteUserForm } from '@/types/organization';
import organizationMocks from '@/mocks/organizationMocks';

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (formData: InviteUserForm) => Promise<void>;
  loading?: boolean;
}

export const InviteUsersModal: React.FC<InviteUsersModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  loading = false
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{
    emails?: string;
    general?: string;
  }>({});

  const { helpers } = organizationMocks;

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Check if current input is a valid email that can be added
  const canAddCurrentEmail = (): boolean => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    return trimmedEmail && 
           isValidEmail(trimmedEmail) && 
           !emails.includes(trimmedEmail) && 
           !helpers.isEmailTaken(trimmedEmail);
  };

  // Handle adding emails
  const handleAddEmail = () => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    
    if (!trimmedEmail) return;

    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      setErrors({ emails: 'Please enter a valid email address' });
      return;
    }

    // Check if email already exists in organization or invitations
    if (helpers.isEmailTaken(trimmedEmail)) {
      setErrors({ emails: 'This email is already a member or has a pending invitation' });
      return;
    }

    // Check if email already in current list
    if (emails.includes(trimmedEmail)) {
      setErrors({ emails: 'This email is already in the list' });
      return;
    }

    // Add email to list
    setEmails(prev => [...prev, trimmedEmail]);
    setEmailInput('');
    setErrors({});
  };

  // Handle removing emails
  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(prev => prev.filter(email => email !== emailToRemove));
    setErrors({});
  };

  // Handle input key press
  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  // Handle paste (for multiple emails)
  const handleEmailPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedEmails = pastedText
      .split(/[,;\s\n]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email && isValidEmail(email));

    const newEmails = pastedEmails.filter(email => 
      !emails.includes(email) && !helpers.isEmailTaken(email)
    );

    if (newEmails.length > 0) {
      setEmails(prev => [...prev, ...newEmails]);
      setEmailInput('');
      setErrors({});
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    // If there's a valid email in the input, add it first
    if (canAddCurrentEmail()) {
      handleAddEmail();
      
      // Use requestAnimationFrame instead of setTimeout for better performance
      // and to avoid conflicts with other timeouts
      requestAnimationFrame(async () => {
        // After adding the email, proceed with the actual submission
        const currentEmails = [...emails, emailInput.trim().toLowerCase()];
        
          try {
            await onInvite({
            emails: currentEmails,
              role,
              message: message.trim() || undefined
            });
            
            // Reset form
            setEmails([]);
          setEmailInput('');
          setMessage('');
            setRole('user');
            setErrors({});
            onClose();
          } catch (error) {
            setErrors({ general: 'Failed to send invitations. Please try again.' });
          }
      });
      return;
    }

    if (emails.length === 0) {
      setErrors({ emails: 'Please add at least one email address' });
      return;
    }

    try {
      await onInvite({
        emails,
        role,
        message: message.trim() || undefined
      });
      
      // Reset form
      setEmails([]);
      setEmailInput('');
      setMessage('');
      setRole('user');
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ general: 'Failed to send invitations. Please try again.' });
    }
  };

  // Reset form when modal closes
  const handleClose = () => {
    setEmails([]);
    setEmailInput('');
    setMessage('');
    setRole('user');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-5 h-5 text-[#00A991]" />
            Invite Users
          </DialogTitle>
          <DialogDescription>
            Invite team members to join your organization. They will receive an email with instructions to join.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Input Section */}
          <div className="space-y-2">
            <Label htmlFor="email-input" className="text-sm font-medium">
              Email Addresses <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  id="email-input"
                  type="email"
                  placeholder="Type email address and press Enter to add..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleEmailKeyPress}
                  onPaste={handleEmailPaste}
                  className={`pr-20 ${errors.emails ? 'border-red-300 focus:border-red-500' : canAddCurrentEmail() ? 'border-[#00A991] focus:border-[#00A991]' : ''}`}
                />
                {canAddCurrentEmail() && (
                  <Button
                    type="button"
                    onClick={handleAddEmail}
                    size="sm"
                    className="absolute right-1 top-1 h-8 px-3 bg-[#00A991] hover:bg-[#008A7A] text-white text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                )}
              </div>
              
              {/* Helpful instruction text */}
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-500 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Keyboard className="w-3 h-3" />
                    <span>Press</span>
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Enter</kbd>
                    <span>or</span>
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">,</kbd>
                    <span>to add</span>
                  </div>
                </div>
                <div className="text-[#00A991] font-medium">
                  {emails.length > 0 ? `${emails.length} email${emails.length === 1 ? '' : 's'} added` : 'Paste multiple emails separated by commas'}
                </div>
              </div>
              
              {/* Email Tags */}
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border">
                  {emails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1 bg-[#00A991]/10 text-[#00A991] border-[#00A991]/20"
                    >
                      <Check className="w-3 h-3" />
                      {email}
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 hover:text-red-600 transition-colors"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {errors.emails && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {errors.emails}
                </div>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role-select" className="text-sm font-medium">
              Role
            </Label>
            <Select value={role} onValueChange={(value: 'admin' | 'user') => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <div>
                      <div className="font-medium">User</div>
                      <div className="text-xs text-gray-500">Can view and edit data</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-gray-500">Full access to organization settings</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Welcome Message <span className="text-gray-500">(optional)</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to your invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Summary */}
          {emails.length > 0 && (
            <div className="p-4 bg-[#E8F5F3] rounded-lg border border-[#00A991]/20">
              <div className="flex items-center gap-2 text-sm text-[#00A991] font-medium">
                <Users className="w-4 h-4" />
                Invitation Summary
              </div>
              <div className="mt-2 text-sm text-gray-700">
                {emails.length} user{emails.length === 1 ? '' : 's'} will be invited as{' '}
                <span className="font-medium">
                  {role === 'admin' ? 'Admin' : 'User'}
                </span>
                {emails.length === 1 ? '' : 's'}
              </div>
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {errors.general}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Invitations will expire in 7 days
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (emails.length === 0 && !canAddCurrentEmail())}
              className="bg-[#00A991] hover:bg-[#008A7A]"
            >
              {loading ? 'Sending...' : `Send ${emails.length || (canAddCurrentEmail() ? '1' : '')} Invitation${(emails.length === 1 || canAddCurrentEmail()) ? '' : 's'}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 