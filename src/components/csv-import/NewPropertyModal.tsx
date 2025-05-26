import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (propertyName: string) => void;
  title?: string;
}

export function NewPropertyModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Create New Property",
}: NewPropertyModalProps) {
  const [propertyName, setPropertyName] = useState("");

  const handleConfirm = () => {
    if (propertyName.trim()) {
      onConfirm(propertyName.trim());
      setPropertyName("");
      onClose();
    }
  };

  const handleClose = () => {
    setPropertyName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="property-name">Property Name</Label>
            <Input
              id="property-name"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="Enter property name"
              className="w-full"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && propertyName.trim()) {
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!propertyName.trim()}
            className="bg-[#62BFAA] hover:bg-[#52AF9A] text-white"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 