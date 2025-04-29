
import { useState } from "react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/shared/avatar";

interface FeedItem {
  id: string;
  author: string;
  authorInitials: string;
  type: "comment" | "update" | "call" | "email";
  date: Date;
  content: string;
  target?: {
    type: string;
    name: string;
  };
  targetStatus?: string;
}

// Sample feed data
const feedItems: FeedItem[] = [
  {
    id: "1",
    author: "Kelly Singsank",
    authorInitials: "KS",
    type: "update",
    date: new Date(2023, 3, 17),
    content: "",
    target: {
      type: "Lead",
      name: "Moxxy Schoeffler"
    },
    targetStatus: "Contacted"
  },
  {
    id: "2",
    author: "Kelly Singsank",
    authorInitials: "KS",
    type: "update",
    date: new Date(2023, 3, 17),
    content: "",
    target: {
      type: "Lead",
      name: "James McSales"
    },
    targetStatus: "Contacted"
  },
  {
    id: "3",
    author: "Jennifer Rafferd",
    authorInitials: "JR",
    type: "comment",
    date: new Date(2023, 3, 16),
    content: "Just text here. @Rose Roca What do think?",
    target: {
      type: "Lead",
      name: "Cloud.ie"
    }
  },
  {
    id: "4",
    author: "Sharadhi Gadgekar",
    authorInitials: "SG",
    type: "comment",
    date: new Date(2023, 3, 15),
    content: "@Edie Robinson had a great call!",
    target: {
      type: "Deal",
      name: "Sushi Rito Inc."
    }
  },
  {
    id: "5",
    author: "Sharadhi Gadgekar",
    authorInitials: "SG",
    type: "update",
    date: new Date(2023, 3, 15),
    content: "",
    target: {
      type: "Deal",
      name: "Avocado Inc."
    },
    targetStatus: "Signed"
  }
];

export function FeedPanel() {
  const [activeTab, setActiveTab] = useState("my-feed");
  
  return (
    <div className="bg-white rounded-lg shadow-relate overflow-hidden h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-slate-light/30">
          <div className="flex justify-between items-center px-4 pt-4">
            <TabsList>
              <TabsTrigger value="my-feed">My Feed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <TabsContent value="my-feed" className="m-0">
            <div className="px-4 py-3 bg-slate-light/10 border-b border-slate-light/30">
              <h3 className="text-sm font-medium text-slate-medium">
                {format(new Date(), "MMM d, yyyy")}
              </h3>
            </div>
            
            <div className="divide-y divide-slate-light/30">
              {feedItems.map(item => (
                <FeedItemComponent key={item.id} item={item} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="all" className="m-0">
            <div className="px-4 py-3 bg-slate-light/10 border-b border-slate-light/30">
              <h3 className="text-sm font-medium text-slate-medium">
                {format(new Date(), "MMM d, yyyy")}
              </h3>
            </div>
            
            <div className="divide-y divide-slate-light/30">
              {feedItems.map(item => (
                <FeedItemComponent key={item.id} item={item} />
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function FeedItemComponent({ item }: { item: FeedItem }) {
  return (
    <div className="p-4 hover:bg-slate-light/10">
      <div className="flex gap-3">
        <Avatar name={item.author} initials={item.authorInitials} />
        
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-semibold">{item.author}</span>
            
            {item.type === "comment" && (
              <span className="text-slate-medium">commented on a</span>
            )}
            
            {item.type === "update" && (
              <span className="text-slate-medium">updated the</span>
            )}
            
            <span className="text-teal-primary font-medium">
              {item.target?.type}
            </span>
            
            {item.type === "update" && item.targetStatus && (
              <span className="text-slate-medium">to {item.targetStatus}</span>
            )}
          </div>
          
          <div className="text-xs text-slate-medium mb-2">
            {format(item.date, "MMM d 'at' h:mm a")}
          </div>
          
          {item.content && (
            <div className="bg-slate-light/10 p-3 rounded-md text-sm">
              {item.content}
            </div>
          )}
          
          <div className="mt-3">
            <div className="flex items-center">
              <Avatar name={item.target?.name || ""} size="sm" />
              <span className="ml-2 text-sm">{item.target?.name}</span>
            </div>
          </div>
          
          {item.type === "comment" && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Add text here..."
                className="w-full p-2 bg-slate-light/10 border border-slate-light/30 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-primary/30 focus:border-teal-primary"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
