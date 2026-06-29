import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, dateInputToISO } from "@/lib/dateUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useHolidays } from "@/hooks/useSettings";
import { Calendar, Trash2, Plus, Loader2 } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Holidays = () => {
  const { holidays = [], isLoading: isLoadingHolidays, addHoliday, isAdding, deleteHoliday, isDeleting } = useHolidays();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHolidayId, setSelectedHolidayId] = useState<string | null>(null);
  
  // Form state for adding holiday
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    date: "",
    type: "HOLIDAY",
  });

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert date to ISO 8601 format with IST timezone
    // Input format: "2025-11-28" (from date input)
    // Output format: "2025-11-28T00:00:00+05:30" (ISO 8601 IST)
    const isoDate = dateInputToISO(holidayForm.date);
    
    addHoliday({
      name: holidayForm.name,
      date: isoDate,
      type: holidayForm.type,
    });
    
    // Reset form and close dialog
    setHolidayForm({ name: "", date: "", type: "HOLIDAY" });
    setDialogOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setSelectedHolidayId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedHolidayId) {
      deleteHoliday(selectedHolidayId);
    }
    setDeleteDialogOpen(false);
    setSelectedHolidayId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Holiday Management</h1>
        <p className="text-muted-foreground">Manage company holidays and observances</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Company Holidays
              </CardTitle>
              <CardDescription>Manage public holidays and observances</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle>Add New Holiday</DialogTitle>
                  <DialogDescription>Enter holiday details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddHoliday} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="holidayName">Holiday Name</Label>
                    <Input 
                      id="holidayName" 
                      placeholder="e.g., Diwali" 
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holidayDate">Date</Label>
                    <Input 
                      id="holidayDate" 
                      type="date" 
                      value={holidayForm.date}
                      onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holidayType">Type</Label>
                    <Input 
                      id="holidayType" 
                      placeholder="HOLIDAY" 
                      value={holidayForm.type}
                      onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: HOLIDAY
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isAdding}>
                      {isAdding ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                      ) : (
                        "Add Holiday"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingHolidays ? (
            <TableSkeleton rows={6} columns={4} showActions={true} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!holidays || holidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No holidays added yet. Click "Add Holiday" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">{holiday.name}</TableCell>
                      <TableCell>
                        {formatDate(holiday.date, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        {holiday.day || formatDate(holiday.date, { weekday: 'long' })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary text-primary-foreground">
                          {holiday.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(holiday.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this holiday? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Holidays;