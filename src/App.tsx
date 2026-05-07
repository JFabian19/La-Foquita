import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Trash2, X, MessageCircle, Image as ImageIcon, Anchor, MapPin, Loader2 } from 'lucide-react';
import { initialData } from './data';
import type { MenuData, MenuItem, CartItem, MenuCategory } from './types';

const SHEET_ID = '1qLvOrUI-MlDYhfLt6GrnGbw2cGz75ka2fOM0v31335A';
const PLATOS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Platos`;
const CATEGORIAS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Categor%C3%ADas`;

// Helper to parse CSV properly (handling quotes)
const parseCSV = (csvText: string) => {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || char === '\r') {
        if (currentField || currentLine.length > 0) {
          currentLine.push(currentField.trim());
          lines.push(currentLine);
          currentLine = [];
          currentField = '';
        }
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }
  return lines;
};

function App() {
  const [data, setData] = useState<MenuData>(initialData);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItemForVariants, setSelectedItemForVariants] = useState<MenuItem | null>(null);

  const slogans = [
    "EL MEJOR SABOR DEL MAR",
    "FRESCURA Y CALIDAD",
    "TRADICIÓN CEVICHERA",
    "EL AUTÉNTICO SABOR PERUANO",
    "LA MEJOR EXPERIENCIA MARINA"
  ];

  // Fetch data from Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, dishRes] = await Promise.all([
          fetch(CATEGORIAS_URL),
          fetch(PLATOS_URL)
        ]);

        const catText = await catRes.text();
        const dishText = await dishRes.text();

        const catData = parseCSV(catText).slice(1); // Remove header
        const dishData = parseCSV(dishText).slice(1); // Remove header

        // Process Categories
        const categories = catData.map(row => row[0]).filter(Boolean);

        // Map local images from initialData for fallback
        const localImageMap: Record<string, string> = {};
        initialData.menu.forEach(cat => {
          cat.items.forEach(item => {
            if (item.imagen) {
              localImageMap[item.nombre.toLowerCase().trim()] = item.imagen;
            }
          });
        });

        // Build Menu Structure
        const menu: MenuCategory[] = categories.map(catName => {
          const items: MenuItem[] = dishData
            .filter(row => row[0] === catName)
            .map((row, idx) => {
              const nombre = row[1];
              const descripcion = row[2];
              const precio = row[3] ? parseFloat(row[3]) : null;
              const imagenUrl = row[4];
              
              // Local image fallback logic
              const localImage = localImageMap[nombre.toLowerCase().trim()];
              const finalImage = imagenUrl || localImage;

              return {
                id: `${catName}-${idx}`,
                nombre,
                descripcion,
                precio,
                imagen: finalImage
              };
            });
          
          return {
            categoria: catName,
            items
          };
        });

        setData(prev => ({
          ...prev,
          menu
        }));
        if (categories.length > 0) setActiveCategory(categories[0]);
      } catch (error) {
        console.error("Error fetching sheet data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Intersection Observer for scrollspy
  useEffect(() => {
    if (loading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    data.menu.forEach((cat) => {
      const element = document.getElementById(cat.categoria);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [data.menu, loading]);

  const addToCart = (item: MenuItem) => {
    if (item.precios && Object.keys(item.precios).length > 0) {
      setSelectedItemForVariants(item);
      return;
    }
    const price = item.precio || 0;
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c);
      }
      return [...prev, { id: item.id, nombre: item.nombre, precio: price, cantidad: 1 }];
    });
  };

  const addVariantToCart = (item: MenuItem, variantName: string, price: number) => {
    const cartId = `${item.id}-${variantName}`;
    setCart(prev => {
      const existing = prev.find(c => c.id === cartId);
      if (existing) {
        return prev.map(c => c.id === cartId ? { ...c, cantidad: c.cantidad + 1 } : c);
      }
      return [...prev, { 
        id: cartId, 
        nombre: `${item.nombre} (${variantName.replace('_', ' ')})`, 
        precio: price, 
        cantidad: 1,
        variante: variantName 
      }];
    });
    setSelectedItemForVariants(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          return { ...c, cantidad: c.cantidad + delta };
        }
        return c;
      });
      return updated.filter(c => c.cantidad > 0);
    });
  };

  const totalCart = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const handleWhatsApp = () => {
    if (cart.length === 0) return;
    const itemsText = cart.map(item => `${item.cantidad}x ${item.nombre} - S/ ${(item.precio * item.cantidad).toFixed(2)}`).join('%0A');
    const totalText = `*Total: S/ ${totalCart.toFixed(2)}*`;
    const message = `Hola *${data.informacion_restaurante.nombre}*, me gustaría hacer el siguiente pedido:%0A%0A${itemsText}%0A%0A${totalText}`;
    window.open(`https://wa.me/51${data.informacion_restaurante.telefono_whatsapp}?text=${message}`, '_blank');
  };

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(categoryId);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
          <Anchor size={80} className="text-secondary relative z-10" />
        </motion.div>
        <h2 className="text-2xl font-display font-bold text-secondary mb-2">Cargando Menú...</h2>
        <p className="text-textMuted animate-pulse flex items-center gap-2">
          <Loader2 className="animate-spin" size={16} />
          Preparando los mejores sabores para ti
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#F5F5F0]">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-secondary/20 rounded-full blur-[130px]"
        />
        <motion.div
          animate={{ x: [0, -120, 0], y: [0, 150, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] -right-[20%] w-[60%] h-[80%] bg-secondary/15 rounded-full blur-[110px]"
        />
      </div>

      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 flex justify-between items-center px-4 py-3 h-[60px]">
        <div className="w-10"></div>
        <h1 className="text-xl font-display text-secondary font-bold">{data.informacion_restaurante.nombre}</h1>
        <a 
          href="https://maps.app.goo.gl/YGaXjNZi2EMQZuMi6" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-red-50 text-red-500 p-2 rounded-full hover:bg-red-100 transition-all shadow-sm"
        >
          <MapPin size={20} />
        </a>
      </header>

      <div className="mt-[60px] bg-secondary overflow-hidden py-2 border-y border-white/10">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="flex whitespace-nowrap"
        >
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-8 px-4">
              {slogans.map((slogan, idx) => (
                <div key={idx} className="flex items-center space-x-8">
                  <span className="text-white font-sans font-bold text-xs tracking-widest uppercase">{slogan}</span>
                  <span className="text-primary">★</span>
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      <section className="w-full">
        <img src="/baner.webp" alt="La Foquita" className="w-full h-auto block shadow-lg" />
      </section>

      <div className="sticky top-[60px] z-40 bg-background/95 backdrop-blur-sm border-b border-gray-200 py-3 shadow-sm">
        <div className="flex overflow-x-auto hide-scrollbar space-x-3 px-4 max-w-6xl mx-auto snap-x">
          {data.menu.map(cat => (
            <button
              key={cat.categoria}
              onClick={() => scrollToCategory(cat.categoria)}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-semibold transition-all snap-start ${
                activeCategory === cat.categoria 
                  ? 'bg-secondary text-white shadow-md' 
                  : 'bg-white text-textMuted border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.categoria}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {data.menu.map((category) => (
          <section key={category.categoria} id={category.categoria} className="scroll-mt-[130px]">
            <h2 className="text-3xl font-display text-secondary font-bold mb-6 border-b-2 border-primary inline-flex items-center gap-3 pb-2">
              {category.categoria}
              <motion.div
                animate={{ y: [0, -4, 0], rotate: [0, -5, 5, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <Anchor className="text-primary w-7 h-7 drop-shadow-sm" />
              </motion.div>
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {category.items.map((item) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "0px 0px -50px 0px" }}
                  whileHover={{ y: -4 }}
                  key={item.id}
                  className="bg-white rounded-[1.5rem] p-2 md:p-4 shadow-soft border border-gray-50 flex flex-col relative group overflow-hidden"
                >
                  {item.imagen ? (
                    <div className="aspect-square -mx-0 -mt-0 mb-3 overflow-hidden rounded-[1rem] md:rounded-[1.5rem] bg-gray-50">
                      <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                  ) : (
                    <div className="aspect-square -mx-0 -mt-0 mb-3 bg-gray-50 flex items-center justify-center rounded-[1rem] md:rounded-[1.5rem]">
                      <ImageIcon className="text-gray-300 h-8 w-8 md:h-12 md:w-12" />
                    </div>
                  )}
                  
                  <div className="flex-grow px-1 md:px-2">
                    <h3 className="text-xs md:text-base font-sans font-extrabold text-secondary leading-tight mb-1">
                      {item.nombre.charAt(0).toUpperCase() + item.nombre.slice(1).toLowerCase()}
                    </h3>
                    
                    {item.descripcion && (
                      <p className="text-[10px] md:text-xs text-textMuted mb-2">{item.descripcion}</p>
                    )}

                    <div className="flex justify-between items-end mt-auto">
                      <div className="flex flex-col">
                        {item.precio !== null && (
                          <span className="text-sm md:text-lg font-sans font-bold text-secondary">
                            S/.{item.precio.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button 
                        onClick={() => addToCart(item)}
                        className="bg-cyan-50 text-cyan-500 p-2 md:p-3 rounded-full hover:bg-cyan-100 transition-all shadow-sm transform active:scale-95"
                      >
                        <Plus size={18} className="md:w-6 md:h-6" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
        
        <section className="mt-16 bg-white rounded-[2rem] p-6 shadow-soft border border-gray-100">
          <h2 className="text-2xl font-display text-secondary font-bold mb-6 flex items-center gap-3">
            <MapPin className="text-primary" />
            Ubícanos en Google Maps
          </h2>
          <div className="rounded-2xl overflow-hidden shadow-inner border border-gray-100">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3010697.415219753!2d-74.41976289790253!3d-16.81573718110197!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9140197f832e4b7d%3A0xbef32ceb11452a7b!2sCEVICHERIA%20%22LA%20FOQUITA%22!5e0!3m2!1ses!2spe!4v1777942013503!5m2!1ses!2spe" 
              width="100%" height="400" style={{ border: 0 }} allowFullScreen={true} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 px-4 z-40 flex justify-center"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="bg-primary text-secondary font-bold py-3 px-8 rounded-full shadow-lg hover:bg-yellow-400 transition-transform transform hover:scale-105 flex items-center space-x-3"
            >
              <ShoppingCart size={20} />
              <span>Ver Pedido ({cart.length}) - S/ {totalCart.toFixed(2)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-secondary/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center p-5 border-b border-gray-100">
                <h3 className="font-display text-2xl font-bold text-secondary">Tu Pedido</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-grow space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">Tu carrito está vacío</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                      <div className="flex-1 pr-3">
                        <p className="text-sm font-bold text-secondary">{item.nombre}</p>
                        <p className="text-sm font-semibold text-primary">S/ {item.precio.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-lg p-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                          {item.cantidad > 1 ? <Minus size={16} /> : <Trash2 size={16} className="text-red-500" />}
                        </button>
                        <span className="text-sm font-bold w-6 text-center">{item.cantidad}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-5 bg-white border-t border-gray-100 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)] rounded-b-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 font-medium">Total a pagar:</span>
                    <span className="text-2xl font-bold text-secondary">S/ {totalCart.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handleWhatsApp}
                    className="w-full bg-[#25D366] text-white font-bold py-4 px-4 rounded-2xl shadow-lg hover:bg-[#20bd5a] transition-transform transform hover:scale-[1.02] flex items-center justify-center space-x-2 text-lg"
                  >
                    <MessageCircle size={24} />
                    <span>Pedir por WhatsApp</span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
