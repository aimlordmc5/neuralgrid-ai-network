import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EarningsClient from "@/components/earnings/EarningsClient";

export default function EarningsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Earnings</h1>
          <p className="text-sm text-muted-foreground">Track your NGR token earnings and recent payouts.</p>
        </div>
      </div>

      <EarningsClient />
    </main>
  );
}