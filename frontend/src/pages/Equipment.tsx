import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Users, FolderOpen } from 'lucide-react';
import EquipmentCategories from '../components/equipment/EquipmentCategories';
import EquipmentList from '../components/equipment/EquipmentList';
import EquipmentAssignments from '../components/equipment/EquipmentAssignments';

const Equipment: React.FC = () => {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground">
            Manage asset categories, items, and assignments
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Categories</CardTitle>
              <CardDescription>
                Manage asset categories to organize your inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EquipmentCategories />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Inventory</CardTitle>
              <CardDescription>
                Manage all asset items and their details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EquipmentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Assignments</CardTitle>
              <CardDescription>
                View and manage asset assignments to employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EquipmentAssignments />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Equipment;