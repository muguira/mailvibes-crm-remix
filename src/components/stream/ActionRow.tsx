
import React from 'react';
import { Phone, Mail, CheckSquare, MoreHorizontal } from 'lucide-react';

interface ActionRowProps {
  className?: string;
}

export default function ActionRow({ className = '' }: ActionRowProps) {
  // Action buttons configuration
  const actions = [
    { icon: Phone, label: 'Call' },
    { icon: Mail, label: 'Email' },
    { icon: CheckSquare, label: 'Task' },
    { icon: MoreHorizontal, label: 'More' },
  ];

  return (
    <div className={`flex items-center justify-between md:justify-around ${className}`}>
      {actions.map((action, index) => (
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
  );
}
