import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGES, type Medicine } from "@/lib/contract";
import { ShoppingBag, Loader2, Star, ExternalLink, ShieldCheck, Search, QrCode, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductTimeline } from "@/components/ProductTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "sonner";

export default function CustomerDashboard() {
  const { account, contract, fetchAllMedicines, connectWallet, fetchMedicine } = useWeb3();
  const [purchases, setPurchases] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tracking state
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<Medicine | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState("purchases");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && ["purchases", "tracking", "request"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [window.location.search]);

  const loadData = async () => {
    if (!contract || !account) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await fetchAllMedicines();
      const mine = all.filter(m => m.consumer.toLowerCase() === account.toLowerCase());
      setPurchases(mine);
    } catch (e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [account, contract]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get("track");
    if (trackId) {
      setSearchId(trackId);
      handleSearch(trackId);
    }
  }, []);

  const handleSearch = async (forcedId?: string) => {
    const idStr = forcedId || searchId;
    const id = parseInt(idStr);
    if (!id || id < 1) { setSearchError("Please enter a valid medicine ID"); return; }
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const med = await fetchMedicine(id);
      if (!med || !med.name || med.name === "") {
        setSearchError(`Medicine ID #${id} not found on blockchain`);
        setSearchResult(null);
      } else {
        setSearchResult(med);
        setSearchError("");
      }
    } catch (e) {
      setSearchError("Error fetching medicine data");
    } finally {
      setSearching(false);
    }
  };

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render((result) => {
        try {
          const url = new URL(result);
          const id = url.searchParams.get("track");
          if (id) {
            setSearchId(id);
            scanner.clear();
            setIsScanning(false);
            handleSearch(id);
          }
        } catch {
          if (result.match(/^\d+$/)) {
            setSearchId(result);
            scanner.clear();
            setIsScanning(false);
            handleSearch(result);
          }
        }
      }, console.error);
    }, 100);
  };

  const formatTime = (ts: number) => ts ? new Date(ts * 1000).toLocaleString() : "—";
  const formatDate = (ts: number) => ts ? new Date(ts * 1000).toLocaleDateString() : "—";

  if (loading && !searching) return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );

  if (!account) return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="bg-primary/10 p-6 rounded-full mb-4">
        <ShieldCheck className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-2xl font-display font-bold">Connect Your Wallet</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Please connect your Ethereum wallet to access the customer dashboard, view your purchases, and verify products.
      </p>
      <Button onClick={connectWallet} className="mt-6">
        Connect Wallet
      </Button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" /> Customer Dashboard
        </h1>
        <Badge variant="outline" className="w-fit">{account.slice(0, 6)}...{account.slice(-4)}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="purchases">My Purchases</TabsTrigger>
          <TabsTrigger value="tracking">Track Product</TabsTrigger>
          <TabsTrigger value="request">Request Role</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="mt-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Purchase History ({purchases.length})</CardTitle>
              <CardDescription>Medicines you have purchased and registered on the blockchain</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto opacity-20" />
                  <p className="text-muted-foreground">You haven't purchased any medicines yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {purchases.map(med => (
                    <Card key={med.id} className="p-4 border-muted hover:border-primary/50 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold">{med.name}</h3>
                            <Badge variant="outline">#{med.id}</Badge>
                            <Badge>{STAGES[med.stage]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{med.description}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                            <span>Batch: <span className="text-foreground">{med.batchNumber}</span></span>
                            <span>Purchased: <span className="text-foreground">{formatTime(med.soldTime)}</span></span>
                          </div>
                        </div>
                        {med.rating > 0 && (
                          <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full h-fit">
                            <Star className="h-4 w-4 fill-primary text-primary" />
                            <span className="font-bold text-primary">{med.rating}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                           <h4 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Journey Timeline</h4>
                           <ProductTimeline medicine={med} />
                        </div>
                        <div className="space-y-4">
                          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-green-600 mb-1">
                              <ShieldCheck className="h-4 w-4" />
                              <span className="text-xs font-bold uppercase">Verified Origin</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">This medicine's lifecycle has been recorded on the blockchain and verified for authenticity.</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="mt-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Track Any Product
              </CardTitle>
              <CardDescription>Enter a medicine ID to verify its authenticity and view its history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  type="number"
                  min={1}
                  placeholder="Enter Medicine ID (e.g. 1)"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={() => handleSearch()} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
                <Button variant="outline" onClick={startScanner} disabled={isScanning}>
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>

              {isScanning && (
                <div className="mb-6 border rounded-xl overflow-hidden">
                  <div id="reader" className="w-full"></div>
                  <Button variant="ghost" className="w-full" onClick={() => setIsScanning(false)}>Cancel Scanning</Button>
                </div>
              )}

              {searchError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Track Error</AlertTitle>
                  <AlertDescription>{searchError}</AlertDescription>
                </Alert>
              )}

              {searchResult && (
                <div className="space-y-6 pt-4 border-t">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-display font-bold">{searchResult.name}</h3>
                        <Badge variant="outline">#{searchResult.id}</Badge>
                        <Badge variant={searchResult.stage === 5 ? "default" : "secondary"}>
                          {STAGES[searchResult.stage]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{searchResult.description}</p>
                    </div>
                  </div>

                  <Alert className="bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle className="font-display font-bold uppercase tracking-wider text-xs">Blockchain Verified</AlertTitle>
                    <AlertDescription className="text-xs">
                      This product is authentic and its entire journey is recorded on the Ethereum blockchain.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Product Details</h4>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {[
                          { label: "Batch Number", value: searchResult.batchNumber },
                          { label: "Manufacturing Date", value: formatDate(searchResult.manufacturingDate) },
                          { label: "Expiry Date", value: formatDate(searchResult.expiryDate) },
                          { label: "Quantity", value: searchResult.quantity },
                          { label: "Current Price", value: `${searchResult.price} Wei` },
                        ].map(item => (
                          <div key={item.label} className="flex justify-between p-2 rounded bg-muted/50">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Journey Tracking</h4>
                      <ProductTimeline medicine={searchResult} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="request" className="mt-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display">Become a Participant</CardTitle>
              <CardDescription>Request to be registered as a Manufacturer, Distributor, Retailer, or RMS supplier</CardDescription>
            </CardHeader>
            <CardContent>
              <RoleRequestForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoleRequestForm() {
  const { account, API_URL } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    place: "",
    requestedRole: "manufacturer"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/role-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: account,
          ...formData
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Request submitted successfully! The owner will review it.");
        setFormData({ name: "", place: "", requestedRole: "manufacturer" });
      } else {
        toast.error(data.error || "Failed to submit request");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <label className="text-sm font-medium">Full Name / Organization Name</label>
        <Input 
          required 
          placeholder="e.g. PharmaCorp Inc." 
          value={formData.name}
          onChange={e => setFormData(s => ({ ...s, name: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        <Input 
          required 
          placeholder="e.g. Mumbai, India" 
          value={formData.place}
          onChange={e => setFormData(s => ({ ...s, place: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Requested Role</label>
        <select 
          className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={formData.requestedRole}
          onChange={e => setFormData(s => ({ ...s, requestedRole: e.target.value }))}
        >
          <option value="rms">Raw Material Supplier (RMS)</option>
          <option value="manufacturer">Manufacturer</option>
          <option value="distributor">Distributor</option>
          <option value="retailer">Retailer</option>
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Submit Registration Request
      </Button>
    </form>
  );
}
