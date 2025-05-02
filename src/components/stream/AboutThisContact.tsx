
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AboutThisContactProps {
  compact?: boolean;
}

export default function AboutThisContact({ compact = false }: AboutThisContactProps) {
  // Dummy contact details
  const contactDetails = {
    email: "alberto@acmecorp.com",
    phone: "+1 (555) 123-4567",
    owner: "Sarah Johnson",
    lastContacted: "Apr 28, 2025",
    lifecycleStage: "Lead",
    source: "Website Form",
    company: "Acme Corporation",
    industry: "Software",
    jobTitle: "Growth Manager",
    address: "123 Tech Lane, Austin, TX 78701"
  };

  // All fields in a single array for the single-column layout
  const allFields = [
    { label: "Email", value: contactDetails.email },
    { label: "Phone", value: contactDetails.phone },
    { label: "Owner", value: contactDetails.owner },
    { label: "Last Contacted", value: contactDetails.lastContacted },
    { label: "Lifecycle Stage", value: contactDetails.lifecycleStage },
    { label: "Source", value: contactDetails.source },
    { label: "Company", value: contactDetails.company },
    { label: "Industry", value: contactDetails.industry },
    { label: "Job Title", value: contactDetails.jobTitle },
    { label: "Address", value: contactDetails.address }
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
                  <div>{contactDetails.email}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Phone</div>
                  <div>{contactDetails.phone}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Owner</div>
                  <div>{contactDetails.owner}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Last Contacted</div>
                  <div>{contactDetails.lastContacted}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Lifecycle Stage</div>
                  <div>{contactDetails.lifecycleStage}</div>
                </div>
              </div>
              <div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Source</div>
                  <div>{contactDetails.source}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Company</div>
                  <div>{contactDetails.company}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Industry</div>
                  <div>{contactDetails.industry}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Job Title</div>
                  <div>{contactDetails.jobTitle}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted-foreground">Address</div>
                  <div>{contactDetails.address}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
