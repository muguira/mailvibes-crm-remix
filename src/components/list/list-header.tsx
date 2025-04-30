
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

  return (
    <div className="bg-white border-b border-slate-light/30 py-2 px-4 flex items-center justify-between">
      {/* Left side - List selection and actions */}
      <div className="flex items-center gap-2">
        {listsLoading ? (
          <div className="text-slate-500 px-2">Loading lists...</div>
        ) : lists.length > 0 ? (
          <div className="w-56">
            <Select 
              value={currentListId || ""}
              onValueChange={(value) => setCurrentListId(value)}
            >
              <SelectTrigger className="h-9 bg-white border border-slate-light/50 text-slate-600 focus:ring-teal-primary">
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
          <div className="text-slate-500 px-2">No lists available</div>
        )}
        
        <CustomButton
          variant="outline"
          size="sm"
          className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50 h-9"
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
              className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50 h-9"
              onClick={() => setIsHistoryOpen(true)}
            >
              <History size={14} />
              <span>History</span>
            </CustomButton>
            
            <CustomButton
              variant="default"
              size="sm"
              className="flex items-center gap-1 h-9 bg-teal-primary hover:bg-teal-primary/90 ml-1"
              onClick={() => setIsAddOpportunityOpen && setIsAddOpportunityOpen(true)}
            >
              <Plus size={14} />
              <span>Add Opportunity</span>
            </CustomButton>
          </>
        )}
      </div>

      {/* Right side - View selector and users */}
      <div className="flex items-center gap-2">
        {currentListId && (
          <Popover>
            <PopoverTrigger asChild>
              <CustomButton
                variant="outline"
                size="sm"
                className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50 h-9"
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
        )}
        
        <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>
    </div>
  );
}
