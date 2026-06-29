import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Loader2, Filter, Search } from 'lucide-react';
import { useEquipment, useEquipmentCategories } from '../../hooks/useEquipment';
import { Equipment, EquipmentRequest } from '../../types';
import { TableSkeleton } from '../skeletons/TableSkeleton';
import { ServerPagination } from '../ServerPagination';
import { SearchableSelect } from '../SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import { formatPurchaseDate } from '../../utils/dateUtils';
import { SortableTableHead, useSearchSort, useCategorySelect } from './shared';

type EquipmentSortCol = 'name' | 'category' | 'price' | 'remaining_quantity' | 'purchase_date';

const DEFAULT_FORM: EquipmentRequest = {
  name: '',
  category_id: '',
  is_shared: false,
  price: 0,
  total_quantity: 1,
  purchase_date: new Date().toISOString().split('T')[0],
};

const parseDateForForm = (dateStr?: string): string => {
  if (!dateStr || dateStr.startsWith('0001-01-01')) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1900) return d.toISOString().split('T')[0];
  } catch { /* fall through */ }
  return new Date().toISOString().split('T')[0];
};

const EquipmentList: React.FC = () => {
  const {
    searchQuery, debouncedSearch, currentPage, pageSize, sortBy, sortDir,
    params, onSearch, onPageChange, onPageSizeChange, handleSort,
  } = useSearchSort<EquipmentSortCol>();

  const {
    equipment, loading, fetching, createEquipment, updateEquipment, deleteEquipment,
    fetchEquipment, fetchEquipmentByCategory, totalItems, totalPages,
  } = useEquipment(params);

  // Single server-driven category select — used for filter toolbar and form dialogs
  const categorySelect = useCategorySelect();

  // Fetch all categories for the table's Category column name lookup
  // Stable params via useMemo — prevents infinite re-fetch from new object reference
  const allCategoriesParams = useMemo(() => ({ page: 1, page_size: 500 }), []);
  const { categories: allCategories } = useEquipmentCategories(allCategoriesParams);

  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<EquipmentRequest>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const resetForm = () => { setFormData(DEFAULT_FORM); setEditingEquipment(null); };

  const validateForm = (): boolean => {
    if (!formData.name.trim() || !formData.category_id) {
      toast({ title: '⚠️ Missing Information', description: 'Please fill in equipment name and select a category', className: 'border-amber-200 bg-amber-50 text-amber-800' });
      return false;
    }
    if (formData.purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.purchase_date)) {
      toast({ title: '📅 Date Format Issue', description: 'Please select a valid purchase date', className: 'border-amber-200 bg-amber-50 text-amber-800' });
      return false;
    }
    return true;
  };

  const buildRequestData = () => ({
    ...formData,
    purchase_date: formData.purchase_date ? `${formData.purchase_date}T00:00:00Z` : undefined,
  });

  const handleCreate = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const result = await createEquipment(buildRequestData());
    if (result.success) {
      toast({ title: '✅ Equipment Created', description: 'New equipment has been added successfully', className: 'border-green-200 bg-green-50 text-green-800' });
      setIsCreateOpen(false);
      resetForm();
    } else {
      toast({ title: '❌ Creation Failed', description: result.error || 'Unable to create equipment.', className: 'border-red-200 bg-red-50 text-red-800' });
    }
    setIsSubmitting(false);
  };

  const handleEdit = (item: Equipment) => {
    setEditingEquipment(item);
    setFormData({
      name: item.name,
      category_id: item.category_id,
      is_shared: item.is_shared,
      price: item.price,
      total_quantity: item.total_quantity,
      purchase_date: parseDateForForm(item.purchase_date),
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingEquipment?.id || !validateForm()) return;
    setIsSubmitting(true);
    const result = await updateEquipment(editingEquipment.id, buildRequestData());
    if (result.success) {
      toast({ title: '✅ Equipment Updated', description: 'Equipment information has been saved successfully', className: 'border-green-200 bg-green-50 text-green-800' });
      setIsEditOpen(false);
      resetForm();
    } else {
      toast({ title: '❌ Update Failed', description: result.error || 'Unable to update equipment.', className: 'border-red-200 bg-red-50 text-red-800' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteEquipment(id);
    if (result.success) {
      toast({ title: '🗑️ Equipment Deleted', description: 'Equipment has been removed successfully', className: 'border-blue-200 bg-blue-50 text-blue-800' });
    } else {
      toast({ title: '❌ Deletion Failed', description: result.error || 'Unable to delete equipment.', className: 'border-red-200 bg-red-50 text-red-800' });
    }
  };

  const handleFilterChange = (categoryId: string) => {
    setFilterCategory(categoryId);
    onPageChange(1);
    if (categoryId === 'all') {
      fetchEquipment({ ...params, page: 1 });
    } else {
      fetchEquipmentByCategory(categoryId, { ...params, page: 1 });
    }
  };

  // Resolve category name — uses the full category list, not just dropdown options
  const getCategoryName = (categoryId: string) =>
    allCategories.find((c) => c.id === categoryId)?.name || categoryId;

  // Inline form fields — NOT a nested component to avoid remount on every keystroke
  const equipmentFormFields = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="eq-name">Name *</Label>
        <Input
          id="eq-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter equipment name"
        />
      </div>
      <div>
        <Label>Category *</Label>
        {/* Server-driven — same hook instance as the filter, no extra fetch */}
        <SearchableSelect
          options={categorySelect.options}
          value={formData.category_id}
          onValueChange={(v) => setFormData({ ...formData, category_id: v })}
          placeholder="Select category"
          searchPlaceholder="Search categories..."
          showAllOption={false}
          className="w-full"
          loading={categorySelect.loading}
          onSearchChange={categorySelect.onSearch}
          hasMore={categorySelect.hasMore}
          onLoadMore={categorySelect.loadMore}
        />
      </div>
      <div>
        <Label htmlFor="eq-price">Price *</Label>
        <Input
          id="eq-price"
          type="number"
          min="0"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
          placeholder="Enter price"
        />
      </div>
      <div>
        <Label htmlFor="eq-qty">Total Quantity *</Label>
        <Input
          id="eq-qty"
          type="number"
          min="1"
          value={formData.total_quantity}
          onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 1 })}
        />
      </div>
      <div>
        <Label htmlFor="eq-date">Purchase Date</Label>
        <Input
          id="eq-date"
          type="date"
          value={formData.purchase_date}
          onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="eq-shared"
          checked={formData.is_shared}
          onCheckedChange={(checked) => setFormData({ ...formData, is_shared: checked })}
        />
        <Label htmlFor="eq-shared">Is Shared</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <h3 className="text-lg font-medium">Equipment</h3>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              className="pl-9 pr-9"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
            />
            {searchQuery && searchQuery !== debouncedSearch && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <SearchableSelect
              options={categorySelect.options}
              value={filterCategory}
              onValueChange={handleFilterChange}
              placeholder="Filter by category"
              searchPlaceholder="Search categories..."
              allOptionLabel="All Categories"
              showAllOption
              className="w-[200px]"
              loading={categorySelect.loading}
              onSearchChange={categorySelect.onSearch}
              hasMore={categorySelect.hasMore}
              onLoadMore={categorySelect.loadMore}
            />
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Equipment</DialogTitle>
              <DialogDescription>Add a new equipment item to your inventory.</DialogDescription>
            </DialogHeader>
            {equipmentFormFields}
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        {loading ? (
          <TableSkeleton rows={5} columns={7} showActions />
        ) : (
          <div className={fetching ? 'opacity-60 pointer-events-none transition-opacity duration-150' : ''}>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead column="name" label="Name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead column="category" label="Category" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead column="price" label="Price" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead>Total Qty</TableHead>
                  <SortableTableHead column="remaining_quantity" label="Available" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead>Shared</TableHead>
                  <SortableTableHead column="purchase_date" label="Purchase Date" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No equipment found. Create your first equipment item to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  equipment.map((item) => item && (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getCategoryName(item.category_id)}</TableCell>
                      <TableCell>${item.price ?? 0}</TableCell>
                      <TableCell>{item.total_quantity ?? 0}</TableCell>
                      <TableCell>{item.remaining_quantity ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={item.is_shared ? 'default' : 'outline'}>
                          {item.is_shared ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPurchaseDate(item.purchase_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
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
                                <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{item.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => item.id && handleDelete(item.id)}
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

        {!loading && equipment.length > 0 && (
          <ServerPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            itemName="equipment items"
          />
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Equipment</DialogTitle>
            <DialogDescription>Update the equipment information.</DialogDescription>
          </DialogHeader>
          {equipmentFormFields}
          <DialogFooter className="border-t pt-4">
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

export default EquipmentList;
