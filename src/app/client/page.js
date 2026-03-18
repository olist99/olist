'use client'; // Important! Marks this as a Client Component

import { useEffect, useState } from "react";

export default function NitroClient() {
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Replace this with your VPS WebSocket URL
    const WS_URL = "ws://81.168.83.122:3001/";
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("✅ Connected to Nitro VPS WebSocket");
      setWsStatus("Connected!");
      ws.send(JSON.stringify({ type: "hello", msg: "Client connected" }));
    };

    ws.onmessage = (event) => {
      console.log("📥 Received:", event.data);
      setMessages(prev => [...prev, event.data]);
    };

    ws.onerror = (err) => {
      console.error("❌ Nitro VPS WebSocket error:", err);
      setWsStatus("Error connecting!");
    };

    ws.onclose = () => {
      console.warn("⚠ Nitro VPS WebSocket closed");
      setWsStatus("Disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Nitro VPS Client</h1>
      <p>Status: <strong>{wsStatus}</strong></p>
      <h2>Messages:</h2>
      <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc", padding: "10px" }}>
        {messages.length === 0 ? (
          <em>No messages yet...</em>
        ) : (
          messages.map((msg, i) => <div key={i}>{msg}</div>)
        )}
      </div>
    </div>
  );
}