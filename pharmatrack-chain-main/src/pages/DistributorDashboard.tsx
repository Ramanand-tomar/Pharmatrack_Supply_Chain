import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MedicineStageProgress } from "@/components/MedicineStageProgress";
import { STAGES, type Medicine } from "@/lib/contract";
import { toast } from "sonner";
import { Loader2, Truck, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DistributorDashboard() {
  const { contract, roleId, fetchMedicine } = useWeb3();
  const [pending, setPending] = useState<Medicine[]>([]);
  const [history, setHistory] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState<number | null>(null);

  const loadData = async () => {
    if (!contract || !roleId) return;
    setLoading(true);
    try {
      const ids: bigint[] = await contract.getMedicinesByDistributor(roleId);
      const meds = await Promise.all(ids.map((id: bigint) => fetchMedicine(Number(id))));
      const valid = meds.filter(Boolean) as Medicine[];
      setPending(valid.filter(m => m.stage === 2 && m.assignedDISid === roleId));
      setHistory(valid.filter(m => m.stage > 2 && m.DISid === roleId));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [contract, roleId]);

  const distribute = async (id: number) => {
    if (!contract) return;
    setTxLoading(id);
    try {
      const tx = await contract.distribute(id);
      toast.info("Transaction submitted...");
      await tx.wait();
      toast.success("Medicine distributed!");
      loadData();
    } catch (e: any) { toast.error(e.reason || e.message || "Failed"); }
    setTxLoading(null);
  };

  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString() : "—";

  if (loading) return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-64" />
      </div>

      <Card className="glass-card">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between items-center py-3 border-b">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-display font-bold flex items-center gap-2">
        <Truck className="h-6 w-6 text-primary" /> Distributor Dashboard
      </h1>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-display">Pending Distribution ({pending.length})</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No medicines awaiting distribution</p>
          ) : (
            <div className="space-y-4">
              {pending.map(med => (
                <Card key={med.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{med.name} <span className="text-sm text-muted-foreground">#{med.id}</span></div>
                      <div className="text-sm text-muted-foreground">{med.description}</div>
                    </div>
                    <Button onClick={() => distribute(med.id)} disabled={txLoading === med.id} size="sm">
                      {txLoading === med.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Distribute
                    </Button>
                  </div>
                  <MedicineStageProgress currentStage={med.stage} />
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-display">Distribution History ({history.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Stage</TableHead><TableHead>Distributed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No history</TableCell></TableRow>
              ) : history.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.id}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><Badge>{STAGES[m.stage]}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{formatTime(m.distributionTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
