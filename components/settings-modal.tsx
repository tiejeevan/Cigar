'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Settings, Download, Upload, AlertCircle, RefreshCw, 
  FileText, Check, Database, HelpCircle, Trash2, GitMerge, Wand2, ShoppingBag,
  Users, UserPlus, Edit2, RotateCcw
} from 'lucide-react';
import { db, useLiveQuery, Employee } from '@/lib/db';
import { toast } from 'sonner';
import { StockWizardModal } from '@/components/stock-wizard-modal';

interface SettingsModalProps {
  onClose: () => void;
  activeItemsCount: number;
  activeOrdersCount: number;
  activeEmployee: Employee | null;
  setActiveEmployee: (employee: Employee | null) => void;
}

export function SettingsModal({ 
  onClose, 
  activeItemsCount, 
  activeOrdersCount,
  activeEmployee,
  setActiveEmployee
}: SettingsModalProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [merging, setMerging] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<'overwrite' | 'merge' | 'skip'>('overwrite');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [showUserManagement, setShowUserManagement] = useState(false);
  
  // Add user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserRole, setNewUserRole] = useState<'employee' | 'manager'>('employee');
  const [registeringUser, setRegisteringUser] = useState(false);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserPin, setEditingUserPin] = useState('');
  const [editingUserRole, setEditingUserRole] = useState<'employee' | 'manager'>('employee');
  const [updatingUser, setUpdatingUser] = useState(false);

  // Settings live query
  const settings = useLiveQuery(() => db.settings.get(), []) || [];
  const employees = useLiveQuery(() => db.employees.list(), []) || [];
  
  const isInvDisabledSetting = settings.find(s => s.key === 'isInventoryDisabled');
  const isInventoryDisabled = isInvDisabledSetting?.value === 'true';

  const isPurchasingDisabledSetting = settings.find(s => s.key === 'isPurchasingDisabled');
  const isPurchasingDisabled = isPurchasingDisabledSetting?.value === 'true';

  const [showAuthGate, setShowAuthGate] = useState(false);
  const [settingToToggle, setSettingToToggle] = useState<'inventory' | 'purchasing' | null>(null);
  const [authName, setAuthName] = useState('');
  const [authPin, setAuthPin] = useState('');

  // Load session
  useEffect(() => {
    if (activeEmployee) {
      setAuthName(activeEmployee.name);
    }
  }, [activeEmployee]);

  // Set default authName dropdown name
  useEffect(() => {
    if (employees.length > 0 && !authName) {
      setAuthName(employees[0].name);
    }
  }, [employees, authName]);

  const handleToggleInventory = async () => {
    if (activeEmployee) {
      const newVal = !isInventoryDisabled;
      await db.settings.update('isInventoryDisabled', String(newVal), activeEmployee.name);
      toast.success(newVal ? 'Inventory module disabled' : 'Inventory module enabled');
    } else {
      setSettingToToggle('inventory');
      setShowAuthGate(true);
      setAuthPin('');
    }
  };

  const handleTogglePurchasing = async () => {
    if (activeEmployee) {
      const newVal = !isPurchasingDisabled;
      await db.settings.update('isPurchasingDisabled', String(newVal), activeEmployee.name);
      toast.success(newVal ? 'Purchasing module disabled' : 'Purchasing module enabled');
    } else {
      setSettingToToggle('purchasing');
      setShowAuthGate(true);
      setAuthPin('');
    }
  };

  const handleAuthorizeToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = authName || (employees[0] ? employees[0].name : '');
    if (!targetName) {
      toast.error('Select employee or set up PIN in Order Book tab');
      return;
    }
    if (!/^\d{4}$/.test(authPin)) {
      toast.error('PIN must be 4 digits');
      return;
    }

    try {
      const res = await db.employees.verifyPin(targetName, authPin);
      if (res && res.success && res.employee) {
        if (settingToToggle === 'purchasing') {
          const newVal = !isPurchasingDisabled;
          await db.settings.update('isPurchasingDisabled', String(newVal), res.employee.name);
          toast.success(newVal ? 'Purchasing module disabled' : 'Purchasing module enabled');
        } else {
          const newVal = !isInventoryDisabled;
          await db.settings.update('isInventoryDisabled', String(newVal), res.employee.name);
          toast.success(newVal ? 'Inventory module disabled' : 'Inventory module enabled');
        }
        
        setActiveEmployee(res.employee);
        sessionStorage.setItem('active_employee', JSON.stringify(res.employee));
        
        setShowAuthGate(false);
        setAuthPin('');
        setSettingToToggle(null);
      } else {
        toast.error('Incorrect PIN');
      }
    } catch (e) {
      toast.error('Connection error authorizing PIN');
    }
  };

  const formatAuditDate = (ts: number) => {
    if (!ts) return '';
    return new Date(Number(ts)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  // Reset wipe confirmation after 5 seconds of inactivity
  useEffect(() => {
    if (!confirmWipe) return;
    const timer = setTimeout(() => {
      setConfirmWipe(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [confirmWipe]);

  // 3. Wipe Data Logic
  const handleWipeData = async () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      toast.warning('Click button again to confirm permanent database wipe!', { duration: 3000 });
      return;
    }

    try {
      setWiping(true);
      toast.loading('Erasing store database records...', { id: 'db-wipe' });
      await db.wipeDatabase();
      toast.success('All database records cleared successfully!', { id: 'db-wipe', duration: 4000 });
      setConfirmWipe(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to wipe data: ' + (err.message || err), { id: 'db-wipe' });
    } finally {
      setWiping(false);
    }
  };

  // 4. Merge duplicate brand casings
  const handleMergeBrands = async () => {
    try {
      setMerging(true);
      toast.loading('Consolidating duplicate brand casings...', { id: 'brand-merge' });
      
      const res = await db.mergeDuplicateBrands();
      
      if (res && res.success) {
        const { mergedBrands, updatedItemsCount, updatedOrdersCount } = res;
        if (mergedBrands && mergedBrands.length > 0) {
          toast.success(
            `Merged ${mergedBrands.length} brand variations. Updated ${updatedItemsCount} items and ${updatedOrdersCount} orders!`,
            { id: 'brand-merge', duration: 6000 }
          );
        } else {
          toast.success('All brand casings are already fully consolidated!', { id: 'brand-merge', duration: 4000 });
        }
      } else {
        throw new Error('API failed to report success.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to consolidate brand casings: ' + (err.message || err), { id: 'brand-merge' });
    } finally {
      setMerging(false);
    }
  };

  // 1. Export Data Logic
  const handleExport = async () => {
    try {
      setExporting(true);
      toast.loading('Generating backup file...', { id: 'backup-export' });
      
      const backupData = await db.exportBackupData();
      
      // Convert JSON object to string
      const jsonString = JSON.stringify(backupData, null, 2);
      
      // Create a Blob and a download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '-').split(' ')[0];
      
      link.href = url;
      link.download = `gaint_mart_backup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Backup downloaded successfully!', { id: 'backup-export' });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate backup: ' + (err.message || err), { id: 'backup-export' });
    } finally {
      setExporting(false);
    }
  };

  // 2. File Selection & Parsing Logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setParsedData(null);
    
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setErrorMsg('Invalid file format. Please upload a .json file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        
        // Simple schema validation
        if (!data || typeof data !== 'object') {
          throw new Error('File contents are invalid or not a JSON object.');
        }
        if (!Array.isArray(data.items)) {
          throw new Error('Invalid schema: Missing inventory "items" array.');
        }
        
        setParsedData(data);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to parse file: ' + (err.message || 'Malformed JSON.'));
        setSelectedFile(null);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading the backup file.');
      setSelectedFile(null);
    };

    reader.readAsText(file);
  };

  // 3. Import Data Logic
  const handleImport = async () => {
    if (!parsedData) return;
    
    try {
      setImporting(true);
      toast.loading('Importing backup data to database...', { id: 'backup-import' });
      
      const result = await db.importBackupData(parsedData, conflictStrategy);
      
      if (result.success) {
        toast.success(
          `Successfully restored ${result.itemsCount} items, ${result.ordersCount} orders, ${result.employeesCount} users, ${result.sessionsCount} sessions, ${result.notesCount} notes, and ${result.settingsCount} settings!`, 
          { id: 'backup-import', duration: 6000 }
        );
        // Reset state after successful import
        setSelectedFile(null);
        setParsedData(null);
      } else {
        throw new Error('Import api failed to report success.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Import failed: ' + (err.message || err), { id: 'backup-import' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col pt-safe backdrop-blur-md">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 bg-[#0A0B0E] border-b border-[#2A2A2A]">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#D4AF37] animate-spin-slow" /> System Settings
        </h2>
        <button 
          onClick={onClose}
          className="p-2 bg-[#14161C] border border-[#2A2A2A] rounded-full text-gray-400 hover:text-white transition-colors active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 w-full max-w-2xl mx-auto space-y-8">
        
        {/* Active Database Summary Card */}
        <div className="bg-[#14161C] border border-[#2A2A2A] rounded-3xl p-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#D4AF37]/10 rounded-2xl border border-[#D4AF37]/20">
              <Database className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#E5E1DA]">Active Store Database</h3>
              <p className="text-xs text-[#888] uppercase tracking-wider font-semibold">Neon Serverless PostgreSQL</p>
            </div>
          </div>
          <div className="text-right flex gap-6">
            <div>
              <p className="text-2xl font-bold font-mono text-[#D4AF37]">{activeItemsCount}</p>
              <p className="text-[9px] uppercase tracking-widest text-[#888] font-bold">Items</p>
            </div>
            <div className="border-l border-[#2A2A2A] pl-6">
              <p className="text-2xl font-bold font-mono text-emerald-500">{activeOrdersCount}</p>
              <p className="text-[9px] uppercase tracking-widest text-[#888] font-bold">Orders</p>
            </div>
          </div>
        </div>

        {/* Manage Users Card */}
        <div className="bg-[#111216] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h4 className="text-lg font-serif italic text-[#D4AF37] mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D4AF37]" /> Manage Users
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                Register new employees, update active profiles, change PIN numbers, soft-delete ex-employees, or restore profiles.
              </p>
            </div>
            
            <button
              onClick={() => setShowUserManagement(!showUserManagement)}
              className="px-4 py-2 bg-[#1A1D24] hover:bg-[#2A2A2A] text-gray-300 hover:text-white border border-[#2A2A2A] rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 shrink-0"
            >
              {showUserManagement ? 'Collapse' : 'Expand'}
            </button>
          </div>

          <AnimatePresence>
            {showUserManagement && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-6 border-t border-[#2A2A2A]/80 pt-4 mt-2"
              >
                {/* Add New User Row */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newUserName.trim()) {
                      toast.error('Name is required');
                      return;
                    }
                    if (!/^\d{4}$/.test(newUserPin)) {
                      toast.error('PIN must be exactly 4 digits');
                      return;
                    }
                    try {
                      setRegisteringUser(true);
                      const res = await db.employees.register(newUserName.trim(), newUserPin, newUserRole);
                      if (res && !res.error) {
                        toast.success(`User profile registered: ${newUserName}`);
                        setNewUserName('');
                        setNewUserPin('');
                        setNewUserRole('employee');
                      } else {
                        toast.error(res?.error || 'Registration failed');
                      }
                    } catch (err) {
                      toast.error('Failed to register employee');
                    } finally {
                      setRegisteringUser(false);
                    }
                  }}
                  className="bg-[#14161C]/30 border border-[#2A2A2A] rounded-2xl p-4 space-y-3"
                >
                  <span className="text-[10px] uppercase tracking-widest text-[#888] font-bold block">Register New Profile</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Name</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="John Doe"
                        className="bg-[#0D0F13] border border-[#2A2A2A] text-[#E5E1DA] px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37] rounded-xl font-sans"
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">4-Digit PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={4}
                        value={newUserPin}
                        onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="bg-[#0D0F13] border border-[#2A2A2A] text-[#E5E1DA] px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37] rounded-xl font-mono text-center tracking-[0.5em]"
                        required
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as 'employee' | 'manager')}
                        className="bg-[#0D0F13] border border-[#2A2A2A] text-[#E5E1DA] px-3 py-2 text-xs focus:outline-none focus:border-[#D4AF37] rounded-xl cursor-pointer"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registeringUser}
                    className="w-full bg-[#D4AF37] disabled:bg-gray-700 text-black py-2 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add User</span>
                  </button>
                </form>

                {/* User List */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-[#888] font-bold block">Current User Profiles ({employees.length})</span>
                  
                  <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                    {employees.map((emp) => {
                      const isEditing = editingUserId === emp.id;
                      const isAdminAccount = emp.name.toLowerCase() === 'admin';
                      return (
                        <div
                          key={emp.id}
                          className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#14161C]/50 border rounded-2xl transition-all duration-200 ${
                            emp.isDeleted 
                              ? 'border-[#2A2A2A] opacity-50 bg-[#14161C]/10' 
                              : 'border-[#2A2A2A] hover:border-[#D4AF37]/25'
                          }`}
                        >
                          {isEditing ? (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!editingUserName.trim()) {
                                  toast.error('Name cannot be empty');
                                  return;
                                }
                                if (!/^\d{4}$/.test(editingUserPin)) {
                                  toast.error('PIN must be 4 digits');
                                  return;
                                }
                                try {
                                  setUpdatingUser(true);
                                  const res = await db.employees.update(emp.id, {
                                    name: editingUserName.trim(),
                                    pin: editingUserPin,
                                    role: editingUserRole
                                  });
                                  if (res && !res.error) {
                                    toast.success('User details updated');
                                    // If current active user renamed themselves or updated details
                                    if (activeEmployee && activeEmployee.id === emp.id) {
                                      const updatedEmp = { ...activeEmployee, name: editingUserName.trim(), role: editingUserRole };
                                      setActiveEmployee(updatedEmp);
                                      sessionStorage.setItem('active_employee', JSON.stringify(updatedEmp));
                                    }
                                    setEditingUserId(null);
                                  } else {
                                    toast.error(res?.error || 'Update failed');
                                  }
                                } catch (err) {
                                  toast.error('Failed to update employee');
                                } finally {
                                  setUpdatingUser(false);
                                }
                              }}
                              className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end text-left"
                            >
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">Name</label>
                                <input
                                  type="text"
                                  value={editingUserName}
                                  onChange={(e) => setEditingUserName(e.target.value)}
                                  disabled={isAdminAccount}
                                  className="bg-[#0D0F13] border border-[#2A2A2A] text-[#E5E1DA] px-2.5 py-1 text-xs focus:outline-none focus:border-[#D4AF37] rounded-lg disabled:opacity-50"
                                  required
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">PIN</label>
                                <input
                                  type="password"
                                  inputMode="numeric"
                                  pattern="\d*"
                                  maxLength={4}
                                  value={editingUserPin}
                                  onChange={(e) => setEditingUserPin(e.target.value.replace(/\D/g, ''))}
                                  disabled={isAdminAccount}
                                  className="bg-[#0D0F13] border border-[#2A2A2A] text-[#E5E1DA] px-2.5 py-1 text-xs focus:outline-none focus:border-[#D4AF37] rounded-lg text-center font-mono tracking-[0.3em] disabled:opacity-50"
                                  required
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">Role</label>
                                <select
                                  value={editingUserRole}
                                  onChange={(e) => setEditingUserRole(e.target.value as 'employee' | 'manager')}
                                  disabled={isAdminAccount}
                                  className="bg-[#0D0F13] border border-[#2A2A2A] text-[#E5E1DA] px-2.5 py-1 text-xs focus:outline-none focus:border-[#D4AF37] rounded-lg cursor-pointer disabled:opacity-50"
                                >
                                  <option value="employee">Employee</option>
                                  <option value="manager">Manager</option>
                                </select>
                              </div>

                              <div className="flex gap-1">
                                <button
                                  type="submit"
                                  disabled={updatingUser}
                                  className="flex-1 py-1.5 bg-[#D4AF37] hover:bg-[#E5C25A] text-black rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="flex-1 py-1.5 bg-zinc-800 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 min-w-0 text-left">
                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${
                                  emp.isDeleted 
                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                                    : 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
                                }`}>
                                  {emp.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap font-sans">
                                    <span className={`text-xs font-bold ${emp.isDeleted ? 'text-zinc-500 line-through' : 'text-[#E5E1DA]'}`}>
                                      {emp.name}
                                    </span>
                                    <span className="text-[8px] bg-[#2A2A2A] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider text-gray-400">
                                      {emp.role || 'employee'}
                                    </span>
                                    {emp.isDeleted && (
                                      <span className="text-[8px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-red-400 text-left">
                                        Ex-employee
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] font-mono text-gray-500 tracking-wider block">
                                    Created: {new Date(emp.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 opacity-85 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isAdminAccount && !emp.isDeleted && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingUserId(emp.id);
                                        setEditingUserName(emp.name);
                                        setEditingUserPin(emp.pin || '');
                                        setEditingUserRole(emp.role || 'employee');
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-all cursor-pointer"
                                      title="Edit user details"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to delete ${emp.name}?`)) {
                                          try {
                                            await db.employees.delete(emp.id);
                                            toast.info(`${emp.name} marked as ex-employee.`);
                                            // If current active user got deleted
                                            if (activeEmployee && activeEmployee.id === emp.id) {
                                              setActiveEmployee(null);
                                              sessionStorage.removeItem('active_employee');
                                            }
                                          } catch (e) {
                                            toast.error('Failed to delete user');
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                      title="Soft delete user"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {!isAdminAccount && emp.isDeleted && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await db.employees.update(emp.id, { isDeleted: false });
                                        toast.success(`${emp.name} restored to active employees list.`);
                                      } catch (e) {
                                        toast.error('Failed to restore user');
                                      }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider"
                                    title="Restore user"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restore</span>
                                  </button>
                                )}
                                {isAdminAccount && (
                                  <span className="text-[9px] font-mono font-bold text-gray-650 px-2 uppercase select-none">System account</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Inventory Management Toggle Card */}
        <div className="bg-[#111216] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h4 className="text-lg font-serif italic text-[#D4AF37] mb-1 flex items-center gap-2">
                <Database className="w-5 h-5 text-[#D4AF37]" /> Inventory Module
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                Toggle the availability and queries of the inventory module. When disabled, the inventory tab, bulk/single intake forms, and all background data synchronization requests for products are completely deactivated.
              </p>
              
              {isInvDisabledSetting && (
                <p className="text-[10px] text-[#D4AF37]/80 font-mono mt-3 uppercase tracking-wider bg-[#1A1D24] inline-block px-3 py-1.5 rounded-lg border border-[#2A2A2A]/40">
                  Status: {isInventoryDisabled ? 'Disabled' : 'Enabled'} by {isInvDisabledSetting.updatedBy} on {formatAuditDate(isInvDisabledSetting.updatedAt)}
                </p>
              )}
            </div>
            
            <button
              onClick={handleToggleInventory}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isInventoryDisabled ? 'bg-gray-700' : 'bg-[#D4AF37]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-[#0A0B0E] shadow ring-0 transition duration-200 ease-in-out ${
                  isInventoryDisabled ? 'translate-x-0' : 'translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* Inline Auth Gate */}
          {showAuthGate && settingToToggle === 'inventory' && (
            <div className="border-t border-[#2A2A2A]/80 pt-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <form onSubmit={handleAuthorizeToggle} className="space-y-4 max-w-sm">
                <p className="text-xs font-bold text-yellow-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  PIN Authorization required to modify system parameters.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase tracking-wider text-[#888] font-bold">Select Profile</label>
                    {employees.length === 0 ? (
                      <div className="text-[10px] text-[#888] italic">No employees found. Setup profile in Order Book first.</div>
                    ) : (
                      <select
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-2 text-xs focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl cursor-pointer"
                      >
                        {employees.map(e => (
                          <option key={e.id} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase tracking-wider text-[#888] font-bold">4-Digit PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={4}
                      value={authPin}
                      onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-2 text-center font-mono text-xs focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl"
                      placeholder="••••"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#D4AF37] text-black py-2 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                  >
                    Authorize Toggle
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAuthGate(false)}
                    className="px-4 bg-[#2A2A2A] text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Purchasing Management Toggle Card */}
        <div className="bg-[#111216] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <h4 className="text-lg font-serif italic text-[#D4AF37] mb-1 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#D4AF37]" /> Purchasing Module
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                Toggle the availability and visibility of the purchasing (Orders) module. When disabled, the purchasing tab, custom order creation panel, and all background vendor/fulfillment operations are completely deactivated.
              </p>
              
              {isPurchasingDisabledSetting && (
                <p className="text-[10px] text-[#D4AF37]/80 font-mono mt-3 uppercase tracking-wider bg-[#1A1D24] inline-block px-3 py-1.5 rounded-lg border border-[#2A2A2A]/40">
                  Status: {isPurchasingDisabled ? 'Disabled' : 'Enabled'} by {isPurchasingDisabledSetting.updatedBy} on {formatAuditDate(isPurchasingDisabledSetting.updatedAt)}
                </p>
              )}
            </div>
            
            <button
              onClick={handleTogglePurchasing}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPurchasingDisabled ? 'bg-gray-700' : 'bg-[#D4AF37]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-[#0A0B0E] shadow ring-0 transition duration-200 ease-in-out ${
                  isPurchasingDisabled ? 'translate-x-0' : 'translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* Inline Auth Gate */}
          {showAuthGate && settingToToggle === 'purchasing' && (
            <div className="border-t border-[#2A2A2A]/80 pt-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <form onSubmit={handleAuthorizeToggle} className="space-y-4 max-w-sm">
                <p className="text-xs font-bold text-yellow-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  PIN Authorization required to modify system parameters.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase tracking-wider text-[#888] font-bold">Select Profile</label>
                    {employees.length === 0 ? (
                      <div className="text-[10px] text-[#888] italic">No employees found. Setup profile in Order Book first.</div>
                    ) : (
                      <select
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-2 text-xs focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl cursor-pointer"
                      >
                        {employees.map(e => (
                          <option key={e.id} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase tracking-wider text-[#888] font-bold">4-Digit PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={4}
                      value={authPin}
                      onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#14161C] border border-[#2A2A2A] text-[#E5E1DA] p-2 text-center font-mono text-xs focus:outline-none focus:border-[#D4AF37] transition-colors rounded-xl"
                      placeholder="••••"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#D4AF37] text-black py-2 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                  >
                    Authorize Toggle
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAuthGate(false)}
                    className="px-4 bg-[#2A2A2A] text-white py-2 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Stock Wizard Engine (Interactive) */}
        <div className="bg-gradient-to-br from-[#1A1D24] to-[#111216] border border-[#2A2A2A] hover:border-[#D4AF37]/50 transition-colors rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 text-left group">
          <div className="flex-1">
            <h4 className="text-lg font-serif italic text-[#D4AF37] mb-1 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[#D4AF37]" /> Stock Wizard Engine
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed max-w-md">
              Launch the interactive stock taking flow. This wizard will guide you through every item in your store brand-by-brand to update stock levels, flag moving items, and ask performance questions.
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex justify-center items-center gap-2 bg-[#D4AF37] hover:bg-[#C4A030] text-black px-6 py-4 rounded-2xl font-bold uppercase tracking-[0.1em] active:scale-95 transition-all text-sm shadow-lg w-full sm:w-auto flex-shrink-0"
          >
            Launch Wizard
          </button>
        </div>


        {/* 1. Export Section */}
        <div className="bg-[#111216] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
          <div>
            <h4 className="text-lg font-serif italic text-[#D4AF37] mb-1">Export Inventory Backup</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generate and download a secure data snapshot file containing all items, active quantities, category codes, reorder limits, price grids, barcodes, purchasing order forms, and **Base64-encoded custom photos**.
            </p>
          </div>
          
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex justify-center items-center gap-2.5 bg-[#D4AF37] disabled:bg-gray-700 text-black px-5 py-3.5 rounded-2xl font-bold active:scale-95 transition-all text-sm shadow-lg w-full sm:w-auto self-start"
          >
            {exporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'Generating Backup...' : 'Download Backup File'}
          </button>
        </div>

        {/* 2. Import Section */}
        <div className="bg-[#111216] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm flex flex-col gap-5 text-left">
          <div>
            <h4 className="text-lg font-serif italic text-[#D4AF37] mb-1">Restore Database from Backup</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Restore your active inventory catalog and purchase tracking by uploading a previously downloaded Gaint Mart backup JSON file.
            </p>
          </div>

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {/* Drag & Drop Visual Area */}
          {!selectedFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2A2A2A] hover:border-[#D4AF37]/50 transition-colors rounded-2xl p-8 text-center cursor-pointer bg-[#0D0E12] group flex flex-col items-center justify-center gap-2"
            >
              <Upload className="w-8 h-8 text-gray-500 group-hover:text-[#D4AF37] transition-colors mb-1" />
              <p className="text-xs text-gray-300 font-semibold group-hover:text-white transition-colors">Drag and drop or tap to select backup `.json` file</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Only JSON backups are supported</p>
            </div>
          ) : (
            <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#E5E1DA] truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-emerald-400/80 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB • Loaded</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedFile(null);
                  setParsedData(null);
                  setErrorMsg(null);
                }}
                className="p-1 bg-[#1A1D24] text-gray-400 hover:text-white rounded-lg border border-[#2A2A2A] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-4 flex gap-3 text-red-400 items-start">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Validation Error</p>
                <p className="text-xs opacity-90 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Import Configuration Panel (Rendered only on valid parsed file) */}
          <AnimatePresence>
            {parsedData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-5"
              >
                <div className="border border-[#2A2A2A] bg-[#1A1D24] rounded-2xl p-5 space-y-4">
                  {/* File Metadata Overview */}
                  <div className="grid grid-cols-3 gap-3.5 pb-4 border-b border-[#2A2A2A]">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-[#888] font-bold">Items</p>
                      <p className="text-lg font-bold font-mono text-[#D4AF37]">{parsedData.items.length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-[#888] font-bold">Orders</p>
                      <p className="text-lg font-bold font-mono text-emerald-500">{(parsedData.orders || []).length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-[#888] font-bold">Users</p>
                      <p className="text-lg font-bold font-mono text-blue-400">{(parsedData.employees || []).length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-[#888] font-bold">Sessions</p>
                      <p className="text-lg font-bold font-mono text-purple-400">{(parsedData.orderSessions || []).length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-[#888] font-bold">Notes</p>
                      <p className="text-lg font-bold font-mono text-rose-400">{(parsedData.personalNotes || []).length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-[#888] font-bold">Settings</p>
                      <p className="text-lg font-bold font-mono text-amber-500">{(parsedData.settings || []).length}</p>
                    </div>
                  </div>

                  {/* Conflict Resolution Selector */}
                  <div className="space-y-2.5">
                    <p className="text-xs uppercase tracking-widest text-[#888] font-bold flex items-center gap-1">
                      Barcode Conflict Strategy <span title="How to handle items that already exist in active inventory with the same barcode"><HelpCircle className="w-3 h-3 cursor-help text-[#888]" /></span>
                    </p>
                    <div className="flex flex-col gap-2">
                      {/* Option 1: Overwrite */}
                      <button
                        onClick={() => setConflictStrategy('overwrite')}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${conflictStrategy === 'overwrite' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#2A2A2A] bg-[#0E0F13] opacity-65 hover:opacity-100'}`}
                      >
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${conflictStrategy === 'overwrite' ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : 'border-gray-600'}`}>
                          {conflictStrategy === 'overwrite' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Overwrite existing data (Recommended)</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Replaces current item photos, tags, price sheets, and stocks with the values in the backup file.</p>
                        </div>
                      </button>

                      {/* Option 2: Merge */}
                      <button
                        onClick={() => setConflictStrategy('merge')}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${conflictStrategy === 'merge' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#2A2A2A] bg-[#0E0F13] opacity-65 hover:opacity-100'}`}
                      >
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${conflictStrategy === 'merge' ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : 'border-gray-600'}`}>
                          {conflictStrategy === 'merge' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Merge stock quantities</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Sums backup stocks into active stocks. Current active photos, descriptions, and price values are strictly preserved.</p>
                        </div>
                      </button>

                      {/* Option 3: Skip */}
                      <button
                        onClick={() => setConflictStrategy('skip')}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${conflictStrategy === 'skip' ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-[#2A2A2A] bg-[#0E0F13] opacity-65 hover:opacity-100'}`}
                      >
                        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${conflictStrategy === 'skip' ? 'border-[#D4AF37] bg-[#D4AF37] text-black' : 'border-gray-600'}`}>
                          {conflictStrategy === 'skip' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Skip duplicates</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Leaves current items exactly as they are and only adds items that are brand new to the store catalog.</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 flex justify-center items-center gap-2 bg-[#D4AF37] disabled:bg-gray-700 text-black py-4 rounded-2xl font-bold active:scale-95 transition-all text-sm shadow-lg"
                  >
                    {importing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    {importing ? 'Importing Data...' : 'Confirm Restore'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setParsedData(null);
                    }}
                    disabled={importing}
                    className="bg-[#2A2A2A] hover:bg-[#333] text-white px-5 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Database Maintenance Section */}
        <div className="bg-[#111216] border border-[#2A2A2A] rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
          <div>
            <h4 className="text-lg font-serif italic text-[#D4AF37] mb-1 flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-[#D4AF37]" /> Database Maintenance
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Consolidate system assets, standardize brand casings case-insensitively, and clean up duplicate groupings in your inventory and purchasing databases without losing any store quantities.
            </p>
          </div>
          
          <button
            onClick={handleMergeBrands}
            disabled={merging}
            className="flex justify-center items-center gap-2.5 bg-[#D4AF37] disabled:bg-gray-700 text-black px-5 py-3.5 rounded-2xl font-bold active:scale-95 transition-all text-sm shadow-lg w-full sm:w-auto self-start"
          >
            {merging ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4" />
            )}
            {merging ? 'Consolidating Brands...' : 'Consolidate Brand Casing'}
          </button>
        </div>

        {/* 3. Danger Zone / Wipe Data */}
        <div className="bg-[#1C1212] border border-red-900/30 rounded-3xl p-6 shadow-sm flex flex-col gap-4 text-left">
          <div>
            <h4 className="text-lg font-serif italic text-red-500 mb-1">Danger Zone</h4>
            <p className="text-xs text-red-300/80 leading-relaxed">
              Permanently delete all active records in the database, including the entire inventory catalog, barcodes, custom base64 pictures, prices, and past purchase sheets. This action is highly destructive and **cannot be undone**.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleWipeData}
              disabled={wiping}
              className={`flex justify-center items-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold transition-all text-sm shadow-lg w-full sm:w-auto active:scale-95 border ${
                confirmWipe 
                  ? 'bg-red-600 border-red-500 text-white hover:bg-red-700 animate-pulse' 
                  : 'bg-transparent border-red-500/30 hover:border-red-500 text-red-400 hover:bg-red-500/10'
              }`}
            >
              {wiping ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : confirmWipe ? (
                <AlertCircle className="w-4 h-4 animate-bounce" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {wiping 
                ? 'Wiping Store Records...' 
                : confirmWipe 
                  ? 'Confirm: Permanently Erase All Data' 
                  : 'Wipe All Store Data'
              }
            </button>
            
            {confirmWipe && (
              <button
                onClick={() => setConfirmWipe(false)}
                disabled={wiping}
                className="bg-[#2A2A2A] hover:bg-[#333] border border-[#3A3A3A] text-white px-5 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-all w-full sm:w-auto"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

      </div>

      {showWizard && (
        <StockWizardModal onClose={() => setShowWizard(false)} />
      )}
    </div>
  );
}
