import React, { useState } from 'react';
import { useDeletedContacts } from '@/hooks/supabase/use-deleted-contacts';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

export function DeletedContactsView() {
  const navigate = useNavigate();
  const { 
    deletedContacts, 
    isLoading, 
    restoreContact, 
    permanentlyDeleteContact, 
    restoreMultipleContacts,
    permanentlyDeleteMultipleContacts,
    isRestoring, 
    isPermanentlyDeleting 
  } = useDeletedContacts();
  
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [actionType, setActionType] = useState<'restore' | 'delete' | 'batch-restore' | 'batch-delete' | null>(null);

  const handleSelectContact = (contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContactIds(new Set(deletedContacts.map(c => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  };

  const handleRestore = async () => {
    if (!selectedContact) return;
    
    try {
      await restoreContact(selectedContact);
      setSelectedContact(null);
      setActionType(null);
    } catch (error) {
      console.error('Failed to restore contact:', error);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedContactIds.size === 0) return;
    
    try {
      await restoreMultipleContacts(Array.from(selectedContactIds));
      setSelectedContactIds(new Set());
      setActionType(null);
    } catch (error) {
      console.error('Failed to restore contacts:', error);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedContact) return;
    
    try {
      await permanentlyDeleteContact(selectedContact);
      setSelectedContact(null);
      setActionType(null);
    } catch (error) {
      console.error('Failed to permanently delete contact:', error);
    }
  };

  const handleBatchPermanentDelete = async () => {
    if (selectedContactIds.size === 0) return;
    
    try {
      await permanentlyDeleteMultipleContacts(Array.from(selectedContactIds));
      setSelectedContactIds(new Set());
      setActionType(null);
    } catch (error) {
      console.error('Failed to permanently delete contacts:', error);
    }
  };

  const isProcessing = isRestoring || isPermanentlyDeleting;

  return (
    <div className="container mx-auto py-8 px-4 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/leads')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Contacts
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Deleted Contacts</h1>
            <p className="text-sm text-gray-500">
              Contacts are kept for 90 days before being permanently deleted
            </p>
          </div>
        </div>
        
        {selectedContactIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedContactIds.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType('batch-restore')}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Restore Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType('batch-delete')}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Forever
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : deletedContacts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="rounded-full bg-gray-100 p-6 mb-4 w-16 h-16 mx-auto flex items-center justify-center">
            <Trash2 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No deleted contacts</h3>
          <p className="text-sm text-gray-500">
            Deleted contacts will appear here and can be restored within 90 days.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedContactIds.size === deletedContacts.length && deletedContacts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead className="min-w-[250px]">Email</TableHead>
                <TableHead className="min-w-[200px]">Company</TableHead>
                <TableHead className="min-w-[120px]">Deleted On</TableHead>
                <TableHead className="min-w-[120px]">Expires On</TableHead>
                <TableHead className="min-w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedContactIds.has(contact.id)}
                      onCheckedChange={() => handleSelectContact(contact.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{contact.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{contact.email || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">{contact.company || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(contact.deleted_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(contact.expiry_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(contact.id);
                          setActionType('restore');
                        }}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedContact(contact.id);
                          setActionType('delete');
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Forever
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Single Restore Confirmation Dialog */}
      <Dialog
        open={actionType === 'restore' && !!selectedContact}
        onOpenChange={(open) => {
          if (!open && !isProcessing) {
            setSelectedContact(null);
            setActionType(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore this contact? It will be added back to your contacts list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!isProcessing) {
                  setSelectedContact(null);
                  setActionType(null);
                }
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Contact'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Restore Confirmation Dialog */}
      <Dialog
        open={actionType === 'batch-restore'}
        onOpenChange={(open) => {
          if (!open && !isProcessing) {
            setActionType(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore {selectedContactIds.size} Contacts</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? 's' : ''}? They will be added back to your contacts list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!isProcessing) {
                  setActionType(null);
                }
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleBatchRestore} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                `Restore ${selectedContactIds.size} Contact${selectedContactIds.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Permanent Delete Confirmation Dialog */}
      <Dialog
        open={actionType === 'delete' && !!selectedContact}
        onOpenChange={(open) => {
          if (!open && !isProcessing) {
            setSelectedContact(null);
            setActionType(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this contact? This action cannot be undone and the contact will be completely removed from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!isProcessing) {
                  setSelectedContact(null);
                  setActionType(null);
                }
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Forever'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Permanent Delete Confirmation Dialog */}
      <Dialog
        open={actionType === 'batch-delete'}
        onOpenChange={(open) => {
          if (!open && !isProcessing) {
            setActionType(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently Delete {selectedContactIds.size} Contacts</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? 's' : ''}? This action cannot be undone and the contacts will be completely removed from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!isProcessing) {
                  setActionType(null);
                }
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBatchPermanentDelete} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedContactIds.size} Contact${selectedContactIds.size !== 1 ? 's' : ''} Forever`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
