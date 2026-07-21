import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Package } from 'lucide-react';
import { useEmployeeEquipment } from '../../hooks/useEmployeeEquipment';
import { ErrorDisplay } from '@/components/ErrorDisplay';

interface EmployeeEquipmentDashboardProps {
  employeeId: string;
  employeeName?: string;
}

const EmployeeEquipmentDashboard: React.FC<EmployeeEquipmentDashboardProps> = ({ 
  employeeId, 
  employeeName 
}) => {
  const { assignments, loading, error, refetch } = useEmployeeEquipment(employeeId);

  // Don't render anything if no employeeId is provided
  if (!employeeId) {
    return (
      <div className="text-center text-muted-foreground p-4">
        <p>⚠️ No employee ID provided</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading assets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        <h3 className="text-lg font-medium">
          Assigned Assets
          {employeeName && <span className="text-muted-foreground"> - {employeeName}</span>}
        </h3>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Assigned By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={3} className="py-4">
                  <ErrorDisplay
                    error={error}
                    onRetry={refetch}
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : !Array.isArray(assignments) || assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground/50" />
                    <p>No assets assigned to this employee.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment, index) => (
                assignment && (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{assignment.equipment_name}</TableCell>
                    <TableCell>{assignment.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {assignment.approved_by_name}
                    </TableCell>
                  </TableRow>
                )
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default EmployeeEquipmentDashboard;