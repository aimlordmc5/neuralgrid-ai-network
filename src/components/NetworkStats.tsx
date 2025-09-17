import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Briefcase, Coins } from "lucide-react";

export type NetworkStatsProps = {
  totalNodes?: number;
  activeJobs?: number;
  totalRewards?: number; // in NGR
};

export const NetworkStats = ({ totalNodes = 128, activeJobs = 7, totalRewards = 12450 }: NetworkStatsProps) => {
  const items = [
    {
      label: "Total Nodes",
      value: totalNodes.toLocaleString(),
      icon: Cpu,
      badge: "24h +8",
    },
    {
      label: "Active Jobs",
      value: activeJobs.toLocaleString(),
      icon: Briefcase,
      badge: "now",
    },
    {
      label: "Total Rewards",
      value: `${totalRewards.toLocaleString()} NGR`,
      icon: Coins,
      badge: "lifetime",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map(({ label, value, icon: Icon, badge }, i) => (
        <Card key={i}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" /> {label}
            </CardTitle>
            <Badge variant="outline">{badge}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NetworkStats;