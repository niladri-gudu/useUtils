export interface Env {
  ROOMS: DurableObjectNamespace;
}

export class Room {
  private state: any;
  private env: any;
  private sessions: Map<WebSocket, string>; // Maps WebSocket -> peerId
  private roles: Map<string, 'sender' | 'receiver'>; // Maps peerId -> role

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.roles = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const peerId = url.searchParams.get("peer") || crypto.randomUUID();
    const role = (url.searchParams.get("role") as 'sender' | 'receiver') || 'receiver';

    const [client, server] = new WebSocketPair();
    server.accept();

    // Map this socket and role
    this.sessions.set(server, peerId);
    this.roles.set(peerId, role);

    // Broadcast "peer-joined" to existing peers (includes new peerId, role, and total count)
    this.broadcast({
      type: "peer-joined",
      peerId: peerId,
      role: role,
      totalPeers: this.sessions.size
    }, server);

    // Send welcome message to the new client with room information (list of existing peers)
    const existingPeers = Array.from(this.sessions.entries()).map(([_, id]) => ({
      id,
      role: this.roles.get(id) || 'receiver'
    }));

    server.send(JSON.stringify({
      type: "room-welcome",
      yourId: peerId,
      peers: existingPeers
    }));

    // Handle incoming messages on this socket connection
    server.addEventListener("message", (event) => {
      try {
        const data = event.data;
        if (typeof data !== "string") return;

        const payload = JSON.parse(data);
        
        // Attach senderId to the payload
        payload.senderId = peerId;
        const msgStr = JSON.stringify(payload);

        const targetId = payload.targetId;
        if (targetId) {
          // Route specifically to the target client
          for (const [socket, id] of this.sessions.entries()) {
            if (id === targetId) {
              socket.send(msgStr);
              break;
            }
          }
        } else {
          // Broadcast to everyone else in the room
          for (const [socket] of this.sessions.entries()) {
            if (socket !== server) {
              socket.send(msgStr);
            }
          }
        }
      } catch (err) {
        console.error("Error routing message:", err);
      }
    });

    const handleDisconnect = () => {
      if (!this.sessions.has(server)) return;
      const peerRole = this.roles.get(peerId) || 'receiver';
      this.sessions.delete(server);
      this.roles.delete(peerId);
      
      this.broadcast({
        type: "peer-left",
        peerId: peerId,
        role: peerRole,
        totalPeers: this.sessions.size
      });
    };

    server.addEventListener("close", handleDisconnect);
    server.addEventListener("error", handleDisconnect);

    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  private broadcast(message: any, exclude?: WebSocket) {
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    for (const [session] of this.sessions.entries()) {
      if (session !== exclude) {
        try {
          session.send(payload);
        } catch (e) {
          this.sessions.delete(session);
        }
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const roomId = url.searchParams.get("room");
    if (!roomId) {
      return new Response("Missing room parameter", { status: 400 });
    }

    // Get the Durable Object namespace ID by room name
    const id = env.ROOMS.idFromName(roomId);
    
    // Get the stub for the Durable Object instance
    const obj = env.ROOMS.get(id);

    // Forward the upgrade request to the Durable Object
    return obj.fetch(request);
  },
};
