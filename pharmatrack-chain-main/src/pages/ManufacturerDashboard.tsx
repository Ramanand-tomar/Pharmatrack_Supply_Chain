import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MedicineStageProgress } from "@/components/MedicineStageProgress";
import { STAGES, type Medicine, API_URL } from "@/lib/contract";
import { toast } from "sonner";
import { Loader2, Factory, CheckCircle, AlertTriangle, Plus, ClipboardList, ImagePlus, Calendar as CalendarIcon, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
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

const recallBatchSchema = z.object({
  batchNumber: z.string().min(1),
  reason: z.string().min(5),
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

  const recallForm = useForm<z.infer<typeof recallBatchSchema>>({
    resolver: zodResolver(recallBatchSchema),
    defaultValues: { batchNumber: "", reason: "" }
  });

  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);

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
    } catch (e: unknown) { 
      const error = e as any;
      toast.error(error.reason || error.message || "Failed"); 
    }
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
    } catch (e: unknown) { 
      const error = e as any;
      toast.error(error.reason || error.message || "Failed"); 
    }
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
    } catch (e: unknown) {
      const error = e as any;
      toast.error(error.message || "Request failed");
      setIsUploading(false);
    }
  };

  const onRecallBatch = async (values: z.infer<typeof recallBatchSchema>) => {
    if (!contract) return;
    setTxLoading(999999);
    try {
      const tx = await contract.recallBatch(values.batchNumber);
      toast.info("Submitting on-chain recall...");
      await tx.wait();

      const response = await fetch(`${API_URL}/api/products/recall-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchNumber: values.batchNumber,
          reason: values.reason,
          manufacturerAddress: account
        })
      });

      if (!response.ok) throw new Error("Failed to broadcast recall alert");
      
      toast.success("Batch successfully recalled and stakeholders notified!");
      setIsRecallModalOpen(false);
      recallForm.reset();
      loadData();
    } catch (e: unknown) {
      const error = e as any;
      toast.error(error.reason || error.message || "Recall failed");
    } finally {
      setTxLoading(null);
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
        <div className="flex gap-2">
          <Dialog open={isRecallModalOpen} onOpenChange={setIsRecallModalOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="font-display">
                <AlertTriangle className="h-4 w-4 mr-2" /> Recall Entire Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Batch Recall Authorization
                </DialogTitle>
              </DialogHeader>
              <Form {...recallForm}>
                <form onSubmit={recallForm.handleSubmit(onRecallBatch)} className="space-y-4 pt-4">
                  <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive-foreground flex gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p><strong>Warning:</strong> This action is irreversible. All products in this batch will be blocked from further transitions.</p>
                  </div>
                  <FormField control={recallForm.control} name="batchNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number to Recall</FormLabel>
                      <FormControl><Input placeholder="e.g. BATCH-2024-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={recallForm.control} name="reason" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Recall</FormLabel>
                      <FormControl><Input placeholder="e.g. Quality control failure in raw materials" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" variant="destructive" className="w-full" disabled={txLoading === 999999}>
                    {txLoading === 999999 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                    Execute Batch Recall
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

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
                      <FormItem className="flex flex-col">
                        <FormLabel>Mfg Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="expiryDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Exp Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                              disabled={(date) =>
                                date < new Date()
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>Price (Wei)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="space-y-3">
                    <FormLabel>Product Image</FormLabel>
                    <div 
                      className={cn(
                        "border-2 border-dashed rounded-lg p-4 transition-all duration-200 cursor-pointer hover:border-primary/50",
                        image ? "bg-muted/50 border-primary/30" : "bg-muted/10 border-muted-foreground/20"
                      )}
                      onClick={() => document.getElementById('product-image-input')?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          setImage(e.dataTransfer.files[0]);
                        }
                      }}
                    >
                      <input 
                        id="product-image-input"
                        type="file" 
                        accept="image/*" 
                        className="hidden"
                        onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)} 
                      />
                      
                      {!image ? (
                        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                          <ImagePlus className="h-10 w-10 mb-2 opacity-30" />
                          <p className="text-sm font-medium">Click to upload or drag and drop</p>
                          <p className="text-xs">PNG, JPG or WEBP (MAX. 2MB)</p>
                        </div>
                      ) : (
                        <div className="relative group">
                          <div className="flex items-center gap-3">
                            <div className="h-16 w-16 rounded overflow-hidden border bg-background shrink-0">
                              <img 
                                src={URL.createObjectURL(image)} 
                                alt="Preview" 
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{image.name}</p>
                              <p className="text-xs text-muted-foreground">{(image.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImage(null);
                                const input = document.getElementById('product-image-input') as HTMLInputElement;
                                if (input) input.value = '';
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
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
                    <Button onClick={() => manufacture(med.id)} disabled={txLoading === med.id || med.isBatchRecalled} size="sm">
                      {txLoading === med.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Manufacture
                    </Button>
                  </div>
                  <MedicineStageProgress currentStage={med.stage} isBatchRecalled={med.isBatchRecalled} />
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
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{m.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{m.batchNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.stage === 6 ? "destructive" : "default"}>
                        {STAGES[m.stage]}
                      </Badge>
                      {m.isBatchRecalled && (
                        <Badge variant="destructive" className="animate-pulse">BATCH RECALLED</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{formatTime(m.manufactureTime)}</TableCell>
                  <TableCell>
                    {m.stage < 5 && !m.isBatchRecalled && (
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
