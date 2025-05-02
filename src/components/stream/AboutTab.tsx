
import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronDown } from 'lucide-react';

export default function AboutTab() {
  // Contact properties 
  const contactProperties = [
    { label: 'First Name', value: 'Jaime' },
    { label: 'Last Name', value: 'Cevallos' },
    { label: 'Email', value: 'jme86emj@gmail.com' },
    { label: 'Phone Number', value: '+593 960244550' },
    { label: 'Mobile Phone Number', value: '' },
    { label: 'License Name', value: 'Essentials' },
    { label: 'Last Contacted', value: '' },
    { label: 'Lifecycle Stage', value: 'Subscriber' },
    { label: 'Contact owner', value: 'Angel Montero' },
    { label: 'rep_email_address_text', value: 'angel.montero@questionpro.com' },
    { label: 'SourceRef', value: 'survey-templates' },
    { label: 'Message custom', value: '' },
    { label: 'City', value: '' },
    { label: 'Streamyard Webinar Registry', value: '' },
    { label: 'Streamyard Webinar Status', value: '' },
  ];

  return (
    <div className="flex flex-col">
      <Accordion type="single" collapsible className="w-full" defaultValue="about-contact">
        <AccordionItem value="about-contact" className="border-b">
          <AccordionTrigger className="px-4 py-3">
            About this contact
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0">
            {contactProperties.map((property, index) => (
              <div 
                key={index} 
                className="flex flex-col border-b border-slate-light/30 px-4 py-3"
              >
                <span className="text-sm text-slate-medium">{property.label}</span>
                {property.value ? (
                  <span className="text-navy-deep">{property.value}</span>
                ) : (
                  <span className="text-slate-light">Not set</span>
                )}
              </div>
            ))}
            <button className="w-full py-4 text-center text-teal-primary hover:underline">
              View all properties
            </button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
