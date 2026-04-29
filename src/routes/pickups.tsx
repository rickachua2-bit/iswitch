import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/pickups")({
  component: PickupsLayout,
});

function PickupsLayout() {
  return <Outlet />;
}
