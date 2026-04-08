import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MedicineStageProgress } from "@/components/MedicineStageProgress";
import { Badge } from "@/components/ui/badge";
import { STAGES, type Medicine, type Participant, IPFS_GATEWAY } from "@/lib/contract";
import { Search, Pill, Users, Package, Factory, Truck, ShoppingCart, Loader2, QrCode, ShieldCheck, History, Activity, AlertCircle } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ProductTimeline } from "@/components/ProductTimeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function LandingPage() {
  const { fetchCounts, fetchMedicine, fetchParticipants, fetchEvents, isOffline: globalOffline } = useWeb3();
  const [counts, setCounts] = useState({ medicines: 0, rms: 0, man: 0, dis: 0, ret: 0 });
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<Medicine | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [participants, setParticipants] = useState<{ rms: Participant[]; man: Participant[]; dis: Participant[]; ret: Participant[] }>({ rms: [], man: [], dis: [], ret: [] });
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await fetchCounts();
        setCounts(c);
        const [rms, man, dis, ret] = await Promise.all([
          fetchParticipants("rms"), fetchParticipants("man"),
          fetchParticipants("dis"), fetchParticipants("ret"),
        ]);
        setParticipants({ rms, man, dis, ret });
        
        setEventsLoading(true);
        const evs = await fetchEvents();
        setEvents(evs);
        setEventsLoading(false);
      } catch (e: any) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Deep linking
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get("track");
    if (trackId) {
      setSearchId(trackId);
      setTimeout(() => document.getElementById("search-btn")?.click(), 500);
    }
  }, []);

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
            setTimeout(() => document.getElementById("search-btn")?.click(), 100);
          }
        } catch {
          if (result.match(/^\d+$/)) {
            setSearchId(result);
            scanner.clear();
            setIsScanning(false);
            setTimeout(() => document.getElementById("search-btn")?.click(), 100);
          }
        }
      }, console.error);
    }, 100);
  };

  const handleSearch = async () => {
    const id = parseInt(searchId);
    if (!id || id < 1) { setSearchError("Please enter a valid medicine ID"); return; }
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    const med = await fetchMedicine(id);
    if (!med || !med.name || med.name === "") {
      setSearchError(`Medicine ID #${id} not found on blockchain`);
      setSearchResult(null);
    } else {
      setSearchResult(med);
      setSearchError("");
    }
    setSearching(false);
  };

  const formatDate = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const truncAddr = (a: string) => a === "0x0000000000000000000000000000000000000000" ? "—" : `${a.slice(0, 6)}...${a.slice(-4)}`;

  const statCards = [
    { label: "Total Medicines", value: counts.medicines, icon: Pill, color: "text-primary" },
    { label: "RMS Suppliers", value: counts.rms, icon: Package, color: "text-warning" },
    { label: "Manufacturers", value: counts.man, icon: Factory, color: "text-info" },
    { label: "Distributors", value: counts.dis, icon: Truck, color: "text-accent-foreground" },
    { label: "Retailers", value: counts.ret, icon: ShoppingCart, color: "text-secondary" },
  ];

  if (loading) return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
      <div className="text-center space-y-4 py-8">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-6 w-1/2 mx-auto" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="glass-card">
            <CardContent className="p-4 flex flex-col items-center space-y-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
      {globalOffline && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Network Error</AlertTitle>
          <AlertDescription>
            Failed to connect to the blockchain. Please check your internet connection and ensure your wallet is on the correct network.
          </AlertDescription>
        </Alert>
      )}

      {/* Hero */}
      <div className="text-center space-y-3 py-8">
        <h1 className="text-3xl md:text-5xl font-display font-bold gradient-text">
          Pharmaceutical Supply Chain
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track medicines from raw materials to consumer with full blockchain transparency. Verify authenticity and trace every step of the journey.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
              <span className="text-2xl font-display font-bold">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="glass-card" id="tracking-section">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Track Medicine
          </CardTitle>
          <CardDescription>Enter a medicine ID to view its complete supply chain history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              type="number"
              min={1}
              placeholder="Medicine ID (e.g. 1)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button id="search-btn" onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={startScanner} disabled={isScanning}>
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
          {isScanning && (
            <div className="mb-4">
              <div id="reader" className="w-full"></div>
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setIsScanning(false)}>Cancel Scan</Button>
            </div>
          )}
          {searchError && <p className="text-destructive text-sm">{searchError}</p>}
          {searchResult && (
            <div className="space-y-4">
              {searchResult.imageHash && (
                <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden border mb-4">
                  <img 
                    src={`${IPFS_GATEWAY}${searchResult.imageHash}`} 
                    alt={searchResult.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display font-bold">{searchResult.name}</h3>
                  <p className="text-sm text-muted-foreground">{searchResult.description}</p>
                </div>
                <Badge variant={searchResult.stage === 6 ? "destructive" : searchResult.stage === 5 ? "default" : "secondary"} className="shrink-0">
                  {STAGES[searchResult.stage]}
                </Badge>
              </div>
              {searchResult.stage === 6 ? (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-display font-bold">Product Recalled</AlertTitle>
                  <AlertDescription className="text-xs">
                    WARNING: This product has been recalled by the manufacturer and should not be consumed.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400">
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle className="font-display font-bold">Authenticity Verified</AlertTitle>
                  <AlertDescription className="text-xs">
                    This product has been successfully verified on the blockchain.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Product Information</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {[
                      { label: "Batch Number", value: searchResult.batchNumber },
                      { label: "Manufacturing Date", value: formatDate(searchResult.manufacturingDate) },
                      { label: "Expiry Date", value: formatDate(searchResult.expiryDate) },
                      { label: "Quantity", value: searchResult.quantity },
                      { label: "Price", value: `${searchResult.price} Wei` },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between p-2 rounded bg-muted/30">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">Supply Chain Timeline</h4>
                  <ProductTimeline medicine={searchResult} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Blockchain Activity
          </CardTitle>
          <CardDescription>Real-time updates from the smart contract</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recent activity detected</p>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 5).map((event, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                  <div className="p-2 rounded-full bg-primary/10">
                    <History className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold text-sm truncate">
                        {event.name === "MedicineAdded" ? "New Product Registered" : 
                         event.name === "StageChanged" ? "Product Stage Updated" :
                         event.name === "MedicineSold" ? "Product Sold to Customer" : 
                         event.name.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        Block #{event.blockNumber}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {event.name === "MedicineAdded" && `Product: ${event.args[1]} (Qty: ${event.args[2]})`}
                      {event.name === "StageChanged" && `Medicine ID: ${event.args[0]} moved to ${STAGES[Number(event.args[1])]}`}
                      {event.name === "MedicineSold" && `Medicine ID: ${event.args[0]} sold`}
                    </div>
                    <div className="mt-2 font-mono text-[9px] text-primary/60 truncate">
                      TX: {event.transactionHash}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants tab moved to bottom or specific section if needed */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Registered Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rms">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="rms">RMS ({participants.rms.length})</TabsTrigger>
              <TabsTrigger value="man">Manufacturers ({participants.man.length})</TabsTrigger>
              <TabsTrigger value="dis">Distributors ({participants.dis.length})</TabsTrigger>
              <TabsTrigger value="ret">Retailers ({participants.ret.length})</TabsTrigger>
            </TabsList>
            {(["rms", "man", "dis", "ret"] as const).map(type => (
              <TabsContent key={type} value={type}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Place</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants[type].length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No participants registered</TableCell></TableRow>
                    ) : (
                      participants[type].map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{p.id}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.place}</TableCell>
                          <TableCell className="font-mono text-xs">{truncAddr(p.addr)}</TableCell>
                          <TableCell>
                            <Badge variant={p.active ? "default" : "secondary"}>
                              {p.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
