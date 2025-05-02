
import React from 'react';
import { Phone, Mail, CheckSquare, MoreHorizontal, StickyNote, CalendarClock, MessageCircle, Calendar } from 'lucide-react';

interface ActionRowProps {
  className?: string;
}

export default function ActionRow({ className = '' }: ActionRowProps) {
  // Action buttons configuration - all buttons for desktop
  const desktopActions = [
    { icon: Phone, label: 'Call' },
    { icon: Mail, label: 'Email' },
    { icon: CheckSquare, label: 'Task' },
    { icon: StickyNote, label: 'Note' },
    { icon: CalendarClock, label: 'Meeting' },
    { icon: MoreHorizontal, label: 'More' },
  ];

  // Mobile shows 5 buttons in the specified order
  const mobileActions = [
    { icon: Phone, label: 'Call' },
    { icon: Calendar, label: 'Meeting' },
    { icon: Mail, label: 'Email' },
    { icon: MessageCircle, label: 'Text' },
    { icon: MoreHorizontal, label: 'More' },
  ];

  return (
    <div className={`${className}`}>
      {/* Mobile buttons (visible on smaller screens) */}
      <div className="flex items-center justify-between w-full lg:hidden">
        {mobileActions.map((action, index) => (
          <button
            key={index}
            className="flex flex-col items-center justify-center p-2 group"
          >
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center border border-slate-light/30 group-hover:bg-slate-light/10 transition-colors">
              <action.icon size={20} strokeWidth={1.5} className="text-teal-primary" />
            </div>
            <span className="text-xs text-slate-dark mt-1">{action.label}</span>
          </button>
        ))}
      </div>
      
      {/* Desktop buttons (visible on larger screens) - reduced gap to gap-4 */}
      <div className="hidden lg:grid grid-cols-6 gap-4 w-full">
        {desktopActions.map((action, index) => (
          <button
            key={index}
            className="flex flex-col items-center justify-center p-2 group"
          >
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center border border-slate-light/30 group-hover:bg-slate-light/10 group-hover:border-teal-primary group-hover:border-2 transition-colors">
              <action.icon size={20} strokeWidth={1.5} className="text-teal-primary" />
            </div>
            <span className="text-xs text-slate-dark mt-1">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
