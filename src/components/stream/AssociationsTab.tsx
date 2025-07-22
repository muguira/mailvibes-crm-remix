import React from 'react'
import { Plus } from 'lucide-react'

export default function AssociationsTab() {
  // Associations to render
  const associations = [
    { id: '1', title: 'Jaime Cevallos 2025-05', subtitle: 'New | Lead pipeline' },
    { type: 'leads' },
    { type: 'companies' },
    { type: 'contacts' },
    { type: 'deals' },
    { type: 'tickets' },
  ]

  return (
    <div className="flex flex-col">
      {/* Lead card */}
      <div className="p-4 border-b border-slate-light/30">
        <h3 className="font-medium text-navy-deep">{associations[0].title}</h3>
        <p className="text-sm text-slate-medium">{associations[0].subtitle}</p>
      </div>

      {/* Add association options */}
      {associations.slice(1).map((item, index) => (
        <button
          key={index}
          className="flex items-center justify-between p-4 border-b border-slate-light/30 hover:bg-slate-light/10 transition-colors"
        >
          <span className="text-teal-primary">Add {item.type}</span>
          <Plus className="h-6 w-6 text-teal-primary" />
        </button>
      ))}
    </div>
  )
}
