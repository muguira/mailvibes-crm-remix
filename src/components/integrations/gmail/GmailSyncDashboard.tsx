import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Database, 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Activity,
  BarChart3,
  Timer
} from 'lucide-react';
import { useGmailMetrics } from '@/hooks/gmail/useGmailMetrics';
import { useGmail } from '@/hooks/gmail';
import { useAuth } from '@/components/auth';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { GmailSyncChart } from './GmailSyncChart';

interface GmailSyncDashboardProps {
  className?: string;
}

export function GmailSyncDashboard({ className }: GmailSyncDashboardProps) {
  const { user } = useAuth();
  const { metrics, loading, error, refresh } = useGmailMetrics(30000); // Refresh every 30 seconds
  const { 
    hasConnectedAccounts, 
    refreshAccounts,
    healthCheck 
  } = useGmail({ 
    userId: user?.id, 
    autoInitialize: true 
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refresh(),
        refreshAccounts()
      ]);
      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const isHealthy = await healthCheck();
      toast.success(isHealthy 
        ? 'Gmail service is healthy and operational' 
        : 'Gmail service has some issues - check console for details'
      );
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Health check failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'started':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    // Handle negative or invalid values
    if (ms < 0 || !isFinite(ms) || isNaN(ms)) return 'Invalid';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatContactDisplay = (contactEmail: string) => {
    if (!contactEmail || contactEmail === 'Unknown Contact') {
      return 'Unknown Contact';
    }
    
    // If it's an email, show just the name part
    if (contactEmail.includes('@')) {
      const namePart = contactEmail.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    
    return contactEmail;
  };

  if (!hasConnectedAccounts) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gmail Sync Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No Gmail accounts connected. Connect a Gmail account to see sync metrics.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gmail Sync Dashboard
            <RefreshCw className="w-4 h-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500">Loading sync metrics...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gmail Sync Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading metrics: {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Gmail Sync Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleHealthCheck}
                className="text-xs"
              >
                <Activity className="w-3 h-3 mr-1" />
                Health Check
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Syncs</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.totalSyncs)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {metrics.successRate.toFixed(1)}%
                  {metrics.successRate >= 95 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails Synced</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.totalEmailsSynced)}</p>
              </div>
              <Mail className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold">{formatDuration(metrics.averageSyncDuration)}</p>
              </div>
              <Timer className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{metrics.todayStats.syncs}</p>
              <p className="text-sm text-blue-600">Syncs Today</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{formatNumber(metrics.todayStats.emails)}</p>
              <p className="text-sm text-green-600">Emails Today</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{formatDuration(metrics.todayStats.avgDuration)}</p>
              <p className="text-sm text-purple-600">Avg Duration Today</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sync Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">API Syncs</span>
              </div>
              <Badge variant="outline">{metrics.syncsBySource.api}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Database Syncs</span>
              </div>
              <Badge variant="outline">{metrics.syncsBySource.database}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <GmailSyncChart recentSyncs={metrics.recentSyncs} />

      {/* Recent Syncs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sync Activity</CardTitle>
          {metrics.lastSyncTime && (
            <p className="text-sm text-gray-500">
              Last sync: {formatDistanceToNow(metrics.lastSyncTime, { addSuffix: true })}
            </p>
          )}
          <div className="text-xs text-gray-400 bg-blue-50 p-2 rounded-lg mt-2">
            💡 Each sync searches for emails between your connected Gmail account and specific contacts when you view their profiles.
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentSyncs.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No recent sync activity</p>
            ) : (
              metrics.recentSyncs.map((sync, index) => {
                // Extract contact information for better display
                const targetContact = (sync as any).target_contact || 'Unknown Contact';
                const description = (sync as any).description || sync.sync_type;
                const realDuration = (sync as any).real_duration || 0;
                
                return (
                  <div key={sync.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(sync.status)}
                      <div> 
                        <p className="text-xs text-gray-900">
                          Via {sync.account_email} • {sync.started_at ? format(new Date(sync.started_at), 'MMM d, HH:mm') : 'Unknown time'}
                        </p>
                        {description !== sync.sync_type && (
                          <p className="text-xs text-gray-500 italic">{description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {sync.emails_synced !== null && (
                        <p className="text-sm font-medium">{sync.emails_synced} emails</p>
                      )}
                      {realDuration > 0 && (
                        <p className="text-xs text-gray-500">
                          {formatDuration(realDuration)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>


    </div>
  );
} 