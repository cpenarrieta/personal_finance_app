"use client";

import PlaidLinkButton from "@/components/sync/PlaidLinkButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Building2 } from "lucide-react";
import type { ConnectedItemsListProps } from "@/types";

export default function ConnectedItemsList({ items }: ConnectedItemsListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No connected accounts found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const needsReauth = item.status === "ITEM_LOGIN_REQUIRED";
        const institutionName = item.institution?.name || "Unknown Institution";

        return (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {item.institution?.logoUrl ? (
                    <img
                      src={item.institution.logoUrl}
                      alt={institutionName}
                      className="w-12 h-12 rounded-lg object-contain bg-muted p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-xl">{institutionName}</CardTitle>
                    <CardDescription>
                      {item.accounts.length} account{item.accounts.length !== 1 ? "s" : ""} connected
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {needsReauth && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Reauth Required
                    </Badge>
                  )}
                  <PlaidLinkButton
                    accessToken={item.accessToken}
                    buttonText={needsReauth ? "Reauthorize" : "Update"}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Connected Accounts:</p>
                <div className="grid gap-2">
                  {item.accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex justify-between items-center p-2 rounded-md bg-muted/50"
                    >
                      <span className="text-sm text-foreground">{account.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {account.subtype || account.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
