'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthDebug } from '@/hooks/useAuthDebug';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function AuthDebugPanel() {
  const { user, session, loading } = useAuth();
  const { debugInfo, isDebugging, runDebugCheck } = useAuthDebug();
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setShowDebug(true)}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm"
        >
          🔐 Auth Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Authentication Debug</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={runDebugCheck}
                disabled={isDebugging}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`h-3 w-3 ${isDebugging ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={() => setShowDebug(false)}
                size="sm"
                variant="ghost"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current Auth State */}
          <div>
            <h4 className="text-xs font-semibold mb-2">Current State</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {loading ? (
                  <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                ) : user ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span>Loading: {loading ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                {user ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span>User: {user ? user.email : 'None'}</span>
              </div>
              <div className="flex items-center gap-2">
                {session ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span>Session: {session ? 'Active' : 'None'}</span>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div>
              <h4 className="text-xs font-semibold mb-2">Storage Analysis</h4>
              <div className="space-y-2 text-xs">
                {/* localStorage */}
                <div className="flex items-center gap-2">
                  {debugInfo.localStorage.hasToken ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>localStorage: {debugInfo.localStorage.hasToken ? 'Has Token' : 'No Token'}</span>
                </div>
                
                {/* Cookies */}
                <div className="flex items-center gap-2">
                  {debugInfo.cookies.hasAccessToken ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>Access Cookie: {debugInfo.cookies.hasAccessToken ? 'Yes' : 'No'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {debugInfo.cookies.hasRefreshToken ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>Refresh Cookie: {debugInfo.cookies.hasRefreshToken ? 'Yes' : 'No'}</span>
                </div>
                
                {/* Session */}
                <div className="flex items-center gap-2">
                  {debugInfo.session.exists ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>Session: {debugInfo.session.exists ? 'Exists' : 'Missing'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {debugInfo?.errors && debugInfo.errors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2 text-red-600">Issues Found</h4>
              <div className="space-y-1">
                {debugInfo.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h4 className="text-xs font-semibold mb-2">Quick Actions</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="text-xs"
              >
                Clear Storage
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  console.log('Current auth state:', { user, session, loading });
                  console.log('localStorage:', localStorage.getItem('supabase.auth.token'));
                  console.log('Cookies:', document.cookie);
                }}
                className="text-xs"
              >
                Log State
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
