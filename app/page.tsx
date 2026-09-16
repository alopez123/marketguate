'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function MarketplaceView() {
  const [categories, setCategories] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Estado para el Tema (Claro u Oscuro)
  const [darkMode, setDarkMode] = useState(true)

  // Estados de Autenticación con marketusers
  const [user, setUser] = useState<any>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Estado de Favoritos y Sucursales
  const [favorites, setFavorites] = useState<number[]>([])
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)

  // Buscadores y filtros avanzados
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalProductsResult, setGlobalProductsResult] = useState<any[]>([])
  const [searchingGlobal, setSearchingGlobal] = useState(false)

  const [branchSearch, setBranchSearch] = useState('')
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchMarketplaceData()
    const savedUser = localStorage.getItem('marketuser')
    if (savedUser) setUser(JSON.parse(savedUser))
  }, [])

  async function fetchMarketplaceData() {
    setLoading(true)
    const { data: catData } = await supabase.rpc('get_categories_business_safe')
    if (catData) setCategories(catData)

    const { data: branchData } = await supabase
      .from('branches')
      .select(`
        id,
        name,
        business_id,
        businesses!inner(id, name, logo_url, phone, is_public, category_business_id)
      `)

    if (branchData) {
      const publicBranches = branchData.filter((b: any) => b.businesses?.is_public === true)
      setBranches(publicBranches)
    }
    setLoading(false)
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)

    try {
      if (isSignUp) {
        const res = await fetch('/api/market-auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error en el registro')
        
        alert('¡Registro exitoso! Revisa tu correo de confirmación.')
        setIsSignUp(false)
      } else {
        const res = await fetch('/api/market-auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Credenciales inválidas')

        setUser(data.user)
        localStorage.setItem('marketuser', JSON.stringify(data.user))
        setAuthModalOpen(false)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('marketuser')
    setSelectedBranch(null)
  }

  function toggleFavorite(branchId: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (favorites.includes(branchId)) {
      setFavorites(favorites.filter(id => id !== branchId))
    } else {
      setFavorites([...favorites, branchId])
    }
  }

  // Búsqueda global en todas las sucursales
  useEffect(() => {
    const query = globalSearch.trim().toLowerCase()
    if (!query) {
      setGlobalProductsResult([])
      setSearchingGlobal(false)
      return
    }

    setSearchingGlobal(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          stock,
          image_url,
          category,
          branch_id,
          branches!inner(
            name,
            businesses!inner(id, name, logo_url, phone, is_public)
          )
        `)
        .ilike('name', `%${query}%`)

      if (data) {
        const filtered = data.filter((p: any) => p.branches?.businesses?.is_public === true)
        setGlobalProductsResult(filtered)
      } else {
        setGlobalProductsResult([])
      }
      setSearchingGlobal(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [globalSearch])

  async function handleSelectBranch(branch: any) {
    setSelectedBranch(branch)
    setBranchSearch('')
    setSelectedProductCategory(null) 
    
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('branch_id', branch.id)

    if (data) setProducts(data)
    else setProducts([])
  }

  const filteredBranches = branches.filter(b => {
    const biz = b.businesses
    const matchesCategory = selectedCategoryId ? biz?.category_business_id === selectedCategoryId : true
    const matchesFav = showOnlyFavorites ? favorites.includes(b.id) : true
    return matchesCategory && matchesFav
  })

  const productCategories = Array.from(new Set(products.map(p => p.category || 'General')))

  const filteredBranchProducts = products.filter(p => {
    const matchesSearch = branchSearch.trim() === '' || p.name.toLowerCase().includes(branchSearch.toLowerCase())
    const prodCat = p.category || 'General'
    const matchesCategory = selectedProductCategory === null || prodCat === selectedProductCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#070b12] text-white' : 'bg-slate-100 text-slate-900'} flex items-center justify-center`}>
        <p className="text-cyan-500 font-bold text-sm animate-pulse">Cargando MarketGuate...</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#070b12] text-white' : 'bg-slate-50 text-slate-900'} font-sans transition-colors duration-300 selection:bg-cyan-500 selection:text-white`}>
      
      {/* HEADER MARKETGUATE */}
      <header className={`sticky top-0 ${darkMode ? 'bg-[#070b12]/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b z-50 px-4 py-3 md:px-8 transition-colors`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex flex-col cursor-pointer" onClick={() => { setSelectedBranch(null); setShowOnlyFavorites(false); }}>
              <span className={`text-base sm:text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'} tracking-wider`}>
                MARKET<span className="text-cyan-500">GUATE</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">Todo en un mismo lugar</span>
            </div>
            
            <div className="flex items-center gap-2 sm:hidden">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-xl text-xs font-bold border ${darkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-200 border-slate-300 text-slate-800'}`}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              {selectedBranch ? (
                <button onClick={() => setSelectedBranch(null)} className="bg-slate-800 text-cyan-400 px-3 py-1 rounded-xl text-xs font-bold border border-slate-700">
                  ← Volver
                </button>
              ) : user ? (
                <button onClick={handleLogout} className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-xl text-xs font-bold">
                  Salir
                </button>
              ) : (
                <button onClick={() => setAuthModalOpen(true)} className="bg-cyan-600 text-white px-3 py-1 rounded-xl text-xs font-bold">
                  Ingresar
                </button>
              )}
            </div>
          </div>

          {/* Buscador global solo visible si ha iniciado sesión */}
          {!selectedBranch && user && (
            <div className="w-full sm:w-80 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input 
                type="text"
                placeholder="Buscar platillos o productos..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className={`w-full ${darkMode ? 'bg-[#111827] border-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-full pl-9 pr-4 py-2 text-xs outline-none focus:border-cyan-500 transition-colors shadow-inner`}
              />
            </div>
          )}

          <div className="hidden sm:flex items-center gap-3">
            {selectedBranch && (
              <button onClick={() => setSelectedBranch(null)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors border ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'}`}>
                ← Volver al Directorio
              </button>
            )}

            {user && (
              <button 
                onClick={() => { setShowOnlyFavorites(!showOnlyFavorites); setSelectedBranch(null); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  showOnlyFavorites ? 'bg-pink-600 text-white border-pink-400' : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>❤️</span> Favoritos ({favorites.length})
              </button>
            )}

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl text-xs font-bold border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-200 border-slate-300 text-slate-800 hover:bg-slate-300'}`}
            >
              {darkMode ? '☀️ Claro' : '🌙 Oscuro'}
            </button>

            {user ? (
              <div className={`flex items-center gap-2 ${darkMode ? 'bg-[#111827] border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'} border px-3 py-1.5 rounded-xl text-xs`}>
                <span className="truncate max-w-[120px]">{user.email}</span>
                <button onClick={handleLogout} className="text-red-400 font-bold hover:underline ml-2">Salir</button>
              </div>
            ) : (
              <button onClick={() => setAuthModalOpen(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow">
                Iniciar Sesión / Registro
              </button>
            )}
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-8">

        {/* MODAL DE AUTENTICACIÓN */}
        {authModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`${darkMode ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} border w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6 transition-colors`}>
              <button onClick={() => setAuthModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-cyan-500 font-bold text-sm">✕</button>
              
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">{isSignUp ? 'Crea tu cuenta en MarketGuate' : 'Inicia Sesión en MarketGuate'}</h3>
                <p className="text-xs text-slate-400">{isSignUp ? 'Te enviaremos un correo de confirmación.' : 'Ingresa para ver todos los comercios y servicios.'}</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold">Correo Electrónico</label>
                  <input 
                    type="email" 
                    required
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="tu@correo.com"
                    className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500`} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold">Contraseña</label>
                  <input 
                    type="password" 
                    required
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500`} 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 rounded-xl uppercase tracking-wider shadow-lg transition-colors"
                >
                  {authLoading ? 'Procesando...' : isSignUp ? 'Registrarse y Enviar Correo' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-800 text-xs">
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-cyan-500 font-bold hover:underline">
                  {isSignUp ? '¿Ya tienes cuenta activa? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTROL DE ACCESO: SI NO HA INICIADO SESIÓN, MUESTRA MENSAJE DE RESTRICCIÓN */}
        {!user ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className={`${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200 shadow-2xl'} border rounded-3xl p-8 md:p-12 text-center max-w-lg mx-auto space-y-6`}>
              <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-2xl mx-auto flex items-center justify-center text-2xl">
                🔒
              </div>
              <div className="space-y-2">
                <h3 className={`text-xl sm:text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Acceso Restringido a MarketGuate
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Inicia sesión o regístrate para ver todos los comercios, sucursales y servicios disponibles en un mismo lugar.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button 
                  onClick={() => { setIsSignUp(false); setAuthModalOpen(true); }}
                  className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg"
                >
                  Iniciar Sesión
                </button>
                <button 
                  onClick={() => { setIsSignUp(true); setAuthModalOpen(true); }}
                  className={`w-full sm:w-auto ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'} border px-6 py-3 rounded-xl text-xs font-bold transition-all`}
                >
                  Registrarse
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CONTENIDO COMPLETO SI YA INICIÓ SESIÓN */
          <>
            {selectedBranch ? (
              <div className="space-y-6">
                <div className={`${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200 shadow-xl'} border rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden transition-colors`}>
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex items-center gap-5 relative z-10">
                    {selectedBranch.businesses?.logo_url ? (
                      <img src={selectedBranch.businesses.logo_url} alt="Logo" className={`w-20 h-20 object-cover ${darkMode ? 'bg-[#070b12] border-slate-700' : 'bg-slate-100 border-slate-200'} rounded-2xl p-1.5 border shadow-md`} />
                    ) : (
                      <div className={`w-20 h-20 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'} rounded-2xl flex items-center justify-center text-xs border`}>Logo</div>
                    )}
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2.5 py-0.5 rounded-full font-bold uppercase">Sucursal Abierta</span>
                      <h2 className={`text-xl sm:text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedBranch.businesses?.name}</h2>
                      <p className="text-xs text-cyan-400 font-semibold">📍 {selectedBranch.name}</p>
                    </div>
                  </div>

                  {selectedBranch.businesses?.phone && (
                    <a 
                      href={`https://wa.me/502${selectedBranch.businesses.phone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      className="relative z-10 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                    >
                      💬 Contactar por WhatsApp
                    </a>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Inventario Disponible en esta Sucursal</h3>
                    <div className="relative w-full sm:w-80">
                      <input 
                        type="text"
                        placeholder="🔍 Buscar en este menú..."
                        value={branchSearch}
                        onChange={e => setBranchSearch(e.target.value)}
                        className={`w-full ${darkMode ? 'bg-[#111827] border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} border px-4 py-2 rounded-xl text-xs outline-none focus:border-cyan-500 shadow-inner`}
                      />
                    </div>
                  </div>

                  {productCategories.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedProductCategory(null)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          selectedProductCategory === null 
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg' 
                            : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        🍽️ Todos ({products.length})
                      </button>
                      {productCategories.map(cat => {
                        const count = products.filter(p => (p.category || 'General') === cat).length
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedProductCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              selectedProductCategory === cat 
                                ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg' 
                                : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            📂 {cat} ({count})
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBranchProducts.length === 0 ? (
                    <p className="col-span-full text-center py-16 text-slate-400 text-xs">No se encontraron productos con ese criterio en esta sucursal.</p>
                  ) : (
                    filteredBranchProducts.map(prod => (
                      <div key={prod.id} className={`${darkMode ? 'bg-[#111827] border-slate-800 hover:border-cyan-500/40' : 'bg-white border-slate-200 hover:border-cyan-500 shadow'} border rounded-3xl p-4 flex gap-4 items-center transition-all group`}>
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className={`w-20 h-20 object-cover ${darkMode ? 'border-slate-700' : 'border-slate-200'} rounded-2xl border group-hover:scale-105 transition-transform`} />
                        ) : (
                          <div className={`w-20 h-20 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'} rounded-2xl flex items-center justify-center text-[10px] border`}>Sin foto</div>
                        )}
                        <div className="flex-1 space-y-1.5">
                          <h4 className={`font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-900'} group-hover:text-cyan-500 transition-colors`}>{prod.name}</h4>
                          <p className="text-cyan-500 font-mono font-black text-sm" translate="no">Q {prod.price}</p>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            prod.stock > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'
                          }`}>
                            {prod.stock > 0 ? `Stock disponible: ${prod.stock}` : 'Agotado'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 p-6 sm:p-8 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="relative z-10 space-y-2 text-left max-w-xl text-white">
                    <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border border-cyan-500/30">
                      ⚡ MarketGuate en Vivo
                    </span>
                    <h3 className="text-xl sm:text-3xl font-black">Todo en un mismo lugar: sucursales y productos de toda Guate</h3>
                    <p className="text-slate-300 text-xs sm:text-sm">Consulta existencias, guarda tus favoritos y comunícate con cada establecimiento local.</p>
                  </div>
                </div>

                {globalSearch.trim() !== '' ? (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-base font-bold text-cyan-500">
                      Resultados globales para: <span className={darkMode ? 'text-white' : 'text-slate-900'}>"{globalSearch}"</span>
                    </h3>

                    {searchingGlobal ? (
                      <p className="text-center py-12 text-slate-400 text-xs">Buscando en todas las sucursales...</p>
                    ) : globalProductsResult.length === 0 ? (
                      <p className="text-center py-12 text-slate-400 text-xs">No se encontraron productos coincidentes en ninguna sucursal.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {globalProductsResult.map((prod: any) => {
                          const branch = prod.branches
                          const biz = branch?.businesses
                          return (
                            <div key={prod.id} className={`${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200 shadow'} border rounded-3xl p-4 flex flex-col justify-between gap-4 transition-colors`}>
                              <div className="flex gap-4 items-center">
                                {prod.image_url ? (
                                  <img src={prod.image_url} alt={prod.name} className={`w-16 h-16 object-cover ${darkMode ? 'border-slate-700' : 'border-slate-200'} rounded-2xl border`} />
                                ) : (
                                  <div className={`w-16 h-16 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'} rounded-2xl flex items-center justify-center text-[10px] border`}>Sin foto</div>
                                )}
                                <div className="flex-1 space-y-1">
                                  <h4 className={`font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{prod.name}</h4>
                                  <p className="text-cyan-500 font-mono font-black text-sm" translate="no">Q {prod.price}</p>
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    prod.stock > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'
                                  }`}>
                                    {prod.stock > 0 ? `Stock: ${prod.stock}` : 'Agotado'}
                                  </span>
                                </div>
                              </div>

                              {branch && (
                                <div className={`pt-3 ${darkMode ? 'border-slate-800' : 'border-slate-100'} border-t flex justify-between items-center text-xs`}>
                                  <span className="text-slate-400 truncate max-w-[160px]">{biz?.name} <strong className="text-cyan-400">({branch.name})</strong></span>
                                  <button 
                                    onClick={() => handleSelectBranch(branch)}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded-xl font-bold transition-colors shadow"
                                  >
                                    Ver Sucursal →
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {showOnlyFavorites && (
                      <div className="flex items-center justify-between bg-pink-500/10 border border-pink-500/30 px-5 py-3 rounded-2xl">
                        <span className="text-xs font-bold text-pink-500">❤️ Viendo únicamente tus sucursales favoritas</span>
                        <button onClick={() => setShowOnlyFavorites(false)} className={`text-xs ${darkMode ? 'text-white' : 'text-slate-900'} font-bold underline`}>Ver todas</button>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Explora por Categoría</h2>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                        <button
                          onClick={() => setSelectedCategoryId(null)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                            selectedCategoryId === null 
                              ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30' 
                              : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>🌟</span>
                          <span>Todas ({branches.length})</span>
                        </button>
                        {categories.map(cat => {
                          const count = branches.filter(b => b.businesses?.category_business_id === cat.id).length
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategoryId(cat.id)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                selectedCategoryId === cat.id 
                                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30' 
                                  : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span>🏷️</span>
                              <span>{cat.name} ({count})</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sucursales Disponibles</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredBranches.length === 0 ? (
                          <div className={`col-span-full text-center py-16 ${darkMode ? 'bg-[#111827] border-slate-800 text-slate-400' : 'bg-white border-slate-200 shadow text-slate-500'} border rounded-3xl text-xs`}>
                            {showOnlyFavorites ? 'Aún no tienes sucursales favoritas guardadas.' : 'No se encontraron sucursales en esta categoría.'}
                          </div>
                        ) : (
                          filteredBranches.map(branch => {
                            const biz = branch.businesses
                            const isFav = favorites.includes(branch.id)
                            return (
                              <div 
                                key={branch.id}
                                className={`${darkMode ? 'bg-[#111827] border-slate-800 hover:border-cyan-500/40' : 'bg-white border-slate-200 shadow-xl hover:border-cyan-500'} border rounded-3xl overflow-hidden transition-all flex flex-col justify-between group relative`}
                              >
                                <button 
                                  onClick={(e) => toggleFavorite(branch.id, e)}
                                  className={`absolute top-3 left-3 z-20 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg border ${
                                    isFav ? 'bg-pink-600 text-white border-pink-400 scale-110' : 'bg-black/60 text-slate-300 border-white/10 hover:text-white'
                                  }`}
                                  title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                                >
                                  {isFav ? '❤️' : '🤍'}
                                </button>

                                <div className={`relative h-44 w-full ${darkMode ? 'bg-gradient-to-r from-slate-900 to-[#070b12] border-slate-800' : 'bg-gradient-to-r from-slate-100 to-slate-200 border-slate-200'} flex items-center justify-center p-6 border-b`}>
                                  {biz?.logo_url ? (
                                    <img src={biz.logo_url} alt="Logo" className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-105 transition-transform duration-500" />
                                  ) : (
                                    <div className={`w-16 h-16 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-white border-slate-300 text-slate-400'} rounded-2xl flex items-center justify-center text-xs border`}>Logo</div>
                                  )}
                                  <span className="absolute top-3 right-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                                    ● Abierto
                                  </span>
                                  <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-cyan-400 px-3 py-1 rounded-xl text-[10px] font-bold border border-white/10">
                                    {categories.find(c => c.id === biz?.category_business_id)?.name || 'General'}
                                  </span>
                                </div>

                                <div className="p-6 space-y-4">
                                  <div>
                                    <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'} group-hover:text-cyan-500 transition-colors mb-0.5`}>{biz?.name}</h3>
                                    <p className="text-xs font-bold text-cyan-400">📍 {branch.name}</p>
                                  </div>

                                  <div className={`grid grid-cols-2 gap-3 pt-3 ${darkMode ? 'border-slate-800' : 'border-slate-100'} border-t`}>
                                    <button 
                                      onClick={() => handleSelectBranch(branch)}
                                      className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-colors border border-cyan-500/30 text-center shadow"
                                    >
                                      🛍️ Ver Productos
                                    </button>

                                    {biz?.phone ? (
                                      <a 
                                        href={`https://wa.me/502${biz.phone.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition-colors text-center shadow flex items-center justify-center gap-1.5"
                                      >
                                        💬 Contactar
                                      </a>
                                    ) : (
                                      <button disabled className={`py-2.5 rounded-xl text-xs font-bold cursor-not-allowed ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400'}`}>
                                        Sin WhatsApp
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}
          </>
        )}

      </main>

      <footer className={`mt-auto py-8 ${darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'} border-t text-center text-xs px-4 transition-colors`}>
        <p>© {new Date().getFullYear()} MarketGuate — Todo en un mismo lugar. Conectando las sucursales de Quantika POS.</p>
      </footer>

    </div>
  )
}