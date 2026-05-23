import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    path: "/api/socket",
    cors: {
      origin: "*",
    },
  });

  globalThis.ticketSocketServer = io;

  io.on("connection", (socket) => {
    socket.emit("ticket:connected", { connected: true });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`Ready on http://localhost:${port}`);
  });
});
