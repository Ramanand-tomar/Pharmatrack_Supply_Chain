export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x44aFb17E5108871ED2685ac7B9949C0Fc434BFB7";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
export const RPC_URL = import.meta.env.VITE_RPC_URL || "https://ethereum-sepolia.publicnode.com";
export const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || "Sepolia";
import { ABI } from "../utils/ABI"

export const STAGES = ["Init", "Raw Material Supply", "Manufacture", "Distribution", "Retail", "Sold"] as const;
export type Stage = typeof STAGES[number];

export const STAGE_COLORS: Record<number, string> = {
  0: "hsl(var(--muted-foreground))",
  1: "hsl(var(--warning))",
  2: "hsl(var(--info))",
  3: "hsl(var(--chart-4))",
  4: "hsl(var(--secondary))",
  5: "hsl(var(--success))",
};

export interface Medicine {
  id: number;
  name: string;
  description: string;
  batchNumber: string;
  manufacturingDate: number;
  expiryDate: number;
  quantity: number;
  price: number;
  assignedRMSid: number;
  assignedMANid: number;
  assignedDISid: number;
  assignedRETid: number;
  RMSid: number;
  MANid: number;
  DISid: number;
  RETid: number;
  rmsSupplyTime: number;
  manufactureTime: number;
  distributionTime: number;
  retailTime: number;
  soldTime: number;
  consumer: string;
  rating: number;
  stage: number;
  imageHash?: string;
}

export interface Participant {
  addr: string;
  id: number;
  name: string;
  place: string;
  active: boolean;
}

export type UserRole = "owner" | "rms" | "manufacturer" | "distributor" | "retailer" | "public";

export const CONTRACT_ABI = ABI;
export const API_URL = "http://localhost:5000";
