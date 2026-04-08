import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, CHAIN_ID, RPC_URL, NETWORK_NAME, API_URL, type UserRole, type Medicine, type Participant } from "@/lib/contract";
import { toast } from "sonner";

interface Web3State {
  account: string | null;
  balance: string;
  role: UserRole;
  roleId: number;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  contract: Contract | null;
  readContract: Contract | null;
  provider: BrowserProvider | null;
  token: string | null;
  user: any | null;
  isOffline: boolean;
}

interface Web3ContextType extends Web3State {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  fetchMedicine: (id: number) => Promise<Medicine | null>;
  fetchAllMedicines: () => Promise<Medicine[]>;
  fetchParticipants: (type: "rms" | "man" | "dis" | "ret") => Promise<Participant[]>;
  fetchCounts: () => Promise<{ medicines: number; rms: number; man: number; dis: number; ret: number }>;
  fetchEvents: () => Promise<any[]>;
  API_URL: string;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used within Web3Provider");
  return ctx;
};

// Singleton instances to avoid infinite recreation
let persistentProvider: JsonRpcProvider | null = null;
let persistentContract: Contract | null = null;

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<Web3State>({
    account: null,
    balance: "0",
    role: "public",
    roleId: 0,
    isConnecting: false,
    isCorrectNetwork: false,
    contract: null,
    readContract: null,
    provider: null,
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "null"),
    isOffline: false,
  });

  // Helper to get read contract safely
  const getReadContract = useCallback(() => {
    if (persistentContract) return persistentContract;
    try {
      persistentProvider = new JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
      persistentContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, persistentProvider);
      return persistentContract;
    } catch (e) {
      console.error("Failed to initialize read-only provider:", e);
      return null;
    }
  }, []);


  const detectRole = useCallback(async (address: string, contract: Contract): Promise<{ role: UserRole; roleId: number }> => {
    try {
      const owner = await contract.owner();
      if (owner.toLowerCase() === address.toLowerCase()) return { role: "owner", roleId: 0 };

      const rmsId = await contract.rmsAddressToId(address);
      if (Number(rmsId) > 0) return { role: "rms", roleId: Number(rmsId) };

      const manId = await contract.manAddressToId(address);
      if (Number(manId) > 0) return { role: "manufacturer", roleId: Number(manId) };

      const disId = await contract.disAddressToId(address);
      if (Number(disId) > 0) return { role: "distributor", roleId: Number(disId) };

      const retId = await contract.retAddressToId(address);
      if (Number(retId) > 0) return { role: "retailer", roleId: Number(retId) };
    } catch (e) {
      console.error("Role detection error:", e);
    }
    return { role: "public", roleId: 0 };
  }, []);

  const checkNetwork = useCallback(async (provider: BrowserProvider): Promise<boolean> => {
    const network = await provider.getNetwork();
    return Number(network.chainId) === CHAIN_ID;
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    const hexChainId = "0x" + CHAIN_ID.toString(16);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
    } catch (e: any) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hexChainId,
            chainName: NETWORK_NAME,
            rpcUrls: [RPC_URL],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          }],
        });
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not detected. Please install MetaMask.");
      return;
    }
    setState(s => ({ ...s, isConnecting: true }));
    try {
      const provider = new BrowserProvider(window.ethereum);
      const isCorrect = await checkNetwork(provider);
      if (!isCorrect) {
        await switchNetwork();
      }
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0];
      const balance = formatEther(await provider.getBalance(account));
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const { role, roleId } = await detectRole(account, contract);

      setState(s => ({
        ...s,
        account,
        balance: parseFloat(balance).toFixed(4),
        role,
        roleId,
        isConnecting: false,
        isCorrectNetwork: true,
        contract,
        readContract: contract,
        provider,
      }));
      toast.success(`Connected as ${role === "public" ? "Public User" : role.toUpperCase()}`);
    } catch (e: any) {
      console.error("Connection error:", e);
      toast.error(e.message || "Failed to connect wallet");
      setState(s => ({ ...s, isConnecting: false }));
    }
  }, [checkNetwork, switchNetwork, detectRole]);

  const disconnectWallet = useCallback(() => {
    setState(s => ({
      ...s,
      account: null, balance: "0", role: "public", roleId: 0,
      isConnecting: false, isCorrectNetwork: false, contract: null, readContract: null, provider: null,
      token: null, user: null,
    }));
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.info("Wallet disconnected");
  }, []);

  const fetchMedicine = useCallback(async (id: number): Promise<Medicine | null> => {
    try {
      const c = state.readContract || getReadContract();
      if (!c) throw new Error("Contract unreachable");
      const m = await c.medicines(id);
      
      if (!m.id || Number(m.id) === 0) return null; // Not found

      const med: Medicine = {
        id: Number(m.id), name: m.name, description: m.description, batchNumber: m.batchNumber,
        manufacturingDate: Number(m.manufacturingDate), expiryDate: Number(m.expiryDate),
        quantity: Number(m.quantity), price: Number(m.price),
        assignedRMSid: Number(m.assignedRMSid), assignedMANid: Number(m.assignedMANid),
        assignedDISid: Number(m.assignedDISid), assignedRETid: Number(m.assignedRETid),
        RMSid: Number(m.RMSid), MANid: Number(m.MANid), DISid: Number(m.DISid), RETid: Number(m.RETid),
        rmsSupplyTime: Number(m.rmsSupplyTime), manufactureTime: Number(m.manufactureTime),
        distributionTime: Number(m.distributionTime), retailTime: Number(m.retailTime),
        soldTime: Number(m.soldTime), consumer: m.consumer, rating: Number(m.rating), stage: Number(m.stage),
      };

      try {
        med.isBatchRecalled = await c.batchRecalled(med.batchNumber);
      } catch (e) {
        console.warn("Failed to fetch batch recall status", e);
      }

      try {
        const metaRes = await fetch(`${API_URL}/api/metadata/${id}`);
        const meta = await metaRes.json();
        if (meta.imageHash) med.imageHash = meta.imageHash;
      } catch (e) {
        console.warn("Failed to fetch medicine metadata", e);
      }

      return med;
    } catch (e) {
      console.error(`Fetch medicine ${id} error:`, e);
      setState(s => ({ ...s, isOffline: true }));
      return null;
    }
  }, [state.readContract, getReadContract]);

  const fetchAllMedicines = useCallback(async (): Promise<Medicine[]> => {
    try {
      const c = state.readContract || getReadContract();
      if (!c) return [];
      const count = Number(await c.medicineCtr());
      const promises = [];
      for (let i = 1; i <= count; i++) promises.push(fetchMedicine(i));
      const results = await Promise.all(promises);
      return results.filter(Boolean) as Medicine[];
    } catch (e) {
      console.error("Fetch all medicines error:", e);
      setState(s => ({ ...s, isOffline: true }));
      return [];
    }
  }, [state.readContract, fetchMedicine, getReadContract]);

  const fetchParticipants = useCallback(async (type: "rms" | "man" | "dis" | "ret"): Promise<Participant[]> => {
    try {
      const c = state.readContract || getReadContract();
      if (!c) return [];
      const ctrMap = { rms: "rmsCtr", man: "manCtr", dis: "disCtr", ret: "retCtr" };
      const fnMap = { rms: "rms", man: "man", dis: "dis", ret: "ret" };
      const count = Number(await c[ctrMap[type]]());
      const promises = [];
      for (let i = 1; i <= count; i++) {
        promises.push(
          c[fnMap[type]](i).then((p: any) => ({
            addr: p.addr, id: Number(p.id), name: p.name, place: p.place, active: p.active,
          }))
        );
      }
      return Promise.all(promises);
    } catch (e) {
      console.error(`Fetch ${type} error:`, e);
      setState(s => ({ ...s, isOffline: true }));
      return [];
    }
  }, [state.readContract, getReadContract]);

  const fetchCounts = useCallback(async () => {
    try {
      const c = state.readContract || getReadContract();
      if (!c) throw new Error("Contract unreachable");
      const [medicines, rms, man, dis, ret] = await Promise.all([
        c.medicineCtr(), c.rmsCtr(), c.manCtr(), c.disCtr(), c.retCtr(),
      ]);
      return { medicines: Number(medicines), rms: Number(rms), man: Number(man), dis: Number(dis), ret: Number(ret) };
    } catch (e) {
      console.error("Fetch counts error:", e);
      setState(s => ({ ...s, isOffline: true }));
      return { medicines: 0, rms: 0, man: 0, dis: 0, ret: 0 };
    }
  }, [state.readContract, getReadContract]);

  const fetchEvents = useCallback(async () => {
    try {
      const c = state.readContract || getReadContract();
      if (!c) return [];
      const events = await c.queryFilter("*", -1000); // Last 1000 blocks
      return events.map(e => {
        const ev = e as any;
        return {
          name: ev.fragment ? ev.fragment.name : "Event",
          args: ev.args || [],
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber
        };
      }).reverse();
    } catch (e) {
      console.error("Fetch events error:", e);
      setState(s => ({ ...s, isOffline: true }));
      return [];
    }
  }, [state.readContract, getReadContract]);

  // Listen for account/network changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnectWallet();
      else connectWallet();
    };
    const handleChainChanged = () => connectWallet();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [connectWallet, disconnectWallet]);

  return (
    <Web3Context.Provider value={{
      ...state, readContract: state.readContract,
      connectWallet, disconnectWallet, switchNetwork,
      fetchMedicine, fetchAllMedicines, fetchParticipants, fetchCounts, fetchEvents,
      API_URL,
    }}>
      {children}
    </Web3Context.Provider>
  );
};

declare global {
  interface Window { ethereum?: any; }
}
