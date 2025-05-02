
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AboutThisContactProps {
  compact?: boolean;
  leadStatus?: string;
  contact: {
    email?: string;
    phone?: string;
    owner?: string;
    lastContacted?: string;
    lifecycleStage?: string;
    source?: string;
    company?: string;
    industry?: string;
    jobTitle?: string;
    address?: string;
  };
}

export default function AboutThisContact({ 
  compact = false, 
  leadStatus = "N/A",
  contact
}: AboutThisContactProps) {
  // All fields in a single array for the single-column layout
  const allFields = [
    { label: "Email", value: contact.email || 'N/A' },
    { label: "Phone", value: contact.phone || 'N/A' },
    { label: "Owner", value: contact.owner || 'N/A' },
    { label: "Last Contacted", value: contact.lastContacted || 'N/A' },
    { label: "Lead Status", value: leadStatus || 'N/A' },
    { label: "Lifecycle Stage", value: contact.lifecycleStage || 'N/A' },
    { label: "Source", value: contact.source || 'N/A' },
    { label: "Company", value: contact.company || 'N/A' },
    { label: "Industry", value: contact.industry || 'N/A' },
    { label: "Job Title", value: contact.jobTitle || 'N/A' },
    { label: "Address", value: contact.address || 'N/A' }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">About This Contact</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={compact ? "space-y-3" : "grid grid-cols-2 gap-4 text-sm"}>
          {compact ? (
            // Single-column layout for desktop
            allFields.map((field, index) => (
              <div key={index} className="mb-3">
                <div className="text-muted-foreground">{field.label}</div>
                <div>{field.value}</div>
              </div>
            ))
          ) : (
            // Two-column layout (legacy support)
            <>
              <div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Email</div>
                  <div>{contact.email || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Phone</div>
                  <div>{contact.phone || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Owner</div>
                  <div>{contact.owner || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Last Contacted</div>
                  <div>{contact.lastContacted || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Lead Status</div>
                  <div>{leadStatus || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Lifecycle Stage</div>
                  <div>{contact.lifecycleStage || 'N/A'}</div>
                </div>
              </div>
              <div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Source</div>
                  <div>{contact.source || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Company</div>
                  <div>{contact.company || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Industry</div>
                  <div>{contact.industry || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Job Title</div>
                  <div>{contact.jobTitle || 'N/A'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Address</div>
                  <div>{contact.address || 'N/A'}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
