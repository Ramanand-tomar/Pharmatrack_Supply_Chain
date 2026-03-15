import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MedicineStageProgress } from "@/components/MedicineStageProgress";
import { STAGES, type Medicine } from "@/lib/contract";
import { toast } from "sonner";
import { Loader2, ShoppingCart, CheckCircle, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RetailerDashboard() {
  const { contract, roleId, fetchMedicine } = useWeb3();
  const [pendingRetail, setPendingRetail] = useState<Medicine[]>([]);
  const [readyToSell, setReadyToSell] = useState<Medicine[]>([]);
  const [history, setHistory] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState<number | null>(null);
  const [sellForms, setSellForms] = useState<Record<number, { consumer: string; rating: number }>>({});

  const loadData = async () => {
    if (!contract || !roleId) return;
    setLoading(true);
    try {
      const ids: bigint[] = await contract.getMedicinesByRetailer(roleId);
      const meds = await Promise.all(ids.map((id: bigint) => fetchMedicine(Number(id))));
      const valid = meds.filter(Boolean) as Medicine[];
      setPendingRetail(valid.filter(m => m.stage === 3 && m.assignedRETid === roleId));
      setReadyToSell(valid.filter(m => m.stage === 4 && m.RETid === roleId));
      setHistory(valid.filter(m => m.stage === 5 && m.RETid === roleId));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [contract, roleId]);

  const retail = async (id: number) => {
    if (!contract) return;
    setTxLoading(id);
    try {
      const tx = await contract.retail(id);
      toast.info("Transaction submitted...");
      await tx.wait();
      toast.success("Received for retail!");
      loadData();
    } catch (e: any) { toast.error(e.reason || e.message || "Failed"); }
    setTxLoading(null);
  };

  const sell = async (id: number) => {
    if (!contract) return;
    const form = sellForms[id];
    if (!form?.consumer?.match(/^0x[a-fA-F0-9]{40}$/)) { toast.error("Invalid consumer address"); return; }
    if (!form.rating || form.rating < 1 || form.rating > 5) { toast.error("Rating must be 1-5"); return; }
    setTxLoading(id);
    try {
      const tx = await contract.sold(id, form.consumer, form.rating);
      toast.info("Transaction submitted...");
      await tx.wait();
      toast.success("Medicine sold!");
      loadData();
    } catch (e: any) { toast.error(e.reason || e.message || "Failed"); }
    setTxLoading(null);
  };

  const updateSellForm = (id: number, field: string, value: string | number) => {
    setSellForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString() : "—";
  const truncAddr = (a: string) => a === "0x0000000000000000000000000000000000000000" ? "—" : `${a.slice(0, 6)}...${a.slice(-4)}`;

  if (loading) return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-64" />
      </div>

      {[1, 2].map(section => (
        <Card key={section} className="glass-card">
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
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-display font-bold flex items-center gap-2">
        <ShoppingCart className="h-6 w-6 text-primary" /> Retailer Dashboard
      </h1>

      {/* Pending Retail */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="font-display">Receive for Retail ({pendingRetail.length})</CardTitle></CardHeader>
        <CardContent>
          {pendingRetail.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No medicines awaiting receipt</p>
          ) : (
            <div className="space-y-4">
              {pendingRetail.map(med => (
                <Card key={med.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{med.name} <span className="text-sm text-muted-foreground">#{med.id}</span></div>
                      <div className="text-sm text-muted-foreground">{med.description}</div>
                    </div>
                    <Button onClick={() => retail(med.id)} disabled={txLoading === med.id} size="sm">
                      {txLoading === med.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Receive
                    </Button>
                  </div>
                  <MedicineStageProgress currentStage={med.stage} />
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ready to Sell */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="font-display">Ready to Sell ({readyToSell.length})</CardTitle></CardHeader>
        <CardContent>
          {readyToSell.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No medicines ready to sell</p>
          ) : (
            <div className="space-y-4">
              {readyToSell.map(med => (
                <Card key={med.id} className="p-4 space-y-3">
                  <div>
                    <div className="font-semibold">{med.name} <span className="text-sm text-muted-foreground">#{med.id}</span></div>
                    <div className="text-sm text-muted-foreground">{med.description}</div>
                  </div>
                  <MedicineStageProgress currentStage={med.stage} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div>
                      <Label className="text-xs">Consumer Address</Label>
                      <Input placeholder="0x..." value={sellForms[med.id]?.consumer || ""} onChange={e => updateSellForm(med.id, "consumer", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Rating (1-5)</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(r => (
                          <Button
                            key={r}
                            variant={(sellForms[med.id]?.rating || 0) >= r ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateSellForm(med.id, "rating", r)}
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => sell(med.id)} disabled={txLoading === med.id}>
                      {txLoading === med.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Sell
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="font-display">Sold History ({history.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Consumer</TableHead><TableHead>Rating</TableHead><TableHead>Sold At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No sales</TableCell></TableRow>
              ) : history.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.id}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="font-mono text-xs">{truncAddr(m.consumer)}</TableCell>
                  <TableCell>{"⭐".repeat(m.rating)}</TableCell>
                  <TableCell className="text-xs font-mono">{formatTime(m.soldTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
