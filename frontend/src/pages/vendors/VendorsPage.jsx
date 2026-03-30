import { Users } from "lucide-react";
import { VendorTable } from "../../components/vendors/VendorTable";

export function VendorsPage() {
  return (
    <div className="flex flex-col space-y-6 p-6 lg:p-8 max-w-350 mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor directory and contacts
          </p>
        </div>
      </div>

      {/* Vendor Table */}
      <VendorTable />
    </div>
  );
}
