// Few-shot examples for Logic system prompt
// Shows correct usage of UI components, semantic tokens, and GSAP

export const LOGIC_EXAMPLES = `
EJEMPLOS:

1. Dashboard con metricas:
\`\`\`tsx
// src/App.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
const { Card, CardHeader, CardTitle, CardContent, Badge, Progress } = window.__UI;

const data = [{ name: 'Ene', value: 400 }, { name: 'Feb', value: 300 }, { name: 'Mar', value: 600 }];

export default function App() {
  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[{ label: 'Usuarios', val: '2,451', pct: 72 }, { label: 'Ingresos', val: '$12.5K', pct: 85 }].map(m => (
          <Card key={m.label}>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">{m.label}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{m.val}</p>
              <Progress value={m.pct} className="mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Ventas mensuales</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" className="fill-primary" /></BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
\`\`\`

2. Landing page con GSAP + Unsplash images:
\`\`\`tsx
// src/App.tsx
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
const { Button, Card, CardContent, Avatar, AvatarImage, AvatarFallback } = window.__UI;

export default function App() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  useEffect(() => {
    gsap.from(heroRef.current.children, { opacity: 0, y: 40, stagger: 0.2, duration: 0.8, ease: 'power2.out' });
    gsap.from('.feature-card', { opacity: 0, y: 60, stagger: 0.15, duration: 0.6, scrollTrigger: { trigger: featuresRef.current, start: 'top 80%' } });
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <section ref={heroRef} className="relative flex flex-col items-center justify-center min-h-screen text-center px-4">
        <img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&q=80" alt="hero" className="absolute inset-0 w-full h-full object-cover opacity-10" />
        <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-4 relative">Build faster</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl relative">Ship beautiful apps in record time.</p>
        <div className="flex gap-4 relative">
          <Button size="lg">Get Started</Button>
          <Button variant="outline" size="lg">Learn More</Button>
        </div>
      </section>
      <section ref={featuresRef} className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[{ icon: Icons.Zap, t: 'Fast' }, { icon: Icons.Shield, t: 'Secure' }, { icon: Icons.TrendingUp, t: 'Scalable' }].map(f => (
            <Card key={f.t} className="feature-card">
              <CardContent className="p-6 text-center">
                {h(f.icon, { className: 'w-10 h-10 text-primary mx-auto mb-4' })}
                <h3 className="text-xl font-semibold text-foreground mb-2">{f.t}</h3>
                <p className="text-muted-foreground">Enterprise-grade quality out of the box.</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
\`\`\`

3. SaaS con sidebar + content layout:
\`\`\`tsx
// src/App.tsx
const { Button, Card, CardHeader, CardTitle, CardContent, Avatar, AvatarImage, AvatarFallback, Badge, Separator, ScrollArea } = window.__UI;

const navItems = [{ icon: Icons.LayoutDashboard, label: 'Dashboard' }, { icon: Icons.Users, label: 'Users' }, { icon: Icons.Settings, label: 'Settings' }];

export default function App() {
  const [active, setActive] = useState('Dashboard');
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card p-4 flex flex-col">
        <h2 className="text-lg font-bold text-foreground mb-6 px-2">SaaS App</h2>
        <nav className="flex-1 space-y-1">
          {navItems.map(n => (
            <button key={n.label} onClick={() => setActive(n.label)} className={\`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm \${active === n.label ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}\`}>
              {React.createElement(n.icon, { className: 'w-4 h-4' })} {n.label}
            </button>
          ))}
        </nav>
        <Separator className="my-2" />
        <div className="flex items-center gap-3 px-2">
          <Avatar><AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80" /><AvatarFallback>JD</AvatarFallback></Avatar>
          <div><p className="text-sm font-medium text-foreground">John Doe</p><p className="text-xs text-muted-foreground">john@example.com</p></div>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">{active}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[{ label: 'Total Users', val: '2,451', trend: '+12%' }, { label: 'Revenue', val: '$45.2K', trend: '+8%' }, { label: 'Active Now', val: '573', trend: '+24%' }].map(m => (
            <Card key={m.label}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{m.label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-foreground">{m.val}</p><Badge variant="secondary" className="mt-1">{m.trend}</Badge></CardContent></Card>
          ))}
        </div>
      </main>
    </div>
  );
}
\`\`\`

4. E-commerce product grid:
\`\`\`tsx
// src/App.tsx
const { Button, Card, CardContent, Badge, Input, Separator } = window.__UI;

const products = [
  { name: 'Minimal Chair', price: 299, img: 'https://images.unsplash.com/photo-1567538096621-38d2284b23ff?w=600&q=80', tag: 'New' },
  { name: 'Desk Lamp', price: 89, img: 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600&q=80', tag: null },
  { name: 'Ceramic Vase', price: 45, img: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=600&q=80', tag: 'Sale' },
  { name: 'Wall Clock', price: 120, img: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&q=80', tag: null },
];

export default function App() {
  const [search, setSearch] = useState('');
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Store</h1>
          <div className="flex items-center gap-4">
            <Input placeholder="Search..." className="w-64" value={search} onChange={e => setSearch(e.target.value)} />
            <Button variant="outline" size="icon"><Icons.ShoppingCart className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map(p => (
            <Card key={p.name} className="overflow-hidden group cursor-pointer">
              <div className="relative aspect-square overflow-hidden">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                {p.tag && <Badge className="absolute top-2 right-2">{p.tag}</Badge>}
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium text-foreground">{p.name}</h3>
                <p className="text-lg font-bold text-foreground mt-1">\${p.price}</p>
                <Button className="w-full mt-3" size="sm">Add to Cart</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
\`\`\`
`
