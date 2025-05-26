import React from "react";
import { User } from "lucide-react";
import { ContactInsert } from "@/utils/mapColumnsToContact";

interface LiveContactCardProps {
  contact: Partial<ContactInsert>;
  additionalEmails?: Array<{ index: number; value?: string }>;
}

export function LiveContactCard({ contact, additionalEmails = [] }: LiveContactCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 h-full">
      <h3 className="text-lg font-medium text-gray-900">Example Contact Data</h3>
      
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-8 h-8 text-gray-400" />
        </div>
        
        <div className="flex-1 space-y-3 min-w-0">
          {/* Name */}
          <div>
            <div className="text-xs text-gray-500 italic">Name</div>
            <div className="text-sm text-gray-900 break-words">
              {contact.name || contact.firstName || "-"}
            </div>
          </div>

          {/* Email */}
          <div>
            <div className="text-xs text-gray-500 italic">Email</div>
            <div className="text-sm text-gray-900 break-all">
              {contact.email || "-"}
            </div>
          </div>

          {/* Additional Emails */}
          {additionalEmails.map(({ index, value }) => (
            <div key={`email-${index}`}>
              <div className="text-xs text-gray-500 italic">Email {index + 1}</div>
              <div className="text-sm text-gray-900 break-all">
                {value || "-"}
              </div>
            </div>
          ))}

          {/* Phone */}
          {contact.phone && (
            <div>
              <div className="text-xs text-gray-500 italic">Phone</div>
              <div className="text-sm text-gray-900 break-words">{contact.phone}</div>
            </div>
          )}

          {/* Address */}
          {contact.address && (
            <div>
              <div className="text-xs text-gray-500 italic">Address</div>
              <div className="text-sm text-gray-900 break-words">{contact.address}</div>
            </div>
          )}

          {/* LinkedIn */}
          {contact.linkedin && (
            <div>
              <div className="text-xs text-gray-500 italic">LinkedIn</div>
              <div className="text-sm text-gray-900 break-words">{contact.linkedin}</div>
            </div>
          )}

          {/* Facebook */}
          {contact.facebook && (
            <div>
              <div className="text-xs text-gray-500 italic">Facebook</div>
              <div className="text-sm text-gray-900 break-words">{contact.facebook}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 