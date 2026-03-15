import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MedicineStageProgress } from "@/components/MedicineStageProgress";
import { STAGES, type Medicine, API_URL } from "@/lib/contract";
import { toast } from "sonner";
import { Loader2, Factory, CheckCircle, AlertTriangle, Plus, ClipboardList, ImagePlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const requestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  batchNumber: z.string().min(1),
  manufacturingDate: z.string().min(1),
  expiryDate: z.string().min(1),
  quantity: z.coerce.number().min(1),
  price: z.coerce.number().min(0),
});

export default function ManufacturerDashboard() {
  const { contract, roleId, fetchMedicine, account } = useWeb3();
  const [pending, setPending] = useState<Medicine[]>([]);
  const [history, setHistory] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState<number | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { name: "", description: "", batchNumber: "", manufacturingDate: "", expiryDate: "", quantity: 1, price: 0 }
  });

  const loadData = async () => {
    if (!contract || !roleId) return;
    setLoading(true);
    try {
      const ids: bigint[] = await contract.getMedicinesByManufacturer(roleId);
      const meds = await Promise.all(ids.map((id: bigint) => fetchMedicine(Number(id))));
      const valid = meds.filter(Boolean) as Medicine[];
      setPending(valid.filter(m => m.stage === 1 && m.assignedMANid === roleId));
      setHistory(valid.filter(m => m.stage > 1 && m.MANid === roleId));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [contract, roleId]);

  const manufacture = async (id: number) => {
    if (!contract) return;
    setTxLoading(id);
    try {
      const tx = await contract.manufacture(id);
      toast.info("Transaction submitted...");
      await tx.wait();
      toast.success("Medicine manufactured!");
      loadData();
    } catch (e: any) { toast.error(e.reason || e.message || "Failed"); }
    setTxLoading(null);
  };

  const recall = async (id: number) => {
    if (!contract) return;
    setTxLoading(id);
    try {
      const tx = await contract.recallMedicine(id);
      await tx.wait();
      toast.success("Medicine recalled!");
      loadData();
    } catch (e: any) { toast.error(e.reason || e.message || "Failed"); }
    setTxLoading(null);
  };

  const onSubmitRequest = async (values: z.infer<typeof requestSchema>) => {
    try {
      let imageHash = "";
      if (image) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("image", image);
        const uploadRes = await fetch(`${API_URL}/api/upload`, {
            method: "POST",
            body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.hash) imageHash = uploadData.hash;
        setIsUploading(false);
      }

      const response = await fetch(`${API_URL}/api/manufacturer/request-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, manufacturerAddress: account, imageHash }) 
      });
      if (!response.ok) throw new Error("Failed to submit request");
      toast.success("Product creation request submitted to Admin!");
      setIsRequestModalOpen(false);
      form.reset();
      setImage(null);
    } catch (e: any) {
      toast.error(e.message || "Request failed");
      setIsUploading(false);
    }
  };
  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString() : "—";

  if (loading) return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-44" />
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
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Factory className="h-6 w-6 text-primary" /> Manufacturer Dashboard
        </h1>
        <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
          <DialogTrigger asChild>
            <Button className="font-display">
              <Plus className="h-4 w-4 mr-2" /> Request New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Request Product Creation</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitRequest)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="batchNumber" render={({ field }) => (
                    <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="manufacturingDate" render={({ field }) => (
                    <FormItem><FormLabel>Mfg Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="expiryDate" render={({ field }) => (
                    <FormItem><FormLabel>Exp Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>Price (Wei)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="space-y-2">
                  <FormLabel>Product Image</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)} 
                    />
                  </FormControl>
                  {image && <p className="text-xs text-muted-foreground flex items-center gap-1"><ImagePlus className="h-3 w-3" /> {image.name}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Submit Request
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-display">Pending Manufacture ({pending.length})</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No medicines awaiting manufacture</p>
          ) : (
            <div className="space-y-4">
              {pending.map(med => (
                <Card key={med.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold">{med.name} <span className="text-sm text-muted-foreground">#{med.id}</span></div>
                      <div className="text-sm text-muted-foreground">{med.description}</div>
                    </div>
                    <Button onClick={() => manufacture(med.id)} disabled={txLoading === med.id} size="sm">
                      {txLoading === med.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Manufacture
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
        <CardHeader><CardTitle className="font-display">History ({history.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Stage</TableHead><TableHead>Manufactured At</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No history</TableCell></TableRow>
              ) : history.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.id}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><Badge>{STAGES[m.stage]}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{formatTime(m.manufactureTime)}</TableCell>
                  <TableCell>
                    {m.stage < 5 && (
                      <Button variant="destructive" size="sm" onClick={() => recall(m.id)} disabled={txLoading === m.id}>
                        <AlertTriangle className="h-3 w-3 mr-1" />Recall
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
