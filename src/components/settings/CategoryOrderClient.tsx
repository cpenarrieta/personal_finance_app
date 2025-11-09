"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CategoryGroupType, type CategoryForClient } from "@/types";

interface CategoryOrderClientProps {
  categories: CategoryForClient[]
}

export function CategoryOrderClient({
  categories: initialCategories,
}: CategoryOrderClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryForClient[]>(initialCategories);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Group categories by groupType and sort within each group
  const grouped = useMemo(() => {
    const groups = new Map<CategoryGroupType, CategoryForClient[]>();
    for (const cat of categories) {
      const group = cat.groupType || CategoryGroupType.EXPENSES;
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(cat);
    }

    // Sort categories within each group by displayOrder
    for (const [groupType, cats] of groups) {
      groups.set(
        groupType,
        cats.sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999))
      );
    }

    return groups;
  }, [categories]);

  const groupOrder = [CategoryGroupType.EXPENSES, CategoryGroupType.INCOME, CategoryGroupType.INVESTMENT];

  const moveUp = (categoryId: string) => {
    setCategories((prevCategories) => {
      const cat = prevCategories.find((c) => c.id === categoryId);
      if (!cat) return prevCategories;

      // Get all categories in the same group, sorted by displayOrder
      const groupCats = prevCategories
        .filter((c) => (c.groupType || CategoryGroupType.EXPENSES) === (cat.groupType || CategoryGroupType.EXPENSES))
        .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));

      const index = groupCats.findIndex((c) => c.id === categoryId);
      if (index <= 0) return prevCategories;

      // Swap displayOrder with previous category
      const prevCat = groupCats[index - 1];
      const currentOrder = cat.displayOrder ?? index;
      const prevOrder = prevCat?.displayOrder ?? (index - 1);

      return prevCategories.map((c) => {
        if (c.id === categoryId) {
          return { ...c, displayOrder: prevOrder };
        }
        if (c.id === prevCat?.id) {
          return { ...c, displayOrder: currentOrder };
        }
        return c;
      });
    });
  };

  const moveDown = (categoryId: string) => {
    setCategories((prevCategories) => {
      const cat = prevCategories.find((c) => c.id === categoryId);
      if (!cat) return prevCategories;

      // Get all categories in the same group, sorted by displayOrder
      const groupCats = prevCategories
        .filter((c) => (c.groupType || CategoryGroupType.EXPENSES) === (cat.groupType || CategoryGroupType.EXPENSES))
        .sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));

      const index = groupCats.findIndex((c) => c.id === categoryId);
      if (index === -1 || index >= groupCats.length - 1) return prevCategories;

      // Swap displayOrder with next category
      const nextCat = groupCats[index + 1];
      const currentOrder = cat.displayOrder ?? index;
      const nextOrder = nextCat?.displayOrder ?? (index + 1);

      return prevCategories.map((c) => {
        if (c.id === categoryId) {
          return { ...c, displayOrder: nextOrder };
        }
        if (c.id === nextCat?.id) {
          return { ...c, displayOrder: currentOrder };
        }
        return c;
      });
    });
  };

  const changeGroup = (categoryId: string, newGroupType: CategoryGroupType) => {
    const updated = categories.map((c) =>
      c.id === categoryId
        ? { ...c, groupType: newGroupType, displayOrder: 9999 }
        : c
    );
    setCategories(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Update all categories with new groupType and displayOrder
      const updates = categories.map((cat) => ({
        id: cat.id,
        groupType: cat.groupType,
        displayOrder: cat.displayOrder,
      }));

      const response = await fetch("/api/categories/update-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setSaveMessage({ type: "success", text: "Category order saved successfully!" });
      router.refresh();
    } catch (error) {
      console.error("Error saving:", error);
      setSaveMessage({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {saveMessage && (
        <Alert variant={saveMessage.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{saveMessage.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Category Groups */}
      {groupOrder.map((groupType) => {
        const groupCats = grouped.get(groupType) || [];
        if (groupCats.length === 0) return null;

        return (
          <div key={groupType} className="bg-card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{groupType}</h2>

            <div className="space-y-2">
              {groupCats.map((cat, index) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-mono w-8">
                      {index + 1}.
                    </span>
                    <span>{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Move up/down */}
                    <Button
                      onClick={() => moveUp(cat.id)}
                      disabled={index === 0}
                      variant="outline"
                      size="sm"
                    >
                      ↑
                    </Button>
                    <Button
                      onClick={() => moveDown(cat.id)}
                      disabled={index === groupCats.length - 1}
                      variant="outline"
                      size="sm"
                    >
                      ↓
                    </Button>

                    {/* Change group */}
                    <select
                      value={groupType}
                      onChange={(e) => changeGroup(cat.id, e.target.value as CategoryGroupType)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      {groupOrder.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
