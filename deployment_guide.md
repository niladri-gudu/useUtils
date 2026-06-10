# Deploying the WebRTC Signaling Server

The P2P File Sharing utility utilizes WebRTC for direct data transfers. To establish peer-to-peer connections, clients must first connect to a **Signaling Server** via WebSockets to swap connection offers, answers, and ICE candidates. 

This project implements the signaling server as a stateless router wrapped around **Cloudflare Workers Durable Objects** inside the `signaling` directory.

---

## ⚡ Prerequisites

1. **Cloudflare Workers Paid Plan**:
   - Because this worker relies on **Durable Objects** to manage stateful WebSocket connections in real time, you must have the **Workers Paid** plan active on your Cloudflare account (starting at $5/month). 
   - Without it, Cloudflare will reject the deployment with a `Durable Objects require a Paid plan` error.
2. **Cloudflare CLI (Wrangler)**:
   - Wrangler is installed as a devDependency in the project.

---

## 🚀 Step-by-Step Deployment

### 1. Authenticate with Cloudflare
Before deploying, make sure you are logged in to your Cloudflare account:
```bash
npx wrangler login
```
This will open a browser window asking you to authorize Wrangler to access your Cloudflare account.

### 2. Deploy the Signaling Worker
Once logged in, navigate to the `signaling` directory and run the deploy script:
```bash
# Navigate to the signaling directory
cd signaling

# Deploy using wrangler
pnpm run deploy
```
Wrangler will package the TypeScript code, upload the worker, register the Durable Object namespace (`ROOMS`), run the migrations, and output a deployment URL like:
`https://useutils-signaling.<your-subdomain>.workers.dev`

---

## 🔗 Connecting the Frontend

The frontend P2P component ([P2PShare.tsx](file:///d:/code/saas/useutils.com/src/components/P2PShare.tsx)) resolves the websocket URL as follows:
- **Development**: Uses `ws://localhost:8787` (run `pnpm run dev` in `signaling` to test locally).
- **Production**: Fallback defaults to `wss://signaling.useutils.com` or reads the environment variable `PUBLIC_SIGNALING_URL`.

You can configure the connection in one of two ways:

### Option A: Use a Custom Domain (Recommended)
This avoids changing any environment variables or code.
1. Go to your **Cloudflare Dashboard** -> **Workers & Pages**.
2. Click on your deployed `useutils-signaling` worker.
3. Go to the **Settings** -> **Domains & Routes** tab.
4. Click **Add Custom Domain** and enter `signaling.useutils.com` (or any subdomain of a domain active on your Cloudflare account).
5. Cloudflare will configure the SSL certificate and route DNS automatically.

### Option B: Set the Build Environment Variable
If you do not want to use a custom domain, you can feed the websocket URL (`wss://...`) to the build script:
1. When deploying the frontend Astro site via Wrangler:
   ```bash
   cross-env PUBLIC_SIGNALING_URL=wss://useutils-signaling.<your-subdomain>.workers.dev pnpm run deploy
   ```
2. Or, if deploying via Cloudflare Pages CI/CD:
   - Go to your Cloudflare Pages project settings -> **Environment Variables**.
   - Add a variable `PUBLIC_SIGNALING_URL` with value `wss://useutils-signaling.<your-subdomain>.workers.dev` for both Production and Preview environments.
   - Trigger a redeploy.
