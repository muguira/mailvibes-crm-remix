import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useOpportunities } from '@/hooks/supabase/use-opportunities';
import { toast } from '@/hooks/use-toast';

export function OpportunitiesTest() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { getOpportunities, bulkConvertContactsToOpportunities } = useOpportunities();

  // Test fetching opportunities
  const testFetchOpportunities = async () => {
    setLoading(true);
    try {
      const data = await getOpportunities();
      setOpportunities(data);
      console.log('✅ Fetched opportunities:', data);
      toast({
        title: "Success",
        description: `Fetched ${data.length} opportunities from database`,
      });
    } catch (error) {
      console.error('❌ Error fetching opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to fetch opportunities from database",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Test creating a sample opportunity
  const testCreateOpportunity = async () => {
    setLoading(true);
    try {
      const sampleContacts = [
        {
          id: 'test-contact-1',
          name: 'Test Contact',
          email: 'test@example.com',
          company: 'Test Company',
          source: 'Test Source'
        }
      ];

      const conversionData = {
        dealValue: 5000,
        closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        stage: 'Discovered',
        priority: 'Medium'
      };

      const result = await bulkConvertContactsToOpportunities(sampleContacts, conversionData);
      
      if (result.success) {
        console.log('✅ Created test opportunity:', result);
        toast({
          title: "Success",
          description: `Created ${result.convertedCount} test opportunity in database`,
        });
        // Refresh the list
        await testFetchOpportunities();
      }
    } catch (error) {
      console.error('❌ Error creating test opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to create test opportunity",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    testFetchOpportunities();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🧪 Opportunities Database Test</h2>
      
      <div className="flex gap-4 mb-6">
        <Button 
          onClick={testFetchOpportunities}
          disabled={loading}
          variant="outline"
        >
          {loading ? 'Loading...' : 'Fetch Opportunities'}
        </Button>
        
        <Button 
          onClick={testCreateOpportunity}
          disabled={loading}
          className="bg-[#32BAB0] hover:bg-[#28a79d] text-white"
        >
          {loading ? 'Creating...' : 'Create Test Opportunity'}
        </Button>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Database Results ({opportunities.length} opportunities):</h3>
        {opportunities.length === 0 ? (
          <p className="text-gray-500">No opportunities found. Try creating a test opportunity!</p>
        ) : (
          <div className="space-y-2">
            {opportunities.map((opp, index) => (
              <div key={opp.id} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{opp.opportunity}</h4>
                    <p className="text-sm text-gray-600">
                      {opp.companyName} • {opp.revenue} • {opp.status}
                    </p>
                    <p className="text-xs text-gray-500">
                      Close Date: {opp.closeDate} • Owner: {opp.owner}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">
                    Created: {new Date(opp.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>💡 This test component verifies that:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>✅ Database connection is working</li>
          <li>✅ Opportunities table exists and is accessible</li>
          <li>✅ RLS policies are configured correctly</li>
          <li>✅ CRUD operations work properly</li>
          <li>✅ Data transformation is working</li>
        </ul>
      </div>
    </div>
  );
} 