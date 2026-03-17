import { useState } from 'react'
import { Book, Key, Rocket, Webhook, Code2, Palette, Gauge, AlertTriangle, Copy, Check, ArrowLeft, Zap } from 'lucide-react'

const NAV_SECTIONS = [
  { id: 'quickstart', label: 'Quickstart', icon: <Rocket size={14} /> },
  { id: 'auth', label: 'Authentication', icon: <Key size={14} /> },
  { id: 'endpoints', label: 'API Endpoints', icon: <Code2 size={14} /> },
  { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={14} /> },
  { id: 'sdk', label: 'Embed SDK', icon: <Zap size={14} /> },
  { id: 'whitelabel', label: 'White-label', icon: <Palette size={14} /> },
  { id: 'agents', label: 'AI Agents', icon: <Book size={14} /> },
  { id: 'ratelimits', label: 'Rate Limits', icon: <Gauge size={14} /> },
  { id: 'errors', label: 'Error Codes', icon: <AlertTriangle size={14} /> },
]

const CodeBlock = ({ code, language = 'bash' }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group rounded-lg bg-[#0f172a] border border-[#1e293b] overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1e293b] text-[10px] text-gray-500">
        <span>{language}</span>
        <button onClick={copy} className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors">
          {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
        </button>
      </div>
      <pre className="p-3 text-[12px] leading-relaxed text-gray-300 overflow-x-auto"><code>{code}</code></pre>
    </div>
  )
}

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('quickstart')

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1e293b] p-4 sticky top-0 h-screen overflow-y-auto hidden md:block">
        <a href="/" className="flex items-center gap-2 mb-6 text-white hover:text-indigo-400 transition-colors">
          <ArrowLeft size={16} />
          <span className="font-semibold text-sm">Plury</span>
        </a>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">API Documentation</h2>
        <nav className="space-y-0.5">
          {NAV_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                activeSection === s.id ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>

        <div className="mt-8 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
          <p className="text-[11px] text-indigo-400 font-medium">Base URL</p>
          <code className="text-[12px] text-indigo-300 mt-1 block">https://plury.co/api/v1</code>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-8">
        {/* Mobile nav */}
        <div className="md:hidden mb-6">
          <select
            value={activeSection}
            onChange={e => setActiveSection(e.target.value)}
            className="w-full bg-[#1e293b] border border-[#334155] text-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {NAV_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {activeSection === 'quickstart' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">Quickstart</h1>
            <p className="text-gray-400 mb-6">Get up and running with the Plury API in 3 steps.</p>

            <h3 className="text-sm font-semibold text-white mt-6 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">1</span>
              Get your API key
            </h3>
            <p className="text-sm text-gray-400 mb-2">Go to Settings → API Keys in your Plury dashboard. Requires Agency ($99/mo) or Enterprise ($299/mo) plan.</p>

            <h3 className="text-sm font-semibold text-white mt-6 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">2</span>
              Start a generation
            </h3>
            <CodeBlock language="bash" code={`curl -X POST https://plury.co/api/v1/generate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: pk_live_your_key_here" \\
  -d '{
    "prompt": "Create a landing page for a pizza delivery app",
    "agent": "dev"
  }'`} />
            <p className="text-sm text-gray-400 mb-2">Response:</p>
            <CodeBlock language="json" code={`{
  "id": "abc123",
  "status": "processing",
  "poll_url": "/api/v1/generations/abc123"
}`} />

            <h3 className="text-sm font-semibold text-white mt-6 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">3</span>
              Poll for results
            </h3>
            <CodeBlock language="bash" code={`curl https://plury.co/api/v1/generations/abc123 \\
  -H "X-API-Key: pk_live_your_key_here"`} />
            <CodeBlock language="json" code={`{
  "id": "abc123",
  "status": "completed",
  "results": [{
    "id": "del_456",
    "title": "Pizza Delivery Landing",
    "type": "code",
    "html": "<!DOCTYPE html>...",
    "published_url": "https://plury.co/p/pizza-delivery"
  }],
  "credits_used": 45
}`} />

            <h3 className="text-sm font-semibold text-white mt-8 mb-2">JavaScript Example</h3>
            <CodeBlock language="javascript" code={`const response = await fetch('https://plury.co/api/v1/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'pk_live_your_key_here'
  },
  body: JSON.stringify({
    prompt: 'Create a SaaS pricing page with 3 tiers',
    agent: 'dev',
    webhook_url: 'https://your-site.com/webhook' // optional
  })
});
const { id } = await response.json();

// Poll every 3s until done
const poll = setInterval(async () => {
  const res = await fetch(\`https://plury.co/api/v1/generations/\${id}\`, {
    headers: { 'X-API-Key': 'pk_live_your_key_here' }
  });
  const data = await res.json();
  if (data.status === 'completed') {
    clearInterval(poll);
    console.log('HTML:', data.results[0].html);
  }
}, 3000);`} />

            <h3 className="text-sm font-semibold text-white mt-8 mb-2">Python Example</h3>
            <CodeBlock language="python" code={`import requests, time

API_KEY = "pk_live_your_key_here"
BASE = "https://plury.co/api/v1"
headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

# Start generation
res = requests.post(f"{BASE}/generate", json={
    "prompt": "Build a restaurant menu app with categories",
    "agent": "dev"
}, headers=headers)
gen_id = res.json()["id"]

# Poll until complete
while True:
    time.sleep(3)
    result = requests.get(f"{BASE}/generations/{gen_id}", headers=headers).json()
    if result["status"] == "completed":
        print("HTML:", result["results"][0]["html"][:200])
        break`} />
          </section>
        )}

        {activeSection === 'auth' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">Authentication</h1>
            <p className="text-gray-400 mb-6">All API requests require authentication via API key.</p>

            <h3 className="text-sm font-semibold text-white mb-2">Pass your API key</h3>
            <p className="text-sm text-gray-400 mb-2">Use either the <code className="text-indigo-400">X-API-Key</code> header or <code className="text-indigo-400">Authorization: Bearer</code>:</p>
            <CodeBlock language="bash" code={`# Option 1: X-API-Key header (recommended)
curl -H "X-API-Key: pk_live_abc123..." https://plury.co/api/v1/usage

# Option 2: Bearer token
curl -H "Authorization: Bearer pk_live_abc123..." https://plury.co/api/v1/usage`} />

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Plan Requirements</h3>
            <div className="bg-[#1e293b] rounded-lg p-4 text-sm">
              <table className="w-full text-left">
                <thead><tr className="text-gray-500 text-xs"><th className="pb-2">Plan</th><th className="pb-2">API Access</th><th className="pb-2">Rate Limit</th></tr></thead>
                <tbody className="text-gray-300">
                  <tr className="border-t border-[#334155]"><td className="py-2">Starter</td><td className="text-red-400">No</td><td>-</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-2">Agency ($99/mo)</td><td className="text-green-400">Yes</td><td>100 req/hr</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-2">Enterprise ($299/mo)</td><td className="text-green-400">Yes</td><td>500 req/hr</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Key Format</h3>
            <p className="text-sm text-gray-400">Keys start with <code className="text-indigo-400">pk_live_</code> followed by 48 hex characters. Store them securely — they cannot be retrieved after creation.</p>
          </section>
        )}

        {activeSection === 'endpoints' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">API Endpoints</h1>
            <p className="text-gray-400 mb-6">Full reference for all available endpoints.</p>

            {/* POST /generate */}
            <div className="mb-8 p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded">POST</span>
                <code className="text-sm text-white">/generate</code>
              </div>
              <p className="text-sm text-gray-400 mb-3">Start an async generation job. Returns immediately with an ID to poll.</p>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Body Parameters</h4>
              <table className="w-full text-sm text-left">
                <tbody className="text-gray-300">
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">prompt</td><td>string <span className="text-red-400">required</span></td><td className="text-gray-500">What to generate</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">agent</td><td>string</td><td className="text-gray-500">dev | web | seo | content | ads (default: dev)</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">model</td><td>string</td><td className="text-gray-500">Model override (optional)</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">webhook_url</td><td>string</td><td className="text-gray-500">URL to receive results when done</td></tr>
                </tbody>
              </table>
            </div>

            {/* GET /generations/:id */}
            <div className="mb-8 p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">GET</span>
                <code className="text-sm text-white">/generations/:id</code>
              </div>
              <p className="text-sm text-gray-400">Get the status and results of a generation. Poll this until status is "completed".</p>
            </div>

            {/* GET /generations */}
            <div className="mb-8 p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">GET</span>
                <code className="text-sm text-white">/generations</code>
              </div>
              <p className="text-sm text-gray-400 mb-3">List all your generations with pagination.</p>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Query Parameters</h4>
              <table className="w-full text-sm text-left">
                <tbody className="text-gray-300">
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">limit</td><td className="text-gray-500">Max results (default 20, max 100)</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">offset</td><td className="text-gray-500">Skip N results (default 0)</td></tr>
                </tbody>
              </table>
            </div>

            {/* GET /usage */}
            <div className="mb-8 p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">GET</span>
                <code className="text-sm text-white">/usage</code>
              </div>
              <p className="text-sm text-gray-400">Get your credit balance and usage breakdown by agent and model.</p>
            </div>

            {/* GET /agents */}
            <div className="mb-8 p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">GET</span>
                <code className="text-sm text-white">/agents</code>
              </div>
              <p className="text-sm text-gray-400">List all available AI agents with their capabilities and costs. No auth required.</p>
            </div>

            {/* GET /docs */}
            <div className="p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded">GET</span>
                <code className="text-sm text-white">/docs</code>
              </div>
              <p className="text-sm text-gray-400">Returns the full OpenAPI 3.0.3 specification as JSON. No auth required.</p>
            </div>
          </section>
        )}

        {activeSection === 'webhooks' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">Webhooks</h1>
            <p className="text-gray-400 mb-6">Get notified when a generation completes instead of polling.</p>

            <h3 className="text-sm font-semibold text-white mb-2">Setup</h3>
            <p className="text-sm text-gray-400 mb-2">Pass a <code className="text-indigo-400">webhook_url</code> in your generate request:</p>
            <CodeBlock language="bash" code={`curl -X POST https://plury.co/api/v1/generate \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: pk_live_..." \\
  -d '{
    "prompt": "Create a portfolio website",
    "webhook_url": "https://your-app.com/plury-webhook"
  }'`} />

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Webhook Payload</h3>
            <p className="text-sm text-gray-400 mb-2">When generation completes, we POST to your URL:</p>
            <CodeBlock language="json" code={`{
  "event": "generation.completed",
  "id": "conv_abc123",
  "status": "completed",
  "results": [{
    "id": "del_456",
    "title": "Portfolio Website",
    "type": "code",
    "html": "<!DOCTYPE html>...",
    "published_url": "https://plury.co/p/portfolio-xyz"
  }],
  "credits_used": 45,
  "timestamp": "2026-03-10T15:30:00.000Z"
}`} />

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Verifying Signatures</h3>
            <p className="text-sm text-gray-400 mb-2">Each webhook includes an <code className="text-indigo-400">X-Plury-Signature</code> header with HMAC-SHA256:</p>
            <CodeBlock language="javascript" code={`const crypto = require('crypto');

app.post('/plury-webhook', (req, res) => {
  const signature = req.headers['x-plury-signature'];
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).send('Invalid signature');
  }

  // Process the webhook
  const { event, results } = req.body;
  console.log('Generation completed:', results[0].title);
  res.status(200).send('OK');
});`} />

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Headers</h3>
            <div className="bg-[#1e293b] rounded-lg p-4 text-sm">
              <table className="w-full text-left">
                <thead><tr className="text-gray-500 text-xs"><th className="pb-2">Header</th><th className="pb-2">Value</th></tr></thead>
                <tbody className="text-gray-300">
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono">Content-Type</td><td>application/json</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono">X-Plury-Signature</td><td>sha256=hmac_hex</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono">X-Plury-Event</td><td>generation.completed</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono">User-Agent</td><td>Plury-Webhook/1.0</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Retry Policy</h3>
            <p className="text-sm text-gray-400">Failed deliveries are retried 3 times with exponential backoff: 1s, 5s, 15s. We expect a 2xx response within 10 seconds.</p>
          </section>
        )}

        {activeSection === 'sdk' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">Embed SDK</h1>
            <p className="text-gray-400 mb-6">Embed Plury's AI web builder directly in your platform.</p>

            <h3 className="text-sm font-semibold text-white mb-2">Quick Setup</h3>
            <CodeBlock language="html" code={`<!-- 1. Add the SDK script -->
<script src="https://plury.co/sdk/plury.js"></script>

<!-- 2. Add a container -->
<div id="builder" style="width:100%;height:700px;"></div>

<!-- 3. Initialize -->
<script>
  const plury = Plury.init({
    apiKey: 'pk_live_your_key_here',
    container: '#builder',
    theme: {
      primaryColor: '#6366f1',
      brandName: 'My Agency'
    },
    onComplete: (result) => {
      console.log('Generated!', result.html);
      console.log('Published:', result.published_url);
    }
  });
</script>`} />

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Configuration Options</h3>
            <div className="bg-[#1e293b] rounded-lg p-4 text-sm">
              <table className="w-full text-left">
                <thead><tr className="text-gray-500 text-xs"><th className="pb-2">Option</th><th className="pb-2">Type</th><th className="pb-2">Description</th></tr></thead>
                <tbody className="text-gray-300">
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">apiKey</td><td>string</td><td>Your API key (required)</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">container</td><td>string | Element</td><td>CSS selector or DOM element</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">theme</td><td>object</td><td>Branding customization</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">locale</td><td>string</td><td>'es' or 'en' (default: 'es')</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">onComplete</td><td>function</td><td>Called when generation completes</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-1.5 font-mono text-indigo-400">onError</td><td>function</td><td>Called on errors</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Programmatic API</h3>
            <CodeBlock language="javascript" code={`// Generate without the visual builder
const plury = Plury.init({ apiKey: 'pk_live_...' });

// Start generation
const { id } = await plury.generate('Create a blog homepage', {
  agent: 'dev',
  webhookUrl: 'https://my-site.com/hook'
});

// Check result
const result = await plury.getResult(id);

// Check credit balance
const usage = await plury.getUsage();
console.log('Credits remaining:', usage.balance);

// List available agents
const { agents } = await plury.listAgents();

// Cleanup
plury.destroy();`} />

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Theme Options</h3>
            <CodeBlock language="javascript" code={`Plury.init({
  apiKey: 'pk_live_...',
  container: '#builder',
  theme: {
    primaryColor: '#FF5733',  // buttons, accents
    brandName: 'AcmeWeb',     // replaces "Plury" branding
    logo: 'https://acme.com/logo.svg'  // header logo
  }
});`} />
          </section>
        )}

        {activeSection === 'whitelabel' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">White-label</h1>
            <p className="text-gray-400 mb-6">Remove Plury branding and use your own identity on generated sites.</p>

            <h3 className="text-sm font-semibold text-white mb-2">Organization Settings</h3>
            <p className="text-sm text-gray-400 mb-3">Configure white-label options in Settings → Organization:</p>

            <div className="bg-[#1e293b] rounded-lg p-4 text-sm space-y-3">
              <div className="flex items-center gap-3"><span className="text-indigo-400 font-mono w-32">brandName</span><span className="text-gray-400">Replace "Plury" in all generated sites</span></div>
              <div className="flex items-center gap-3"><span className="text-indigo-400 font-mono w-32">primaryColor</span><span className="text-gray-400">Main brand color for CSS variables</span></div>
              <div className="flex items-center gap-3"><span className="text-indigo-400 font-mono w-32">accentColor</span><span className="text-gray-400">Secondary accent color</span></div>
              <div className="flex items-center gap-3"><span className="text-indigo-400 font-mono w-32">logoUrl</span><span className="text-gray-400">Your logo URL</span></div>
              <div className="flex items-center gap-3"><span className="text-indigo-400 font-mono w-32">faviconUrl</span><span className="text-gray-400">Custom favicon for generated sites</span></div>
              <div className="flex items-center gap-3"><span className="text-indigo-400 font-mono w-32">fontFamily</span><span className="text-gray-400">Custom font family</span></div>
              <div className="flex items-center gap-3"><span className="text-indigo-400 font-mono w-32">customCss</span><span className="text-gray-400">Additional CSS injected into sites</span></div>
            </div>

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">How It Works</h3>
            <p className="text-sm text-gray-400">When configured, Plury automatically:</p>
            <ul className="text-sm text-gray-400 list-disc ml-5 mt-2 space-y-1">
              <li>Injects CSS variables (<code className="text-indigo-400">--plury-primary</code>, <code className="text-indigo-400">--plury-accent</code>) into generated HTML</li>
              <li>Replaces "Powered by Plury" with your brand name in footers</li>
              <li>Applies your custom font family to all text</li>
              <li>Replaces favicon with your custom icon</li>
              <li>Appends any custom CSS you provide</li>
            </ul>
          </section>
        )}

        {activeSection === 'agents' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">AI Agents</h1>
            <p className="text-gray-400 mb-6">Available agents and their specializations.</p>

            {[
              { id: 'dev', name: 'Code', desc: 'Full-stack developer. Generates complete React/Tailwind web apps.', caps: ['Landing pages', 'Web apps', 'Dashboards', 'E-commerce', 'CRUD apps'], cost: '~3 credits / 1K output tokens' },
              { id: 'web', name: 'Pixel', desc: 'Visual designer. Creates logos, banners, and brand materials.', caps: ['Logos', 'Social media posts', 'Banners', 'Branding'], cost: '10 credits per image' },
              { id: 'seo', name: 'Lupa', desc: 'SEO specialist. Keyword research and competitor analysis.', caps: ['Keyword research', 'Competitor analysis', 'SEO audit'], cost: '~1 credit / 1K output tokens' },
              { id: 'content', name: 'Pluma', desc: 'Content writer. Blog posts, emails, and social calendars.', caps: ['Blog posts', 'Email sequences', 'Social calendars'], cost: '~1 credit / 1K output tokens' },
              { id: 'ads', name: 'Metric', desc: 'Ad specialist. Campaign planning and Meta Ads management.', caps: ['Ad copy', 'Campaign plans', 'Meta Ads'], cost: '~1 credit / 1K output tokens' },
            ].map(agent => (
              <div key={agent.id} className="mb-4 p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-indigo-400 font-mono">{agent.id}</code>
                  <span className="text-white font-semibold">{agent.name}</span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{agent.desc}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {agent.caps.map(c => <span key={c} className="px-2 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-400 rounded-full">{c}</span>)}
                </div>
                <p className="text-[11px] text-gray-500">Cost: {agent.cost}</p>
              </div>
            ))}
          </section>
        )}

        {activeSection === 'ratelimits' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">Rate Limits</h1>
            <p className="text-gray-400 mb-6">API rate limits are enforced per API key per hour.</p>

            <div className="bg-[#1e293b] rounded-lg p-4 text-sm mb-6">
              <table className="w-full text-left">
                <thead><tr className="text-gray-500 text-xs"><th className="pb-2">Plan</th><th className="pb-2">Limit</th></tr></thead>
                <tbody className="text-gray-300">
                  <tr className="border-t border-[#334155]"><td className="py-2">Agency</td><td>100 requests/hour</td></tr>
                  <tr className="border-t border-[#334155]"><td className="py-2">Enterprise</td><td>500 requests/hour</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-white mb-2">Response Headers</h3>
            <CodeBlock language="text" code={`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
Retry-After: 3200        (only on 429)`} />

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Handling 429</h3>
            <CodeBlock language="javascript" code={`const res = await fetch(url, { headers });
if (res.status === 429) {
  const retryAfter = res.headers.get('Retry-After');
  console.log(\`Rate limited. Retry in \${retryAfter}s\`);
}`} />
          </section>
        )}

        {activeSection === 'errors' && (
          <section>
            <h1 className="text-2xl font-bold text-white mb-2">Error Codes</h1>
            <p className="text-gray-400 mb-6">Standard HTTP error codes returned by the API.</p>

            <div className="space-y-3">
              {[
                { code: 400, title: 'Bad Request', desc: 'Missing or invalid parameters. Check the error message for details.' },
                { code: 401, title: 'Unauthorized', desc: 'Invalid or missing API key. Ensure your key starts with pk_live_.' },
                { code: 402, title: 'Payment Required', desc: 'Insufficient credits. Top up your balance or upgrade your plan.' },
                { code: 403, title: 'Forbidden', desc: 'Plan does not support API access. Upgrade to Agency or Enterprise.' },
                { code: 404, title: 'Not Found', desc: 'Generation not found or does not belong to your account.' },
                { code: 429, title: 'Too Many Requests', desc: 'Rate limit exceeded. Check X-RateLimit-Remaining and Retry-After headers.' },
                { code: 500, title: 'Internal Error', desc: 'Server error. Retry the request. If persistent, contact support.' },
              ].map(err => (
                <div key={err.code} className="flex items-start gap-3 p-3 bg-[#1e293b] rounded-lg border border-[#334155]">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded ${err.code < 500 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{err.code}</span>
                  <div>
                    <p className="text-sm text-white font-medium">{err.title}</p>
                    <p className="text-sm text-gray-400">{err.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-white mt-6 mb-2">Error Response Format</h3>
            <CodeBlock language="json" code={`{
  "error": "Human-readable error message",
  "balance": 0,             // included on 402
  "currentPlan": "starter", // included on 403
  "limit": 100,             // included on 429
  "retryAfterSeconds": 3200 // included on 429
}`} />
          </section>
        )}
      </main>
    </div>
  )
}

export default DocsPage
