import { getAllConnectedItems } from "@/lib/db/queries";
import ConnectedItemsList from "@/components/settings/ConnectedItemsList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Connections",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ConnectionsPage() {
  const items = await getAllConnectedItems();

  console.log("Items:", items);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Manage Connections</h1>
        <p className="text-muted-foreground mt-1">
          View and reauthorize your connected financial institutions.
        </p>
      </div>
      <ConnectedItemsList items={items} />
    </div>
  );
}
