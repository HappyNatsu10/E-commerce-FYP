const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
import React, { useState, useEffect } from 'react';
import { ShoppingBag, ShoppingCart, Trash2, CreditCard, CheckCircle2, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const PRODUCTS: Product[] = [
  {
    id: 'prod_aura_book',
    name: 'Aura Book Pro 16"',
    price: 950000,
    category: 'Computers',
    description: 'Next-generation neural processor, 32GB RAM, 1TB SSD, and liquid retina glow display.',
    image: '/images/aura_book.png'
  },
  {
    id: 'prod_apex_phone',
    name: 'Apex Phone 15 Ultra',
    price: 650000,
    category: 'Phones',
    description: 'Titanium chassis, 5x optical telephoto lens, and quantum computing dynamic island.',
    image: '/images/apex_phone.png'
  },
  {
    id: 'prod_aero_pods',
    name: 'Aero Pods Max Pro',
    price: 250000,
    category: 'Audio',
    description: 'Studio-grade spatial audio, hybrid active noise canceling, and 48-hour smart battery.',
    image: '/images/aero_pods.png'
  },
  {
    id: 'prod_quantum_watch',
    name: 'Quantum Watch 2',
    price: 180000,
    category: 'Wearables',
    description: 'Biometric telemetry, holographic watch faces, and 100m deep water resistance.',
    image: '/images/quantum_watch.png'
  },
  {
    id: 'prod_zenith_vr',
    name: 'Zenith VR Headset',
    price: 1200000,
    category: 'Gaming',
    description: 'Ultra-low latency virtual reality headset with 8K micro-OLED displays and tactile feedback.',
    image: '/images/zenith_vr.png'
  },
  {
    id: 'prod_vortex_charger',
    name: 'Vortex Charging Station',
    price: 95000,
    category: 'Accessories',
    description: 'Multi-device wireless magnetic dock supporting 15W fast charge for phone, watch, and earbuds.',
    image: '/images/vortex_charger.png'
  },
  {
    id: 'prod_nebula_projector',
    name: 'Nebula 4K Projector',
    price: 450000,
    category: 'Home Tech',
    description: 'Compact 4K smart laser projector with built-in Dolby Atmos soundbar and 200-inch display.',
    image: '/images/nebula_projector.png'
  },
  {
    id: 'prod_titan_ssd',
    name: 'Titan External SSD 4TB',
    price: 120000,
    category: 'Storage',
    description: 'Rugged, water-resistant 4TB external solid-state drive with up to 2000MB/s transfer speeds.',
    image: '/images/titan_ssd.png'
  }
];

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentGateway, setPaymentGateway] = useState<'paystack' | 'stripe'>('paystack');
  const [status, setStatus] = useState<'idle' | 'checking_out' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [telemetry, setTelemetry] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastRef, setLastRef] = useState('');

  // Multi-tenant merchant selection
  const [merchants, setMerchants] = useState<any[]>([
    { id: 'usr_default', companyName: 'Covenant E-Shop Ltd' },
    { id: 'usr_apex', companyName: 'Apex Devices Ltd' }
  ]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('usr_default');

  // Check connection to SmartTax API
  const checkTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) {
        setTelemetry('connected');
      } else {
        setTelemetry('disconnected');
      }
    } catch {
      setTelemetry('disconnected');
    }
  };

  // Fetch list of registered merchants/users dynamically from the SmartTax backend
  const fetchMerchants = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setMerchants(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
    }
  };

  useEffect(() => {
    checkTelemetry();
    fetchMerchants();
    const interval = setInterval(checkTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const qty = item.quantity + delta;
          return qty > 0 ? { ...item, quantity: qty } : null;
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const getSubtotal = () => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const getVat = () => getSubtotal() * 0.075; // 7.5% VAT
  const getTotal = () => getSubtotal() + getVat();
  const getCartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !customerName) {
      alert('Please fill out customer details.');
      return;
    }

    setStatus('checking_out');
    setErrorMessage('');

    const total = getTotal();
    const reference = `TXN_APEX_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    try {
      // Post payload to SmartTax webhook endpoint matching event structure, passing selected userId as query parameter
      const response = await fetch(`${API_BASE_URL}/api/webhooks/${paymentGateway}?userId=${selectedMerchantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'charge.success',
          data: {
            amount: Math.round(total * 100), // In cents/kobo
            reference,
            customer: {
              email: customerEmail,
              name: customerName
            }
          }
        })
      });

      if (response.ok) {
        setStatus('success');
        setLastRef(reference);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        setCart([]);
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Webhook ingestion failed.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Unable to submit payment telemetry to SmartTax.');
    }
  };

  return (
    <div>
      <header>
        <a href="#" className="logo">
          <ShoppingBag className="w-6 h-6 text-emerald-500" />
          <span>Apex Devices</span>
        </a>

        <div className="header-actions">
          {/* Glassmorphic Merchant Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <Building2 className="w-4 h-4 text-[#8b5cf6]" />
            <select 
              value={selectedMerchantId} 
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              className="merchant-select"
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {merchants.map((m: any) => (
                <option key={m.id} value={m.id} style={{ background: '#0f1019', color: '#fff' }}>
                  Remit to: {m.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className={`telemetry-badge ${telemetry}`}>
            <span className="dot pulse" />
            {telemetry === 'connected' && 'SmartTax Ingestion Channel: Connected'}
            {telemetry === 'disconnected' && 'SmartTax Ingestion Channel: Offline'}
            {telemetry === 'checking' && 'SmartTax Ingestion Channel: Checking...'}
          </div>

          <button className="cart-btn" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="w-5 h-5" />
            Cart
            {getCartCount() > 0 && <span className="cart-count">{getCartCount()}</span>}
          </button>
        </div>
      </header>

      <main>
        <div className="hero">
          <h1>Premium gadgets for the <span>future</span></h1>
          <p>
            Experience next-level biometric watches, high-performance computing devices, and wireless audio with automatic tax telemetry and FIRS-compliant VAT receipts.
          </p>
        </div>

        <div className="products-grid">
          {PRODUCTS.map(product => (
            <div className="product-card" key={product.id}>
              <div className="product-image-container">
                <span className="product-tag">{product.category}</span>
                <img src={product.image} alt={product.name} className="product-image" />
              </div>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-footer">
                <span className="price">₦{product.price.toLocaleString('en-US')}</span>
                <button className="add-btn" onClick={() => addToCart(product)}>
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Drawer */}
      <div className={`cart-drawer-overlay ${cartOpen ? 'active' : ''}`} onClick={() => setCartOpen(false)} />
      <div className={`cart-drawer ${cartOpen ? 'active' : ''}`}>
        <div className="drawer-header">
          <h2 className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Shopping Cart
          </h2>
          <button className="close-btn" onClick={() => setCartOpen(false)}>
            Close
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingBag className="w-16 h-16 opacity-30" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div className="cart-item" key={item.product.id}>
                <div className="item-details">
                  <h4>{item.product.name}</h4>
                  <div className="item-price">₦{item.product.price.toLocaleString('en-US')}</div>
                  <div className="item-controls">
                    <button className="qty-btn" onClick={() => updateQuantity(item.product.id, -1)}>-</button>
                    <span className="qty-display">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.product.id, 1)}>+</button>
                  </div>
                </div>
                <button className="remove-item" onClick={() => removeFromCart(item.product.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₦{getSubtotal().toLocaleString('en-US')}</span>
            </div>
            <div className="summary-row vat-row">
              <span>VAT (FIRS 7.5%)</span>
              <span>₦{getVat().toLocaleString('en-US')}</span>
            </div>
            <div className="summary-row total-row">
              <span>Grand Total</span>
              <span>₦{getTotal().toLocaleString('en-US')}</span>
            </div>

            <button 
              className="checkout-btn"
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
            >
              <CreditCard className="w-5 h-5" />
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-emerald-500" />
                Secure Checkout
              </h2>
              <button 
                className="close-btn" 
                onClick={() => {
                  setCheckoutOpen(false);
                  setStatus('idle');
                }}
              >
                Close
              </button>
            </div>

            {status === 'success' ? (
              <div className="success-card">
                <div className="success-icon">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3>Purchase Successful!</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Thank you for your order. Your receipt telemetry has been securely ingested by the SmartTax compliant gateway.
                </p>

                <div className="receipt-box">
                  <div className="receipt-row">
                    <span>Reference ID</span>
                    <span className="receipt-ref">{lastRef}</span>
                  </div>
                  <div className="receipt-row">
                    <span>Customer Name</span>
                    <span>{customerName}</span>
                  </div>
                  <div className="receipt-row">
                    <span>Billing Gateway</span>
                    <span style={{ textTransform: 'capitalize' }}>{paymentGateway}</span>
                  </div>
                  <div className="receipt-row bold">
                    <span>Total Remitted</span>
                    <span style={{ color: 'var(--emerald)' }}>₦{getTotal().toLocaleString('en-US')}</span>
                  </div>
                </div>

                <button 
                  className="done-btn" 
                  onClick={() => {
                    setCheckoutOpen(false);
                    setStatus('idle');
                    setCustomerName('');
                    setCustomerEmail('');
                  }}
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <form onSubmit={handlePay}>
                <div className="form-group">
                  <label htmlFor="c_name">Billing Full Name</label>
                  <input 
                    type="text" 
                    id="c_name" 
                    className="form-input" 
                    placeholder="Jane Doe" 
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="c_email">Billing Email Address</label>
                  <input 
                    type="email" 
                    id="c_email" 
                    className="form-input" 
                    placeholder="jane@example.com" 
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Select Payment Gateway</label>
                  <div className="gateway-selector">
                    <div 
                      className={`gateway-option ${paymentGateway === 'paystack' ? 'selected' : ''}`}
                      onClick={() => setPaymentGateway('paystack')}
                    >
                      <h5>Paystack</h5>
                      <p>Remits instantly via Paystack Webhook</p>
                    </div>
                    <div 
                      className={`gateway-option ${paymentGateway === 'stripe' ? 'selected' : ''}`}
                      onClick={() => setPaymentGateway('stripe')}
                    >
                      <h5>Stripe</h5>
                      <p>Remits instantly via Stripe Webhook</p>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                  <div className="summary-row" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                    <span>Subtotal</span>
                    <span>₦{getSubtotal().toLocaleString('en-US')}</span>
                  </div>
                  <div className="summary-row vat-row" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                    <span>VAT (FIRS 7.5%)</span>
                    <span>₦{getVat().toLocaleString('en-US')}</span>
                  </div>
                  <div className="summary-row total-row" style={{ fontSize: '1rem', marginBottom: 0, paddingTop: '0.5rem' }}>
                    <span>Total Due</span>
                    <span>₦{getTotal().toLocaleString('en-US')}</span>
                  </div>
                </div>

                {status === 'error' && (
                  <div style={{ color: 'var(--rose)', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="pay-btn"
                  disabled={status === 'checking_out' || telemetry !== 'connected'}
                >
                  {status === 'checking_out' ? (
                    <>
                      <div className="spinner" />
                      Simulating Checkout Ingestion...
                    </>
                  ) : telemetry !== 'connected' ? (
                    'SmartTax Ingestion Offline'
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Pay ₦{getTotal().toLocaleString('en-US')}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
