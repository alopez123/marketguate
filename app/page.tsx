'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'

export default function MarketplaceView() {
  const [isMounted, setIsMounted] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Estado para el Tema (Claro u Oscuro)
  const [darkMode, setDarkMode] = useState(true)

  // Estado para Menú Móvil Desplegable
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Estados de Autenticación con marketusers
  const [user, setUser] = useState<any>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Estado de Favoritos y Sucursales
  const [favorites, setFavorites] = useState<number[]>([])
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)

  // Estado para el Historial de Compras y Calificaciones
  const [showHistory, setShowHistory] = useState(false)
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [productRatings, setProductRatings] = useState<{ [key: string]: number }>({})

  // Buscadores y filtros avanzados
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalProductsResult, setGlobalProductsResult] = useState<any[]>([])
  const [searchingGlobal, setSearchingGlobal] = useState(false)

  const [branchSearch, setBranchSearch] = useState('')
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null)

  // Estado para la Vista Previa del Producto
  const [previewProduct, setPreviewProduct] = useState<any | null>(null)

  // Estado del Carrito de Compras y Modal de Checkout
  const [cart, setCart] = useState<any[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerNit, setCustomerNit] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  // Estado para el Modal de Mensaje Directo de WhatsApp a la Sucursal
  const [isBranchWhatsAppModalOpen, setIsBranchWhatsAppModalOpen] = useState(false)
  const [branchWhatsAppName, setBranchWhatsAppName] = useState('')
  const [branchWhatsAppMessage, setBranchWhatsAppMessage] = useState('')

  // Estado para la notificación flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Referencias y estados para el desplazamiento por arrastre y flechas del carrusel
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    setIsMounted(true)
    fetchMarketplaceData()
    const savedUser = localStorage.getItem('marketuser')
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser)
      setUser(parsedUser)
      if (parsedUser?.email) {
        setEmail(parsedUser.email)
        fetchUserProfile(parsedUser.email)
      }
    }
  }, [])

  async function fetchUserProfile(userEmail: string) {
    const { data } = await supabase.rpc('get_user_orders', { p_email: userEmail })

    if (data && data.length > 0) {
      const lastOrder = data[0]
      setCustomerName(lastOrder.customer_name || '')
      setCustomerNit(lastOrder.customer_nit || '')
      setCustomerPhone(lastOrder.customer_phone || '')
      setCustomerAddress(lastOrder.customer_address || '')
      setBranchWhatsAppName(lastOrder.customer_name || '')
    }
  }

  async function fetchOrderHistory() {
    if (!user?.email && !email) return
    setLoadingHistory(true)
    const targetEmail = user?.email || email

    const { data } = await supabase.rpc('get_user_orders', { p_email: targetEmail })

    if (data) {
      setOrderHistory(data)
    } else {
      setOrderHistory([])
    }

    const { data: ratingsData } = await supabase
      .from('product_ratings')
      .select('*')
      .eq('user_email', targetEmail)

    if (ratingsData) {
      const ratingsMap: { [key: string]: number } = {}
      ratingsData.forEach((r: any) => {
        ratingsMap[`${r.order_id}-${r.product_name}`] = r.rating
      })
      setProductRatings(ratingsMap)
    }

    setLoadingHistory(false)
  }

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
        phone,
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
      if (isForgotPassword) {
        const res = await fetch('/api/market-auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al enviar el correo de recuperación')
        
        alert('¡Correo de recuperación enviado exitosamente!')
        setIsForgotPassword(false)
        setAuthModalOpen(false)
      } else if (isSignUp) {
        const res = await fetch('/api/market-auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error en el registro')
        
        alert('¡Registro exitoso! Ya puedes iniciar sesión.')
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
        if (data.user?.email) {
          fetchUserProfile(data.user.email)
        }
        setAuthModalOpen(false)
        setToastMessage('🎉 ¡Sesión iniciada con éxito!')
        setTimeout(() => setToastMessage(null), 3000)
      }
    } catch (err: any) {
      alert(err.message || 'Ocurrió un error en la autenticación')
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('marketuser')
    setSelectedBranch(null)
    setShowHistory(false)
    setCart([])
    setCustomerName('')
    setCustomerNit('')
    setCustomerPhone('')
    setCustomerAddress('')
    setMobileMenuOpen(false)
    fetchMarketplaceData()
  }

  function toggleFavorite(branchId: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!user) {
      setToastMessage('🔒 Inicia sesión para guardar favoritos')
      setTimeout(() => setToastMessage(null), 3000)
      setIsSignUp(false)
      setIsForgotPassword(false)
      setAuthModalOpen(true)
      return
    }
    if (favorites.includes(branchId)) {
      setFavorites(favorites.filter(id => id !== branchId))
    } else {
      setFavorites([...favorites, branchId])
    }
  }

  function addToCart(prod: any, e: React.MouseEvent) {
    e.stopPropagation()

    if (!user) {
      setToastMessage('🔒 Inicia sesión para agregar productos al pedido')
      setTimeout(() => setToastMessage(null), 3000)
      setIsSignUp(false)
      setIsForgotPassword(false)
      setAuthModalOpen(true)
      return
    }

    const existing = cart.find(item => item.id === prod.id)
    const currentQty = existing ? existing.quantity : 0

    if (currentQty + 1 > prod.stock) {
      setToastMessage(`⚠️ Existencias agotadas (Máximo: ${prod.stock})`)
      setTimeout(() => setToastMessage(null), 3000)
      return
    }

    if (existing) {
      setCart(cart.map(item => item.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item))
    } else {
      setCart([...cart, { ...prod, quantity: 1 }])
    }

    setToastMessage(`¡"${prod.name}" agregado al carrito!`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  function updateCartQuantity(prodId: number, delta: number) {
    setCart(cart.map(item => {
      if (item.id === prodId) {
        const newQty = item.quantity + delta
        if (delta > 0 && newQty > item.stock) {
          setToastMessage(`⚠️ Stock máximo alcanzado (${item.stock})`)
          setTimeout(() => setToastMessage(null), 3000)
          return item
        }
        return newQty > 0 ? { ...item, quantity: newQty } : null
      }
      return item
    }).filter(Boolean))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  async function handleRateProduct(order: any, item: any, rating: number) {
    const orderStatus = (order.status || '').toLowerCase()
    if (orderStatus !== 'entregado') {
      setToastMessage(`⚠️ Solo puedes calificar productos de pedidos en estado Entregado`)
      setTimeout(() => setToastMessage(null), 3000)
      return
    }

    const key = `${order.id}-${item.name}`
    setProductRatings(prev => ({ ...prev, [key]: rating }))

    const userEmail = user?.email || email || 'No especificado'

    let businessId = order.business_id || selectedBranch?.business_id || null
    if (!businessId) {
      const storedBiz = localStorage.getItem('currentBusiness')
      if (storedBiz) {
        try {
          businessId = JSON.parse(storedBiz).id || null
        } catch (e) {}
      }
    }

    const branchId = order.branch_id || selectedBranch?.id || null

    const payload = {
      order_id: Number(order.id) || null,
      business_id: businessId || null,
      branch_id: branchId !== null ? Number(branchId) : null,
      product_name: item.name,
      user_email: userEmail,
      rating: Number(rating)
    }

    const { error } = await supabase
      .from('product_ratings')
      .upsert([payload], { onConflict: 'order_id,product_name,user_email' })

    if (error) {
      console.error('Error al guardar la calificación:', error.message)
      setToastMessage(`⚠️ Error al guardar: ${error.message}`)
    } else {
      setToastMessage(`⭐ ¡Calificación de ${rating} estrellas guardada!`)
    }
    setTimeout(() => setToastMessage(null), 3000)
  }

  function handleSendBranchWhatsApp(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBranch) return

    const branchPhone = selectedBranch.phone || selectedBranch.businesses?.phone || ''
    let rawPhone = branchPhone.replace(/\D/g, '')
    
    if (!rawPhone) {
      alert("⚠️ Esta sucursal no tiene un número de teléfono registrado para WhatsApp.")
      return
    }

    const phone = rawPhone.startsWith('502') ? rawPhone : `502${rawPhone}`

    let message = `💬 *Consulta a Sucursal - MarketGuate*\n\n`
    message += `📍 Sucursal: *${selectedBranch.name}*\n`
    message += `👤 *Cliente:* ${branchWhatsAppName}\n\n`
    message += `📝 *Mensaje:*\n${branchWhatsAppMessage}`

    const encodedURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(encodedURL, '_blank')
    setIsBranchWhatsAppModalOpen(false)
    setBranchWhatsAppMessage('')
  }

  function handleDownloadPastPDF(order: any) {
    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("MARKETGUATE - COMPROBANTE DE PEDIDO", 14, 20)

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`Fecha del Pedido: ${new Date(order.created_at).toLocaleString()}`, 14, 28)

    doc.setFont("helvetica", "bold")
    doc.text("Datos del Cliente y Facturación:", 14, 40)
    doc.setFont("helvetica", "normal")
    doc.text(`Nombre Completo: ${order.customer_name}`, 14, 47)
    doc.text(`NIT: ${order.customer_nit}`, 14, 54)
    doc.text(`Correo Electrónico: ${order.customer_email}`, 14, 61)
    doc.text(`Teléfono: ${order.customer_phone}`, 14, 68)
    
    const splitAddress = doc.splitTextToSize(`Dirección de Entrega e Instrucciones: ${order.customer_address}`, 180)
    doc.text(splitAddress, 14, 75)

    let y = 75 + (splitAddress.length * 6) + 5
    doc.setFont("helvetica", "bold")
    doc.text("Artículos Solicitados:", 14, y)

    y += 7
    doc.setFontSize(10)
    doc.text("Cantidad", 14, y)
    doc.text("Descripción", 40, y)
    doc.text("Precio Unit.", 130, y)
    doc.text("Subtotal", 170, y)
    y += 6
    doc.line(14, y, 196, y)
    y += 8

    doc.setFont("helvetica", "normal")
    const items = Array.isArray(order.cart_items) ? order.cart_items : []
    items.forEach((item: any) => {
      doc.text(String(item.quantity), 14, y)
      doc.text(String(item.name).substring(0, 45), 40, y)
      doc.text(`Q ${Number(item.price).toFixed(2)}`, 130, y)
      doc.text(`Q ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`, 170, y)
      y += 8
    })

    y += 4
    doc.line(14, y, 196, y)
    y += 10
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(`TOTAL PAGADO: Q ${Number(order.total).toFixed(2)}`, 130, y)

    doc.save(`Pedido_MarketGuate_${order.id}_${Date.now()}.pdf`)
  }

  async function handleGenerateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0) return

    const phoneRegex = /^[234567]\d{7}$/
    if (!phoneRegex.test(customerPhone)) {
      alert("⚠️ Ingresa un número de teléfono válido de 8 dígitos (debe iniciar con 2, 3, 4, 5, 6 o 7).")
      return
    }

    const userEmail = user?.email || email || 'No especificado'
    const businessId = selectedBranch?.business_id || selectedBranch?.businesses?.id || null
    const branchId = selectedBranch?.id || null

    const { error: dbError } = await supabase.rpc('insert_marketguate_order', {
      p_business_id: businessId,
      p_branch_id: branchId,
      p_customer_name: customerName,
      p_customer_nit: customerNit,
      p_customer_email: userEmail,
      p_customer_phone: customerPhone,
      p_customer_address: customerAddress,
      p_cart_items: cart,
      p_total: cartTotal
    })

    if (dbError) {
      alert('Hubo un error al registrar el pedido en la base de datos: ' + dbError.message)
      return
    }

    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("MARKETGUATE - COMPROBANTE DE PEDIDO", 14, 20)

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 28)
    
    if (selectedBranch) {
      doc.text(`Sucursal: ${selectedBranch.name}`, 14, 35)
    }

    doc.setFont("helvetica", "bold")
    doc.text("Datos del Cliente y Facturación:", 14, 45)
    doc.setFont("helvetica", "normal")
    doc.text(`Nombre Completo: ${customerName}`, 14, 52)
    doc.text(`NIT: ${customerNit}`, 14, 59)
    doc.text(`Correo Electrónico: ${userEmail}`, 14, 66)
    doc.text(`Teléfono: ${customerPhone}`, 14, 73)
    
    const splitAddress = doc.splitTextToSize(`Dirección de Entrega e Instrucciones: ${customerAddress}`, 180)
    doc.text(splitAddress, 14, 80)

    let y = 80 + (splitAddress.length * 6) + 5
    doc.setFont("helvetica", "bold")
    doc.text("Artículos Solicitados:", 14, y)

    y += 7
    doc.setFontSize(10)
    doc.text("Cantidad", 14, y)
    doc.text("Descripción", 40, y)
    doc.text("Precio Unit.", 130, y)
    doc.text("Subtotal", 170, y)
    y += 6
    doc.line(14, y, 196, y)
    y += 8

    doc.setFont("helvetica", "normal")
    cart.forEach(item => {
      doc.text(String(item.quantity), 14, y)
      doc.text(String(item.name).substring(0, 45), 40, y)
      doc.text(`Q ${item.price.toFixed(2)}`, 130, y)
      doc.text(`Q ${(item.price * item.quantity).toFixed(2)}`, 170, y)
      y += 8
    })

    y += 4
    doc.line(14, y, 196, y)
    y += 10
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(`TOTAL A PAGAR: Q ${cartTotal.toFixed(2)}`, 130, y)

    doc.save(`Pedido_MarketGuate_${Date.now()}.pdf`)

    const branchPhone = selectedBranch?.phone || selectedBranch?.businesses?.phone || ''
    let rawPhone = branchPhone.replace(/\D/g, '')

    if (!rawPhone) {
      alert("⚠️ Pedido registrado con éxito y PDF descargado, pero esta sucursal no tiene un número de teléfono registrado para abrir WhatsApp automáticamente.")
      setIsCheckoutModalOpen(false)
      setIsCartOpen(false)
      setCart([])
      return
    }

    const phone = rawPhone.startsWith('502') ? rawPhone : `502${rawPhone}`

    let message = `🛒 *Nuevo Pedido - MarketGuate*\n\n`
    if (selectedBranch) {
      message += `📍 Sucursal: *${selectedBranch.name}*\n\n`
    }
    message += `👤 *Cliente:* ${customerName}\n`
    message += `📄 *NIT:* ${customerNit}\n`
    message += `📧 *Correo:* ${userEmail}\n`
    message += `📱 *Teléfono:* ${customerPhone}\n`
    message += `🏠 *Dirección de Entrega e Instrucciones:* ${customerAddress}\n\n`
    message += `*Artículos solicitados:*\n`
    cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name} - Q ${item.price * item.quantity} (Q ${item.price} c/u)\n`
    })
    message += `\n💰 *Total a pagar: Q ${cartTotal.toFixed(2)}*\n\n¡He generado mi comprobante en PDF, espero confirmación, gracias!`

    const encodedURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(encodedURL, '_blank')

    setIsCheckoutModalOpen(false)
    setIsCartOpen(false)
    setCart([])
  }

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
          category_id,
          branch_id,
          show_in_marketguate,
          branches!inner(
            name,
            phone,
            businesses!inner(id, name, logo_url, phone, is_public)
          )
        `)
        .ilike('name', `%${query}%`)
        .eq('show_in_marketguate', true)

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
    setCart([]) 
    
    const { data, error } = await supabase.rpc('market_get_categories_and_products', { p_branch_id: branch.id })

    if (!error && data) {
      setCategories(data.categories || [])
      const visibleProducts = (data.products || []).filter((p: any) => p.show_in_marketguate === true)
      setProducts(visibleProducts)
    } else {
      setProducts([])
    }
  }

  const filteredBranches = branches.filter(b => {
    const biz = b.businesses
    const matchesCategory = selectedCategoryId ? biz?.category_business_id === selectedCategoryId : true
    const matchesFav = showOnlyFavorites ? favorites.includes(b.id) : true
    return matchesCategory && matchesFav
  })

  const productCategoriesList = categories.map(c => c.name)

  const filteredBranchProducts = products.filter(p => {
    const matchesSearch = branchSearch.trim() === '' || p.name.toLowerCase().includes(branchSearch.toLowerCase())
    const prodCatObj = categories.find(c => c.id === p.category_id)
    const prodCatName = prodCatObj ? prodCatObj.name : 'General'
    const matchesCategory = selectedProductCategory === null || prodCatName === selectedProductCategory
    return matchesSearch && matchesCategory
  })

  function getCategoryIcon(name: string) {
    const lower = name.toLowerCase()
    if (lower.includes('comida') || lower.includes('restaurante') || lower.includes('comedor')) return '🍔'
    if (lower.includes('cafe') || lower.includes('bebida')) return '☕'
    if (lower.includes('pan') || lower.includes('postre')) return '🥐'
    if (lower.includes('ropa') || lower.includes('moda')) return '👕'
    if (lower.includes('tec') || lower.includes('electro')) return '💻'
    if (lower.includes('salud') || lower.includes('farmacia')) return '💊'
    if (lower.includes('ferrete') || lower.includes('hogar')) return '🛠️'
    return '🏷️'
  }

  const isPhoneValid = /^[234567]\d{7}$/.test(customerPhone)
  const isPhoneDirty = customerPhone.length > 0
  const showPhoneError = isPhoneDirty && !isPhoneValid

  if (!isMounted || loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-[#070b12] text-white' : 'bg-slate-100 text-slate-900'} flex items-center justify-center`} suppressHydrationWarning>
        <p className="text-cyan-500 font-bold text-sm animate-pulse">Cargando MarketGuate...</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#070b12] text-white' : 'bg-slate-100 text-slate-900'} font-sans transition-colors duration-300 selection:bg-cyan-500 selection:text-white`} suppressHydrationWarning>
      
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-black tracking-wide animate-bounce flex items-center gap-3 border-2 ${
          toastMessage.includes('Existencias') || toastMessage.includes('Stock') || toastMessage.includes('Error') || toastMessage.includes('Solo puedes calificar') || toastMessage.includes('Inicia sesión')
            ? 'bg-red-600 border-red-300' 
            : 'bg-cyan-600 border-cyan-300'
        }`}>
          <span className="text-lg">{toastMessage.includes('Existencias') || toastMessage.includes('Stock') || toastMessage.includes('Error') || toastMessage.includes('Solo puedes calificar') || toastMessage.includes('Inicia sesión') ? '🔒' : '🛒'}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER RESPONSIVE */}
      <header className={`sticky top-0 ${darkMode ? 'bg-[#070b12]/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b z-40 px-4 sm:px-8 py-3 transition-colors`} suppressHydrationWarning>
        <div className="w-full mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col cursor-pointer" onClick={() => { setSelectedBranch(null); setShowOnlyFavorites(false); setShowHistory(false); fetchMarketplaceData(); }}>
              <span className={`text-base sm:text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'} tracking-wider`}>
                MARKET<span className="text-cyan-500">GUATE</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">Todo en un mismo lugar</span>
            </div>
          </div>

          {!selectedBranch && !showHistory && (
            <div className="hidden md:flex w-96 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input 
                id="global-search-input"
                name="globalSearch"
                type="text"
                placeholder="Buscar platillos o productos..."
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className={`w-full ${darkMode ? 'bg-[#111827] border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border rounded-full pl-9 pr-4 py-2 text-xs outline-none focus:border-cyan-500 transition-colors shadow-inner`}
              />
            </div>
          )}

          <div className="hidden md:flex items-center gap-3">
            {selectedBranch && (
              <button 
                onClick={() => setIsCartOpen(true)} 
                className="relative bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2"
              >
                <span>🛒 Ver Carrito</span>
                {cart.length > 0 && (
                  <span className="bg-pink-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                    {cart.reduce((a, c) => a + c.quantity, 0)}
                  </span>
                )}
              </button>
            )}

            {selectedBranch && (
              <button onClick={() => { setSelectedBranch(null); fetchMarketplaceData(); }} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors border ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700' : 'bg-white hover:bg-slate-100 text-cyan-700 border-slate-300 shadow-sm'}`}>
                ← Volver al Directorio
              </button>
            )}

            <button 
              onClick={() => {
                if (!user) {
                  setToastMessage('🔒 Inicia sesión para ver tus pedidos')
                  setTimeout(() => setToastMessage(null), 3000)
                  setIsSignUp(false)
                  setIsForgotPassword(false)
                  setAuthModalOpen(true)
                  return
                }
                setShowHistory(!showHistory)
                setSelectedBranch(null)
                setShowOnlyFavorites(false)
                if (!showHistory) fetchOrderHistory()
                else fetchMarketplaceData()
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                showHistory ? 'bg-cyan-600 text-white border-cyan-400' : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 shadow-sm'
              }`}
            >
              <span>📦</span> Mis Pedidos
            </button>

            <button 
              onClick={() => { 
                if (!user) {
                  setToastMessage('🔒 Inicia sesión para ver tus favoritos')
                  setTimeout(() => setToastMessage(null), 3000)
                  setIsSignUp(false)
                  setIsForgotPassword(false)
                  setAuthModalOpen(true)
                  return
                }
                setShowOnlyFavorites(!showOnlyFavorites); 
                setSelectedBranch(null); 
                setShowHistory(false); 
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                showOnlyFavorites ? 'bg-pink-600 text-white border-pink-400' : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 shadow-sm'
              }`}
            >
              <span>❤️</span> Favoritos ({favorites.length})
            </button>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl text-xs font-bold border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-sm'}`}
            >
              {darkMode ? '☀️ Claro' : '🌙 Oscuro'}
            </button>

            {user ? (
              <div className={`flex items-center gap-2 ${darkMode ? 'bg-[#111827] border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-800 shadow-sm'} border px-3 py-1.5 rounded-xl text-xs`} suppressHydrationWarning>
                <span className="truncate max-w-[120px] font-medium">{user.email}</span>
                <button onClick={handleLogout} className="text-red-500 dark:text-red-400 font-bold hover:underline ml-2">Salir</button>
              </div>
            ) : (
              <button onClick={() => { setIsSignUp(false); setIsForgotPassword(false); setAuthModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow">
                Iniciar Sesión / Registro
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {selectedBranch && (
              <button onClick={() => setIsCartOpen(true)} className="relative bg-cyan-600 text-white p-2.5 rounded-xl text-xs font-bold">
                🛒 {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{cart.reduce((a,c)=>a+c.quantity,0)}</span>}
              </button>
            )}
            
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2.5 rounded-xl text-xs font-bold border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'}`}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

        </div>

        {mobileMenuOpen && (
          <div className={`md:hidden mt-3 pt-3 border-t ${darkMode ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-white'} rounded-2xl p-4 space-y-3 shadow-2xl`}>
            {selectedBranch && (
              <button 
                onClick={() => { setSelectedBranch(null); fetchMarketplaceData(); setMobileMenuOpen(false); }} 
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-cyan-500/10 text-cyan-500"
              >
                ← Volver al Directorio
              </button>
            )}

            <button 
              onClick={() => {
                if (!user) {
                  setToastMessage('🔒 Inicia sesión para ver tus pedidos')
                  setTimeout(() => setToastMessage(null), 3000)
                  setIsSignUp(false)
                  setIsForgotPassword(false)
                  setAuthModalOpen(true)
                  setMobileMenuOpen(false)
                  return
                }
                setShowHistory(true)
                setSelectedBranch(null)
                setShowOnlyFavorites(false)
                fetchOrderHistory()
                setMobileMenuOpen(false)
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-800/40"
            >
              <span>📦</span> Mis Pedidos
            </button>

            <button 
              onClick={() => { 
                if (!user) {
                  setToastMessage('🔒 Inicia sesión para ver tus favoritos')
                  setTimeout(() => setToastMessage(null), 3000)
                  setIsSignUp(false)
                  setIsForgotPassword(false)
                  setAuthModalOpen(true)
                  setMobileMenuOpen(false)
                  return
                }
                setShowOnlyFavorites(true); 
                setSelectedBranch(null); 
                setShowHistory(false); 
                setMobileMenuOpen(false); 
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-800/40"
            >
              <span>❤️</span> Favoritos ({favorites.length})
            </button>

            <button 
              onClick={() => { setDarkMode(!darkMode); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-800/40"
            >
              <span>{darkMode ? '☀️ Cambiar a Modo Claro' : '🌙 Cambiar a Modo Oscuro'}</span>
            </button>

            {user ? (
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                <span className="text-[11px] truncate max-w-[180px] text-slate-400">{user.email}</span>
                <button onClick={handleLogout} className="text-red-400 font-bold text-xs">Cerrar Sesión</button>
              </div>
            ) : (
              <button 
                onClick={() => { setIsSignUp(false); setIsForgotPassword(false); setAuthModalOpen(true); setMobileMenuOpen(false); }} 
                className="w-full bg-cyan-600 text-white py-2.5 rounded-xl text-xs font-bold text-center shadow"
              >
                Iniciar Sesión / Registro
              </button>
            )}
          </div>
        )}
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-10 py-6 space-y-8" suppressHydrationWarning>

        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className={`w-full max-w-md h-full ${darkMode ? 'bg-[#111827] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border-l p-6 flex flex-col justify-between shadow-2xl transition-colors`}>
              <div className="space-y-6 overflow-y-auto flex-1">
                <div className="flex items-center justify-between border-b pb-4 border-slate-300 dark:border-slate-700">
                  <h3 className="text-lg font-black flex items-center gap-2">🛒 Tu Carrito de Pedido</h3>
                  <button onClick={() => setIsCartOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-cyan-500 font-bold text-sm">✕</button>
                </div>

                {cart.length === 0 ? (
                  <p className="text-center py-20 text-slate-500 dark:text-slate-400 text-xs">Tu carrito está vacío. Agrega productos de la sucursal.</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className={`flex items-center justify-between gap-3 p-3 rounded-2xl border ${darkMode ? 'bg-[#070b12] border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-700" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] text-slate-500">Sin foto</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs truncate">{item.name}</h4>
                          <p className="text-cyan-600 dark:text-cyan-400 font-mono text-xs font-black">Q {item.price * item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded-xl">
                          <button onClick={() => updateCartQuantity(item.id, -1)} className="text-xs font-bold px-1 hover:text-cyan-500">-</button>
                          <span className="text-xs font-mono font-bold">{item.quantity}</span>
                          <button onClick={() => updateCartQuantity(item.id, 1)} className="text-xs font-bold px-1 hover:text-cyan-500">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="pt-4 border-t border-slate-300 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between text-base font-black">
                    <span>Total a pagar:</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-mono">Q {cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (user?.email) fetchUserProfile(user.email)
                      setIsCheckoutModalOpen(true)
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center gap-2"
                  >
                    💬 Continuar Pedido (Registrar, PDF y WhatsApp)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isBranchWhatsAppModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`${darkMode ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} border w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6 transition-colors`}>
              <button onClick={() => setIsBranchWhatsAppModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-cyan-500 font-bold text-sm">✕</button>
              
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Contactar a Sucursal</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Envía un mensaje personalizado a <strong>{selectedBranch?.name}</strong> para que lo atiendan directamente.</p>
              </div>

              <form onSubmit={handleSendBranchWhatsApp} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label htmlFor="branch-wa-name" className="font-semibold">Tu Nombre:</label>
                  <input 
                    id="branch-wa-name"
                    name="branchWhatsAppName"
                    type="text" 
                    required
                    value={branchWhatsAppName} 
                    onChange={e => setBranchWhatsAppName(e.target.value)} 
                    placeholder="Ej. Juan Pérez"
                    className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500`} 
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="branch-wa-msg" className="font-semibold">Tu Mensaje Personalizado:</label>
                  <textarea 
                    id="branch-wa-msg"
                    name="branchWhatsAppMessage"
                    rows={4}
                    required
                    value={branchWhatsAppMessage} 
                    onChange={e => setBranchWhatsAppMessage(e.target.value)} 
                    placeholder="Escribe tu consulta, duda sobre un producto o mensaje..."
                    className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500 resize-none`} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  💬 Enviar Mensaje a WhatsApp
                </button>
              </form>
            </div>
          </div>
        )}

        {isCheckoutModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`${darkMode ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} border w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6 transition-colors`}>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-cyan-500 font-bold text-sm">✕</button>
              
              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">Finalizar Pedido</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tus datos se cargaron automáticamente de tu última compra. Puedes editarlos si lo necesitas.</p>
              </div>

              <form onSubmit={handleGenerateOrder} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label htmlFor="customer-name" className="font-semibold">Nombre Completo o Razón Social</label>
                  <input 
                    id="customer-name"
                    name="customerName"
                    type="text" 
                    required
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                    placeholder="Ej. Juan Pérez"
                    className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500`} 
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="customer-nit" className="font-semibold">NIT (Solo números)</label>
                  <input 
                    id="customer-nit"
                    name="customerNit"
                    type="text" 
                    required
                    value={customerNit} 
                    onChange={e => setCustomerNit(e.target.value.replace(/\D/g, ''))} 
                    placeholder="Ej. 45302820"
                    className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500`} 
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="customer-email" className="font-semibold">Correo Electrónico (del login)</label>
                  <input 
                    id="customer-email"
                    name="customerEmail"
                    type="email" 
                    disabled
                    value={user?.email || email} 
                    className={`w-full ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'} border rounded-xl px-4 py-3 outline-none cursor-not-allowed`} 
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="customer-phone" className="font-semibold">Número de Teléfono (8 dígitos)</label>
                  <input 
                    id="customer-phone"
                    name="customerPhone"
                    type="text" 
                    maxLength={8}
                    required
                    value={customerPhone} 
                    onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 8))} 
                    placeholder="Ej. 50212345"
                    className={`w-full ${darkMode ? 'bg-[#070b12] text-white' : 'bg-slate-100 text-slate-900'} border rounded-xl px-4 py-3 outline-none transition-colors ${
                      showPhoneError 
                        ? 'border-red-500 text-red-500 focus:border-red-500 ring-1 ring-red-500' 
                        : darkMode ? 'border-slate-700 focus:border-cyan-500' : 'border-slate-300 focus:border-cyan-500'
                    }`} 
                  />
                  {showPhoneError ? (
                    <span className="text-[10px] text-red-500 font-bold block mt-1 animate-pulse">
                      ⚠️ Número no válido. Debe tener 8 dígitos y comenzar con 2, 3, 4, 5, 6 o 7.
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block mt-1">Debe iniciar con 2, 3, 4, 5, 6 o 7</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="customer-address" className="font-semibold">Dirección de Entrega e Instrucciones</label>
                  <textarea 
                    id="customer-address"
                    name="customerAddress"
                    rows={3}
                    required
                    value={customerAddress} 
                    onChange={e => setCustomerAddress(e.target.value)} 
                    placeholder="Ej. 10ma Calle 4-20 zona 1, color de casa y referencias..."
                    className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500 resize-none`} 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={showPhoneError}
                  className={`w-full font-black py-3.5 rounded-xl uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center gap-2 ${
                    showPhoneError 
                      ? 'bg-slate-600 cursor-not-allowed opacity-50 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  🚀 Registrar, Descargar PDF y Enviar
                </button>
              </form>
            </div>
          </div>
        )}

        {previewProduct && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className={`${darkMode ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} border w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6 transition-colors`}>
              <button onClick={() => setPreviewProduct(null)} className="absolute top-4 right-4 text-slate-400 hover:text-cyan-500 font-bold text-base w-8 h-8 rounded-full flex items-center justify-center bg-black/20">✕</button>
              
              <div className="space-y-4 text-center">
                {previewProduct.image_url ? (
                  <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-xl bg-black/40">
                    <img src={previewProduct.image_url} alt={previewProduct.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-full h-56 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'} rounded-2xl flex items-center justify-center text-sm border font-bold`}>Sin imagen disponible</div>
                )}
                
                <div className="space-y-2">
                  <span className="inline-block bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-3 py-1 rounded-full text-xs font-bold uppercase border border-cyan-500/30">
                    {categories.find(c => c.id === previewProduct.category_id)?.name || 'General'}
                  </span>
                  <h3 className="text-2xl font-black">{previewProduct.name}</h3>
                  <p className="text-cyan-600 dark:text-cyan-400 font-mono font-black text-2xl" translate="no">Q {previewProduct.price}</p>
                </div>
              </div>

              {previewProduct.description && (
                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${darkMode ? 'bg-[#070b12] text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                  <strong className="block text-cyan-600 dark:text-cyan-400 mb-1">Descripción:</strong>
                  {previewProduct.description}
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={(e) => { addToCart(previewProduct, e); setPreviewProduct(null); }}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-lg"
                >
                  🛒 Agregar al Carrito
                </button>
                <button 
                  onClick={() => setPreviewProduct(null)} 
                  className={`px-4 py-3.5 rounded-xl text-xs font-bold border ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {authModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`${darkMode ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} border w-full max-w-sm rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6 transition-colors`}>
              <button onClick={() => setAuthModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-cyan-500 font-bold text-sm">✕</button>
              
              <div className="flex justify-center mb-2">
                <div className="w-36 h-24 rounded-2xl shadow-xl border border-cyan-500/40 bg-cover bg-center bg-no-repeat bg-[#070b12]" style={{ backgroundImage: "url('/marketguate.jpg')" }}></div>
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-black">
                  {isForgotPassword ? 'Recupera tu contraseña' : isSignUp ? 'Crea tu cuenta en MarketGuate' : 'Inicia Sesión para continuar'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isForgotPassword ? 'Te enviaremos un enlace de recuperación a tu correo.' : isSignUp ? 'Regístrate para guardar tu carrito y pedidos.' : 'Necesitamos identificarte para agregar productos al pedido.'}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label htmlFor="auth-email" className="font-semibold">Correo Electrónico</label>
                  <input 
                    id="auth-email"
                    name="email"
                    type="email" 
                    required
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="tu@correo.com"
                    className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500`} 
                  />
                </div>

                {!isForgotPassword && (
                  <div className="space-y-1">
                    <label htmlFor="auth-password" className="font-semibold">Contraseña</label>
                    <input 
                      id="auth-password"
                      name="password"
                      type="password" 
                      required
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      className={`w-full ${darkMode ? 'bg-[#070b12] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} border rounded-xl px-4 py-3 outline-none focus:border-cyan-500`} 
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 rounded-xl uppercase tracking-wider shadow-lg transition-colors"
                >
                  {authLoading ? 'Procesando...' : isForgotPassword ? 'Enviar Enlace de Recuperación' : isSignUp ? 'Registrarse y Continuar' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-300 dark:border-slate-800 text-xs">
                {!isForgotPassword ? (
                  <>
                    <button onClick={() => setIsForgotPassword(true)} className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">
                      ¿Olvidaste tu contraseña?
                    </button>
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-cyan-600 dark:text-cyan-500 font-bold hover:underline">
                      {isSignUp ? '¿Ya tienes cuenta activa? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsForgotPassword(false)} className="text-cyan-600 dark:text-cyan-500 font-bold hover:underline">
                    ← Volver al inicio de sesión
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showHistory ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>📦 Tus Últimas 10 Compras</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Historial de pedidos realizados con tu cuenta ({user?.email})</p>
              </div>
              <button 
                onClick={() => { setShowHistory(false); fetchMarketplaceData(); }} 
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${darkMode ? 'bg-slate-800 border-slate-700 text-cyan-400 hover:bg-slate-700' : 'bg-white border-slate-300 text-cyan-700 hover:bg-slate-100 shadow-sm'}`}
              >
                ← Volver al Directorio
              </button>
            </div>

            {loadingHistory ? (
              <p className="text-center py-20 text-slate-500 dark:text-slate-400 text-xs animate-pulse">Cargando tus pedidos anteriores...</p>
            ) : orderHistory.length === 0 ? (
              <div className={`text-center py-20 ${darkMode ? 'bg-[#111827] border-slate-800 text-slate-400' : 'bg-white border-slate-300 shadow-md text-slate-600'} border rounded-3xl text-xs`}>
                No tienes compras registradas en tu historial todavía.
              </div>
            ) : (
              <div className="space-y-6">
                {orderHistory.map((order: any, idx: number) => {
                  const items = Array.isArray(order.cart_items) ? order.cart_items : []
                  const status = order.status || 'Pendiente'
                  const isDelivered = status.toLowerCase() === 'entregado'

                  return (
                    <div 
                      key={`order-${order.id || idx}`}
                      className={`${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-xl'} border rounded-3xl p-6 sm:p-8 space-y-5 transition-colors`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-300 dark:border-slate-800">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 px-3.5 py-1 rounded-full font-black uppercase tracking-wider border border-cyan-500/30">
                              Pedido #{order.id}
                            </span>
                            <span className={`text-xs px-3.5 py-1 rounded-full font-black uppercase tracking-wider border ${
                              isDelivered 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                : status.toLowerCase() === 'en camino' || status.toLowerCase() === 'procesando' || status.toLowerCase() === 'despachado'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                            }`}>
                              ● Estado: {status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 font-semibold pt-1">📅 {new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right flex items-center justify-between sm:justify-end gap-6">
                          <span className="text-sm font-bold text-slate-300">NIT: {order.customer_nit}</span>
                          <span className="text-cyan-500 dark:text-cyan-400 font-mono font-black text-xl">Q {Number(order.total).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">Artículos ({items.reduce((a:any,c:any)=>a+Number(c.quantity),0)}) y Calificación:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {items.map((item: any, i: number) => {
                            const ratingKey = `${order.id}-${item.name}`
                            const currentRating = productRatings[ratingKey] || 0
                            return (
                              <div key={`item-${i}`} className={`p-4 rounded-2xl border flex flex-col gap-3 ${darkMode ? 'bg-[#070b12] border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>
                                <div className="flex justify-between items-center gap-2">
                                  <span className="font-extrabold text-sm sm:text-base truncate">✨ {item.quantity}x {item.name}</span>
                                  <span className="font-mono font-black text-sm text-cyan-500 shrink-0">Q {item.price * item.quantity}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                                  <span className="text-xs font-bold text-slate-400">
                                    {isDelivered ? 'Califica este producto:' : '🔒 Disponible al ser Entregado'}
                                  </span>
                                  <div className={`flex items-center gap-1.5 ${!isDelivered ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={`star-${i}-${star}`}
                                        type="button"
                                        disabled={!isDelivered}
                                        onClick={() => handleRateProduct(order, item, star)}
                                        className={`text-lg sm:text-xl transition-colors ${
                                          star <= currentRating ? 'text-amber-400 scale-110' : 'text-slate-600 hover:text-slate-400'
                                        } ${!isDelivered ? 'cursor-not-allowed' : ''}`}
                                        title={isDelivered ? `${star} estrellas` : 'Pedido no entregado aún'}
                                      >
                                        ★
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3 border-t border-slate-800/50">
                        <p className="text-sm text-slate-300">📍 <strong>Entrega:</strong> {order.customer_address}</p>
                        <button 
                          onClick={() => handleDownloadPastPDF(order)}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all shadow flex items-center gap-2 shrink-0 uppercase tracking-wider"
                        >
                          📄 Descargar PDF de Comprobante
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : selectedBranch ? (
          <div className="space-y-6">
            <div className={`${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-lg'} border rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden transition-colors`}>
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-5 relative z-10">
                {selectedBranch.businesses?.logo_url ? (
                  <img src={selectedBranch.businesses.logo_url} alt="Logo" className={`w-20 h-20 object-cover ${darkMode ? 'bg-[#070b12] border-slate-700' : 'bg-slate-100 border-slate-300'} rounded-2xl p-1.5 border shadow-md`} />
                ) : (
                  <div className={`w-20 h-20 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'} rounded-2xl flex items-center justify-center text-xs border`}>Logo</div>
                )}
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 px-2.5 py-0.5 rounded-full font-bold uppercase">Sucursal Abierta</span>
                  <h2 className={`text-xl sm:text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    📍 {selectedBranch.name}
                  </h2>
                  {selectedBranch.phone ? (
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold pt-0.5">
                      📞 Teléfono: {selectedBranch.phone}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic pt-0.5">
                      📞 Teléfono: Sin registrar
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                {selectedBranch.phone && (
                  <button 
                    onClick={() => {
                      if (customerName) setBranchWhatsAppName(customerName)
                      setIsBranchWhatsAppModalOpen(true)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                  >
                    💬 WhatsApp Sucursal
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Inventario Disponible</h3>
                <div className="w-full sm:w-80">
                  <input 
                    id="branch-search-input"
                    name="branchSearch"
                    type="text"
                    placeholder="🔍 Buscar en este menú..."
                    value={branchSearch}
                    onChange={e => setBranchSearch(e.target.value)}
                    className={`w-full ${darkMode ? 'bg-[#111827] border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'} border px-4 py-2 rounded-xl text-xs outline-none focus:border-cyan-500`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <button
                  onClick={() => setSelectedProductCategory(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                    selectedProductCategory === null 
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg' 
                      : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 shadow-sm'
                  }`}
                >
                  🍽️ Todos ({products.length})
                </button>
                {productCategoriesList.map(cat => {
                  const catObj = categories.find(c => c.name === cat)
                  const count = products.filter(p => p.category_id === catObj?.id || (!p.category_id && cat === 'General')).length
                  return (
                    <button
                      key={`prod-cat-${cat}`}
                      onClick={() => setSelectedProductCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                        selectedProductCategory === cat 
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg' 
                          : darkMode ? 'bg-[#111827] text-slate-300 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 shadow-sm'
                      }`}
                    >
                      📂 {cat} ({count})
                    </button>
                  )
                })}
              </div>
            </div>

            {filteredBranchProducts.length === 0 ? (
              <p className="text-center py-16 text-slate-500 dark:text-slate-400 text-xs">No se encontraron productos con ese criterio en esta sucursal.</p>
            ) : selectedProductCategory !== null || branchSearch.trim() !== '' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBranchProducts.map(prod => (
                  <div 
                    key={`prod-${prod.id}`} 
                    onClick={() => setPreviewProduct(prod)}
                    className={`${darkMode ? 'bg-[#111827] border-slate-800 hover:border-cyan-500/40' : 'bg-white border-slate-300 hover:border-cyan-500 shadow-md'} border rounded-3xl p-4 flex flex-col justify-between gap-4 transition-all group cursor-pointer`}
                  >
                    <div className="flex gap-4 items-center">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className={`w-20 h-20 object-cover ${darkMode ? 'border-slate-700' : 'border-slate-300'} rounded-2xl border group-hover:scale-105 transition-transform`} />
                      ) : (
                        <div className={`w-20 h-20 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'} rounded-2xl flex items-center justify-center text-[10px] border`}>Sin foto</div>
                      )}
                      <div className="flex-1 space-y-1">
                        <h4 className={`font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-900'} group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors`}>{prod.name}</h4>
                        <p className="text-cyan-600 dark:text-cyan-400 font-mono font-black text-sm" translate="no">Q {prod.price}</p>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          prod.stock > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                        }`}>
                          {prod.stock > 0 ? `Stock: ${prod.stock}` : 'Agotado'}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => addToCart(prod, e)}
                      className="w-full bg-cyan-600/10 hover:bg-cyan-600 text-cyan-700 dark:text-cyan-400 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-colors border border-cyan-500/30 shadow-sm text-center"
                    >
                      🛒 Agregar al Carrito
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {productCategoriesList.map(catName => {
                  const catObj = categories.find(c => c.name === catName)
                  const catProducts = filteredBranchProducts.filter(p => p.category_id === catObj?.id || (!p.category_id && catName === 'General'))
                  if (catProducts.length === 0) return null

                  return (
                    <div key={`cat-section-${catName}`} className="space-y-4">
                      <div className="flex items-center gap-3 border-b pb-2 border-slate-300 dark:border-slate-800">
                        <span className="text-lg">📂</span>
                        <h4 className={`text-base font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{catName}</h4>
                        <span className="text-xs bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-2.5 py-0.5 rounded-full font-bold">
                          {catProducts.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {catProducts.map(prod => (
                          <div 
                            key={`prod-${prod.id}`} 
                            onClick={() => setPreviewProduct(prod)}
                            className={`${darkMode ? 'bg-[#111827] border-slate-800 hover:border-cyan-500/40' : 'bg-white border-slate-300 hover:border-cyan-500 shadow-md'} border rounded-3xl p-4 flex flex-col justify-between gap-4 transition-all group cursor-pointer`}
                          >
                            <div className="flex gap-4 items-center">
                              {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name} className={`w-20 h-20 object-cover ${darkMode ? 'border-slate-700' : 'border-slate-300'} rounded-2xl border group-hover:scale-105 transition-transform`} />
                              ) : (
                                <div className={`w-20 h-20 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'} rounded-2xl flex items-center justify-center text-[10px] border`}>Sin foto</div>
                              )}
                              <div className="flex-1 space-y-1">
                                <h4 className={`font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-900'} group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors`}>{prod.name}</h4>
                                <p className="text-cyan-600 dark:text-cyan-400 font-mono font-black text-sm" translate="no">Q {prod.price}</p>
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  prod.stock > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                                }`}>
                                  {prod.stock > 0 ? `Stock: ${prod.stock}` : 'Agotado'}
                                </span>
                              </div>
                            </div>

                            <button 
                              onClick={(e) => addToCart(prod, e)}
                              className="w-full bg-cyan-600/10 hover:bg-cyan-600 text-cyan-700 dark:text-cyan-400 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-colors border border-cyan-500/30 shadow-sm text-center"
                            >
                              🛒 Agregar al Carrito
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8" suppressHydrationWarning>
            
            <div className="w-full relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-[#0b1329] to-cyan-950 p-8 sm:p-12 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500 hover:border-cyan-400/60">
              
              <div className="absolute -top-24 -left-24 w-56 h-56 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 space-y-3 text-left max-w-2xl text-white">
                <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 text-[10px] font-extrabold uppercase px-3.5 py-1.5 rounded-full border border-cyan-500/30 tracking-wider shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  ⚡ MarketGuate en Vivo
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                  Todo en un mismo lugar: sucursales y productos de toda Guate
                </h3>
                
                <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
                  Consulta existencias, arma tu carrito y genera tus pedidos directamente vía WhatsApp.
                </p>
              </div>

              <div className="relative z-10 w-72 h-44 sm:w-80 sm:h-48 rounded-2xl shadow-2xl border-2 border-cyan-400/60 bg-contain bg-center bg-no-repeat bg-[#070b12] shrink-0" style={{ backgroundImage: "url('/marketguate.jpg')" }}></div>

            </div>

            {/* SECCIÓN ACTUALIZADA: EXPANDE TU NEGOCIO CON NÚMERO Y CORREO ESPECÍFICOS */}
            <div className={`w-full rounded-3xl p-6 sm:p-8 border transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl ${
              darkMode 
                ? 'bg-[#111827]/90 border-cyan-500/40 text-white shadow-cyan-950/50' 
                : 'bg-white border-cyan-300 text-slate-900 shadow-cyan-100'
            }`}>
              <div className="space-y-2 text-center md:text-left">
                <span className="inline-block bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  🚀 Expande tu Negocio
                </span>
                <h4 className="text-xl sm:text-2xl font-black tracking-tight">
                  ¿Te gustaría ser parte de MarketGuate?
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xl">
                  No esperes más y asocia tu negocio con nosotros y QuantikaPOS. Contáctanos hoy mismo para habilitar tu presencia online y empezar a recibir pedidos.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                <a 
                  href="https://wa.me/50248069299?text=Hola,%20me%20gustaría%20asociar%20mi%20negocio%20a%20MarketGuate%20y%20QuantikaPOS" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg transition-all flex items-center gap-2"
                >
                  <span>💬</span> Contáctanos por WhatsApp
                </a>
                <a 
                  href="mailto:codenexaacademy@gmail.com?subject=Asociar%20mi%20negocio%20a%20MarketGuate" 
                  className={`font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all border flex items-center gap-2 ${
                    darkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-cyan-700 border-slate-300'
                  }`}
                >
                  <span>✉️</span> Enviar Correo
                </a>
              </div>
            </div>

            {globalSearch.trim() !== '' ? (
              <div className="space-y-4 pt-2">
                <h3 className="text-base font-bold text-cyan-600 dark:text-cyan-400">
                  Resultados globales para: <span className={darkMode ? 'text-white' : 'text-slate-900'}>"{globalSearch}"</span>
                </h3>

                {searchingGlobal ? (
                  <p className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">Buscando en todas las sucursales...</p>
                ) : globalProductsResult.length === 0 ? (
                  <p className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">No se encontraron productos coincidentes en ninguna sucursal.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {globalProductsResult.map((prod: any) => {
                      const branch = prod.branches
                      return (
                        <div key={`global-prod-${prod.id}`} className={`${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-300 shadow-md'} border rounded-3xl p-4 flex flex-col justify-between gap-4 transition-colors`}>
                          <div className="flex gap-4 items-center">
                            {prod.image_url ? (
                              <img src={prod.image_url} alt={prod.name} className={`w-16 h-16 object-cover ${darkMode ? 'border-slate-700' : 'border-slate-300'} rounded-2xl border`} />
                            ) : (
                              <div className={`w-16 h-16 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'} rounded-2xl flex items-center justify-center text-[10px] border`}>Sin foto</div>
                            )}
                            <div className="flex-1 space-y-1">
                              <h4 className={`font-extrabold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{prod.name}</h4>
                              <p className="text-cyan-600 dark:text-cyan-400 font-mono font-black text-sm" translate="no">Q {prod.price}</p>
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                prod.stock > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                              }`}>
                                {prod.stock > 0 ? `Stock: ${prod.stock}` : 'Agotado'}
                              </span>
                            </div>
                          </div>

                          {branch && (
                            <div className={`pt-3 ${darkMode ? 'border-slate-800' : 'border-slate-200'} border-t flex justify-between items-center text-xs`}>
                              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{branch.name}</span>
                              <button 
                                onClick={() => handleSelectBranch(branch)}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-xl font-bold transition-colors shadow"
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
                
                {/* CARRUSEL MODERNO CON BOTONES DE NAVEGACIÓN Y ARRASTRE FLUIDO */}
                <div className="space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-sm sm:text-base font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Explora por Categoría
                    </h2>
                    
                    {/* Botones de Flechas de Navegación Estilo Premium */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button 
                        onClick={() => {
                          if (categoryScrollRef.current) {
                            categoryScrollRef.current.scrollBy({ left: -250, behavior: 'smooth' })
                          }
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                          darkMode ? 'bg-slate-800/80 border-slate-700 text-white hover:bg-cyan-600 hover:border-cyan-500' : 'bg-white border-slate-300 text-slate-800 hover:bg-cyan-600 hover:text-white shadow-sm'
                        }`}
                        title="Desplazar a la izquierda"
                      >
                        ←
                      </button>
                      <button 
                        onClick={() => {
                          if (categoryScrollRef.current) {
                            categoryScrollRef.current.scrollBy({ left: 250, behavior: 'smooth' })
                          }
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                          darkMode ? 'bg-slate-800/80 border-slate-700 text-white hover:bg-cyan-600 hover:border-cyan-500' : 'bg-white border-slate-300 text-slate-800 hover:bg-cyan-600 hover:text-white shadow-sm'
                        }`}
                        title="Desplazar a la derecha"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  <div 
                    ref={categoryScrollRef}
                    onMouseDown={(e) => {
                      setIsDragging(true)
                      setStartX(e.pageX - categoryScrollRef.current!.offsetLeft)
                      setScrollLeft(categoryScrollRef.current!.scrollLeft)
                    }}
                    onMouseLeave={() => setIsDragging(false)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseMove={(e) => {
                      if (!isDragging) return
                      e.preventDefault()
                      const x = e.pageX - categoryScrollRef.current!.offsetLeft
                      const walk = (x - startX) * 1.5 // velocidad de arrastre
                      categoryScrollRef.current!.scrollLeft = scrollLeft - walk
                    }}
                    className="flex items-center gap-3 overflow-x-auto pb-4 pt-2 scrollbar-none snap-x cursor-grab active:cursor-grabbing select-none"
                  >
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className={`group snap-start relative flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 shrink-0 border ${
                        selectedCategoryId === null 
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/50 shadow-lg shadow-cyan-600/30 scale-105 z-10' 
                          : darkMode 
                          ? 'bg-[#111827]/80 text-slate-300 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/90 hover:scale-105' 
                          : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-500/50 hover:scale-105 shadow-sm'
                      }`}
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">🌟</span>
                      <div className="text-left pointer-events-none">
                        <span className="block font-black text-xs sm:text-sm tracking-wide">Todas</span>
                        <span className={`block text-[10px] ${selectedCategoryId === null ? 'text-cyan-100' : 'text-slate-400'}`}>
                          {branches.length} sucursales
                        </span>
                      </div>
                    </button>

                    {categories.map(cat => {
                      const count = branches.filter(b => b.businesses?.category_business_id === cat.id).length
                      const isSelected = selectedCategoryId === cat.id
                      const iconEmoji = getCategoryIcon(cat.name)
                      return (
                        <button
                          key={`cat-card-${cat.id}`}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          className={`group snap-start relative flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-300 shrink-0 border ${
                            isSelected 
                              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/50 shadow-lg shadow-cyan-600/30 scale-105 z-10' 
                              : darkMode 
                              ? 'bg-[#111827]/80 text-slate-300 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/90 hover:scale-105' 
                              : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-500/50 hover:scale-105 shadow-sm'
                          }`}
                        >
                          <span className="text-xl group-hover:scale-110 transition-transform">{iconEmoji}</span>
                          <div className="text-left pointer-events-none">
                            <span className="block font-black text-xs sm:text-sm tracking-wide truncate max-w-[120px]">{cat.name}</span>
                            <span className={`block text-[10px] ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
                              {count} sucursales
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  {showOnlyFavorites && (
                    <div className="flex items-center justify-between bg-pink-500/10 border border-pink-500/30 px-5 py-3 rounded-2xl">
                      <span className="text-xs font-bold text-pink-600 dark:text-pink-400">❤️ Viendo únicamente tus sucursales favoritas</span>
                      <button onClick={() => setShowOnlyFavorites(false)} className={`text-xs ${darkMode ? 'text-white' : 'text-slate-900'} font-bold underline`}>Ver todas</button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      Sucursales Disponibles {selectedCategoryId ? `(${filteredBranches.length})` : ''}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredBranches.length === 0 ? (
                      <div className={`col-span-full text-center py-20 ${darkMode ? 'bg-[#111827] border-slate-800 text-slate-400' : 'bg-white border-slate-300 shadow-md text-slate-600'} border rounded-3xl text-xs`}>
                        {showOnlyFavorites ? 'Aún no tienes sucursales favoritas guardadas.' : 'No se encontraron sucursales en esta categoría.'}
                      </div>
                    ) : (
                      filteredBranches.map(branch => {
                        const biz = branch.businesses
                        const isFav = favorites.includes(branch.id)
                        return (
                          <div 
                            key={`branch-card-${branch.id}`}
                            onClick={() => handleSelectBranch(branch)}
                            className={`${darkMode ? 'bg-[#111827] border-slate-800 hover:border-cyan-500/40' : 'bg-white border-slate-300 shadow-lg hover:border-cyan-500'} border rounded-3xl overflow-hidden transition-all flex flex-col justify-between group relative cursor-pointer`}
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

                            <div className={`relative h-44 w-full ${darkMode ? 'bg-gradient-to-r from-slate-900 to-[#070b12] border-slate-800' : 'bg-gradient-to-r from-slate-100 to-slate-200 border-slate-300'} flex items-center justify-center p-6 border-b`}>
                              {biz?.logo_url ? (
                                <img src={biz.logo_url} alt="Logo" className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className={`w-16 h-16 ${darkMode ? 'bg-[#070b12] border-slate-700 text-slate-500' : 'bg-white border-slate-300 text-slate-500'} rounded-2xl flex items-center justify-center text-xs border`}>Logo</div>
                              )}
                              <span className="absolute top-3 right-3 bg-emerald-600 text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:border dark:border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                                ● Abierto
                              </span>
                              <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-cyan-300 px-3 py-1 rounded-xl text-[10px] font-bold border border-white/10">
                                {categories.find(c => c.id === biz?.category_business_id)?.name || 'General'}
                              </span>
                            </div>

                            <div className="p-6 space-y-4">
                              <div>
                                <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'} group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-0.5`}>{branch.name}</h3>
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

      </main>

      <footer className={`mt-auto py-8 ${darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-500'} border-t text-center text-xs px-4 transition-colors`}>
        <p>© {new Date().getFullYear()} MarketGuate — Todo en un mismo lugar. Conectando las sucursales de Quantika POS.</p>
      </footer>

    </div>
  )
}