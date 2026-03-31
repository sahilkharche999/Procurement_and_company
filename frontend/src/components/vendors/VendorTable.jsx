import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Plus, MoreHorizontal, Trash2, Pencil, Loader2, AlertCircle } from "lucide-react";
import { useGetAllVendors } from "../../redux/hooks/vendors/useGetAllVendors";
import { useCreateVendor } from "../../redux/hooks/vendors/useCreateVendor";
import { useUpdateVendor } from "../../redux/hooks/vendors/useUpdateVendor";
import { useDeleteVendor } from "../../redux/hooks/vendors/useDeleteVendor";

export function VendorTable() {
  const { vendors, total, loading, error, search, setSearch, refetch } =
    useGetAllVendors();
  const { create, loading: createLoading } = useCreateVendor();
  const { update, loading: updateLoading } = useUpdateVendor();
  const { remove, loading: deleteLoading } = useDeleteVendor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    contact_number: "",
    email: "",
    description: "",
  });

  const handleOpenDialog = (vendor = null) => {
    if (vendor) {
      setEditingId(vendor._id);
      setFormData({
        company_name: vendor.company_name || "",
        contact_name: vendor.contact_name || "",
        contact_number: vendor.contact_number || "",
        email: vendor.email || "",
        description: vendor.description || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        company_name: "",
        contact_name: "",
        contact_number: "",
        email: "",
        description: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formData.company_name.trim() || !formData.contact_name.trim()) {
      alert("Company name and contact name are required");
      return;
    }

    if (editingId) {
      const result = await update(editingId, formData);
      if (result.success) {
        handleCloseDialog();
        refetch();
      } else {
        alert("Failed to update vendor: " + (result.error || "Unknown error"));
      }
    } else {
      const result = await create(formData);
      if (result.success) {
        handleCloseDialog();
        refetch();
      } else {
        alert("Failed to create vendor: " + (result.error || "Unknown error"));
      }
    }
  };

  const handleDelete = async (vendorId) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      const result = await remove(vendorId);
      if (result.success) {
        refetch();
      } else {
        alert("Failed to delete vendor: " + (result.error || "Unknown error"));
      }
    }
  };

  const isSaving = createLoading || updateLoading;

  return (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search vendors by name, contact, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button
          onClick={() => handleOpenDialog()}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-700">Error loading vendors</p>
            <p className="text-red-600/80 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="w-32 font-semibold text-gray-900">
                Company
              </TableHead>
              <TableHead className="w-28 font-semibold text-gray-900">
                Contact
              </TableHead>
              <TableHead className="w-32 font-semibold text-gray-900">
                Phone
              </TableHead>
              <TableHead className="font-semibold text-gray-900">
                Email
              </TableHead>
              <TableHead className="w-40 font-semibold text-gray-900">
                Description
              </TableHead>
              <TableHead className="w-16 text-right font-semibold text-gray-900">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan="6" className="h-24 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading vendors...
                  </div>
                </TableCell>
              </TableRow>
            ) : vendors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan="6"
                  className="h-24 text-center text-gray-500"
                >
                  {search ? "No vendors match your search" : "No vendors yet. Click 'Add Vendor' to create one."}
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {vendor.company_name}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {vendor.contact_name}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {vendor.contact_number}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {vendor.email ? (
                      <a
                        href={`mailto:${vendor.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {vendor.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm line-clamp-2">
                    {vendor.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleOpenDialog(vendor)}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(vendor._id)}
                          disabled={deleteLoading}
                          className="gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {!error && (
        <div className="text-sm text-gray-600">
          Showing {vendors.length} of {total} vendors
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Vendor" : "Add New Vendor"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Company Name *
              </label>
              <Input
                placeholder="Company name"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                className="rounded-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Contact Name *
              </label>
              <Input
                placeholder="Contact person name"
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                className="rounded-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Contact Number *
              </label>
              <Input
                placeholder="Phone number"
                value={formData.contact_number}
                onChange={(e) =>
                  setFormData({ ...formData, contact_number: e.target.value })
                }
                className="rounded-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Email
              </label>
              <Input
                placeholder="Email address"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="rounded-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Description
              </label>
              <textarea
                placeholder="Vendor description or notes"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Vendor"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
