
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutThisContact() {
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

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">About This Contact</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
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
        </div>
      </CardContent>
    </Card>
  );
}
