import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Database, 
  Trash2, 
  RefreshCw, 
  Settings, 
  Monitor,
  Wifi,
  HardDrive,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface CacheInfo {
  name: string;
  itemCount: number;
  estimatedSizeKB: number;
  sampleUrls: string[];
  createdAt: string;
}

interface StorageInfo {
  localStorage: {
    itemCount: number;
    estimatedSizeKB: number;
    keys: string[];
  };
  sessionStorage: {
    itemCount: number;
    estimatedSizeKB: number;
    keys: string[];
  };
}

interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  lastCleared: string | null;
  totalCacheSize: number;
  performanceData: Array<{
    operation: string;
    duration: number;
    timestamp: string;
  }>;
}

interface PerformanceReport {
  timestamp: string;
  caches: CacheInfo[];
  storage: StorageInfo;
  performance: any;
  metrics: PerformanceMetrics;
  serviceWorker?: any;
  connection?: any;
}

declare global {
  interface Window {
    filmflexCache: {
      info: () => Promise<PerformanceReport>;
      clearAll: () => Promise<void>;
      forceUpdate: () => Promise<void>;
      enableDebug: () => void;
      disableDebug: () => void;
      getPerformanceSummary: () => any;
      startPerformanceMonitoring: () => void;
      stopPerformanceMonitoring: () => void;
      trackMetrics: (hit?: boolean) => void;
    };
  }
}

const PerformanceDashboard: React.FC = () => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Check if debug mode is enabled
    setDebugMode(localStorage.getItem('filmflex-debug') === 'true');
    
    // Initial load
    loadPerformanceData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = async () => {
    if (!window.filmflexCache) {
      console.warn('FilmFlex cache system not available');
      return;
    }

    setLoading(true);
    try {
      const data = await window.filmflexCache.info();
      setReport(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!window.filmflexCache) return;
    
    try {
      await window.filmflexCache.clearAll();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const handleForceUpdate = async () => {
    if (!window.filmflexCache) return;
    
    try {
      await window.filmflexCache.forceUpdate();
      await loadPerformanceData();
    } catch (error) {
      console.error('Failed to force update:', error);
    }
  };

  const toggleDebugMode = () => {
    if (!window.filmflexCache) return;
    
    if (debugMode) {
      window.filmflexCache.disableDebug();
      setDebugMode(false);
    } else {
      window.filmflexCache.enableDebug();
      setDebugMode(true);
    }
  };

  const togglePerformanceMonitoring = () => {
    if (!window.filmflexCache) return;
    
    if (isMonitoring) {
      window.filmflexCache.stopPerformanceMonitoring();
      setIsMonitoring(false);
    } else {
      window.filmflexCache.startPerformanceMonitoring();
      setIsMonitoring(true);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthStatus = () => {
    if (!report) return { status: 'unknown', color: 'gray' };
    
    const totalCaches = report.caches.length;
    const totalSize = report.caches.reduce((sum, cache) => sum + cache.estimatedSizeKB, 0);
    
    if (totalSize > 50000) { // > 50MB
      return { status: 'warning', color: 'yellow', message: 'High cache usage' };
    }
    
    if (totalCaches > 10) {
      return { status: 'warning', color: 'yellow', message: 'Many caches active' };
    }
    
    return { status: 'healthy', color: 'green', message: 'Performance optimal' };
  };

  const health = getHealthStatus();

  if (!window.filmflexCache) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Performance Dashboard Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            The FilmFlex cache system is not available. Please refresh the page to enable performance monitoring.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Monitor className="h-8 w-8" />
            FilmFlex Performance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor cache performance, storage usage, and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={health.color === 'green' ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" />
            {health.status}
          </Badge>
          <Button
            onClick={loadPerformanceData}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleClearCache} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Caches
            </Button>
            <Button onClick={handleForceUpdate} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Force SW Update
            </Button>
            <Button 
              onClick={toggleDebugMode} 
              variant={debugMode ? "default" : "outline"} 
              size="sm"
            >
              <Activity className="h-4 w-4 mr-2" />
              {debugMode ? 'Disable' : 'Enable'} Debug
            </Button>
            <Button 
              onClick={togglePerformanceMonitoring} 
              variant={isMonitoring ? "default" : "outline"} 
              size="sm"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Caches</p>
                  <p className="text-2xl font-bold">{report.caches.length}</p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cache Size</p>
                  <p className="text-2xl font-bold">
                    {formatBytes(report.caches.reduce((sum, cache) => sum + cache.estimatedSizeKB * 1024, 0))}
                  </p>
                </div>
                <HardDrive className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hit Rate</p>
                  <p className="text-2xl font-bold">
                    {report.metrics.cacheHits + report.metrics.cacheMisses > 0 
                      ? ((report.metrics.cacheHits / (report.metrics.cacheHits + report.metrics.cacheMisses)) * 100).toFixed(1)
                      : '0'}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                  <p className="text-sm font-bold">
                    {lastUpdate.toLocaleTimeString()}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cache Details */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.caches.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No caches found</p>
            ) : (
              <div className="space-y-4">
                {report.caches.map((cache, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{cache.name}</h3>
                      <Badge variant="outline">
                        {cache.itemCount} items
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Size:</span> {formatBytes(cache.estimatedSizeKB * 1024)}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {cache.createdAt}
                      </div>
                    </div>
                    {cache.sampleUrls.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Sample URLs:</p>
                        <div className="text-xs text-gray-500 space-y-1">
                          {cache.sampleUrls.map((url, urlIndex) => (
                            <div key={urlIndex} className="truncate">{url}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Storage Information */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Local Storage</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{report.storage.localStorage.itemCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{formatBytes(report.storage.localStorage.estimatedSizeKB * 1024)}</span>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Session Storage</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{report.storage.sessionStorage.itemCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{formatBytes(report.storage.sessionStorage.estimatedSizeKB * 1024)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Information */}
      {report && report.connection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Network Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Connection:</span>
                <p>{report.connection.effectiveType}</p>
              </div>
              <div>
                <span className="font-medium">Downlink:</span>
                <p>{report.connection.downlink}</p>
              </div>
              <div>
                <span className="font-medium">RTT:</span>
                <p>{report.connection.rtt}</p>
              </div>
              <div>
                <span className="font-medium">Save Data:</span>
                <p>{report.connection.saveData ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdate.toLocaleString()} • 
        Auto-refresh every 30 seconds • 
        Use browser console commands for advanced features
      </div>
    </div>
  );
};

export default PerformanceDashboard;