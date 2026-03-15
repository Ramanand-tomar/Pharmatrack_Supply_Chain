import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MedicineStageProgress } from "@/components/MedicineStageProgress";
import { STAGES, type Medicine, type Participant } from "@/lib/contract";
import { QRModal } from "@/components/QRModal";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, Pill, Users, Settings, ShieldAlert, Play, Pause, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useLocation } from "react-router-dom";

// Schemas
const participantSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  name: z.string().min(1, "Name required").max(100),
  place: z.string().min(1, "Place required").max(100),
});

const medicineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  batchNumber: z.string().min(1).max(50),
  manufacturingDate: z.string().min(1),
  expiryDate: z.string().min(1),
  quantity: z.coerce.number().min(1),
  price: z.coerce.number().min(0),
});

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split("/").pop() || "participants";
  const activeTab = ["participants", "medicines", "requests", "settings"].includes(currentPath) ? currentPath : "participants";

  const { contract, fetchAllMedicines, fetchParticipants, fetchCounts, API_URL } = useWeb3();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({ rms: [], man: [], dis: [], ret: [] });
  const [counts, setCounts] = useState({ medicines: 0, rms: 0, man: 0, dis: 0, ret: 0 });
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [selectedQR, setSelectedQR] = useState<{ id: number; name: string } | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [roleRequests, setRoleRequests] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [meds, c, rms, man, dis, ret] = await Promise.all([
        fetchAllMedicines(), fetchCounts(),
        fetchParticipants("rms"), fetchParticipants("man"),
        fetchParticipants("dis"), fetchParticipants("ret"),
      ]);
      setMedicines(meds);
      setCounts(c);
      setParticipants({ rms, man, dis, ret });
      
      const reqRes = await fetch(`${API_URL}/api/admin/requests`);
      if (reqRes.ok) setPendingRequests(await reqRes.json());

      const roleReqRes = await fetch(`${API_URL}/api/admin/role-requests`);
      if (roleReqRes.ok) setRoleRequests(await roleReqRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Add participant form
  const participantForm = useForm({ resolver: zodResolver(participantSchema), defaultValues: { address: "", name: "", place: "" } });
  const [addType, setAddType] = useState<"rms" | "man" | "dis" | "ret">("rms");

  const addParticipant = async (data: z.infer<typeof participantSchema>) => {
    if (!contract) return;
    setTxLoading(true);
    try {
      const fnMap = { rms: "addRMS", man: "addManufacturer", dis: "addDistributor", ret: "addRetailer" };
      const tx = await contract[fnMap[addType]](data.address, data.name, data.place);
      toast.info("Transaction submitted...");
      await tx.wait();
      toast.success("Participant added!");
      participantForm.reset();
      loadData();
    } catch (e: any) {
      toast.error(e.reason || e.message || "Transaction failed");
    }
    setTxLoading(false);
  };

  // Toggle active
  const toggleActive = async (type: string, id: number, currentActive: boolean) => {
    if (!contract) return;
    setTxLoading(true);
    try {
      const activateMap: Record<string, string> = { rms: "activateRMS", man: "activateManufacturer", dis: "activateDistributor", ret: "activateRetailer" };
      const deactivateMap: Record<string, string> = { rms: "deactivateRMS", man: "deactivateManufacturer", dis: "deactivateDistributor", ret: "deactivateRetailer" };
      const fn = currentActive ? deactivateMap[type] : activateMap[type];
      const tx = await contract[fn](id);
      await tx.wait();
      toast.success(`Participant ${currentActive ? "deactivated" : "activated"}`);
      loadData();
    } catch (e: any) {
      toast.error(e.reason || e.message || "Failed");
    }
    setTxLoading(false);
  };

  // Add medicine form
  const medicineForm = useForm({ resolver: zodResolver(medicineSchema), defaultValues: { name: "", description: "", batchNumber: "", manufacturingDate: "", expiryDate: "", quantity: 1, price: 0 } });

  const addMedicine = async (data: z.infer<typeof medicineSchema>) => {
    if (!contract) return;
    setTxLoading(true);
    try {
      const mfgDate = Math.floor(new Date(data.manufacturingDate).getTime() / 1000);
      const expDate = Math.floor(new Date(data.expiryDate).getTime() / 1000);
      const tx = await contract.addMedicine(data.name, data.description, data.batchNumber, mfgDate, expDate, data.quantity, data.price);
      toast.info("Transaction submitted...");
      await tx.wait();
      toast.success("Medicine added!");
      medicineForm.reset();
      loadData();
    } catch (e: any) {
      toast.error(e.reason || e.message || "Failed");
    }
    setTxLoading(false);
  };

  // Assign role to medicine
  const assignRole = async (medicineId: number, roleType: string, participantId: number) => {
    if (!contract) return;
    setTxLoading(true);
    try {
      const fnMap: Record<string, string> = { rms: "assignRMS", man: "assignManufacturer", dis: "assignDistributor", ret: "assignRetailer" };
      const tx = await contract[fnMap[roleType]](medicineId, participantId);
      await tx.wait();
      toast.success("Assigned successfully!");
      loadData();
    } catch (e: any) {
      toast.error(e.reason || e.message || "Failed");
    }
    setTxLoading(false);
  };

  // Pause/Unpause
  const handlePause = async (pause: boolean) => {
    if (!contract) return;
    setTxLoading(true);
    try {
      const tx = pause ? await contract.pause() : await contract.unpause();
      await tx.wait();
      toast.success(pause ? "Contract paused" : "Contract unpaused");
    } catch (e: any) { toast.error(e.reason || e.message || "Failed"); }
    setTxLoading(false);
  };

  // Transfer ownership
  const [newOwner, setNewOwner] = useState("");
  const transferOwnership = async () => {
    if (!contract || !newOwner.match(/^0x[a-fA-F0-9]{40}$/)) { toast.error("Invalid address"); return; }
    setTxLoading(true);
    try {
      const tx = await contract.transferOwnership(newOwner);
      await tx.wait();
      toast.success("Ownership transferred!");
      setNewOwner("");
    } catch (e: any) { toast.error(e.reason || e.message || "Failed"); }
    setTxLoading(false);
  };

  const approveRequest = async (request: any) => {
    if (!contract) return;
    setTxLoading(true);
    try {
      const mfgDate = Math.floor(new Date(request.manufacturingDate).getTime() / 1000);
      const expDate = Math.floor(new Date(request.expiryDate).getTime() / 1000);
      const tx = await contract.addMedicine(request.name, request.description, request.batchNumber, mfgDate, expDate, request.quantity, request.price);
      toast.info("Approving on-chain...");
      const receipt = await tx.wait();
      
      // Extract medicine ID from event
      let onChainId;
      if (receipt.logs) {
        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog(log);
                if (parsedLog?.name === "MedicineAdded") {
                    onChainId = Number(parsedLog.args.id);
                    break;
                }
            } catch (e) {}
        }
      }

      await fetch(`${API_URL}/api/admin/requests/${request._id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: receipt.hash, onChainId })
      });

      toast.success("Product approved and added to blockchain!");
      loadData();
    } catch (e: any) { 
      console.error(e);
      toast.error(e.reason || e.message || "Failed"); 
    }
    setTxLoading(false);
  };

  const rejectRequest = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/requests/${id}/reject`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to reject");
      toast.success("Request rejected");
      loadData();
    } catch (e: any) { toast.error(e.message); }
  };

  const approveRoleRequest = async (request: any) => {
    if (!contract) return;
    setTxLoading(true);
    try {
      const fnMap: Record<string, string> = { rms: "addRMS", manufacturer: "addManufacturer", distributor: "addDistributor", retailer: "addRetailer" };
      const tx = await contract[fnMap[request.requestedRole]](request.userAddress, request.name, request.place);
      toast.info("Approving on-chain...");
      await tx.wait();

      await fetch(`${API_URL}/api/admin/role-requests/${request._id}/approve`, {
        method: "PUT"
      });

      toast.success("User registered on blockchain!");
      loadData();
    } catch (e: any) {
      toast.error(e.reason || e.message || "Failed");
    }
    setTxLoading(false);
  };

  const rejectRoleRequest = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/role-requests/${id}/reject`, { method: "PUT" });
      if (res.ok) {
        toast.success("Request rejected");
        loadData();
      } else {
        toast.error("Failed to reject");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const getNextAssignment = (med: Medicine): { type: string; label: string; participants: Participant[] } | null => {
    if (med.stage === 0 && med.assignedRMSid === 0) return { type: "rms", label: "Assign RMS", participants: participants.rms.filter(p => p.active) };
    if (med.stage === 1 && med.assignedMANid === 0) return { type: "man", label: "Assign Manufacturer", participants: participants.man.filter(p => p.active) };
    if (med.stage === 2 && med.assignedDISid === 0) return { type: "dis", label: "Assign Distributor", participants: participants.dis.filter(p => p.active) };
    if (med.stage === 3 && med.assignedRETid === 0) return { type: "ret", label: "Assign Retailer", participants: participants.ret.filter(p => p.active) };
    return null;
  };

  const truncAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  const getManufacturerName = (address: string) => {
    if (!address) return "Unknown";
    const man = participants.man.find(p => p.addr.toLowerCase() === address.toLowerCase());
    return man ? man.name : `Unknown (${truncAddr(address)})`;
  };

  if (loading) return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Skeleton className="h-8 w-48 mb-6" />
      
      {/* Stats Skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 text-center space-y-2">
              <Skeleton className="h-5 w-5 mx-auto rounded-full" />
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        <Card className="glass-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2 mt-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center py-3 border-b">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-display font-bold">Owner Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { l: "Medicines", v: counts.medicines, icon: Pill },
          { l: "RMS", v: counts.rms, icon: Users },
          { l: "Manufacturers", v: counts.man, icon: Users },
          { l: "Distributors", v: counts.dis, icon: Users },
          { l: "Retailers", v: counts.ret, icon: Users },
        ].map(s => (
          <Card key={s.l} className="glass-card">
            <CardContent className="p-4 text-center">
              <s.icon className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-2xl font-bold font-display">{s.v}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => navigate(`/owner/${v}`)}>
        <TabsList>
          <TabsTrigger value="participants"><Users className="h-4 w-4 mr-1" />Participants</TabsTrigger>
          <TabsTrigger value="medicines"><Pill className="h-4 w-4 mr-1" />Medicines</TabsTrigger>
          <TabsTrigger value="requests"><ClipboardList className="h-4 w-4 mr-1" />Role Requests</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1" />Settings</TabsTrigger>
        </TabsList>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">Add Participant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {(["rms", "man", "dis", "ret"] as const).map(t => (
                  <Button key={t} variant={addType === t ? "default" : "outline"} size="sm" onClick={() => setAddType(t)}>
                    {{ rms: "RMS", man: "Manufacturer", dis: "Distributor", ret: "Retailer" }[t]}
                  </Button>
                ))}
              </div>
              <Form {...participantForm}>
                <form onSubmit={participantForm.handleSubmit(addParticipant)} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField control={participantForm.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="0x..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={participantForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={participantForm.control} name="place" render={({ field }) => (
                    <FormItem><FormLabel>Place</FormLabel><FormControl><Input placeholder="Location" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={txLoading} className="md:col-span-3">
                    {txLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add {{ rms: "RMS", man: "Manufacturer", dis: "Distributor", ret: "Retailer" }[addType]}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {(["rms", "man", "dis", "ret"] as const).map(type => (
            <Card key={type} className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg font-display">
                  {{ rms: "Raw Material Suppliers", man: "Manufacturers", dis: "Distributors", ret: "Retailers" }[type]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Place</TableHead>
                      <TableHead>Address</TableHead><TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants[type].length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">None</TableCell></TableRow>
                    ) : participants[type].map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.id}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.place}</TableCell>
                        <TableCell className="font-mono text-xs">{truncAddr(p.addr)}</TableCell>
                        <TableCell>
                          <Switch checked={p.active} onCheckedChange={() => toggleActive(type, p.id, p.active)} disabled={txLoading} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Medicines Tab */}
        <TabsContent value="medicines" className="space-y-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg font-display">Add Medicine</CardTitle></CardHeader>
            <CardContent>
              <Form {...medicineForm}>
                <form onSubmit={medicineForm.handleSubmit(addMedicine)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField control={medicineForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={medicineForm.control} name="batchNumber" render={({ field }) => (
                    <FormItem><FormLabel>Batch Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={medicineForm.control} name="description" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={medicineForm.control} name="manufacturingDate" render={({ field }) => (
                    <FormItem><FormLabel>Manufacturing Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={medicineForm.control} name="expiryDate" render={({ field }) => (
                    <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={medicineForm.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={medicineForm.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>Price (Wei)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" disabled={txLoading} className="md:col-span-2">
                    {txLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add Medicine
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-lg font-display">All Medicines</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {medicines.length === 0 ? (
                <p className="text-center text-muted-foreground">No medicines added yet</p>
              ) : medicines.map(med => {
                const next = getNextAssignment(med);
                return (
                  <Card key={med.id} className="p-4">
                    <div className="flex flex-col md:flex-row justify-between gap-3 mb-3">
                      <div>
                        <div className="font-semibold">{med.name} <span className="text-muted-foreground text-sm">#{med.id}</span></div>
                        <div className="text-sm text-muted-foreground">{med.description}</div>
                        <div className="text-xs text-muted-foreground">Batch: {med.batchNumber} | Qty: {med.quantity}</div>
                      </div>
                      <div className="flex gap-2 items-start">
                        <Button variant="outline" size="sm" onClick={() => setSelectedQR({ id: med.id, name: med.name })}>
                          QR Code
                        </Button>
                        <Badge>{STAGES[med.stage]}</Badge>
                      </div>
                    </div>
                    <MedicineStageProgress currentStage={med.stage} className="mb-3" />
                    {next && (
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(v) => assignRole(med.id, next.type, parseInt(v))}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder={next.label} />
                          </SelectTrigger>
                          <SelectContent>
                            {next.participants.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name} (#{p.id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {pendingRequests.length > 0 && (
          <div className="mt-6 space-y-4">
            <Card className="glass-card border-orange-500/50">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-orange-500" /> Pending Manufacturer Requests
                </CardTitle>
                <CardDescription>Review and approve product creation requests from manufacturers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingRequests.map(req => (
                  <Card key={req._id} className="p-4 border-muted">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex gap-4 items-center">
                        {req.imageHash && (
                           <img 
                             src={`https://gateway.pinata.cloud/ipfs/${req.imageHash}`} 
                             alt={req.name} 
                             className="h-20 w-20 object-cover rounded-md border bg-muted"
                             onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=No+Image")}
                           />
                        )}
                        <div>
                          <div className="font-semibold text-primary text-base">{req.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">{req.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Manufacturer: <span className="text-foreground font-medium">{getManufacturerName(req.manufacturerAddress)}</span> | 
                            Batch: <span className="text-foreground">{req.batchNumber}</span> | 
                            Qty: <span className="text-foreground">{req.quantity}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Mfg Date: <span className="text-foreground">{new Date(req.manufacturingDate).toLocaleDateString()}</span> | 
                            Exp Date: <span className="text-foreground">{new Date(req.expiryDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveRequest(req)} disabled={txLoading}>
                          {txLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectRequest(req._id)} disabled={txLoading}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <TabsContent value="requests" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" /> Pending Role Registration Requests
              </CardTitle>
              <CardDescription>Review and approve users who want to join the supply chain as specific participants.</CardDescription>
            </CardHeader>
            <CardContent>
              {roleRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No pending role requests
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Address</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Place</TableHead>
                      <TableHead>Requested Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleRequests.map((req) => (
                      <TableRow key={req._id}>
                        <TableCell className="font-mono text-xs">{truncAddr(req.userAddress)}</TableCell>
                        <TableCell className="font-medium">{req.name}</TableCell>
                        <TableCell>{req.place}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="uppercase text-[10px]">
                            {req.requestedRole}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => approveRoleRequest(req)} 
                              disabled={txLoading}
                            >
                              {txLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => rejectRoleRequest(req._id)} 
                              disabled={txLoading}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" /> Contract Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={() => handlePause(true)} disabled={txLoading} variant="destructive">
                  <Pause className="h-4 w-4 mr-2" />Pause Contract
                </Button>
                <Button onClick={() => handlePause(false)} disabled={txLoading} variant="outline">
                  <Play className="h-4 w-4 mr-2" />Unpause Contract
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">Transfer Ownership</CardTitle>
              <CardDescription>Transfer contract ownership to a new address. This action is irreversible.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input placeholder="New owner address (0x...)" value={newOwner} onChange={e => setNewOwner(e.target.value)} />
                <Button onClick={transferOwnership} disabled={txLoading} variant="destructive">Transfer</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedQR && (
        <QRModal
          isOpen={!!selectedQR}
          onClose={() => setSelectedQR(null)}
          medicineId={selectedQR.id}
          medicineName={selectedQR.name}
        />
      )}
    </div>
  );
}
