'use client';

import { useState, useEffect } from 'react';
import { db, useLiveQuery, OrderItem, Employee, OrderSession, PersonalNote } from '@/lib/db';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { OrderHistorySection } from '@/components/order-history-section';
import {
  BookOpen, Search, Trash2, Calendar, User, Key, Lock, Unlock,
  Plus, CheckCircle, Clock, ShoppingCart, UserCheck, ChevronDown, ChevronUp,
  Sparkles, Package, Flame, Eye, ShieldAlert, Edit2, Check, X,
  ClipboardCopy, ListPlus, CheckSquare, Filter, DollarSign, StickyNote
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

  // Reactive query of employees, orders, inventory items, database sessions, and personal notes
  const employees = useLiveQuery(() => db.employees.list(), []) || [];
  const orders = useLiveQuery(() => db.orders.toArray(), []) || [];
  const items = useLiveQuery(() => db.items.toArray(), []) || [];
  const orderSessions = useLiveQuery(() => db.orderSessions.list(), []) || [];
  const personalNotes = useLiveQuery(
    () => activeEmployee ? db.personalNotes.list(activeEmployee.id) : Promise.resolve([]),
    [activeEmployee]
  ) || [];

  const getEmployeeDisplayName = (name: string | null | undefined) => {
    if (!name) return '';
    if (name === 'System' || name.toLowerCase() === 'admin') return name;
    const found = employees.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (found && found.isDeleted) {
      return `${found.name} (Ex-employee)`;
    }
    return name;
  };

  // Selected Order Detail Modal State
  const [selectedOrderDetailId, setSelectedOrderDetailId] = useState<number | null>(null);

  // Modal Edit States
  const [modalEditing, setModalEditing] = useState(false);
  const [modalEditQty, setModalEditQty] = useState<number>(1);
  const [modalEditNotes, setModalEditNotes] = useState<string>('');
  const [modalEditUrgency, setModalEditUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [modalEditTimeframe, setModalEditTimeframe] = useState<'asap' | '1week' | '2weeks' | 'monthly'>('1week');

  // Modal Split States
  const [modalSplitActive, setModalSplitActive] = useState(false);
  const [modalSplitQty, setModalSplitQty] = useState<number>(1);

  const selectedOrderDetail = orders.find(o => o.id === selectedOrderDetailId) || null;

  const openOrderDetailModal = (order: OrderItem) => {
    setSelectedOrderDetailId(order.id!);
    setModalEditQty(order.quantity);
    setModalEditNotes(order.notes || '');
    setModalEditUrgency(order.urgency || 'medium');
    setModalEditTimeframe(order.timeframe || '1week');
    setModalSplitActive(false);
    setModalSplitQty(1);
    setModalEditing(false);
  };

  const handleSaveModalEdit = async (id: number) => {
    await db.orders.update(id, {
      quantity: modalEditQty,
      notes: modalEditNotes.trim(),
      urgency: modalEditUrgency,
      timeframe: modalEditTimeframe
    });
    toast.success('Request details updated successfully!');
    setModalEditing(false);
  };

  const handleModalPartialComplete = async (item: OrderItem, fillQty: number) => {
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
      setModalSplitActive(false);
      setSelectedOrderDetailId(null); // Close details modal since split finished
    } catch (err) {
      toast.error('Failed to complete partial split');
    }
  };

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
  const [newNotes, setNewNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filters
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending-approved');
  const [sortBy, setSortBy] = useState<string>('newest');

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
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'history' | 'notes'>('orders');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Active items selection for shopping completion
  const [selectedItemIds, setSelectedItemIds] = useState<Record<number, boolean>>({});





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
    const targetName = loginName.trim();
    if (!targetName) {
      toast.error('Please enter your employee name');
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
      estimatedPrice: 0.00,
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
      return `- ${item.brand.toUpperCase()}${item.flavor ? ` (${item.flavor})` : ''} x${item.quantity} - Cycle: ${item.timeframe || '1week'}, Urgency: ${(item.urgency || 'medium').toUpperCase()}${item.notes ? ` (Note: ${item.notes})` : ''}`;
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

  const overallCompletedCount = orders.filter(o => o.status === 'ordered' || o.status === 'received').length;
  const totalCount = orders.length;
  const fulfillmentRate = totalCount > 0 ? Math.round((overallCompletedCount / totalCount) * 100) : 100;
  const selectedCount = Object.values(selectedItemIds).filter(Boolean).length;

  // Get item count for the current completion modal mode
  const getCompletionModalItemCount = () => {
    if (completionMode === 'selected') {
      return selectedCount;
    }
    if (completionMode === 'asap') {
      return orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === 'asap').length;
    }
    if (completionMode === '1week') {
      return orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === '1week').length;
    }
    if (completionMode === '2weeks') {
      return orders.filter(o => (o.status === 'pending' || o.status === 'approved') && o.timeframe === '2weeks').length;
    }
    if (completionMode === 'all') {
      return activeNeedsCount;
    }
    return 0;
  };
  const modalTargetCount = getCompletionModalItemCount();

  // Suggested reorders from inventory (low stock)
  const lowStockSuggestions = items.filter(item => item.quantity <= item.reorderThreshold);



  const handleQuickOrder = (item: OrderItem) => {
    setNewBrand(item.brand);
    setNewFlavor(item.flavor || '');
    setNewCategory(item.category || '');
    setNewPackType(item.packType || (item.category === 'Drinks' ? 'Bottle/Can' : 'Item'));
    setNewQty(item.quantity.toString());
    setNewUrgency(item.urgency || 'medium');
    setNewTimeframe(item.timeframe || '1week');
    setNewNotes(item.notes || '');
    setShowAddItemModal(true);
  };

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
                <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Employee Name</label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Enter employee name..."
                  className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3.5 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl placeholder-gray-650"
                  required
                />
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
                className="w-full mt-4 bg-[#D4AF37] text-black py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#E5C25A] active:bg-[#B3932E] transition-all cursor-pointer"
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
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto text-left">

          {/* Tab Switcher */}
          <div className="flex border-b border-[#2A2A2A] pb-1 gap-6 mb-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-2.5 text-sm font-serif font-bold tracking-wide transition-all relative flex items-center gap-2 cursor-pointer ${activeTab === 'orders' ? 'text-[#D4AF37]' : 'text-gray-400 hover:text-white'
                }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Orders</span>
              {activeTab === 'orders' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37] rounded-full animate-in fade-in zoom-in duration-300" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 text-sm font-serif font-bold tracking-wide transition-all relative flex items-center gap-2 cursor-pointer ${activeTab === 'history' ? 'text-[#D4AF37]' : 'text-gray-400 hover:text-white'
                }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>History</span>
              {activeTab === 'history' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37] rounded-full animate-in fade-in zoom-in duration-300" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`pb-2.5 text-sm font-serif font-bold tracking-wide transition-all relative flex items-center gap-2 cursor-pointer ${activeTab === 'notes' ? 'text-[#D4AF37]' : 'text-gray-400 hover:text-white'
                }`}
            >
              <StickyNote className="w-4 h-4" />
              <span>Notes</span>
              {activeTab === 'notes' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#D4AF37] rounded-full animate-in fade-in zoom-in duration-300" />
              )}
            </button>
          </div>

          {/* ===== ADD ITEM BUTTON ===== */}
          {activeTab === 'orders' && (
            <div className="flex justify-center w-full">
              <button
                onClick={() => setShowAddItemModal(true)}
                className="add-item-btn-shimmer w-[80%] py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#E5C25A] to-[#D4AF37] text-black rounded-2xl font-bold uppercase tracking-[0.2em] text-sm shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
            </div>
          )}

          {/* Active Filters Calculations */}
          {activeTab !== 'notes' && (() => {
            const activeFiltersCount =
              (filterStatus !== 'pending-approved' ? 1 : 0) +
              (filterUrgency !== 'all' ? 1 : 0) +
              (filterTimeframe !== 'all' ? 1 : 0) +
              (sortBy !== 'newest' ? 1 : 0);

            return (
              <>
                {/* Unified Search & Filter Control Row */}
                <div className="flex gap-2.5 w-full">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search requests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0D0F13] border border-[#2A2A2A] rounded-xl text-sm py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-mono shadow-sm"
                    />
                  </div>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 bg-[#14161C] border rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-md cursor-pointer ${showFilters || activeFiltersCount > 0
                      ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
                      : 'border-[#2A2A2A] text-gray-300 hover:border-gray-500'
                      }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="bg-[#D4AF37] text-black text-[9px] font-extrabold w-4.5 h-4.5 flex items-center justify-center rounded-full ml-0.5 font-mono">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Collapsible Filters Panel */}
                {showFilters && (
                  <div className="bg-[#0D0F13] border border-[#2A2A2A] p-4 rounded-2xl shadow-sm flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">


                    {/* Dropdowns Grid: Urgency, Cycle, Sort */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Urgency</span>
                        <select
                          value={filterUrgency}
                          onChange={(e) => setFilterUrgency(e.target.value)}
                          className="w-full bg-[#14161C] border border-[#2A2A2A] text-gray-300 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                        >
                          <option value="all">All Urgencies</option>
                          <option value="high">High Urgency</option>
                          <option value="medium">Medium Urgency</option>
                          <option value="low">Low Urgency</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Fulfillment Cycle</span>
                        <select
                          value={filterTimeframe}
                          onChange={(e) => setFilterTimeframe(e.target.value)}
                          className="w-full bg-[#14161C] border border-[#2A2A2A] text-gray-300 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                        >
                          <option value="all">All Cycles</option>
                          <option value="asap">ASAP</option>
                          <option value="1week">1 Week Cycle</option>
                          <option value="2weeks">2 Week Cycle</option>
                          <option value="monthly">Monthly Cycle</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Sort By</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="urgency">Urgency Level</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {activeTab === 'orders' ? (
            <>
              {/* Needs List */}
              <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl shadow-md overflow-hidden flex flex-col">

                {/* Batch Action / Info Toolbar (Approach A) */}
                {selectedCount > 0 ? (
                  <div className="p-3 bg-[#D4AF37]/5 border-b border-[#2A2A2A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#D4AF37] font-mono flex items-center gap-1.5 bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg border border-[#D4AF37]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                        {selectedCount} Selected
                      </span>
                      <button
                        onClick={() => setSelectedItemIds({})}
                        className="text-gray-400 hover:text-white font-semibold uppercase tracking-wider text-[10px] cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      {/* Copy Selected */}
                      <button
                        onClick={handleCopySelectedList}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-[#14161C] hover:bg-[#1C1F27] border border-[#2A2A2A] text-gray-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <ClipboardCopy className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Copy List</span>
                      </button>

                      {/* Complete Batch / Complete */}
                      <button
                        onClick={openCompleteModal}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>{selectedCount === 1 ? 'Complete' : 'Complete Batch'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#14161C]/60 border-b border-[#2A2A2A] flex justify-between items-center gap-4">
                    {/* Left Side: Inline status info */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                      <span className="text-white font-mono bg-[#2A2A2A] px-2 py-0.5 rounded-md">{activeNeedsCount}</span> Requests
                      <span className="text-[#888]">•</span>
                      {highPriorityCount > 0 ? (
                        <span className="flex items-center gap-1.5 text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          {highPriorityCount} Critical
                        </span>
                      ) : (
                        <span className="text-gray-500">0 Critical</span>
                      )}
                    </div>

                    {/* Right Side: Select All Checkbox */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={displayNeeds.length > 0 && displayNeeds.every(item => selectedItemIds[item.id!])}
                        onChange={() => handleSelectAll(displayNeeds)}
                        disabled={displayNeeds.length === 0}
                        className="w-4.5 h-4.5 text-[#D4AF37] accent-[#D4AF37] rounded border-gray-300 focus:ring-[#D4AF37] cursor-pointer"
                      />
                      <span className="text-[10px] sm:text-xs text-gray-300 font-bold uppercase tracking-wider">Select All ({displayNeeds.length})</span>
                    </div>
                  </div>
                )}

                {displayNeeds.length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center justify-center space-y-4">
                    <ShoppingCart className="w-12 h-12 text-[#2A2A2A]" />
                    <p className="text-[10px] uppercase tracking-widest text-[#888]">No matching store requests logged.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 p-3.5 sm:p-5 max-w-3xl mx-auto w-full">
                    {displayNeeds.map(order => {
                      const isHigh = order.urgency === 'high';
                      const urgencyStyles = isHigh
                        ? 'border-l-4 border-l-red-500 bg-red-500/[0.02]'
                        : order.urgency === 'medium'
                          ? 'border-l-4 border-l-orange-500 bg-orange-500/[0.01]'
                          : 'border-l-4 border-l-blue-500';

                      return (
                        <div
                          key={order.id}
                          className={`p-3.5 sm:p-4 bg-[#14161C]/50 hover:bg-[#1A1D24]/50 border border-[#2A2A2A] rounded-2xl flex items-center justify-between gap-4 transition-all ${urgencyStyles} ${selectedItemIds[order.id!] ? 'border-[#D4AF37]/70 bg-[#D4AF37]/5' : 'hover:border-[#D4AF37]/35'}`}
                        >
                          {/* Left Part: Selection & Item Info */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={!!selectedItemIds[order.id!]}
                              onChange={() => toggleItemSelection(order.id!)}
                              className="w-5 h-5 text-[#D4AF37] accent-[#D4AF37] rounded border-gray-300 focus:ring-[#D4AF37] shrink-0 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1 flex flex-col gap-0.5 text-left">
                              <h4 className="text-sm sm:text-base font-serif text-[#E5E1DA] font-bold uppercase tracking-wide flex items-center gap-2 flex-wrap">
                                <span>{order.brand}</span>
                                {order.flavor && <span className="text-[#888] font-sans text-xs lowercase normal-case italic font-normal">({order.flavor})</span>}
                              </h4>

                              {/* Muted Subtitle with Urgency */}
                              <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-gray-500 font-bold flex-wrap">
                                <span className={order.urgency === 'high' ? 'text-red-400' : order.urgency === 'medium' ? 'text-orange-400' : 'text-blue-400'}>
                                  {order.urgency || 'medium'}
                                </span>
                                {order.timeframe === 'asap' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-red-400 animate-pulse">ASAP</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Part: Qty pill & Details button */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="bg-[#0D0F13] border border-[#2A2A2A] px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono text-xs font-bold text-[#E5E1DA]">
                              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-sans font-bold">Qty:</span>
                              <span>{order.quantity}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => openOrderDetailModal(order)}
                              className="w-8 h-8 rounded-full bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 text-gray-400 hover:text-[#D4AF37] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md shrink-0"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ===== INTELLIGENT SUGGESTED ORDERS ===== */}
              {(() => {
                // ──────────────────────────────────────────────────
                // LAYER 1: Dice Coefficient Fuzzy String Similarity
                // ──────────────────────────────────────────────────
                const bigrams = (str: string): Set<string> => {
                  const s = str.toLowerCase().trim();
                  const set = new Set<string>();
                  for (let i = 0; i < s.length - 1; i++) {
                    set.add(s.substring(i, i + 2));
                  }
                  return set;
                };

                const diceCoefficient = (a: string, b: string): number => {
                  if (a === b) return 1;
                  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
                  const bigramsA = bigrams(a);
                  const bigramsB = bigrams(b);
                  let intersection = 0;
                  bigramsA.forEach(bg => { if (bigramsB.has(bg)) intersection++; });
                  return (2 * intersection) / (bigramsA.size + bigramsB.size);
                };

                const normalize = (s: string) => s.toLowerCase().trim()
                  .replace(/[''`]/g, '')
                  .replace(/\s+/g, ' ')
                  .replace(/s$/, ''); // strip trailing plural 's'

                // ──────────────────────────────────────────────────
                // LAYER 2: Cluster orders by fuzzy brand+flavor match
                // ──────────────────────────────────────────────────
                const SIMILARITY_THRESHOLD = 0.82;
                const now = Date.now();
                const DAY_MS = 86400000;

                interface SuggestionCluster {
                  canonicalBrand: string;
                  canonicalFlavor: string;
                  category: string;
                  packType: string;
                  totalQty: number;
                  orderCount: number;
                  recentOrderCount: number;   // orders in last 7 days
                  weeklyOrderCount: number;   // orders in last 14 days
                  sessionIds: Set<string>;    // unique fulfillment sessions
                  oldestOrder: number;
                  newestOrder: number;
                  recencyScore: number;       // sum of recency weights
                  inventoryStock: number | null;
                  inventoryThreshold: number | null;
                  isLowStock: boolean;
                  isPending: boolean;         // already has pending/approved order
                }

                const clusters: SuggestionCluster[] = [];

                // Find or create cluster for an order
                const findCluster = (brand: string, flavor: string): SuggestionCluster | null => {
                  const normBrand = normalize(brand);
                  const normFlavor = normalize(flavor || '');
                  const combined = normFlavor ? `${normBrand} ${normFlavor}` : normBrand;

                  for (const cluster of clusters) {
                    const clusterNormBrand = normalize(cluster.canonicalBrand);
                    const clusterNormFlavor = normalize(cluster.canonicalFlavor || '');
                    const clusterCombined = clusterNormFlavor ? `${clusterNormBrand} ${clusterNormFlavor}` : clusterNormBrand;

                    // Exact normalized match
                    if (combined === clusterCombined) return cluster;

                    // Fuzzy match on brand (flavor must be close too)
                    const brandSim = diceCoefficient(normBrand, clusterNormBrand);
                    if (brandSim >= SIMILARITY_THRESHOLD) {
                      if (!normFlavor && !clusterNormFlavor) return cluster;
                      if (normFlavor && clusterNormFlavor) {
                        const flavorSim = diceCoefficient(normFlavor, clusterNormFlavor);
                        if (flavorSim >= SIMILARITY_THRESHOLD) return cluster;
                      }
                      // One has flavor, other doesn't — still consider it a match if brand is very similar
                      if (brandSim >= 0.92) return cluster;
                    }
                  }
                  return null;
                };

                // Process all orders into clusters
                orders.forEach(o => {
                  const daysAgo = (now - o.createdAt) / DAY_MS;
                  const recencyWeight = Math.exp(-daysAgo / 30); // 30-day half-life decay

                  let cluster = findCluster(o.brand, o.flavor);
                  if (!cluster) {
                    cluster = {
                      canonicalBrand: o.brand,
                      canonicalFlavor: o.flavor || '',
                      category: o.category || 'Store Supplies',
                      packType: o.packType || 'Item',
                      totalQty: 0,
                      orderCount: 0,
                      recentOrderCount: 0,
                      weeklyOrderCount: 0,
                      sessionIds: new Set(),
                      oldestOrder: o.createdAt,
                      newestOrder: o.createdAt,
                      recencyScore: 0,
                      inventoryStock: null,
                      inventoryThreshold: null,
                      isLowStock: false,
                      isPending: false
                    };
                    clusters.push(cluster);
                  }

                  cluster.totalQty += o.quantity;
                  cluster.orderCount += 1;
                  cluster.recencyScore += o.quantity * recencyWeight;

                  if (daysAgo <= 7) cluster.recentOrderCount += 1;
                  if (daysAgo <= 14) cluster.weeklyOrderCount += 1;

                  if (o.createdAt < cluster.oldestOrder) cluster.oldestOrder = o.createdAt;
                  if (o.createdAt > cluster.newestOrder) cluster.newestOrder = o.createdAt;

                  // Track fulfillment sessions (order history awareness)
                  if (o.listId) cluster.sessionIds.add(o.listId);

                  // Track if already pending
                  if (o.status === 'pending' || o.status === 'approved') {
                    cluster.isPending = true;
                  }

                  // Use most common brand casing (the one with more orders keeps canonical name)
                  // Keep category/packType from most recent order
                  if (o.createdAt >= cluster.newestOrder) {
                    if (o.category) cluster.category = o.category;
                    if (o.packType) cluster.packType = o.packType;
                  }
                });

                // ──────────────────────────────────────────────────
                // LAYER 3: Inventory stock cross-reference
                // ──────────────────────────────────────────────────
                clusters.forEach(cluster => {
                  const normBrand = normalize(cluster.canonicalBrand);
                  const normFlavor = normalize(cluster.canonicalFlavor);

                  // Fuzzy match against inventory items
                  const matchedItem = items.find(inv => {
                    const invBrand = normalize(inv.brand);
                    const invFlavor = normalize(inv.flavor || '');
                    const brandSim = diceCoefficient(normBrand, invBrand);
                    if (brandSim < SIMILARITY_THRESHOLD) return false;
                    if (!normFlavor && !invFlavor) return true;
                    if (normFlavor && invFlavor) {
                      return diceCoefficient(normFlavor, invFlavor) >= SIMILARITY_THRESHOLD;
                    }
                    return brandSim >= 0.92;
                  });

                  if (matchedItem) {
                    cluster.inventoryStock = matchedItem.quantity;
                    cluster.inventoryThreshold = matchedItem.reorderThreshold;
                    cluster.isLowStock = matchedItem.quantity <= matchedItem.reorderThreshold;
                  }
                });

                // ──────────────────────────────────────────────────
                // LAYER 4: Weighted Composite Score
                // ──────────────────────────────────────────────────
                // Weights: frequency=2, volume=0.3, recency=3, lowStock=5, sessions=1.5
                const scoredItems = clusters
                  .filter(c => !c.isPending) // Exclude already-pending items
                  .map(c => {
                    const frequencyScore = c.orderCount * 2;
                    const volumeScore = Math.min(c.totalQty * 0.3, 15); // cap volume contribution
                    const recencyScore = c.recencyScore * 3;
                    const lowStockBoost = c.isLowStock ? 5 + (c.inventoryThreshold! - c.inventoryStock!) * 0.5 : 0;
                    const sessionCoverage = c.sessionIds.size * 1.5; // items across many sessions = staple goods
                    const trendingBoost = c.recentOrderCount >= 2 ? 3 : 0; // ordered 2+ times in last 7 days

                    const totalScore = frequencyScore + volumeScore + recencyScore + lowStockBoost + sessionCoverage + trendingBoost;

                    // Determine signal tags for UI
                    const signals: { label: string; color: string }[] = [];
                    if (c.recentOrderCount >= 2) signals.push({ label: 'Trending', color: '#F97316' });
                    if (c.isLowStock) signals.push({ label: 'Low Stock', color: '#EF4444' });
                    if (c.sessionIds.size >= 3) signals.push({ label: 'Staple', color: '#8B5CF6' });
                    if (c.orderCount >= 5) signals.push({ label: 'Frequent', color: '#D4AF37' });
                    if (signals.length === 0 && c.orderCount >= 2) signals.push({ label: 'Reorder', color: '#6B7280' });

                    return { ...c, totalScore, signals };
                  })
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .slice(0, 12);

                if (scoredItems.length === 0) return null;

                const rankColors = ['#D4AF37', '#C0C0C0', '#CD7F32'];

                return (
                  <div className="mt-6">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/25 flex items-center justify-center">
                          <Flame className="w-4 h-4 text-[#D4AF37]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-serif text-[#E5E1DA] font-bold tracking-wide">Suggested Orders</h3>
                          <p className="text-[8px] uppercase tracking-[0.2em] text-gray-500 font-bold">AI-ranked by frequency, recency & stock</p>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono bg-[#14161C] border border-[#2A2A2A] px-2 py-0.5 rounded-md">
                        Top {scoredItems.length}
                      </span>
                    </div>

                    {/* Horizontal scroll on mobile, wrapping grid on desktop */}
                    <div className="flex gap-3 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-x-visible scrollbar-none snap-x snap-mandatory">
                      {scoredItems.map((item, idx) => {
                        const isTop3 = idx < 3;
                        const rankColor = rankColors[idx] || '#555';

                        return (
                          <div
                            key={`${item.canonicalBrand}-${item.canonicalFlavor}-${idx}`}
                            className={`snap-start shrink-0 w-[72%] sm:w-auto bg-[#0D0F13] border rounded-2xl p-3.5 sm:p-4 relative overflow-hidden group transition-all duration-300 hover:border-[#D4AF37]/40 ${isTop3 ? 'border-[#D4AF37]/20' : 'border-[#2A2A2A]'}`}
                          >
                            {/* Rank badge */}
                            <div
                              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-extrabold border"
                              style={{
                                backgroundColor: `${rankColor}15`,
                                borderColor: `${rankColor}40`,
                                color: rankColor
                              }}
                            >
                              {idx + 1}
                            </div>

                            {/* Top glow for top 3 */}
                            {isTop3 && (
                              <div
                                className="absolute top-0 left-0 w-full h-[2px]"
                                style={{ background: `linear-gradient(90deg, transparent, ${rankColor}60, transparent)` }}
                              />
                            )}

                            {/* Signal tags */}
                            {item.signals.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {item.signals.map(sig => (
                                  <span
                                    key={sig.label}
                                    className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                                    style={{
                                      backgroundColor: `${sig.color}12`,
                                      borderColor: `${sig.color}30`,
                                      color: sig.color
                                    }}
                                  >
                                    {sig.label}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Category icon + badge */}
                            <div className="flex items-center gap-1.5 mb-2">
                              {getCategoryIcon(item.category)}
                              <span className={`text-[8px] border px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${getCategoryBadgeStyles(item.category)}`}>
                                {item.category}
                              </span>
                            </div>

                            {/* Item name */}
                            <h4 className="text-sm font-serif text-[#E5E1DA] font-bold uppercase tracking-wide leading-tight mb-0.5 pr-8">
                              {item.canonicalBrand}
                            </h4>
                            {item.canonicalFlavor && (
                              <p className="text-[11px] text-gray-400 italic mb-2">({item.canonicalFlavor})</p>
                            )}
                            {!item.canonicalFlavor && <div className="mb-2" />}

                            {/* Stats row */}
                            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                              <div className="flex items-center gap-1 bg-[#14161C] border border-[#2A2A2A]/60 px-1.5 py-0.5 rounded-md">
                                <ShoppingCart className="w-2.5 h-2.5 text-[#D4AF37]" />
                                <span className="text-[9px] font-mono font-bold text-[#E5E1DA]">{item.orderCount}</span>
                                <span className="text-[7px] text-gray-500 uppercase">ord</span>
                              </div>
                              <div className="flex items-center gap-1 bg-[#14161C] border border-[#2A2A2A]/60 px-1.5 py-0.5 rounded-md">
                                <Package className="w-2.5 h-2.5 text-blue-400" />
                                <span className="text-[9px] font-mono font-bold text-[#E5E1DA]">{item.totalQty}</span>
                                <span className="text-[7px] text-gray-500 uppercase">qty</span>
                              </div>
                              {item.sessionIds.size > 0 && (
                                <div className="flex items-center gap-1 bg-[#14161C] border border-[#2A2A2A]/60 px-1.5 py-0.5 rounded-md">
                                  <BookOpen className="w-2.5 h-2.5 text-purple-400" />
                                  <span className="text-[9px] font-mono font-bold text-[#E5E1DA]">{item.sessionIds.size}</span>
                                  <span className="text-[7px] text-gray-500 uppercase">runs</span>
                                </div>
                              )}
                              {item.isLowStock && (
                                <div className="flex items-center gap-1 bg-red-500/8 border border-red-500/20 px-1.5 py-0.5 rounded-md">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                  <span className="text-[9px] font-mono font-bold text-red-400">{item.inventoryStock}/{item.inventoryThreshold}</span>
                                </div>
                              )}
                            </div>

                            {/* Quick reorder button */}
                            <button
                              onClick={() => {
                                setNewBrand(item.canonicalBrand);
                                setNewFlavor(item.canonicalFlavor);
                                setNewCategory(item.category);
                                setNewPackType(item.packType);
                                setShowAddItemModal(true);
                                toast.info(`Prefilled with ${item.canonicalBrand}`);
                              }}
                              className="w-full py-2 bg-[#14161C] hover:bg-[#D4AF37]/10 border border-[#2A2A2A] hover:border-[#D4AF37]/40 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#D4AF37] transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Quick Reorder
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          ) : activeTab === 'history' ? (
            <OrderHistorySection 
              searchQuery={searchQuery} 
              onViewDetails={openOrderDetailModal} 
              onQuickOrder={handleQuickOrder} 
            />
          ) : (
            <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
              {/* Privacy Warning Banner - Ultra compact */}
              <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/15 rounded-xl px-3 py-2 flex items-center gap-2.5 backdrop-blur-sm">
                <Lock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="text-[10px] text-gray-400 leading-normal">
                  Only you (logged in as <strong className="text-white font-semibold">{activeEmployee?.name}</strong>) can see your personal notes.
                </span>
              </div>

              {/* Notes Container */}
              <div className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-4 shadow-lg flex flex-col gap-4">
                {/* Header Row */}
                <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-2">
                  <h3 className="font-serif text-sm font-bold text-[#E5E1DA] flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-[#D4AF37]" />
                    <span>My Notes ({personalNotes.length})</span>
                  </h3>
                </div>

                {/* Inline Quick Add Note Input - Mobile First & Space Saving */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newNoteContent.trim()) {
                      toast.error('Note content cannot be empty');
                      return;
                    }
                    if (!activeEmployee) return;
                    try {
                      await db.personalNotes.add(activeEmployee.id, newNoteContent.trim());
                      toast.success('Note saved');
                      setNewNoteContent('');
                    } catch (err) {
                      toast.error('Failed to save note');
                    }
                  }}
                  className="flex gap-2 w-full bg-[#14161C]/30 p-1.5 border border-[#2A2A2A] rounded-xl focus-within:border-[#D4AF37] transition-all"
                >
                  <input
                    type="text"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Add a private note..."
                    className="flex-1 bg-transparent text-[#E5E1DA] px-2.5 py-1.5 text-xs focus:outline-none placeholder-gray-650 font-sans"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-[#D4AF37] hover:bg-[#E5C25A] text-black rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                    title="Save note"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                {/* Notes List */}
                {personalNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-[#2A2A2A] rounded-xl bg-[#14161C]/10 text-center">
                    <StickyNote className="w-6 h-6 text-gray-600 mb-2" />
                    <p className="text-[11px] font-bold text-gray-400">No notes found</p>
                    <p className="text-[9px] text-gray-500 mt-0.5 max-w-[180px]">
                      Add quick reminders, lists, or private thoughts above.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {personalNotes.map((note) => (
                      <div
                        key={note.id}
                        className="group flex justify-between items-center gap-3 p-3 bg-[#14161C] hover:bg-[#1A1C23] border border-[#2A2A2A] hover:border-[#2f323a] rounded-xl transition-all duration-200"
                      >
                        {editingNoteId === note.id ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!editingNoteContent.trim()) {
                                toast.error('Note content cannot be empty');
                                return;
                              }
                              if (!activeEmployee) return;
                              try {
                                await db.personalNotes.update(note.id, activeEmployee.id, editingNoteContent.trim());
                                toast.success('Note updated');
                                setEditingNoteId(null);
                                setEditingNoteContent('');
                              } catch (err) {
                                toast.error('Failed to update note');
                              }
                            }}
                            className="flex-1 flex gap-2 animate-in fade-in duration-200"
                          >
                            <input
                              type="text"
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              className="flex-1 bg-[#0D0F13] border border-[#D4AF37]/50 text-[#E5E1DA] px-2.5 py-1 text-xs focus:outline-none rounded-lg font-sans"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="p-1 bg-[#D4AF37] hover:bg-[#E5C25A] text-black rounded-lg cursor-pointer flex items-center justify-center shrink-0"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingNoteContent('');
                              }}
                              className="p-1 bg-zinc-800 text-gray-400 hover:text-white rounded-lg cursor-pointer flex items-center justify-center shrink-0"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <p className="text-xs text-gray-300 whitespace-pre-wrap break-words leading-relaxed font-serif">
                                {note.content}
                              </p>
                              <span className="text-[8px] font-semibold text-gray-500 font-mono tracking-wider uppercase">
                                {new Date(note.createdAt).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteContent(note.content);
                                }}
                                className="p-1 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-all cursor-pointer"
                                title="Edit note"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!activeEmployee) return;
                                  try {
                                    await db.personalNotes.delete(note.id, activeEmployee.id);
                                    toast.info('Note deleted');
                                  } catch (err) {
                                    toast.error('Failed to delete note');
                                  }
                                }}
                                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                title="Delete note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

      {/* ============== FUTURISTIC ADD ITEM MODAL ============== */}
      {showAddItemModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md add-item-modal-backdrop"
          onClick={() => setShowAddItemModal(false)}
        >
          <div
            className="add-item-modal add-item-modal-glow bg-[#0A0C10]/95 border border-[#D4AF37]/30 rounded-t-[2rem] sm:rounded-3xl w-full sm:w-[95%] sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated top accent border */}
            <div className="gradient-border-scan h-[2px] w-full rounded-t-[2rem] sm:rounded-t-3xl" />

            {/* Close button */}
            <button
              onClick={() => setShowAddItemModal(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#14161C]/80 border border-[#2A2A2A] hover:border-[#D4AF37]/50 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer hover:rotate-90 duration-300"
              aria-label="Close add item modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="px-5 sm:px-7 pt-6 pb-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-[#E5E1DA] font-bold tracking-wide">Add New Item</h3>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-gray-500 font-bold">Store Request</p>
                </div>
              </div>

              {/* Decorative line */}
              <div className="mt-4 mb-5 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

              <form onSubmit={(e) => { handleCreateNeed(e); setShowAddItemModal(false); }} className="space-y-4">
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
                    className="w-full bg-[#14161C] border border-[#2A2A2A] focus:border-[#D4AF37] text-[#E5E1DA] p-3.5 text-sm rounded-xl placeholder:text-gray-600 font-medium shadow-inner transition-all focus:outline-none focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)]"
                    placeholder="e.g. 10 Bags of Ice, Swisher Sweets..."
                    autoComplete="off"
                    autoFocus
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

                {/* 2. Variant / Flavor / Size */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Variant / Flavor / Size</label>
                  <input
                    type="text"
                    value={newFlavor}
                    onChange={(e) => setNewFlavor(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] focus:border-[#D4AF37] text-[#E5E1DA] p-3.5 text-sm rounded-xl placeholder:text-gray-600 font-medium shadow-inner transition-all focus:outline-none focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)]"
                    placeholder="e.g. 7 lb bag, Grape, 10-pack..."
                  />
                </div>

                {/* 3. Category */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] focus:border-[#D4AF37] text-[#E5E1DA] p-3.5 text-sm rounded-xl placeholder:text-gray-600 font-medium shadow-inner transition-all focus:outline-none focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)]"
                    placeholder="e.g. Supplies, Cigarillos, Snacks..."
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['Supplies', 'Cigarillos', 'Drinks', 'Snacks'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold uppercase tracking-wider transition-all cursor-pointer ${newCategory === cat ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]' : 'bg-[#1C1E24] border-[#2A2A2A]/60 text-gray-400 hover:text-white hover:bg-[#2A2D35]'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Packaging */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Format / Packaging</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Single', 'Box', 'Carton', 'Case', 'Roll', 'Item'].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setNewPackType(f)}
                        className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all cursor-pointer ${newPackType === f ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]' : 'bg-[#1C1E24] border-[#2A2A2A]/60 text-gray-400 hover:text-white hover:bg-[#2A2D35]'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urgency + Quantity row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Urgency</label>
                    <div className="flex gap-1.5">
                      {(['low', 'medium', 'high'] as const).map(u => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setNewUrgency(u)}
                          className={`flex-1 py-2 text-[10px] rounded-xl font-bold uppercase border transition-all cursor-pointer ${newUrgency === u
                            ? u === 'high'
                              ? 'bg-red-500/15 border-red-500/50 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                              : u === 'medium'
                                ? 'bg-orange-500/15 border-orange-500/50 text-orange-400'
                                : 'bg-blue-500/15 border-blue-500/50 text-blue-400'
                            : 'bg-[#14161C] border-[#2A2A2A] text-gray-500 hover:text-white'
                            }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] focus:border-[#D4AF37] text-[#E5E1DA] p-2.5 text-sm rounded-xl text-center font-mono font-bold shadow-inner transition-all focus:outline-none focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)]"
                    />
                  </div>
                </div>

                {/* Timeframe */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Fulfillment Cycle</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([['asap', 'ASAP'], ['1week', '1 Wk'], ['2weeks', '2 Wk'], ['monthly', 'Mth']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNewTimeframe(val as any)}
                        className={`py-2 text-[10px] rounded-xl font-bold uppercase border transition-all cursor-pointer ${newTimeframe === val
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]'
                          : 'bg-[#14161C] border-[#2A2A2A] text-gray-500 hover:text-white'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Notes</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-[#14161C] border border-[#2A2A2A] focus:border-[#D4AF37] text-[#E5E1DA] p-3.5 text-sm rounded-xl placeholder:text-gray-600 resize-none transition-all focus:outline-none focus:shadow-[0_0_0_3px_rgba(212,175,55,0.1)]"
                    placeholder="Alternate brands, special requests..."
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="add-item-btn-shimmer w-full mt-2 py-4 bg-gradient-to-r from-[#D4AF37] via-[#E5C25A] to-[#D4AF37] text-black rounded-2xl font-bold uppercase tracking-[0.2em] text-sm shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Add Store Request
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Complete Session Dialog Modal */}
      {showCompleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setShowCompleteModal(false)}
        >
          <div
            className="bg-[#0D0F13] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col text-left"
            onClick={(e) => e.stopPropagation()}
          >
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
                {modalTargetCount === 1 ? 'Complete' : 'Complete Batch'}
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

      {/* Needs Item Details Popover Modal (Scenario 3) */}
      {selectedOrderDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
          onClick={() => {
            setSelectedOrderDetailId(null);
            setModalEditing(false);
            setModalSplitActive(false);
          }}
        >
          <div
            className="bg-[#0D0F13] border border-[#2A2A2A] rounded-3xl p-5 sm:p-7 w-full max-w-lg shadow-2xl relative flex flex-col text-left animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Priority Color Bar */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${selectedOrderDetail.urgency === 'high' ? 'bg-red-500' :
              selectedOrderDetail.urgency === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
              }`} />

            {/* Modal Close Icon */}
            <button
              onClick={() => {
                setSelectedOrderDetailId(null);
                setModalEditing(false);
                setModalSplitActive(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white hover:bg-[#2A2A2A] p-2 rounded-xl transition-all cursor-pointer z-10"
              aria-label="Close detail modal"
            >
              <X className="w-5 h-5" />
            </button>

            {modalEditing ? (
              /* ================== EDIT MODE ================== */
              <div className="space-y-4 mt-2 overflow-y-auto pr-1">
                <div className="border-b border-[#2A2A2A] pb-3 mb-2">
                  <h3 className="text-lg font-serif font-bold text-[#E5E1DA]">Edit Request Details</h3>
                  <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">{selectedOrderDetail.brand.toUpperCase()}</p>
                </div>

                <div className="space-y-3">
                  {/* Qty Input */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Quantity Required</label>
                    <input
                      type="number"
                      min="1"
                      value={modalEditQty}
                      onChange={(e) => setModalEditQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl font-mono font-bold"
                    />
                  </div>

                  {/* Urgency Selector */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Urgency Level</label>
                    <select
                      value={modalEditUrgency}
                      onChange={(e) => setModalEditUrgency(e.target.value as any)}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl appearance-none cursor-pointer font-bold"
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                    </select>
                  </div>

                  {/* Fulfillment Cycle Selector */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Fulfillment Cycle</label>
                    <select
                      value={modalEditTimeframe}
                      onChange={(e) => setModalEditTimeframe(e.target.value as any)}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl appearance-none cursor-pointer font-bold"
                    >
                      <option value="asap">ASAP</option>
                      <option value="1week">1 Week Cycle</option>
                      <option value="2weeks">2 Week Cycle</option>
                      <option value="monthly">Monthly Cycle</option>
                    </select>
                  </div>

                  {/* Notes Input */}
                  <div className="space-y-1">
                    <label className="block text-xs uppercase tracking-[0.2em] text-[#888] font-bold">Special Notes / Instructions</label>
                    <textarea
                      value={modalEditNotes}
                      onChange={(e) => setModalEditNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-3 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-[#2A2A2A]/40">
                  <button
                    onClick={() => handleSaveModalEdit(selectedOrderDetail.id!)}
                    className="flex-1 py-3 bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-450 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => setModalEditing(false)}
                    className="flex-1 py-3 bg-zinc-800 text-gray-300 text-xs font-bold uppercase tracking-wider rounded-xl hover:text-white active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ================== DETAIL VIEW MODE ================== */
              <div className="space-y-4.5 mt-2 flex-1 overflow-y-auto pr-1">
                <div className="space-y-3">
                  {/* Brand & Flavor */}
                  <div>
                    <h3 className="text-2xl font-serif text-[#E5E1DA] font-bold uppercase tracking-wide italic leading-tight flex items-center gap-2 flex-wrap text-left">
                      {getCategoryIcon(selectedOrderDetail.category)}
                      <span>{selectedOrderDetail.brand}</span>
                      {selectedOrderDetail.flavor && (
                        <span className="text-gray-400 font-sans text-sm normal-case italic font-normal">({selectedOrderDetail.flavor})</span>
                      )}
                    </h3>

                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {selectedOrderDetail.category && (
                        <span className={`text-[8px] sm:text-[9px] border px-2 py-0.5 rounded uppercase tracking-wider font-bold ${getCategoryBadgeStyles(selectedOrderDetail.category)}`}>
                          {selectedOrderDetail.category}
                        </span>
                      )}
                      {selectedOrderDetail.packType && (
                        <span className="text-[9px] sm:text-[10px] bg-[#14161C] border border-[#2A2A2A]/60 px-2 py-0.5 rounded text-[#888] uppercase tracking-wider font-semibold">
                          {selectedOrderDetail.packType}
                        </span>
                      )}
                      <span className={`text-[8px] sm:text-[9px] border px-2 py-0.5 rounded uppercase tracking-wider font-bold ${selectedOrderDetail.urgency === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        selectedOrderDetail.urgency === 'medium' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                          'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                        {selectedOrderDetail.urgency || 'medium'}
                      </span>
                      <span className="text-[8px] sm:text-[9px] bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded uppercase tracking-wider font-bold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-[#D4AF37]" />
                        Cycle: {selectedOrderDetail.timeframe === 'asap' ? 'ASAP' : selectedOrderDetail.timeframe === '1week' ? '1 Wk' : selectedOrderDetail.timeframe === '2weeks' ? '2 Wk' : 'Mth'}
                      </span>

                    </div>
                  </div>

                  {/* Quantity Card */}
                  <div className="bg-[#14161C] border border-[#2A2A2A] rounded-2xl p-4 shadow-inner">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Qty Required</span>
                      <span className="text-3xl font-mono text-[#E5E1DA] font-bold mt-1">{selectedOrderDetail.quantity}</span>
                    </div>
                  </div>

                  {/* Notes box */}
                  {selectedOrderDetail.notes ? (
                    <div className="p-3.5 bg-[#14161C]/50 border border-amber-500/20 rounded-2xl block text-left">
                      <span className="text-[9px] uppercase tracking-wider text-[#D4AF37] font-bold block mb-1">Instructions / Notes:</span>
                      <p className="text-xs text-gray-300 italic leading-relaxed">{selectedOrderDetail.notes}</p>
                    </div>
                  ) : null}

                  {/* Logs Section */}
                  <div className="space-y-1.5 border-t border-[#2A2A2A]/40 pt-3 text-[10px] text-gray-500 font-semibold space-y-2 text-left">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Logged by: <strong className="text-gray-400">{getEmployeeDisplayName(selectedOrderDetail.addedBy) || 'System'}</strong></span>
                      <span className="opacity-55">•</span>
                      <span className="font-mono">{formatDateTime(selectedOrderDetail.createdAt)}</span>
                    </div>

                    {selectedOrderDetail.approvedBy && (
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                        <span>Approved by: <strong className="text-amber-400">{getEmployeeDisplayName(selectedOrderDetail.approvedBy)}</strong></span>
                        <span className="opacity-55">•</span>
                        <span className="font-mono">{formatDateTime(selectedOrderDetail.approvedAt || 0)}</span>
                      </div>
                    )}

                    {selectedOrderDetail.completedBy && (
                      <div className="flex items-center gap-1.5 text-purple-400">
                        <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />
                        <span>Completed by: <strong className="text-purple-400">{getEmployeeDisplayName(selectedOrderDetail.completedBy)}</strong></span>
                        <span className="opacity-55">•</span>
                        <span className="font-mono">{formatDateTime(selectedOrderDetail.completedAt || 0)}</span>
                      </div>
                    )}

                    {selectedOrderDetail.receivedBy && (
                      <div className="flex items-center gap-1.5 text-blue-400">
                        <Package className="w-3.5 h-3.5 text-blue-400" />
                        <span>Received by: <strong className="text-blue-400">{getEmployeeDisplayName(selectedOrderDetail.receivedBy)}</strong></span>
                        <span className="opacity-55">•</span>
                        <span className="font-mono">{formatDateTime(selectedOrderDetail.receivedAt || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline partial completion split wrapper inside modal */}
                {modalSplitActive ? (
                  <div className="bg-[#14161C] border border-[#2A2A2A] p-3.5 rounded-2xl space-y-3 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Split & Fill Quantity</span>
                      <span className="text-[9px] text-gray-500 font-mono">Max split: {selectedOrderDetail.quantity - 1}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={selectedOrderDetail.quantity - 1}
                        value={modalSplitQty}
                        onChange={(e) => setModalSplitQty(Math.min(selectedOrderDetail.quantity - 1, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="flex-1 bg-[#0D0F13] border border-[#2A2A2A] text-white p-2.5 rounded-xl text-center font-mono font-bold"
                      />
                      <button
                        onClick={() => handleModalPartialComplete(selectedOrderDetail, modalSplitQty)}
                        className="px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                      >
                        Confirm Fill
                      </button>
                      <button
                        onClick={() => setModalSplitActive(false)}
                        className="px-4 bg-zinc-800 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Workflow Actions */}
                {!modalSplitActive && (
                  <div className="space-y-2.5 pt-3 border-t border-[#2A2A2A]/40">
                    {/* Primary Actions Row */}
                    <div className="flex flex-wrap gap-2 justify-end">
                      {/* Complete Request Button */}
                      {(selectedOrderDetail.status === 'pending' || selectedOrderDetail.status === 'approved') && (
                        <button
                          onClick={async () => {
                            await db.orders.update(selectedOrderDetail.id!, {
                              status: 'received',
                              receivedBy: activeEmployee.name,
                              receivedAt: Date.now()
                            });
                            toast.success('Need marked as Completed!');
                            setSelectedOrderDetailId(null);
                          }}
                          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-450 text-black rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          Complete Request
                        </button>
                      )}
                    </div>

                    {/* Secondary Actions Row (Edit, Delete) */}
                    <div className="flex gap-2 justify-between border-t border-[#2A2A2A]/40 pt-2.5">
                      {/* Delete */}
                      {(activeEmployee.role === 'manager' || selectedOrderDetail.status === 'pending') && (
                        <button
                          onClick={() => {
                            handleDeleteItem(selectedOrderDetail.id!);
                            setSelectedOrderDetailId(null);
                          }}
                          className="px-3.5 py-2.5 bg-[#C2410C]/10 hover:bg-[#C2410C]/20 border border-[#C2410C]/25 text-[#C2410C] hover:text-[#e04c10] rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}

                      {/* Edit */}
                      {activeEmployee.role === 'manager' && (
                        <button
                          onClick={() => setModalEditing(true)}
                          className="px-3.5 py-2.5 bg-[#14161C] border border-[#2A2A2A] hover:border-gray-500 text-gray-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ml-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Request
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
