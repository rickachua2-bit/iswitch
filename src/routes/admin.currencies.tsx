import { createFileRoute } from "@tanstack/react-router";
import { DollarSign } from "lucide-react";
import { CurrencyAdmin } from "@/components/admin/CurrencyAdmin";
import { AdminPageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/currencies")({
  head: () => ({ meta: [{ title: "Currencies — Admin" }] }),
  component: () => (
    <div>
      <AdminPageHeader icon={DollarSign} title="Currencies" description="Enable currencies, set FX rates against USD, and order how they appear to customers." />
      <CurrencyAdmin />
    </div>
  ),
});
