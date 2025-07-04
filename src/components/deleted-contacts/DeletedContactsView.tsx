import React, { useState } from 'react';
import { useDeletedContacts } from '@/hooks/supabase/use-deleted-contacts';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
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
  const { deletedContacts, isLoading, restoreContact, permanentlyDeleteContact, isRestoring, isPermanentlyDeleting } = useDeletedContacts();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'restore' | 'delete' | null>(null);

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

  const isProcessing = isRestoring || isPermanentlyDeleting;

  return (
    <div className="container mx-auto py-8 max-w-6xl">
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
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Deleted On</TableHead>
                <TableHead>Expires On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.email || '-'}</TableCell>
                  <TableCell>{contact.company || '-'}</TableCell>
                  <TableCell>
                    {format(new Date(contact.deleted_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
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

      {/* Restore Confirmation Dialog */}
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

      {/* Permanent Delete Confirmation Dialog */}
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
    </div>
  );
}
