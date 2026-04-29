import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { OpsDashboard } from "@/components/admin/OpsDashboard";
import { AdminPageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/operations")({
  head: () => ({ meta: [{ title: "Operations — Admin" }] }),
  component: () => (
    <div>
      <AdminPageHeader icon={Activity} title="Operations" description="Provider health, inventory, crawl jobs, bookings, and live markup controls." />
      <OpsDashboard />
    </div>
  ),
});
