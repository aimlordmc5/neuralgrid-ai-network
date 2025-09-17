import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Coins } from "lucide-react";

export type JobCardProps = {
  title: string;
  reward: string;
  deadline: string;
  requiredNodes: number;
  status?: "PENDING" | "ACTIVE" | "COMPLETED" | "FAILED";
  // Optional click action for PENDING/ACTIVE states
  onAction?: () => void;
  onchainId?: number | null;
  onchainTx?: string | null;
};

export const JobCard = ({ title, reward, deadline, requiredNodes, status = "PENDING", onAction, onchainId, onchainTx }: JobCardProps) => {
  const isActionable = status === "PENDING" || status === "ACTIVE";
  const label = status === "ACTIVE" ? "Submit" : status === "PENDING" ? "Join" : "View";
  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <Badge variant={status === "ACTIVE" ? "default" : status === "COMPLETED" ? "secondary" : "outline"}>
            {status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2 text-sm">
          <Coins className="h-4 w-4" /> {reward}
        </CardDescription>
        {(typeof onchainId === "number" && onchainId > 0) || onchainTx ? (
          <div className="text-xs text-muted-foreground">
            {onchainId ? `On-chain #${onchainId}` : null}
            {onchainTx ? `${onchainId ? " • " : ""}${onchainTx.slice(0, 10)}…` : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Deadline: {deadline}
          </div>
          <div>Required nodes: {requiredNodes}</div>
        </div>
        <Button size="sm" disabled={!isActionable || !onAction} onClick={onAction}>
          {label}
        </Button>
      </CardContent>
    </Card>
  );
};

export default JobCard;