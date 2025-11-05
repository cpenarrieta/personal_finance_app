import Link from "next/link";
import { format } from "date-fns";
import { formatAmount } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Transaction, PlaidAccount, Category, Subcategory } from "@prisma/client";

type TransactionWithRelations = Transaction & {
  account: PlaidAccount;
  category: Category | null;
  subcategory: Subcategory | null;
  tags: Array<{
    tagId: string;
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }>;
};

interface TransactionTableProps {
  transactions: TransactionWithRelations[];
  showCategory?: boolean;
}

export function TransactionTable({
  transactions,
  showCategory = true,
}: TransactionTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            {showCategory && <TableHead>Category</TableHead>}
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-muted/50">
              <TableCell className="whitespace-nowrap">
                {format(new Date(transaction.date), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Link
                  href={`/transactions/${transaction.id}`}
                  className="block hover:underline"
                >
                  <div className="font-medium">{transaction.name}</div>
                  {transaction.merchantName && (
                    <div className="text-sm text-muted-foreground">
                      {transaction.merchantName}
                    </div>
                  )}
                  {transaction.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {transaction.tags.map((tt) => (
                        <Badge
                          key={tt.tagId}
                          variant="secondary"
                          style={{ backgroundColor: tt.tag.color }}
                          className="text-xs text-white"
                        >
                          {tt.tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Link>
              </TableCell>
              {showCategory && (
                <TableCell>
                  {transaction.category ? (
                    <div>
                      <div className="font-medium">
                        {transaction.category.name}
                      </div>
                      {transaction.subcategory && (
                        <div className="text-sm text-muted-foreground">
                          {transaction.subcategory.name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline">Uncategorized</Badge>
                  )}
                </TableCell>
              )}
              <TableCell>{transaction.account.name}</TableCell>
              <TableCell className="text-right font-medium">
                <span
                  className={
                    transaction.amount.toNumber() > 0
                      ? "text-destructive"
                      : "text-success"
                  }
                >
                  {transaction.amount.toNumber() > 0 ? "-" : "+"}$
                  {formatAmount(Math.abs(transaction.amount.toNumber()))}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
