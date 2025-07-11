import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { TopNavbar } from '../../components/layout/top-navbar';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { 
  DEFAULT_ACCOUNT_PROPERTIES, 
  PROPERTY_TYPE_OPTIONS, 
  AccountProperty, 
  NewAccountProperty 
} from '@/types/account-properties';
import { AddPropertyModal } from '@/components/settings/AddPropertyModal';
import { DeletePropertyDialog } from '@/components/settings/DeletePropertyDialog';
import { toast } from '@/hooks/use-toast';

const AccountProperties = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [customProperties, setCustomProperties] = useState<AccountProperty[]>([]);
    const [allProperties, setAllProperties] = useState<AccountProperty[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<AccountProperty | null>(null);
    const [selectedPropertyType, setSelectedPropertyType] = useState<'text' | 'number' | 'date' | 'collaborator' | 'list' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState<AccountProperty | null>(null);

    const isActive = (path: string) => location.pathname === path;

    useEffect(() => {
        // Load custom properties from backend or localStorage
        loadCustomProperties();
    }, []);

    useEffect(() => {
        // Combine default and custom properties for display order
        const combined = [...DEFAULT_ACCOUNT_PROPERTIES, ...customProperties];
        setAllProperties(combined);
    }, [customProperties]);

    const loadCustomProperties = async () => {
        try {
            // TODO: Replace with actual API call to load custom properties
            const savedProperties = localStorage.getItem('custom-account-properties');
            if (savedProperties) {
                setCustomProperties(JSON.parse(savedProperties));
            } else {
                // Add some test custom properties for demonstration
                const testProperties: AccountProperty[] = [
                    {
                        id: 'custom_test_1',
                        name: 'Budget',
                        type: 'number',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: 'custom_test_2',
                        name: 'Account Manager',
                        type: 'collaborator',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ];
                setCustomProperties(testProperties);
                localStorage.setItem('custom-account-properties', JSON.stringify(testProperties));
            }
        } catch (error) {
            console.error('Error loading custom properties:', error);
        }
    };

    const saveCustomProperties = async (properties: AccountProperty[]) => {
        try {
            // TODO: Replace with actual API call to save custom properties
            localStorage.setItem('custom-account-properties', JSON.stringify(properties));
            setCustomProperties(properties);
        } catch (error) {
            console.error('Error saving custom properties:', error);
            toast({
                title: "Error",
                description: "Failed to save properties",
                variant: "destructive"
            });
        }
    };

    const handleAddPropertyClick = (propertyType: 'text' | 'number' | 'date' | 'collaborator' | 'list') => {
        console.log('Adding property of type:', propertyType);
        setSelectedPropertyType(propertyType);
        setEditingProperty(null);
        setIsAddModalOpen(true);
    };

    const handleAddProperty = async (newProperty: NewAccountProperty) => {
        setIsLoading(true);
        try {
            const property: AccountProperty = {
                ...newProperty,
                id: `custom_${Date.now()}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const updatedProperties = [...customProperties, property];
            await saveCustomProperties(updatedProperties);
            
            toast({
                title: "Success",
                description: "Property added successfully"
            });
            
            setIsAddModalOpen(false);
            setSelectedPropertyType(null);
        } catch (error) {
            console.error('Error adding property:', error);
            toast({
                title: "Error",
                description: "Failed to add property",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditProperty = (property: AccountProperty) => {
        console.log('Editing property:', property);
        setEditingProperty(property);
        setSelectedPropertyType(null); // Don't pre-select type when editing
        setIsAddModalOpen(true);
    };

    const handleUpdateProperty = async (updatedProperty: NewAccountProperty) => {
        if (!editingProperty) return;
        
        console.log('Updating property:', editingProperty, 'with:', updatedProperty);
        setIsLoading(true);
        try {
            const property: AccountProperty = {
                ...editingProperty,
                ...updatedProperty,
                updated_at: new Date().toISOString()
            };
            
            const updatedProperties = customProperties.map(p => 
                p.id === editingProperty.id ? property : p
            );
            await saveCustomProperties(updatedProperties);
            
            toast({
                title: "Success",
                description: "Property updated successfully"
            });
            
            setIsAddModalOpen(false);
            setEditingProperty(null);
        } catch (error) {
            console.error('Error updating property:', error);
            toast({
                title: "Error",
                description: "Failed to update property",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (property: AccountProperty) => {
        setPropertyToDelete(property);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!propertyToDelete) return;
        
        setIsLoading(true);
        try {
            const updatedProperties = customProperties.filter(p => p.id !== propertyToDelete.id);
            await saveCustomProperties(updatedProperties);
            
            toast({
                title: "Success",
                description: "Property deleted successfully"
            });
        } catch (error) {
            console.error('Error deleting property:', error);
            toast({
                title: "Error",
                description: "Failed to delete property",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
            setDeleteDialogOpen(false);
            setPropertyToDelete(null);
        }
    };

    const handleSave = () => {
        toast({
            title: "Success",
            description: "Changes saved successfully"
        });
    };

    const handleModalClose = () => {
        console.log('Closing modal');
        setIsAddModalOpen(false);
        setEditingProperty(null);
        setSelectedPropertyType(null);
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent, propertyId: string) => {
        setDraggedItem(propertyId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        
        if (!draggedItem || draggedItem === targetId) {
            setDraggedItem(null);
            return;
        }

        const newOrder = [...allProperties];
        const draggedIndex = newOrder.findIndex(p => p.id === draggedItem);
        const targetIndex = newOrder.findIndex(p => p.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Remove dragged item and insert at target position
            const [draggedProperty] = newOrder.splice(draggedIndex, 1);
            newOrder.splice(targetIndex, 0, draggedProperty);
            
            setAllProperties(newOrder);
            
            // Save the new order (you might want to save this to backend)
            localStorage.setItem('property-order', JSON.stringify(newOrder.map(p => p.id)));
            
            toast({
                title: "Success",
                description: "Property order updated"
            });
        }

        setDraggedItem(null);
    };

    const getPropertyTypeIcon = (type: string) => {
        switch (type) {
            case 'collaborator':
                return '👥';
            case 'date':
                return '📅';
            case 'number':
                return '#';
            case 'text':
                return 'T';
            case 'list':
                return '📋';
            default:
                return '📝';
        }
    };

    const isCustomProperty = (propertyId: string) => {
        return customProperties.some(p => p.id === propertyId);
    };

    return (
        <>
            <TopNavbar />
            <div className="min-h-screen bg-gray-50 pt-12">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-semibold mb-8">Settings</h1>

                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <div className="w-64 flex-shrink-0">
                            <div className="bg-white rounded-lg shadow-sm p-4">
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900 mb-3">My Account Settings</h2>
                                        <nav className="space-y-1">
                                            <button
                                                className={cn(
                                                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                                                    isActive('/settings') 
                                                        ? "bg-gray-100 text-gray-900 font-medium" 
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                                onClick={() => navigate('/settings')}
                                            >
                                                Your Information
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Security
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Notifications
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Connected Accounts
                                            </button>
                                        </nav>
                                    </div>

                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900 mb-3">Organization Settings</h2>
                                        <nav className="space-y-1">
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                General
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Sharing
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Lists
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Users
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Teams
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Billing
                                            </button>
                                            <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                                                Payment Methods
                                            </button>
                                            <button
                                                className={cn(
                                                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                                                    isActive('/settings/account-properties') 
                                                        ? "bg-gray-100 text-gray-900 font-medium" 
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                                onClick={() => navigate('/settings/account-properties')}
                                            >
                                                Account Properties
                                            </button>
                                            <button
                                                className={cn(
                                                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                                                    isActive('/settings/integrations') 
                                                        ? "bg-[#E8F5F3] text-[#00A991] font-medium" 
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                                onClick={() => navigate('/settings/integrations')}
                                            >
                                                Integrations
                                            </button>
                                            <button
                                                className={cn(
                                                    "w-full px-3 py-2 text-left text-sm rounded-md transition-colors",
                                                    isActive('/settings/imports') 
                                                        ? "bg-[#E8F5F3] text-[#00A991] font-medium" 
                                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                                onClick={() => navigate('/settings/imports')}
                                            >
                                                Imports
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Existing Properties */}
                                <Card className="p-6 bg-white shadow-sm">
                                    <h2 className="text-lg font-medium mb-4 text-blue-600">Existing Properties</h2>
                                    
                                    <div className="space-y-1">
                                        {allProperties.map((property) => (
                                            <div 
                                                key={property.id} 
                                                className={cn(
                                                    "flex items-center justify-between py-3 px-3 rounded hover:bg-gray-50 transition-colors group",
                                                    draggedItem === property.id ? "opacity-50" : "",
                                                    isCustomProperty(property.id) ? "bg-blue-50 hover:bg-blue-100" : ""
                                                )}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, property.id)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, property.id)}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-gray-900">{property.name}</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {property.required && (
                                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px]">
                                                            Required
                                                        </span>
                                                    )}
                                                    {isCustomProperty(property.id) && (
                                                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px]">
                                                            Custom
                                                        </span>
                                                    )}
                                                    
                                                    {isCustomProperty(property.id) ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => handleEditProperty(property)}
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => handleDeleteClick(property)}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-gray-300 cursor-not-allowed opacity-0 group-hover:opacity-100 transition-opacity"
                                                            disabled
                                                            title="Default properties cannot be edited"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-6 pt-4 border-t">
                                        <button 
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            onClick={() => {/* TODO: Show more details */}}
                                        >
                                            show more details →
                                        </button>
                                    </div>
                                </Card>

                                {/* Select Property to Add */}
                                <Card className="p-6 bg-white shadow-sm">
                                    <h2 className="text-lg font-medium mb-4 text-blue-600">Select Property to Add</h2>
                                    
                                    <div className="space-y-1">
                                        {PROPERTY_TYPE_OPTIONS.map((option) => (
                                            <div 
                                                key={option.value}
                                                className="flex items-center justify-between py-3 px-3 rounded hover:bg-gray-50 cursor-pointer transition-colors group"
                                                onClick={() => handleAddPropertyClick(option.value as any)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <span className="text-sm">
                                                            {getPropertyTypeIcon(option.value)}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                                                </div>
                                                <Plus className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>

                            {/* Save Button */}
                            <div className="mt-8 flex justify-end">
                                <Button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                                    disabled={isLoading}
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Property Modal */}
            <AddPropertyModal
                isOpen={isAddModalOpen}
                onClose={handleModalClose}
                onSave={editingProperty ? handleUpdateProperty : handleAddProperty}
                editingProperty={editingProperty}
                preselectedType={selectedPropertyType}
                isLoading={isLoading}
            />

            {/* Delete Confirmation Dialog */}
            <DeletePropertyDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                propertyName={propertyToDelete?.name || ''}
            />
        </>
    );
};

export default AccountProperties; 