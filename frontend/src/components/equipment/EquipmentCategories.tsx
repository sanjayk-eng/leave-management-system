import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Loader2, Search } from 'lucide-react';
import { useEquipmentCategories } from '../../hooks/useEquipment';
import { EquipmentCategory, EquipmentCategoryRequest } from '../../types';
import { TableSkeleton } from '../skeletons/TableSkeleton';
import { ServerPagination } from '../ServerPagination';
import { useToast } from '@/hooks/use-toast';
import { SortableTableHead, useSearchSort } from './shared';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ApiError } from '@/lib/api';

const EMPTY_FORM: EquipmentCategoryRequest = { name: '', description: '' };

// Returns true when the error is a 403 or 401 — no point showing write actions
function isAccessDenied(err: Error | null): boolean {
  return err instanceof ApiError && (err.status === 403 || err.status === 401);
}

const EquipmentCategories: React.FC = () => {
  const { searchQuery, debouncedSearch, currentPage, pageSize, sortBy, sortDir,
    params, onSearch, onPageChange, onPageSizeChange, handleSort } = useSearchSort<'name' | 'created_at'>();

  const {
    categories, loading, fetching, error, createCategory, updateCategory, deleteCategory,
    totalItems, totalPages, fetchCategories,
  } = useEquipmentCategories(params);

  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null);
  const [formData, setFormData] = useState<EquipmentCategoryRequest>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => { setFormData(EMPTY_FORM); setEditingCategory(null); };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await createCategory(formData);
    if (result.success) {
      toast({ title: 'Success', description: 'Category created successfully' });
      setIsCreateOpen(false);
      resetForm();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to create category', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleEdit = (category: EquipmentCategory) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '' });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingCategory?.id || !formData.name.trim()) {
      toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await updateCategory(editingCategory.id, formData);
    if (result.success) {
      toast({ title: 'Success', description: 'Category updated successfully' });
      setIsEditOpen(false);
      resetForm();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to update category', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCategory(id);
    if (result.success) {
      toast({ title: 'Success', description: 'Category deleted successfully' });
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to delete category', variant: 'destructive' });
    }
  };

  // Inline form fields — NOT a nested component to avoid remount on every keystroke
  const formFields = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="cat-name">Name *</Label>
        <Input
          id="cat-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter category name"
        />
      </div>
      <div>
        <Label htmlFor="cat-desc">Description</Label>
        <Textarea
          id="cat-desc"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter category description (optional)"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden when access is denied */}
      {!isAccessDenied(error) && (
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            className="pl-9 pr-9"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
          {searchQuery && searchQuery !== debouncedSearch && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Equipment Category</DialogTitle>
              <DialogDescription>Add a new category to organize your equipment inventory.</DialogDescription>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        {loading && categories.length === 0 ? (
          <TableSkeleton rows={5} columns={3} showActions />
        ) : error ? (
          <div className="p-4">
            <ErrorDisplay error={error} onRetry={() => fetchCategories(params)} />
          </div>
        ) : (
          <div className={fetching ? 'opacity-60 pointer-events-none transition-opacity duration-150' : ''}>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="name" label="Name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead>Description</TableHead>
                  <SortableTableHead column="created_at" label="Created" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No categories found. Create your first category to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => category && (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description || '-'}</TableCell>
                      <TableCell>
                        {category.created_at ? new Date(category.created_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => category.id && handleDelete(category.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && categories.length > 0 && (
          <ServerPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            itemName="categories"
          />
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Equipment Category</DialogTitle>
            <DialogDescription>Update the category information.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentCategories;
