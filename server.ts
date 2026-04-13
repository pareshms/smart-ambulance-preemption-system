import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const signals = [
    { id: 'signal_1', name: 'Silk Board Junction', location: { lat: 12.9176, lng: 77.6233 } },
    { id: 'signal_2', name: 'Sony World Signal', location: { lat: 12.9344, lng: 77.6267 } },
    { id: 'signal_3', name: 'Richmond Circle', location: { lat: 12.9667, lng: 77.5933 } }
  ];

  const activeOverrides = new Map<string, NodeJS.Timeout>();

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Socket.IO logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Ambulance location updates
    socket.on("ambulance_location", (data) => {
      // data: { requestId, driverId, isEmergency, location: { lat, lng }, acuity }
      
      // Broadcast to all clients (dashboard)
      socket.broadcast.emit("location_update", data);
      
      // Traffic Signal Priority System
      if (data.isEmergency && data.location) {
        signals.forEach(signal => {
          const distance = calculateDistance(
            data.location.lat, data.location.lng,
            signal.location.lat, signal.location.lng
          );

          // If within 500 meters
          if (distance < 0.5) {
            console.log(`Emergency Priority: Setting ${signal.id} to GREEN (Dist: ${distance.toFixed(2)}km)`);
            
            // Clear existing timeout if any
            if (activeOverrides.has(signal.id)) {
              clearTimeout(activeOverrides.get(signal.id)!);
            }

            io.emit("signal_update", {
              signalId: signal.id,
              state: "GREEN",
              isManual: true,
              reason: "Emergency Priority"
            });

            // Revert to AUTO after 10 seconds of no emergency in range
            const timeout = setTimeout(() => {
              console.log(`Reverting ${signal.id} to AUTO`);
              io.emit("signal_update", {
                signalId: signal.id,
                state: "AUTO",
                isManual: false
              });
              activeOverrides.delete(signal.id);
            }, 10000);

            activeOverrides.set(signal.id, timeout);
          }
        });
      }
    });

    // Manual Traffic Signal Control
    socket.on("manual_signal_control", (data) => {
      // data: { signalId, state, duration, role }
      if (data.role === 'admin' || data.role === 'traffic_police') {
        console.log(`Manual override for ${data.signalId}: ${data.state}`);
        
        io.emit("signal_update", {
          signalId: data.signalId,
          state: data.state,
          isManual: true,
          duration: data.duration
        });

        // Revert to AUTO after duration
        if (data.state !== 'AUTO' && data.duration) {
          setTimeout(() => {
            io.emit("signal_update", {
              signalId: data.signalId,
              state: "AUTO",
              isManual: false
            });
          }, data.duration * 1000);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
