
import { Plus, History, Users } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ViewModeSelector } from "./view-mode-selector";
import { format } from "date-fns";
import { PresenceUser } from "@/hooks/supabase";
import { ListHeaderProps } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ListHeader({ 
  listsLoading, 
  lists, 
  currentListId, 
  presentUsers,
  viewMode,
  setCurrentListId, 
  setIsCreateListOpen, 
  setIsHistoryOpen,
  setViewMode,
  setIsAddOpportunityOpen
}: ListHeaderProps & {
  setIsAddOpportunityOpen?: (isOpen: boolean) => void;
}) {
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddOpportunity = () => {
    if (setIsAddOpportunityOpen) {
      setIsAddOpportunityOpen(true);
    }
  };

  return (
    <div className="bg-white border-b border-slate-light/30 p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {listsLoading ? (
          <div className="text-slate-500">Loading lists...</div>
        ) : lists.length > 0 ? (
          <div className="w-56">
            <Select 
              value={currentListId || ""}
              onValueChange={(value) => setCurrentListId(value)}
            >
              <SelectTrigger className="w-full bg-white border border-slate-200 focus:ring-teal-primary focus:ring-opacity-50">
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {lists.map(list => (
                  <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="text-slate-500">No lists available</div>
        )}
        
        <CustomButton
          variant="outline"
          size="sm"
          className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50"
          onClick={() => setIsCreateListOpen(true)}
        >
          <Plus size={14} />
          <span>New List</span>
        </CustomButton>
        
        {currentListId && (
          <>
            <CustomButton
              variant="outline"
              size="sm"
              className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setIsHistoryOpen(true)}
            >
              <History size={14} />
              <span>History</span>
            </CustomButton>

            <CustomButton
              variant="default"
              size="sm"
              className="flex items-center gap-1 ml-auto"
              onClick={handleAddOpportunity}
            >
              <Plus size={14} />
              <span>Add Opportunity</span>
            </CustomButton>
            
            <Popover>
              <PopoverTrigger asChild>
                <CustomButton
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Users size={14} />
                  <span>Users ({Object.keys(presentUsers).length})</span>
                </CustomButton>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h3 className="font-medium">Currently viewing</h3>
                  {Object.values(presentUsers).length === 0 ? (
                    <p className="text-sm text-slate-500">No one else is viewing this list</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.values(presentUsers).map((user: PresenceUser) => (
                        <div key={user.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {user.avatar_url ? (
                              <AvatarImage src={user.avatar_url} alt={user.name} />
                            ) : null}
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name}</span>
                          <span className="text-xs text-slate-500">
                            {formatDate(user.last_active)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>

      <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
    </div>
  );
}
