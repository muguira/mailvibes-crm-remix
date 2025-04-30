
import React from 'react';
import { 
  Menubar, 
  MenubarMenu, 
  MenubarTrigger, 
  MenubarContent, 
  MenubarItem, 
  MenubarSeparator, 
  MenubarShortcut 
} from "@/components/ui/menubar";
import { Save, FileText, FileEdit, Edit, Copy, Trash, Share2, Download, Printer, Settings } from 'lucide-react';

interface SheetMenuProps {
  listName: string;
}

export function SheetMenu({ listName }: SheetMenuProps) {
  return (
    <div className="sheet-style-menu">
      <div className="flex items-center gap-2 mr-4">
        <span className="font-medium text-navy-deep">{listName || "Untitled List"}</span>
      </div>
      
      <Menubar className="border-none bg-transparent p-0 h-auto space-x-0">
        <MenubarMenu>
          <MenubarTrigger className="sheet-menu-item">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Save size={16} className="mr-2" /> Save
              <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <FileText size={16} className="mr-2" /> Make a copy
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <Download size={16} className="mr-2" /> Download
            </MenubarItem>
            <MenubarItem>
              <Printer size={16} className="mr-2" /> Print
              <MenubarShortcut>⌘P</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="sheet-menu-item">Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Edit size={16} className="mr-2" /> Undo
              <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Edit size={16} className="mr-2" /> Redo
              <MenubarShortcut>⌘Y</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <Copy size={16} className="mr-2" /> Copy
              <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <FileEdit size={16} className="mr-2" /> Paste
              <MenubarShortcut>⌘V</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <Trash size={16} className="mr-2" /> Delete
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="sheet-menu-item">View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Full screen
            </MenubarItem>
            <MenubarItem>
              Freeze columns
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Show formulas
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="sheet-menu-item">Data</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Sort range
            </MenubarItem>
            <MenubarItem>
              Filter views
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Data validation
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="sheet-menu-item">Tools</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Settings size={16} className="mr-2" /> Settings
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Macros
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="sheet-menu-item">Help</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Documentation
            </MenubarItem>
            <MenubarItem>
              Keyboard shortcuts
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      
      <div className="flex-1"></div>
      
      <button className="px-3 py-1 text-sm rounded bg-teal-primary hover:bg-teal-dark transition-colors text-white">
        <Share2 size={16} className="inline-block mr-1" />
        Share
      </button>
    </div>
  );
}
