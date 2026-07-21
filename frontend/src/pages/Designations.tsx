import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useDesignations } from "@/hooks/useDesignations";
import { Briefcase, Trash2, Plus, Loader2, Pencil, Search, Users, Building2, Filter, Keyboard } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { canManageDesignations } from "@/lib/permissions";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { ApiError } from "@/lib/api";

// 403/401 → user is authenticated but doesn't have write permission
function isAccessDenied(err: Error | null): boolean {
  return err instanceof ApiError && (err.status === 403 || err.status === 401);
}

const Designations = () => {
  const { currentUser } = useAuth();
  const {
    designations, loading, error, fetchDesignations,
    createDesignation, updateDesignation, deleteDesignation,
  } = useDesignations();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<{
    id: string; name: string; description?: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createForm, setCreateForm] = useState({ designation_name: "", description: "" });
  const [editForm, setEditForm] = useState({ designation_name: "", description: "" });

  // canManage = role allows it AND no 403 from the API
  const canManage =
    (currentUser ? canManageDesignations(currentUser.role) : false) &&
    !isAccessDenied(error);

  const filteredDesignations = useMemo(() => {
    if (!searchQuery.trim()) return designations;
    const q = searchQuery.toLowerCase();
    return designations.filter(
      (d) =>
        d.designation_name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)),
    );
  }, [designations, searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && canManage) {
        e.preventDefault();
        setCreateDialogOpen(true);
      }
      if (e.key === "Escape") {
        setCreateDialogOpen(false);
        setEditDialogOpen(false);
        setDeleteDialogOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canManage]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.designation_name.trim()) return;
    const ok = await createDesignation({
      designation_name: createForm.designation_name.trim(),
      description: createForm.description.trim() || undefined,
    });
    if (ok) {
      setCreateForm({ designation_name: "", description: "" });
      setCreateDialogOpen(false);
    }
  };

  const handleEditClick = (d: { id: string; designation_name: string; description?: string }) => {
    setSelectedDesignation({ id: d.id, name: d.designation_name, description: d.description });
    setEditForm({ designation_name: d.designation_name, description: d.description || "" });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesignation || !editForm.designation_name.trim()) return;
    const ok = await updateDesignation(selectedDesignation.id, {
      designation_name: editForm.designation_name.trim(),
      description: editForm.description.trim() || undefined,
    });
    if (ok) { setEditDialogOpen(false); setSelectedDesignation(null); }
  };

  const handleDeleteClick = (d: { id: string; designation_name: string }) => {
    setSelectedDesignation({ id: d.id, name: d.designation_name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedDesignation) return;
    await deleteDesignation(selectedDesignation.id);
    setDeleteDialogOpen(false);
    setSelectedDesignation(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            Designations
          </h1>
          <p className="text-muted-foreground mt-2">Manage employee designations and job titles</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{designations.length} Total</span>
          </div>
          {canManage && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Designation
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="flex items-center gap-2">
                    <Keyboard className="h-3 w-3" />
                    Ctrl+N
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* ── Search bar — hidden when access is denied ── */}
      {!isAccessDenied(error) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search designations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>{filteredDesignations.length} of {designations.length} designations</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main table card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Designations
          </CardTitle>
          <CardDescription>
            {searchQuery
              ? `Showing ${filteredDesignations.length} results for "${searchQuery}"`
              : "View and manage company designations"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading && designations.length === 0 ? (
            <TableSkeleton rows={5} columns={3} showActions={canManage} />
          ) : error ? (
            // ← Reusable ErrorDisplay handles 403 → "Access Denied" styling automatically
            <ErrorDisplay error={error} onRetry={() => fetchDesignations()} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Designation</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDesignations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 4 : 3} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-muted rounded-full">
                          <Briefcase className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-muted-foreground">
                          {searchQuery ? "No designations match your search" : "No designations found"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery
                            ? "Try adjusting your search terms"
                            : canManage
                            ? 'Click "Add Designation" to create your first one.'
                            : "Contact your administrator to add designations."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDesignations.map((designation) => (
                    <TableRow key={designation.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-md">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                          <p className="font-medium">{designation.designation_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {designation.description ? (
                          <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                            {designation.description}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                          Active
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(designation)} className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(designation)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create dialog ── */}
      {canManage && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-md"><Plus className="h-4 w-4 text-primary" /></div>
                Add New Designation
              </DialogTitle>
              <DialogDescription>Create a new designation for employees in your organization</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="designation_name">Designation Name <span className="text-destructive">*</span></Label>
                  <Input id="designation_name" placeholder="e.g., Senior Software Engineer" value={createForm.designation_name} onChange={(e) => setCreateForm({ ...createForm, designation_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Brief description of the role and responsibilities" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={3} className="resize-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><Plus className="mr-2 h-4 w-4" />Create Designation</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Edit dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-md"><Pencil className="h-4 w-4 text-blue-600" /></div>
              Edit Designation
            </DialogTitle>
            <DialogDescription>Update the designation details and information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_designation_name">Designation Name <span className="text-destructive">*</span></Label>
                <Input id="edit_designation_name" placeholder="e.g., Senior Software Engineer" value={editForm.designation_name} onChange={(e) => setEditForm({ ...editForm, designation_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea id="edit_description" placeholder="Brief description of the role and responsibilities" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : <><Pencil className="mr-2 h-4 w-4" />Update Designation</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-md"><Trash2 className="h-5 w-5 text-destructive" /></div>
              <AlertDialogTitle>Delete Designation</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-4">
              Are you sure you want to delete <strong>"{selectedDesignation?.name}"</strong>?
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> Employees assigned to this designation will have it removed. This cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" />Delete Designation</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Designations;
