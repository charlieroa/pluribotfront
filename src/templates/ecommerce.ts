/**
 * E-commerce template — Header, ProductGrid with category filter, CartSidebar.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { sharedFiles, sharedUIComponents } from './shared'

const appTsx = `import { useState } from 'react'
import Header from './components/Header'
import ProductGrid from './components/ProductGrid'
import CartSidebar from './components/CartSidebar'
import { products } from './data/products'

export interface CartItem {
  id: number
  name: string
  price: number
  color: string
  qty: number
}

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const addToCart = (product: { id: number; name: string; price: number; color: string }) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
    setCartOpen(true)
  }

  const updateQty = (id: number, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    )
  }

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <ProductGrid products={products} onAddToCart={addToCart} />
      </main>
      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={updateQty}
      />
    </div>
  )
}
`

const headerTsx = `import { ShoppingCart, Search } from 'lucide-react'

interface HeaderProps {
  cartCount: number
  onCartClick: () => void
}

export default function Header({ cartCount, onCartClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-xl font-bold text-gray-900">MiTienda</span>

        <div className="hidden sm:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
        </div>

        <button onClick={onCartClick} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ShoppingCart size={20} className="text-gray-700" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
`

const productCardTsx = `import { ShoppingCart } from 'lucide-react'

interface ProductCardProps {
  id: number
  name: string
  price: number
  category: string
  color: string
  onAdd: () => void
}

export default function ProductCard({ name, price, color, onAdd }: ProductCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-lg transition-all">
      <div
        className="h-48 w-full"
        style={{ background: \`linear-gradient(135deg, \${color}, \${color}aa)\` }}
      />
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        <p className="text-lg font-bold text-gray-800 mt-1">\${price.toFixed(2)}</p>
        <button
          onClick={onAdd}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <ShoppingCart size={14} />
          Agregar
        </button>
      </div>
    </div>
  )
}
`

const productGridTsx = `import { useState } from 'react'
import ProductCard from './ProductCard'

interface Product {
  id: number
  name: string
  price: number
  category: string
  color: string
}

interface ProductGridProps {
  products: Product[]
  onAddToCart: (product: Product) => void
}

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))]
  const [active, setActive] = useState('Todos')

  const filtered = active === 'Todos' ? products : products.filter(p => p.category === active)

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={\`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors \${
              active === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }\`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(p => (
          <ProductCard key={p.id} {...p} onAdd={() => onAddToCart(p)} />
        ))}
      </div>
    </div>
  )
}
`

const cartSidebarTsx = `import { X, Plus, Minus, ShoppingBag } from 'lucide-react'
import type { CartItem } from '../App'

interface CartSidebarProps {
  open: boolean
  onClose: () => void
  items: CartItem[]
  onUpdateQty: (id: number, delta: number) => void
}

export default function CartSidebar({ open, onClose, items, onUpdateQty }: CartSidebarProps) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />}

      {/* Sidebar */}
      <div className={\`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 \${open ? 'translate-x-0' : 'translate-x-full'}\`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Carrito</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingBag size={48} className="mb-3 opacity-40" />
                <p className="text-sm">Tu carrito esta vacio</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg flex-shrink-0" style={{ background: item.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">\${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onUpdateQty(item.id, -1)} className="p-1 rounded hover:bg-gray-100">
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                      <button onClick={() => onUpdateQty(item.id, 1)} className="p-1 rounded hover:bg-gray-100">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-xl font-bold text-gray-900">\${total.toFixed(2)}</span>
              </div>
              <button className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                Comprar ahora
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
`

const productsTs = `export const products = [
  { id: 1, name: 'Camiseta Basica', price: 24.99, category: 'Ropa', color: '#6366f1' },
  { id: 2, name: 'Pantalon Cargo', price: 49.99, category: 'Ropa', color: '#059669' },
  { id: 3, name: 'Zapatillas Running', price: 89.99, category: 'Calzado', color: '#dc2626' },
  { id: 4, name: 'Mochila Urban', price: 39.99, category: 'Accesorios', color: '#7c3aed' },
  { id: 5, name: 'Gorra Snapback', price: 19.99, category: 'Accesorios', color: '#0891b2' },
  { id: 6, name: 'Chaqueta Denim', price: 74.99, category: 'Ropa', color: '#2563eb' },
  { id: 7, name: 'Botas Chelsea', price: 119.99, category: 'Calzado', color: '#92400e' },
  { id: 8, name: 'Reloj Clasico', price: 149.99, category: 'Accesorios', color: '#1e293b' },
]
`

export function getEcommerceFiles(): FileSystemTree {
  const sharedSrc = (sharedFiles.src as { directory: FileSystemTree }).directory
  return {
    ...sharedFiles,
    src: {
      directory: {
        ...sharedSrc,
        'App.tsx': { file: { contents: appTsx } },
        components: {
          directory: {
            ...sharedUIComponents,
            'Header.tsx': { file: { contents: headerTsx } },
            'ProductCard.tsx': { file: { contents: productCardTsx } },
            'ProductGrid.tsx': { file: { contents: productGridTsx } },
            'CartSidebar.tsx': { file: { contents: cartSidebarTsx } },
          },
        },
        data: {
          directory: {
            'products.ts': { file: { contents: productsTs } },
          },
        },
      },
    },
  }
}
