import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "@/lib/contract";
import { toast } from "sonner";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Connected to Socket.io server");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.io server");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("Socket connection error:", err);
    });

    // Listen for recall alerts (Blast Notification)
    newSocket.on("recall_alert", (data: { batchNumber: string; reason: string; manufacturer: string }) => {
      console.log("RECALL ALERT RECEIVED:", data);
      
      toast.error(`CRITICAL RECALL ALERT`, {
        description: `Batch ${data.batchNumber} has been recalled. Reason: ${data.reason}`,
        duration: 15000,
        style: {
          border: '2px solid hsl(var(--destructive))',
          background: 'hsl(var(--destructive) / 0.1)',
        }
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
