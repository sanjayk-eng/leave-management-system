import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Clock, Save, AlertCircle, Check } from 'lucide-react';
import { useLeaveTiming } from '../hooks/useLeaveTiming';
import { useAuth } from '../hooks/useAuth';
import { LeaveTiming, UpdateLeaveTimingRequest } from '../types';

export const LeaveTimingSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const { leaveTimings, loading, error, updateLeaveTiming } = useLeaveTiming(true);

  const [editingTiming, setEditingTiming] = useState<{ [key: number]: string }>({});
  const [updating, setUpdating] = useState<{ [key: number]: boolean }>({});
  const [recentlyUpdated, setRecentlyUpdated] = useState<{ [key: number]: boolean }>({});

  // Check if user has permission to access leave timing settings
  const hasPermission =
    currentUser?.role === 'SUPERADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'HR';

  if (!hasPermission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Leave Timing Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-orange-500 mb-3" />
              <p className="text-gray-600 font-medium">Access Restricted</p>
              <p className="text-sm text-gray-500 mt-1">
                Only Super Admins and Admins can manage leave timing settings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleTimingChange = (id: number, value: string) => {
    setEditingTiming(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSave = async (timing: LeaveTiming) => {
    const newTiming = editingTiming[timing.id];
    if (!newTiming || newTiming === timing.timing) return;

    setUpdating(prev => ({ ...prev, [timing.id]: true }));

    const request: UpdateLeaveTimingRequest = { id: timing.id, timing: newTiming };
    const success = await updateLeaveTiming(request);

    if (success) {
      setEditingTiming(prev => {
        const updated = { ...prev };
        delete updated[timing.id];
        return updated;
      });
      setRecentlyUpdated(prev => ({ ...prev, [timing.id]: true }));
      setTimeout(() => {
        setRecentlyUpdated(prev => ({ ...prev, [timing.id]: false }));
      }, 3000);
    }

    setUpdating(prev => ({ ...prev, [timing.id]: false }));
  };

  const getTimingTypeColor = (type: string) => {
    switch (type) {
      case 'FIRST_HALF':
        return 'bg-blue-100 text-blue-800';
      case 'SECOND_HALF':
        return 'bg-purple-100 text-purple-800';
      case 'EARLY':
        return 'bg-orange-100 text-orange-800';
      case 'FULL':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimingTypeLabel = (type: string) => {
    switch (type) {
      case 'FIRST_HALF':
        return 'First Half';
      case 'SECOND_HALF':
        return 'Second Half';
      case 'EARLY':
        return 'Early Leave';
      case 'FULL':
        return 'Full Day';
      default:
        return type;
    }
  };

  if (loading && leaveTimings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Leave Timing Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading leave timings...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Leave Timing Settings
        </CardTitle>
        <p className="text-sm text-gray-600">
          Configure timing slots for different leave types
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {leaveTimings.map((timing) => (
            <div key={timing.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge className={getTimingTypeColor(timing.type)}>
                    {getTimingTypeLabel(timing.type)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor={`timing-${timing.id}`}>
                    Timing (e.g., 10:00-13:30)
                  </Label>
                  <Input
                    id={`timing-${timing.id}`}
                    value={editingTiming[timing.id] ?? timing.timing}
                    onChange={(e) => handleTimingChange(timing.id, e.target.value)}
                    placeholder="HH:MM-HH:MM"
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSave(timing)}
                    disabled={
                      updating[timing.id] ||
                      !editingTiming[timing.id] ||
                      editingTiming[timing.id] === timing.timing
                    }
                    size="sm"
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      recentlyUpdated[timing.id]
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : ''
                    }`}
                  >
                    {updating[timing.id] ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Saving...
                      </>
                    ) : recentlyUpdated[timing.id] ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Last updated: {timing.updated_at ? new Date(timing.updated_at).toLocaleString() : 'Never'}
                </div>
                {recentlyUpdated[timing.id] && (
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium animate-in fade-in-50 slide-in-from-right-2 duration-300">
                    <Check className="h-3 w-3" />
                    Successfully updated!
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {leaveTimings.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No leave timings configured
          </div>
        )}
      </CardContent>
    </Card>
  );
};