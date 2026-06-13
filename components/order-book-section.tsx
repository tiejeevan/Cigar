'use client';

import { useState, useEffect } from 'react';
import { db, useLiveQuery, OrderItem, Employee, OrderSession } from '@/lib/db';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { 
  BookOpen, Search, Trash2, Calendar, User, Key, Lock, Unlock, 
  Plus, CheckCircle, Clock, ShoppingCart, UserCheck, ChevronDown, ChevronUp,
  Sparkles, Package, Flame, Eye, ShieldAlert, Edit2, Check, X, 
  ClipboardCopy, ListPlus, TrendingUp, DollarSign, CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderBookSectionProps {
  orders: OrderItem[];
  activeEmployee: Employee | null;
  setActiveEmployee: (employee: Employee | null) => void;
}

export function OrderBookSection({ 
  orders: initialOrders,
  activeEmployee,
  setActiveEmployee
}: OrderBookSectionProps) {
  // Helper styling methods for categories
  const getCategoryBadgeStyles = (category?: string | null) => {
    if (!category) return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400';
    const cat = category.toLowerCase().trim();
    if (cat.includes('supply') || cat.includes('store') || cat === 'paper' || cat === 'clean' || cat.includes('towel')) {
      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    }
    if (cat.includes('drink') || cat.includes('water') || cat.includes('beverage') || cat === 'soda' || cat.includes('cup')) {
      return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
    if (cat.includes('snack') || cat.includes('food') || cat.includes('candy') || cat.includes('chip') || cat.includes('cookie')) {
      return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
    }
    if (cat.includes('cigar') || cat.includes('tobacco') || cat.includes('wrap') || cat.includes('smoke') || cat.includes('lighter')) {
      return 'bg-amber-500/10 border-amber-500/20 text-[#D4AF37]';
    }
    return 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400';
  };

  const getCategoryIcon = (category?: string | null) => {
    if (!category) return <Package className="w-4 h-4 text-zinc-400 shrink-0" />;
    const cat = category.toLowerCase().trim();
    if (cat.includes('supply') || cat.includes('store') || cat === 'paper' || cat === 'clean' || cat.includes('towel')) {
      return <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (cat.includes('drink') || cat.includes('water') || cat.includes('beverage') || cat === 'soda' || cat.includes('cup')) {
      return <ShoppingCart className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (cat.includes('snack') || cat.includes('food') || cat.includes('candy') || cat.includes('chip') || cat.includes('cookie')) {
      return <ShoppingCart className="w-4 h-4 text-orange-400 shrink-0" />;
    }
    if (cat.includes('cigar') || cat.includes('tobacco') || cat.includes('wrap') || cat.includes('smoke') || cat.includes('lighter')) {
      return <Flame className="w-4 h-4 text-[#D4AF37] shrink-0" />;
    }
    return <Package className="w-4 h-4 text-zinc-400 shrink-0" />;
  };

  // Reactive query of employees, orders, inventory items, and database sessions
  const employees = useLiveQuery(() => db.employees.list(), []) || [];
  const orders = useLiveQuery(() => db.orders.toArray(), []) || [];
  const items = useLiveQuery(() => db.items.toArray(), []) || [];
  const orderSessions = useLiveQuery(() => db.orderSessions.list(), []) || [];

  // Authentication State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Login Form
  const [loginName, setLoginName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  
  // Registration Form
  const [regName, setRegName] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regRole, setRegRole] = useState<'employee' | 'manager'>('employee');

  // Needs Form (all fields, brand required)
  const [newBrand, setNewBrand] = useState('');
  const [newFlavor, setNewFlavor] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPackType, setNewPackType] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUrgency, setNewUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTimeframe, setNewTimeframe] = useState<'asap' | '1week' | '2weeks' | 'monthly'>('1week');
  const [newEstimatedPrice, setNewEstimatedPrice] = useState('0.00');
  const [newNotes, setNewNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filters
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending-approved');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editPrice, setEditPrice] = useState<string>('0.00');
  const [editNotes, setEditNotes] = useState<string>('');

  // Splits & Partial completion state
  const [splitInputId, setSplitInputId] = useState<number | null>(null);
  const [splitQty, setSplitQty] = useState<number>(1);

  // Complete Batch Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [completionMode, setCompletionMode] = useState<'selected' | 'asap' | '1week' | '2weeks' | 'all'>('selected');

  const COMMON_SUPPLIES = [
    'Ice bags',
    'Bottled water',
    'Paper towels',
    'Trash bags',
    'Napkins',
    'Receipt paper rolls',
    'Lighters',
    'Cleaning spray',
    'Plastic cups',
    'Toilet paper',
    'Hand soap',
    'Sponges',
    'Dish soap'
  ];

  const getSuggestions = () => {
    const list: string[] = [...COMMON_SUPPLIES];
    items.forEach(item => {
      if (item.brand) {
        const name = item.flavor ? `${item.brand} - ${item.flavor}` : item.brand;
        if (!list.some(s => s.toLowerCase() === name.toLowerCase())) {
          list.push(name);
        }
      }
    });
    return list;
  };

  const suggestionsList = getSuggestions();
  const matchingSuggestions = newBrand.trim()
    ? suggestionsList.filter(s => s.toLowerCase().includes(newBrand.toLowerCase()) && s.toLowerCase() !== newBrand.toLowerCase())
    : [];

  // Search & Collapsing
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  // Active items selection for shopping completion
  const [selectedItemIds, setSelectedItemIds] = useState<Record<number, boolean>>({});



  // Set default login dropdown name
  useEffect(() => {
    if (employees.length > 0 && !loginName) {
      setLoginName(employees[0].name);
    }
  }, [employees, loginName]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!/^\d{4}$/.test(regPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    if (regPin !== regConfirmPin) {
      toast.error('PINs do not match');
      return;
    }

    try {
      const res = await db.employees.register(regName.trim(), regPin, regRole);
      if (res && !res.error) {
        toast.success(`Profile created for ${regName}`);
        // Log in automatically
        const newEmp: Employee = { id: res.id, name: res.name, role: res.role, createdAt: res.createdAt };
        setActiveEmployee(newEmp);
        sessionStorage.setItem('active_employee', JSON.stringify(newEmp));
        // Reset inputs
        setRegName('');
        setRegPin('');
        setRegConfirmPin('');
        setRegRole('employee');
      } else {
        toast.error(res?.error || 'Registration failed');
      }
    } catch (err) {
      toast.error('Registration failed due to connection error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = loginName || (employees[0] ? employees[0].name : '');
    if (!targetName) {
      toast.error('Please select or create an employee profile first');
      return;
    }
    if (!/^\d{4}$/.test(loginPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    try {
      const res = await db.employees.verifyPin(targetName, loginPin);
      if (res && res.success && res.employee) {
        toast.success(`Welcome, ${res.employee.name}!`);
        setActiveEmployee(res.employee);
        sessionStorage.setItem('active_employee', JSON.stringify(res.employee));
        setLoginPin('');
      } else {
        toast.error(res?.error || 'Incorrect PIN entered');
      }
    } catch (err) {
      toast.error('Verification failed due to connection error');
    }
  };



  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.trim()) {
      toast.error('Description / Item Name is required.');
      return;
    }
    if (!activeEmployee) return;

    // Look for matching item in inventory to get its inventoryId and prefill price if not manually set
    const matchedItem = items.find(
      i => i.brand.toLowerCase() === newBrand.toLowerCase().trim() && 
           (newFlavor ? i.flavor.toLowerCase() === newFlavor.toLowerCase().trim() : true)
    );

    const order: Omit<OrderItem, 'id'> = {
      inventoryId: matchedItem?.id || undefined,
      brand: newBrand.trim(),
      flavor: newFlavor.trim() || '',
      category: newCategory.trim() || 'Store Supplies',
      packType: newPackType.trim() || 'Item',
      quantity: parseInt(newQty) || 1,
      status: 'pending',
      createdAt: Date.now(),
      addedBy: activeEmployee.name,
      urgency: newUrgency,
      timeframe: newTimeframe,
      estimatedPrice: parseFloat(newEstimatedPrice) || 0.00,
      notes: newNotes.trim()
    };

    await db.orders.add(order);
    toast.success('Added to Store Needs list');
    
    setNewBrand('');
    setNewFlavor('');
    setNewCategory('');
    setNewPackType('');
    setNewQty('1');
    setNewUrgency('medium');
    setNewTimeframe('1week');
    setNewEstimatedPrice('0.00');
    setNewNotes('');
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    if (suggestion.includes(' - ')) {
      const parts = suggestion.split(' - ');
      const brandVal = parts[0].trim();
      const flavorVal = parts[1].trim();
      setNewBrand(brandVal);
      setNewFlavor(flavorVal);
      
      const matched = items.find(i => i.brand === brandVal && i.flavor === flavorVal);
      if (matched) {
        setNewCategory(matched.category || 'Cigarillos');
        setNewPackType(matched.packType || 'Single');
        setNewEstimatedPrice(matched.price ? String(matched.price) : '0.00');
      }
    } else {
      setNewBrand(suggestion);
      // Dynamically auto-categorize common items
      const lowerSug = suggestion.toLowerCase();
      if (lowerSug.includes('water') || lowerSug.includes('cup') || lowerSug.includes('drink')) {
        setNewCategory('Drinks');
      } else if (COMMON_SUPPLIES.includes(suggestion) || lowerSug.includes('bag') || lowerSug.includes('towel') || lowerSug.includes('paper') || lowerSug.includes('soap') || lowerSug.includes('spray')) {
        setNewCategory('Supplies');
      }

      const matched = items.find(i => i.brand.toLowerCase() === lowerSug);
      if (matched) {
        setNewCategory(matched.category || 'Cigarillos');
        setNewPackType(matched.packType || 'Single');
        setNewEstimatedPrice(matched.price ? String(matched.price) : '0.00');
      }
    }
    setShowSuggestions(false);
  };

  const toggleItemSelection = (id: number) => {
    setSelectedItemIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = (pendingItems: OrderItem[]) => {
    const allSelected = pendingItems.every(item => selectedItemIds[item.id!]);
    const nextSelection: Record<number, boolean> = {};
    if (!allSelected) {
      pendingItems.forEach(item => {
        nextSelection[item.id!] = true;
      });
    }
    setSelectedItemIds(nextSelection);
  };

  // Open Complete Dialog
  const openCompleteModal = () => {
    const defaultName = `Restock Batch - ${new Date().toLocaleDateString()}`;
    setSessionName(defaultName);
    setVendorName('General Supplier');
    setSessionNotes('');
    setCompletionMode('selected');
    setShowCompleteModal(true);
  };

  // Batch Complete Orders inside Dialog Modal
  const handleProcessCompletion = async () => {
    let targetIds: number[] = [];
    
    if (completionMode === 'selected') {
      targetIds = Object.keys(selectedItemIds)
        .map(Number)
        .filter(id => selectedItemIds[id]);
    } else if (completionMode === 'asap') {
      targetIds = orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === 'asap').map(o => o.id!);
    } else if (completionMode === '1week') {
      targetIds = orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === '1week').map(o => o.id!);
    } else if (completionMode === '2weeks') {
      targetIds = orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === '2weeks').map(o => o.id!);
    } else if (completionMode === 'all') {
      targetIds = orders.filter(o => o.status === 'pending' || o.status === 'approved').map(o => o.id!);
    }

    if (targetIds.length === 0 || !activeEmployee) {
      toast.warning('No items match completion criteria, or you are logged out.');
      return;
    }

    try {
      const res = await db.orders.completeActiveOrders(
        targetIds, 
        activeEmployee.name, 
        sessionName, 
        vendorName, 
        sessionNotes
      );
      if (res && res.success) {
        toast.success(`Fulfillment session "${sessionName}" recorded in database with ${targetIds.length} items!`);
        setSelectedItemIds({});
        setShowCompleteModal(false);
      } else {
        toast.error('Failed to save ordering batch session');
      }
    } catch (err) {
      toast.error('Server error executing completion session');
    }
  };

  // Batch Approve
  const handleApproveSelected = async () => {
    const selectedIds = Object.keys(selectedItemIds)
      .map(Number)
      .filter(id => selectedItemIds[id]);

    if (selectedIds.length === 0 || !activeEmployee) {
      toast.warning('Please select at least one item to approve.');
      return;
    }

    try {
      for (const id of selectedIds) {
        await db.orders.update(id, { 
          status: 'approved',
          approvedBy: activeEmployee.name,
          approvedAt: Date.now()
        });
      }
      toast.success(`Successfully approved ${selectedIds.length} items!`);
      setSelectedItemIds({});
    } catch (err) {
      toast.error('Error approving items');
    }
  };

  // Batch Receive Stock
  const handleReceiveSelected = async () => {
    const selectedIds = Object.keys(selectedItemIds)
      .map(Number)
      .filter(id => selectedItemIds[id]);

    if (selectedIds.length === 0 || !activeEmployee) {
      toast.warning('Please select at least one item.');
      return;
    }

    try {
      for (const id of selectedIds) {
        await db.orders.update(id, { 
          status: 'received',
          receivedBy: activeEmployee.name,
          receivedAt: Date.now()
        });
      }
      toast.success(`Marked ${selectedIds.length} items as Received & updated inventory stock!`);
      setSelectedItemIds({});
    } catch (err) {
      toast.error('Error receiving items');
    }
  };

  // Copy selected list as text helper
  const handleCopySelectedList = () => {
    const selectedIds = Object.keys(selectedItemIds)
      .map(Number)
      .filter(id => selectedItemIds[id]);

    if (selectedIds.length === 0) return;

    const selectedItemsList = orders.filter(o => selectedIds.includes(o.id!));
    const text = selectedItemsList.map(item => {
      const priceText = item.estimatedPrice ? ` ($${item.estimatedPrice} ea)` : '';
      return `- ${item.brand.toUpperCase()}${item.flavor ? ` (${item.flavor})` : ''} x${item.quantity}${priceText} - Cycle: ${item.timeframe || '1week'}, Urgency: ${(item.urgency || 'medium').toUpperCase()}${item.notes ? ` (Note: ${item.notes})` : ''}`;
    }).join('\n');

    navigator.clipboard.writeText(`Gaint Mart - Store Needs List:\n${text}`);
    toast.success('Selected list copied to clipboard!');
  };

  // Individual Actions
  const handleApproveItem = async (id: number) => {
    if (!activeEmployee) return;
    await db.orders.update(id, {
      status: 'approved',
      approvedBy: activeEmployee.name,
      approvedAt: Date.now()
    });
    toast.success('Request Approved');
  };

  const handleOrderItem = async (id: number) => {
    if (!activeEmployee) return;
    await db.orders.update(id, {
      status: 'ordered',
      completedBy: activeEmployee.name,
      completedAt: Date.now()
    });
    toast.success('Marked as Ordered / Placed');
  };

  const handleReceiveItem = async (id: number) => {
    if (!activeEmployee) return;
    await db.orders.update(id, {
      status: 'received',
      receivedBy: activeEmployee.name,
      receivedAt: Date.now()
    });
    toast.success('Item received and inventory stocked!');
  };

  const handleDeleteItem = async (id: number) => {
    await db.orders.delete(id);
    toast.info('Item request removed');
  };

  // Partial quantity fulfillment splitting
  const handlePartialComplete = async (item: OrderItem, fillQty: number) => {
    if (fillQty <= 0 || fillQty >= item.quantity || !activeEmployee) {
      toast.error('Invalid quantity split.');
      return;
    }

    try {
      const remainingQty = item.quantity - fillQty;
      
      // 1. Update existing item's quantity to remaining
      await db.orders.update(item.id!, { quantity: remainingQty });
      
      // 2. Add new temporary item with target quantity
      const tempOrder: Omit<OrderItem, 'id'> = {
        inventoryId: item.inventoryId,
        brand: item.brand,
        flavor: item.flavor,
        category: item.category,
        packType: item.packType,
        quantity: fillQty,
        status: 'pending',
        createdAt: item.createdAt,
        addedBy: item.addedBy,
        urgency: item.urgency,
        timeframe: item.timeframe,
        estimatedPrice: item.estimatedPrice,
        notes: `Partial split from original request of ${item.quantity}. Notes: ${item.notes || ''}`,
        approvedBy: item.approvedBy,
        approvedAt: item.approvedAt
      };
      
      const tempId = await db.orders.add(tempOrder);
      
      // 3. Immediately trigger completion batch session for that split item
      await db.orders.completeActiveOrders(
        [tempId], 
        activeEmployee.name, 
        `Partial Complete - ${item.brand.toUpperCase()}`, 
        'General Distributor', 
        `Fulfillment split of ${fillQty} items out of original requested ${item.quantity}.`
      );

      toast.success(`Completed partial order of ${fillQty} units. ${remainingQty} units left pending.`);
      setSplitInputId(null);
    } catch (err) {
      toast.error('Failed to complete partial split');
    }
  };

  // Defer Cycle
  const handleDeferCycle = async (item: OrderItem) => {
    const cycleMap: Record<string, 'asap' | '1week' | '2weeks' | 'monthly'> = {
      asap: '1week',
      '1week': '2weeks',
      '2weeks': 'monthly',
      monthly: 'asap'
    };
    const current = item.timeframe || '1week';
    const next = cycleMap[current];
    await db.orders.update(item.id!, { 
      timeframe: next,
      notes: `${item.notes || ''} (Deferred on ${new Date().toLocaleDateString()})`.trim()
    });
    toast.info(`Postponed ${item.brand.toUpperCase()} cycle to ${next.toUpperCase()}`);
  };

  // Inline editing actions
  const startEditing = (item: OrderItem) => {
    setEditingId(item.id!);
    setEditQty(item.quantity);
    setEditPrice(item.estimatedPrice ? String(item.estimatedPrice) : '0.00');
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async (id: number) => {
    await db.orders.update(id, {
      quantity: editQty,
      estimatedPrice: parseFloat(editPrice) || 0.00,
      notes: editNotes.trim()
    });
    toast.success('Request details updated');
    setEditingId(null);
  };

  const toggleReportExpand = (listId: string) => {
    setExpandedReports(prev => ({
      ...prev,
      [listId]: !prev[listId]
    }));
  };

  const formatDateTime = (timestamp: number) => {
    if (!timestamp) return 'Unknown Date';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filters & Sorting logic
  let displayNeeds = orders.filter(o => {
    if (filterStatus === 'pending-approved') {
      return o.status === 'pending' || o.status === 'approved';
    }
    return o.status === filterStatus;
  });

  // Search Filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    displayNeeds = displayNeeds.filter(o => 
      o.brand.toLowerCase().includes(query) || 
      o.flavor.toLowerCase().includes(query) ||
      (o.notes && o.notes.toLowerCase().includes(query)) ||
      (o.category && o.category.toLowerCase().includes(query))
    );
  }

  // Urgency filter
  if (filterUrgency !== 'all') {
    displayNeeds = displayNeeds.filter(o => o.urgency === filterUrgency);
  }

  // Timeframe filter
  if (filterTimeframe !== 'all') {
    displayNeeds = displayNeeds.filter(o => o.timeframe === filterTimeframe);
  }

  // Sorting
  displayNeeds.sort((a, b) => {
    if (sortBy === 'newest') return b.createdAt - a.createdAt;
    if (sortBy === 'oldest') return a.createdAt - b.createdAt;
    if (sortBy === 'urgency') {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const weightA = priorityWeight[a.urgency || 'medium'];
      const weightB = priorityWeight[b.urgency || 'medium'];
      return weightB - weightA;
    }
    if (sortBy === 'cost') {
      const costA = (a.estimatedPrice || 0) * a.quantity;
      const costB = (b.estimatedPrice || 0) * b.quantity;
      return costB - costA;
    }
    return 0;
  });

  // Group completed orders (for lists)
  const completedOrders = orders.filter(o => o.status === 'ordered' || o.status === 'received');

  // Analytics Metrics (Active needs = pending + approved)
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'approved');
  const activeNeedsCount = activeOrders.length;
  const highPriorityCount = activeOrders.filter(o => o.urgency === 'high').length;
  const asapCount = activeOrders.filter(o => o.timeframe === 'asap').length;
  const oneWeekCount = activeOrders.filter(o => o.timeframe === '1week').length;
  const twoWeekCount = activeOrders.filter(o => o.timeframe === '2weeks').length;
  
  const activePriceSum = activeOrders.reduce((sum, o) => sum + (o.estimatedPrice || 0) * o.quantity, 0);

  const overallCompletedCount = orders.filter(o => o.status === 'ordered' || o.status === 'received').length;
  const totalCount = orders.length;
  const fulfillmentRate = totalCount > 0 ? Math.round((overallCompletedCount / totalCount) * 100) : 100;

  // Suggested reorders from inventory (low stock)
  const lowStockSuggestions = items.filter(item => item.quantity <= item.reorderThreshold);



  // Auth Screen if not logged in
  if (!activeEmployee) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto text-left">
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 w-full shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#D4AF37]"></div>
          
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl">
              <Lock className="w-8 h-8 text-[#D4AF37]" />
            </div>
          </div>

          <h3 className="text-2xl font-serif font-bold text-center text-[#E5E1DA] mb-1">Employee Portal</h3>
          <p className="text-xs text-center text-gray-500 uppercase tracking-widest font-semibold mb-8">Order Book Security</p>

          <div className="flex bg-[#14161C] border border-[#2A2A2A] rounded-xl p-1 mb-6">
            <button 
              onClick={() => { setAuthMode('login'); setLoginPin(''); }}
              className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${authMode === 'login' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Log In
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setRegPin(''); setRegConfirmPin(''); }}
              className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${authMode === 'register' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Setup PIN
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Select Employee</label>
                {employees.length === 0 ? (
                  <div className="text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3.5 leading-relaxed">
                    No employee profiles registered yet. Please click the <strong>"Setup PIN"</strong> tab to create one.
                  </div>
                ) : (
                  <select
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3.5 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl appearance-none cursor-pointer"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.name}>{e.name} ({e.role || 'Employee'})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">4-Digit PIN</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={4}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3.5 pl-10 text-center text-lg tracking-[1.5em] focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl font-mono"
                    placeholder="••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={employees.length === 0}
                className="w-full mt-4 bg-[#D4AF37] disabled:bg-gray-700 text-black py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all cursor-pointer"
              >
                Authenticate
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Your Name / Title</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3.5 pl-10 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl"
                    placeholder="e.g. Alex"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Role / Permissions</label>
                <div className="flex bg-[#14161C] border border-[#2A2A2A] rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setRegRole('employee')}
                    className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${regRole === 'employee' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegRole('manager')}
                    className={`flex-1 text-center py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${regRole === 'manager' ? 'bg-[#2A2A2A] text-[#D4AF37] shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    Manager
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Choose 4-Digit PIN</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={4}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3.5 pl-10 text-center text-lg tracking-[1.5em] focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl font-mono"
                    placeholder="••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Confirm PIN</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={4}
                    value={regConfirmPin}
                    onChange={(e) => setRegConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3.5 pl-10 text-center text-lg tracking-[1.5em] focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl font-mono"
                    placeholder="••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all cursor-pointer"
              >
                Create Profile & Log In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto text-left">
      
      {/* 1. Fulfillment Analytics Dashboard Header */}
      {/* Mobile Analytics Bar (Single compressed row) */}
      <div className="flex sm:hidden bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-3.5 justify-between items-center text-center gap-1.5 shadow-sm animate-in fade-in duration-300">
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-gray-500 font-extrabold mb-0.5">Requests</span>
          <span className="text-base font-mono text-[#E5E1DA] font-bold">{activeNeedsCount}</span>
        </div>
        <div className="w-[1px] h-6 bg-[#2A2A2A]/60" />
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-gray-500 font-extrabold mb-0.5">Spend</span>
          <span className="text-base font-mono text-emerald-400 font-bold">${activePriceSum.toFixed(0)}</span>
        </div>
        <div className="w-[1px] h-6 bg-[#2A2A2A]/60" />
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-gray-500 font-extrabold mb-0.5">Critical</span>
          <span className="text-base font-mono text-red-400 font-bold">{highPriorityCount}</span>
        </div>
        <div className="w-[1px] h-6 bg-[#2A2A2A]/60" />
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-gray-500 font-extrabold mb-0.5">Fulfill</span>
          <span className="text-base font-mono text-blue-400 font-bold">{fulfillmentRate}%</span>
        </div>
      </div>

      {/* Desktop Analytics Dashboard (4 Cards) */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
        
        {/* Metric 1: Store Needs */}
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1 bg-[#D4AF37]" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Active Store Requests</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono text-[#E5E1DA] font-bold">{activeNeedsCount}</span>
              <span className="text-xs text-gray-400">items logged</span>
            </div>
            <span className="text-[9px] text-[#888] block mt-1">Awaiting order cycle</span>
          </div>
          <ShoppingCart className="w-10 h-10 text-[#D4AF37]/10" />
        </div>

        {/* Metric 2: Estimated Spend */}
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Est. Projected Spend</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-mono text-emerald-400 font-bold">${activePriceSum.toFixed(2)}</span>
            </div>
            <span className="text-[9px] text-[#888] block mt-1">Based on estimated prices</span>
          </div>
          <DollarSign className="w-10 h-10 text-emerald-500/10" />
        </div>

        {/* Metric 3: urgencies breakdown */}
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1 bg-red-500" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Urgency Dashboard</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono text-red-400 font-bold">{highPriorityCount}</span>
              <span className="text-xs text-red-500 font-bold">CRITICAL / HIGH</span>
            </div>
            <span className="text-[9px] text-[#888] block mt-1">{asapCount} requested ASAP timeframe</span>
          </div>
          <ShieldAlert className="w-10 h-10 text-red-500/10" />
        </div>

        {/* Metric 4: Cycles & Fulfillment */}
        <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1 bg-blue-500" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Fulfillment Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono text-blue-400 font-bold">{fulfillmentRate}%</span>
              <span className="text-xs text-gray-400">({overallCompletedCount}/{totalCount})</span>
            </div>
            <span className="text-[9px] text-[#888] block mt-1">Cycles: {oneWeekCount} (1w) | {twoWeekCount} (2w)</span>
          </div>
          <TrendingUp className="w-10 h-10 text-blue-500/10" />
        </div>

      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        
        {/* Collaborative Needs Board */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Header Info Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0D0F13] border border-[#2A2A2A] px-5 py-4 rounded-2xl">
            <div>
              <h2 className="text-2xl font-serif text-[#E5E1DA]">Order Book</h2>
              <p className="text-[9px] uppercase tracking-widest text-[#888] mt-0.5">Unified store requests list & fulfillment cycle manager</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#666]" />
            <input 
              type="text" 
              placeholder="Search store requests by brand, flavor, categories, or notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-xl text-base text-[#E5E1DA] py-4 pl-12 pr-4 focus:outline-none focus:border-[#D4AF37] transition-colors font-mono shadow-sm"
            />
          </div>

          {/* Filtering & Sorting Controls Bar */}
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-[#0D0F13] border border-[#2A2A2A] p-4 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
              {/* Status tabs */}
              <div className="flex overflow-x-auto scrollbar-none flex-nowrap bg-[#14161C] border border-[#2A2A2A] rounded-xl p-1 text-[10px] w-full sm:w-auto shrink-0">
                {[
                  { label: 'Active', value: 'pending-approved' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Approved', value: 'approved' },
                  { label: 'Ordered', value: 'ordered' },
                  { label: 'Received', value: 'received' }
                ].map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setFilterStatus(tab.value)}
                    className={`flex-shrink-0 whitespace-nowrap px-3 py-2 rounded-lg font-bold uppercase tracking-wider transition-all ${
                      filterStatus === tab.value
                        ? 'bg-[#2A2A2A] text-[#D4AF37] shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              {/* Dropdowns group */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Urgency select */}
                <select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  className="bg-[#14161C] border border-[#2A2A2A] text-gray-300 rounded-xl px-3 py-2.5 sm:py-2 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] cursor-pointer flex-1 sm:flex-none w-full sm:w-auto"
                >
                  <option value="all">All Urgencies</option>
                  <option value="high">High Urgency</option>
                  <option value="medium">Medium Urgency</option>
                  <option value="low">Low Urgency</option>
                </select>
                
                {/* Timeframe select */}
                <select
                  value={filterTimeframe}
                  onChange={(e) => setFilterTimeframe(e.target.value)}
                  className="bg-[#14161C] border border-[#2A2A2A] text-gray-300 rounded-xl px-3 py-2.5 sm:py-2 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] cursor-pointer flex-1 sm:flex-none w-full sm:w-auto"
                >
                  <option value="all">All Cycles</option>
                  <option value="asap">ASAP</option>
                  <option value="1week">1 Week Cycle</option>
                  <option value="2weeks">2 Week Cycle</option>
                  <option value="monthly">Monthly Cycle</option>
                </select>
              </div>
            </div>
            
            {/* Sorting */}
            <div className="flex items-center gap-2 text-xs w-full xl:w-auto justify-between xl:justify-end border-t xl:border-0 border-[#2A2A2A]/40 pt-2 xl:pt-0">
              <span className="text-gray-500 uppercase tracking-wider font-semibold">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#14161C] border border-[#2A2A2A] text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37] font-semibold cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="urgency">Urgency Level</option>
                <option value="cost">Estimated Cost</option>
              </select>
            </div>
          </div>

          {/* Needs List */}
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl shadow-md overflow-hidden flex flex-col">
            
            {/* Batch Action Toolbar */}
            <div className="p-4 bg-[#14161C]/60 border-b border-[#2A2A2A] flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={displayNeeds.length > 0 && displayNeeds.every(item => selectedItemIds[item.id!])}
                  onChange={() => handleSelectAll(displayNeeds)}
                  disabled={displayNeeds.length === 0}
                  className="w-4.5 h-4.5 text-[#D4AF37] accent-[#D4AF37] rounded border-gray-300 focus:ring-[#D4AF37] cursor-pointer"
                />
                <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">Select All ({displayNeeds.length})</span>
                {Object.values(selectedItemIds).filter(Boolean).length > 0 && (
                  <span className="text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-md font-mono">
                    {Object.values(selectedItemIds).filter(Boolean).length} Selected
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Copy list button */}
                <button
                  onClick={handleCopySelectedList}
                  disabled={Object.values(selectedItemIds).filter(Boolean).length === 0}
                  className="flex items-center gap-1.5 bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 disabled:opacity-40 disabled:border-zinc-800 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  Copy Text
                </button>

                {/* Manager Actions */}
                {activeEmployee.role === 'manager' && (
                  <>
                    <button
                      onClick={handleApproveSelected}
                      disabled={Object.values(selectedItemIds).filter(Boolean).length === 0}
                      className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 disabled:opacity-40 disabled:border-zinc-800 disabled:text-gray-500 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                      Approve
                    </button>
                    
                    <button
                      onClick={handleReceiveSelected}
                      disabled={Object.values(selectedItemIds).filter(Boolean).length === 0}
                      className="flex items-center gap-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 disabled:opacity-40 disabled:border-zinc-800 disabled:text-gray-500 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                      Receive Stock
                    </button>
                  </>
                )}
                
                {/* ADVANCED COMPLETE BUTTON MODAL TRIGGER */}
                <button
                  onClick={openCompleteModal}
                  className="flex items-center gap-1.5 bg-[#22C55E] hover:bg-[#1fba59] text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-sm cursor-pointer animate-pulse"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Complete / Order Batch
                </button>
              </div>
            </div>

            {displayNeeds.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
                <ShoppingCart className="w-12 h-12 text-[#2A2A2A]" />
                <p className="text-[10px] uppercase tracking-widest text-[#888]">No matching store requests logged.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A2A]">
                {displayNeeds.map(order => {
                  const isEditing = editingId === order.id;
                  
                  // Priority Styling variables
                  const isHigh = order.urgency === 'high';
                  const urgencyStyles = isHigh 
                    ? 'border-l-4 border-l-red-500 bg-red-500/[0.02]' 
                    : order.urgency === 'medium'
                    ? 'border-l-4 border-l-orange-500 bg-orange-500/[0.01]'
                    : 'border-l-4 border-l-blue-500';

                  return (
                    <div 
                      key={order.id} 
                      className={`p-4 sm:p-5 flex flex-col hover:bg-[#14161C]/50 transition-colors gap-3 ${urgencyStyles} ${selectedItemIds[order.id!] ? 'bg-[#D4AF37]/5' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        
                        {/* Checkbox and Card Main details */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <input 
                            type="checkbox"
                            checked={!!selectedItemIds[order.id!]}
                            onChange={() => toggleItemSelection(order.id!)}
                            className="w-4.5 h-4.5 mt-1 text-[#D4AF37] accent-[#D4AF37] rounded border-gray-300 focus:ring-[#D4AF37] shrink-0 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              {order.category && (
                                <span className={`text-[8px] sm:text-[9px] border px-2 py-0.5 rounded uppercase tracking-wider font-bold ${getCategoryBadgeStyles(order.category)}`}>
                                  {order.category}
                                </span>
                              )}
                              {order.packType && (
                                <span className="text-[9px] sm:text-[10px] bg-[#14161C] border border-[#2A2A2A]/60 px-2 py-0.5 rounded text-[#888] uppercase tracking-wider font-semibold">
                                  {order.packType}
                                </span>
                              )}
                              
                              {/* Urgency Badge */}
                              <span className={`text-[8px] sm:text-[9px] border px-2 py-0.5 rounded uppercase tracking-wider font-bold ${
                                isHigh ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                order.urgency === 'medium' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                                'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              }`}>
                                {order.urgency || 'medium'}
                              </span>

                              {/* Timeframe Cycle Badge */}
                              <span className="text-[8px] sm:text-[9px] bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded uppercase tracking-wider font-bold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                Cycle: {order.timeframe === 'asap' ? 'ASAP' : order.timeframe === '1week' ? '1 Week' : order.timeframe === '2weeks' ? '2 Weeks' : 'Monthly'}
                              </span>

                              {/* Status progression indicator */}
                              <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                order.status === 'pending' ? 'bg-zinc-800 text-zinc-400' :
                                order.status === 'approved' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                order.status === 'ordered' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {order.status}
                              </span>
                            </div>

                            <h4 className="text-base sm:text-lg font-serif text-[#E5E1DA] flex items-center gap-2 flex-wrap text-left uppercase">
                              {getCategoryIcon(order.category)}
                              <span className="font-bold">{order.brand}</span>
                              {order.flavor && <span className="text-[#888] font-sans text-xs sm:text-sm normal-case italic">({order.flavor})</span>}
                            </h4>

                            {/* Added metadata info lines */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-gray-500 font-semibold mt-2.5">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                                Logged by: {order.addedBy || 'System'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDateTime(order.createdAt)}
                              </span>
                              {order.approvedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-500 flex items-center gap-1">
                                    Approved by {order.approvedBy} ({formatDateTime(order.approvedAt || 0)})
                                  </span>
                                </>
                              )}
                              {order.receivedBy && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-400 flex items-center gap-1">
                                    Received by {order.receivedBy} ({formatDateTime(order.receivedAt || 0)})
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Quantity and Price summary */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {isEditing ? (
                            <div className="flex flex-col gap-2 bg-[#14161C] p-3 border border-[#2A2A2A] rounded-xl text-left w-48">
                              <div className="space-y-1">
                                <label className="text-[9px] text-[#888] uppercase tracking-wider font-bold">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editQty}
                                  onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                                  className="w-full bg-[#0D0F13] border border-[#2A2A2A] text-white p-1 px-2 rounded-lg text-xs font-mono text-center font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-[#888] uppercase tracking-wider font-bold">Unit Price ($)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full bg-[#0D0F13] border border-[#2A2A2A] text-white p-1 px-2 rounded-lg text-xs font-mono text-center font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-[#888] uppercase tracking-wider font-bold">Notes</label>
                                <input
                                  type="text"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  className="w-full bg-[#0D0F13] border border-[#2A2A2A] text-white p-1 px-2 rounded-lg text-xs"
                                />
                              </div>
                              <div className="flex gap-2.5 mt-1 border-t border-[#2A2A2A]/40 pt-2">
                                <button
                                  onClick={() => handleSaveEdit(order.id!)}
                                  className="flex-1 py-1.5 bg-emerald-500 text-black text-[10px] font-bold uppercase rounded-lg hover:bg-emerald-400 active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" /> Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="flex-1 py-1.5 bg-zinc-800 text-gray-400 text-[10px] font-bold uppercase rounded-lg hover:text-white active:scale-95 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-right">
                              <div className="flex items-center gap-3">
                                <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Qty:</span>
                                <span className="text-xl font-mono text-[#E5E1DA] font-bold">{order.quantity}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono mt-1">
                                Est. Cost: <strong className="text-emerald-400">${((order.estimatedPrice || 0) * order.quantity).toFixed(2)}</strong>
                              </div>
                              {order.estimatedPrice ? (
                                <div className="text-[9px] text-[#888] font-mono mt-0.5">
                                  (${order.estimatedPrice.toFixed(2)} ea)
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Display special notes & action buttons in secondary row */}
                      {!isEditing && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-[#2A2A2A]/30 pt-3 gap-3">
                          
                          {/* Notes */}
                          <div className="min-w-0 flex-1">
                            {order.notes ? (
                              <p className="text-xs text-gray-400 italic bg-[#14161C]/40 border border-[#2A2A2A]/40 px-3 py-1.5 rounded-xl block max-w-lg leading-relaxed text-left">
                                <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold block mb-0.5">Instructions:</span>
                                {order.notes}
                              </p>
                            ) : (
                              <span className="text-[10px] text-gray-600 italic">No notes provided.</span>
                            )}
                          </div>

                          {/* Quick Workflow Action Panel depending on activeEmployee permissions & status */}
                          <div className="flex items-center justify-end gap-2.5">
                            
                            {/* Defer Cycle Button */}
                            {(order.status === 'pending' || order.status === 'approved') && (
                              <button
                                onClick={() => handleDeferCycle(order)}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-[#2A2A2A] text-zinc-300 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                title="Defer to next timeframe cycle"
                              >
                                Defer
                              </button>
                            )}

                            {/* PARTIAL FULFILLMENT SPLIT INTERFACE */}
                            {splitInputId === order.id ? (
                              <div className="flex items-center gap-1.5 bg-[#14161C] border border-[#2A2A2A] p-2 rounded-xl">
                                <span className="text-[9px] text-gray-500 font-bold uppercase">Fill:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max={order.quantity - 1}
                                  value={splitQty}
                                  onChange={(e) => setSplitQty(Math.min(order.quantity - 1, Math.max(1, parseInt(e.target.value) || 1)))}
                                  className="w-16 bg-[#0D0F13] border border-[#2A2A2A] text-white p-1 rounded-lg text-xs font-mono font-bold text-center"
                                />
                                <button
                                  onClick={() => handlePartialComplete(order, splitQty)}
                                  className="p-1 bg-purple-500 text-white rounded hover:bg-purple-400 text-[10px] font-bold uppercase px-2 transition-all cursor-pointer"
                                >
                                  Complete Split
                                </button>
                                <button
                                  onClick={() => setSplitInputId(null)}
                                  className="p-1 bg-zinc-850 text-gray-400 rounded hover:text-white text-[10px] font-bold uppercase px-2 transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              (order.status === 'pending' || order.status === 'approved') && order.quantity > 1 ? (
                                <button
                                  onClick={() => { setSplitInputId(order.id!); setSplitQty(1); }}
                                  className="p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                  title="Order a partial quantity of this need"
                                >
                                  Split & Fill
                                </button>
                              ) : null
                            )}

                            {/* Manager Actions */}
                            {activeEmployee.role === 'manager' && (
                              <>
                                {/* Approve Action */}
                                {order.status === 'pending' && (
                                  <button
                                    onClick={() => handleApproveItem(order.id!)}
                                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                    title="Approve Request"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    Approve
                                  </button>
                                )}
                                
                                {/* Ordered / Complete Action */}
                                {(order.status === 'pending' || order.status === 'approved') && (
                                  <button
                                    onClick={() => handleOrderItem(order.id!)}
                                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                    title="Complete & Order"
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    Order
                                  </button>
                                )}

                                {/* Stock Received Action */}
                                {order.status === 'ordered' && (
                                  <button
                                    onClick={() => handleReceiveItem(order.id!)}
                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                    title="Receive Stock in Inventory"
                                  >
                                    <Package className="w-3.5 h-3.5" />
                                    Receive Stock
                                  </button>
                                )}

                                {/* Inline Edit Trigger */}
                                <button
                                  onClick={() => startEditing(order)}
                                  className="p-2 bg-[#14161C] border border-[#2A2A2A] hover:border-gray-500 text-gray-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                  title="Edit quantity / prices"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                              </>
                            )}

                            {/* Delete/Cancel request */}
                            {(activeEmployee.role === 'manager' || order.status === 'pending') && (
                              <button
                                onClick={() => handleDeleteItem(order.id!)}
                                className="p-2 bg-[#C2410C]/10 hover:bg-[#C2410C]/20 border border-[#C2410C]/20 hover:border-[#C2410C]/40 text-[#C2410C] rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                title="Remove Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historical Shopping Reports */}
          <div className="mt-4">
            <h3 className="text-xl font-serif text-[#E5E1DA] mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#D4AF37]" /> Previous Reports / Shopping History
            </h3>

            <div className="space-y-4 animate-in fade-in duration-300">
              {orderSessions.length === 0 ? (
                <div className="py-12 border border-dashed border-[#2A2A2A] rounded-2xl bg-[#0D0F13] text-center">
                  <p className="text-[10px] uppercase tracking-widest text-[#888]">No shopping history reports logged in database.</p>
                </div>
              ) : (
                orderSessions.map(session => {
                  const isExpanded = !!expandedReports[session.listId];
                  const sessionItems = completedOrders.filter(o => o.listId === session.listId);
                  const totalCost = sessionItems.reduce((sum, o) => sum + (o.estimatedPrice || 0) * o.quantity, 0);

                  return (
                    <div key={session.listId} className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-md">
                      <div 
                        onClick={() => toggleReportExpand(session.listId)}
                        className="p-4 sm:p-5 flex justify-between items-center hover:bg-[#14161C] transition-colors cursor-pointer"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start md:items-center gap-2 sm:gap-4 text-left">
                          <span className="text-xs font-mono uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                            {session.sessionName || 'Order Batch'}
                          </span>
                          <div className="text-sm">
                            <span className="text-gray-300 font-serif font-bold">Distributor: {session.vendorName || 'General Distributor'}</span>
                            <span className="text-[#888] text-xs font-mono ml-3">
                              • Placed by: <strong>{session.completedBy}</strong> • {formatDateTime(session.completedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                          <span className="text-emerald-400 font-mono font-bold">${totalCost.toFixed(2)}</span>
                          <div className="text-[#888] flex items-center gap-1.5">
                            <span>{sessionItems.length} {sessionItems.length === 1 ? 'item' : 'items'}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#D4AF37]" /> : <ChevronDown className="w-4 h-4 text-[#D4AF37]" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-[#2A2A2A] bg-[#0A0B0E]/60 divide-y divide-[#2A2A2A] text-left">
                          {session.notes && (
                            <div className="p-4 bg-[#14161C]/30 text-xs text-gray-400 italic border-b border-[#2A2A2A]">
                              <strong>Batch Notes:</strong> "{session.notes}"
                            </div>
                          )}
                          {sessionItems.map(item => (
                            <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5 text-[9px] text-[#666]">
                                  {item.category && (
                                    <span className={`border px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${getCategoryBadgeStyles(item.category)}`}>
                                      {item.category}
                                    </span>
                                  )}
                                  {item.packType && <span className="bg-[#14161C] border border-[#2A2A2A] px-1.5 py-0.2 rounded text-gray-400 font-bold uppercase tracking-wider">{item.packType}</span>}
                                  <span>Requested by: <strong className="text-gray-400">{item.addedBy || 'System'}</strong></span>
                                  <span>at {formatDateTime(item.createdAt)}</span>
                                  {item.urgency && (
                                    <span className="text-gray-500 capitalize">Urgency: {item.urgency}</span>
                                  )}
                                  {item.timeframe && (
                                    <span className="text-gray-500 uppercase font-mono">Cycle: {item.timeframe}</span>
                                  )}
                                </div>
                                <h5 className="text-sm font-serif font-bold text-gray-300 uppercase italic tracking-wide flex items-center gap-1.5 flex-wrap">
                                  {getCategoryIcon(item.category)}
                                  <span>{item.brand}</span>
                                  {item.flavor && <span className="text-xs font-sans text-gray-500 ml-1.5 normal-case">({item.flavor})</span>}
                                </h5>
                                {item.notes && <p className="text-[11px] text-gray-500 italic mt-1 font-sans">Instruction: "{item.notes}"</p>}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm font-mono text-gray-300 bg-[#14161C] px-2.5 py-1 border border-[#2A2A2A] rounded-lg">Qty: {item.quantity}</span>
                                {item.estimatedPrice ? (
                                  <p className="text-[10px] text-gray-500 font-mono mt-1">Cost: ${(item.estimatedPrice * item.quantity).toFixed(2)}</p>
                                ) : null}
                                <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ml-2 ${
                                  item.status === 'received' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar panel */}
        <div className="w-full lg:w-96 flex flex-col gap-6 animate-in fade-in slide-in-from-right-3 duration-300 shrink-0">
          
          {/* Add New Need Panel */}
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-6 shadow-md text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] to-[#B3932E]" />
            
            <h3 className="text-lg font-serif text-[#D4AF37] mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Request Need
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-6">Write what the store requires (All Optional)</p>
            
            {/* Real-time Custom Request Preview Card */}
            <div className="mb-6 p-4 rounded-xl border border-dashed border-[#2A2A2A] bg-[#14161C]/30 relative overflow-hidden">
              <div className="absolute top-2.5 right-3 flex items-center gap-1.5 text-[8px] uppercase tracking-wider text-gray-500 font-bold bg-[#14161C] px-2 py-0.5 rounded border border-[#2A2A2A]/50">
                <Eye className="w-3.5 h-3.5 text-[#D4AF37]" /> Live Preview
              </div>
              <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-3 font-semibold">Dashboard Card Mockup:</p>
              
              <div className="bg-[#0D0F13]/90 border border-[#2A2A2A]/80 rounded-xl p-4 flex flex-col gap-3 shadow-inner">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className={`text-[8px] border px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider transition-colors ${getCategoryBadgeStyles(newCategory)}`}>
                        {newCategory.trim() || 'Store Supplies'}
                      </span>
                      <span className="text-[9px] bg-[#14161C] border border-[#2A2A2A] px-1.5 py-0.2 rounded text-zinc-400 font-medium uppercase tracking-wider transition-all">
                        {newPackType.trim() || 'Item'}
                      </span>
                      <span className={`text-[8px] border px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        newUrgency === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        newUrgency === 'medium' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {newUrgency}
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-serif text-[#E5E1DA] uppercase flex items-center gap-1.5 flex-wrap font-bold">
                      {getCategoryIcon(newCategory)}
                      <span className="truncate max-w-[140px] block">
                        {newBrand.trim() || 'Description Required'}
                      </span>
                      {newFlavor.trim() && (
                        <span className="text-[#888] font-sans text-xs lowercase italic font-normal shrink-0">
                          ({newFlavor.trim()})
                        </span>
                      )}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 bg-[#14161C] px-2 py-0.5 rounded border border-[#2A2A2A]/40 text-[9px] text-[#888]">
                      <span>Cycle:</span>
                      <span className="font-bold text-[#E5E1DA]">{newTimeframe.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 bg-[#14161C] px-2 py-1 rounded-lg border border-[#2A2A2A]/40">
                      <span className="text-[8px] uppercase tracking-wider text-gray-500 font-semibold font-sans">Qty:</span>
                      <span className="text-xs font-mono text-[#E5E1DA] font-bold">{newQty || 1}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-[#2A2A2A]/40 pt-2 text-xs">
                  <span className="text-gray-500 font-semibold">Est. Spend:</span>
                  <span className="font-mono text-[#D4AF37] font-bold">
                    ${((parseFloat(newEstimatedPrice) || 0) * (parseInt(newQty) || 1)).toFixed(2)}
                  </span>
                </div>

                {newNotes.trim() && (
                  <div className="text-[9px] text-[#888] bg-[#14161C]/50 border border-[#2A2A2A]/20 p-2 rounded italic text-left">
                    Notes: {newNotes}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleCreateNeed} className="space-y-4">
              {/* 1. Description */}
              <div className="space-y-2 relative">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Description / Item Name</label>
                  <span className="text-[9px] uppercase tracking-wider text-[#C2410C] font-bold animate-pulse">Required</span>
                </div>
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl placeholder:text-gray-600 font-medium shadow-inner"
                  placeholder="e.g. 10 Bags of Ice, Swisher Sweets..."
                  autoComplete="off"
                />
                
                {/* Autocomplete Suggestions */}
                {showSuggestions && matchingSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-[#14161C] border border-[#2A2A2A] rounded-xl overflow-hidden z-20 shadow-xl max-h-48 overflow-y-auto">
                    {matchingSuggestions.slice(0, 8).map(suggestion => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full text-left p-2.5 text-[#E5E1DA] hover:bg-[#2A2A2A] transition-colors text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2 border-b border-[#2A2A2A]/50 last:border-b-0 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Variant / Details */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Variant / Flavor / Size</label>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold italic">Optional</span>
                </div>
                <input
                  type="text"
                  value={newFlavor}
                  onChange={(e) => setNewFlavor(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl placeholder:text-gray-600 font-medium shadow-inner"
                  placeholder="e.g. 7 lb bag, Grape, 10-pack..."
                />
              </div>

              {/* 3. Category */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Category / Department</label>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold italic">Optional</span>
                </div>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl placeholder:text-gray-600 font-medium shadow-inner"
                  placeholder="e.g. Supplies, Cigarillos, Snacks..."
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['Supplies', 'Cigarillos', 'Drinks', 'Snacks'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className="text-[9px] bg-[#1C1E24] hover:bg-[#2A2D35] text-gray-400 hover:text-white px-2 py-0.5 rounded-md border border-[#2A2A2A]/60 transition-colors cursor-pointer"
                    >
                      + {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Format / Packaging */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Format / Packaging</label>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold italic">Optional</span>
                </div>
                <input
                  type="text"
                  value={newPackType}
                  onChange={(e) => setNewPackType(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl placeholder:text-gray-600 font-medium shadow-inner"
                  placeholder="e.g. Case, Box, Single, Roll..."
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {['Single', 'Box', 'Carton', 'Case', 'Roll'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setNewPackType(f)}
                      className="text-[9px] bg-[#1C1E24] hover:bg-[#2A2D35] text-gray-400 hover:text-white px-2 py-0.5 rounded-md border border-[#2A2A2A]/60 transition-colors cursor-pointer"
                    >
                      + {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Urgency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setNewUrgency(u)}
                      className={`py-2 px-3 text-xs rounded-xl font-bold uppercase border transition-all cursor-pointer ${
                        newUrgency === u
                          ? u === 'high'
                            ? 'bg-red-500/10 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                            : u === 'medium'
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                            : 'bg-blue-500/10 border-blue-500 text-blue-400'
                          : 'bg-[#14161C] border-[#2A2A2A] text-gray-400 hover:text-white'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframe Cycle */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Fulfillment Cycle</label>
                <select
                  value={newTimeframe}
                  onChange={(e) => setNewTimeframe(e.target.value as any)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl appearance-none cursor-pointer"
                >
                  <option value="asap">ASAP (Within 24-48 hours)</option>
                  <option value="1week">1 Week Cycle</option>
                  <option value="2weeks">2 Week Cycle</option>
                  <option value="monthly">Monthly / Custom</option>
                </select>
              </div>

              {/* Estimated Price */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Est. Unit Price ($)</label>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold italic">Optional</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newEstimatedPrice}
                  onChange={(e) => setNewEstimatedPrice(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl font-mono shadow-inner font-bold"
                  placeholder="0.00"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Special Notes</label>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold italic">Optional</span>
                </div>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl placeholder:text-gray-600 resize-none"
                  placeholder="Alternate brands, special flavors..."
                />
              </div>

              {/* 5. Quantity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Quantity Required</label>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold italic">Optional (Defaults to 1)</span>
                </div>
                <input
                  type="number"
                  min="1"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl text-center font-mono shadow-inner font-bold"
                />
              </div>

              <button 
                type="submit"
                className="w-full mt-2 bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all cursor-pointer"
              >
                Add store request
              </button>
            </form>
          </div>

          {/* Suggested Reorders (Low stock widget) */}
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-6 shadow-md text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-[#D4AF37]" />
            
            <h3 className="text-lg font-serif text-[#E5E1DA] mb-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
              Suggested Reorders
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-4">Stock below threshold levels</p>
            
            {lowStockSuggestions.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-2">All inventory items are adequately stocked!</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {lowStockSuggestions.slice(0, 10).map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-[#14161C] border border-[#2A2A2A] rounded-xl text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-300 truncate uppercase">{item.brand}</p>
                      {item.flavor && <p className="text-[#888] text-[10px] truncate">({item.flavor})</p>}
                      <p className="text-[9px] text-red-400 font-semibold mt-1">
                        Stock: {item.quantity} / Min: {item.reorderThreshold}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setNewBrand(item.brand);
                        setNewFlavor(item.flavor || '');
                        setNewCategory(item.category || '');
                        setNewPackType(item.packType || 'Single');
                        setNewQty('15'); // default suggested order count
                        setNewUrgency('high');
                        setNewEstimatedPrice(item.price ? String(item.price) : '0.00');
                        setNewNotes('Auto-restock request for low stock levels');
                        toast.info(`Prefilled request with ${item.brand}`);
                      }}
                      className="p-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-lg text-[#D4AF37] transition-all shrink-0 cursor-pointer"
                      title="Draft Request"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Complete Session Dialog Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col text-left">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#D4AF37]"></div>
            
            <h3 className="text-xl font-serif font-bold text-[#E5E1DA] mb-2 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-[#D4AF37]" />
              Configure Ordering Batch
            </h3>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-6">Group completed orders into a recorded batch</p>
            
            <div className="space-y-4">
              {/* Batch Mode Selector */}
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Fulfillment Scope / Completion Mode</label>
                <select
                  value={completionMode}
                  onChange={(e) => setCompletionMode(e.target.value as any)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl appearance-none cursor-pointer font-bold"
                >
                  <option value="selected">Only Selected Checkbox Needs ({Object.values(selectedItemIds).filter(Boolean).length})</option>
                  <option value="asap">All Active ASAP Urgency Needs ({orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === 'asap').length})</option>
                  <option value="1week">All Active 1-Week Cycle Needs ({orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === '1week').length})</option>
                  <option value="2weeks">All Active 2-Week Cycle Needs ({orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === '2weeks').length})</option>
                  <option value="all">All Active Store Needs ({activeNeedsCount})</option>
                </select>
              </div>

              {/* Session Name */}
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Session / Batch Title</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl font-medium"
                  placeholder="e.g. Weekly Restock June 11"
                  required
                />
              </div>

              {/* Vendor Name */}
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Distributor / Vendor Name</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl font-medium"
                  placeholder="e.g. Core-Mark, General Distributor"
                />
              </div>

              {/* Session Notes */}
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Batch Notes / Reminders</label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl resize-none font-medium"
                  placeholder="e.g. Supplier invoice reference or special instructions..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleProcessCompletion}
                className="flex-1 bg-emerald-500 hover:bg-emerald-450 text-black py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                Complete Batch
              </button>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 bg-zinc-800 text-gray-300 py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
