'use client';

import { useState } from 'react';
import { db, useLiveQuery, OrderItem } from '@/lib/db';
import { BookOpen, Eye, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface OrderHistorySectionProps {
  searchQuery: string;
  onViewDetails: (item: OrderItem) => void;
  onQuickOrder?: (item: OrderItem) => void;
}

export function OrderHistorySection({ searchQuery, onViewDetails, onQuickOrder }: OrderHistorySectionProps) {
  // Queries
  const employees = useLiveQuery(() => db.employees.list(), []) || [];
  const orders = useLiveQuery(() => db.orders.toArray(), []) || [];
  const orderSessions = useLiveQuery(() => db.orderSessions.list(), []) || [];

  const getEmployeeDisplayName = (name: string | null | undefined) => {
    if (!name) return '';
    if (name === 'System' || name.toLowerCase() === 'admin') return name;
    const found = employees.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (found && found.isDeleted) {
      return `${found.name} (Ex-employee)`;
    }
    return name;
  };

  // Local States
  const [historyPage, setHistoryPage] = useState(1);
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleReportExpand = (listId: string) => {
    setExpandedReports(prev => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };

  // Build unified completed history entries
  const buildHistoryEntries = () => {
    const completed = orders.filter(o => o.status === 'ordered' || o.status === 'received');
    const groupMap: Record<string, OrderItem[]> = {};
    const ungrouped: OrderItem[] = [];

    completed.forEach(item => {
      if (item.listId) {
        if (!groupMap[item.listId]) {
          groupMap[item.listId] = [];
        }
        groupMap[item.listId].push(item);
      } else {
        ungrouped.push(item);
      }
    });

    const entries: any[] = [];

    // Process ungrouped completed orders as single items
    ungrouped.forEach(item => {
      entries.push({
        type: 'single',
        id: `single-${item.id}`,
        timestamp: item.receivedAt || item.completedAt || item.createdAt,
        completedBy: getEmployeeDisplayName(item.receivedBy || item.completedBy) || 'System',
        item,
      });
    });

    // Process grouped completed orders
    Object.entries(groupMap).forEach(([listId, items]) => {
      const session = orderSessions.find(s => s.listId === listId);
      if (items.length === 1) {
        const item = items[0];
        entries.push({
          type: 'single',
          id: `single-group-${listId}`,
          timestamp: session?.completedAt || item.receivedAt || item.completedAt || item.createdAt,
          completedBy: getEmployeeDisplayName(session?.completedBy || item.receivedBy || item.completedBy) || 'System',
          item,
        });
      } else {
        const timestamp = session?.completedAt || Math.max(...items.map(i => i.receivedAt || i.completedAt || i.createdAt));
        const completedBy = getEmployeeDisplayName(session?.completedBy || items[0].receivedBy || items[0].completedBy) || 'System';
        entries.push({
          type: 'multi',
          id: `multi-group-${listId}`,
          timestamp,
          completedBy,
          session: session || {
            listId,
            sessionName: `Restock Batch`,
            completedBy,
            completedAt: timestamp,
            notes: '',
          },
          items,
        });
      }
    });

    // Sort entries chronologically descending
    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries;
  };

  const allHistoryEntries = buildHistoryEntries();

  // Apply search filtering
  const filteredHistoryEntries = allHistoryEntries.filter(entry => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();

    if (entry.type === 'single') {
      const item = entry.item;
      return (
        item.brand.toLowerCase().includes(query) ||
        (item.flavor && item.flavor.toLowerCase().includes(query)) ||
        (item.notes && item.notes.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query)) ||
        entry.completedBy.toLowerCase().includes(query)
      );
    } else {
      const session = entry.session;
      const itemsMatch = entry.items.some((item: OrderItem) =>
        item.brand.toLowerCase().includes(query) ||
        (item.flavor && item.flavor.toLowerCase().includes(query)) ||
        (item.notes && item.notes.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query))
      );
      const sessionMatch =
        (session.sessionName && session.sessionName.toLowerCase().includes(query)) ||
        (session.notes && session.notes.toLowerCase().includes(query)) ||
        entry.completedBy.toLowerCase().includes(query);

      return itemsMatch || sessionMatch;
    }
  });

  // Pagination logic
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredHistoryEntries.length / itemsPerPage);
  const currentPage = Math.min(historyPage, Math.max(1, totalPages));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredHistoryEntries.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="mt-2 w-full">
      <h3 className="text-xl font-serif text-[#E5E1DA] mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-[#D4AF37]" /> Fulfillment History
      </h3>

      <div className="space-y-4 animate-in fade-in duration-300">
        {filteredHistoryEntries.length === 0 ? (
          <div className="py-12 border border-dashed border-[#2A2A2A] rounded-2xl bg-[#0D0F13] text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#888]">
              {searchQuery.trim()
                ? 'No matching history records found.'
                : 'No shopping history reports logged in database.'}
            </p>
          </div>
        ) : (
          paginatedEntries.map(entry => {
            if (entry.type === 'single') {
              const item = entry.item;
              return (
                <div
                  key={entry.id}
                  className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-md hover:border-[#D4AF37]/35 transition-all duration-300"
                >
                  <div className="min-w-0 flex-1 text-left">
                    <h4 className="text-sm sm:text-base font-serif text-gray-300 font-bold uppercase tracking-wide flex items-center gap-2 flex-wrap">
                      <span>{item.brand}</span>
                      {item.flavor && (
                        <span className="text-[#888] font-sans text-xs lowercase italic font-normal">
                          ({item.flavor})
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">
                      {formatDateTime(entry.timestamp)} • by {entry.completedBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-sm font-mono text-gray-300 bg-[#14161C] px-2.5 py-1.5 border border-[#2A2A2A] rounded-xl font-bold">
                      Qty: {item.quantity}
                    </div>
                    {onQuickOrder && (
                      <button
                        type="button"
                        onClick={() => onQuickOrder(item)}
                        className="w-8 h-8 rounded-full bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 text-gray-400 hover:text-[#D4AF37] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md shrink-0"
                        title="Quick Reorder"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewDetails(item)}
                      className="w-8 h-8 rounded-full bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 text-gray-400 hover:text-[#D4AF37] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md shrink-0"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            } else {
              const session = entry.session;
              const isExpanded = !!expandedReports[session.listId];
              return (
                <div
                  key={entry.id}
                  className="bg-[#0D0F13] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-md hover:border-[#D4AF37]/25 transition-all duration-300"
                >
                  <div
                    onClick={() => toggleReportExpand(session.listId)}
                    className="p-4 sm:p-5 flex justify-between items-center hover:bg-[#14161C] transition-colors cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start md:items-center gap-2 sm:gap-4 text-left">
                      <span className="text-xs font-mono uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                        Batch Order Completed
                      </span>
                      <div className="text-sm">
                        <span className="text-[#888] text-xs font-mono">
                          {formatDateTime(entry.timestamp)} • by <strong>{entry.completedBy}</strong>
                        </span>
                        {session.sessionName && session.sessionName !== 'Restock Batch' && (
                          <div className="text-xs font-serif text-[#D4AF37] mt-0.5">
                            {session.sessionName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                      <div className="text-[#888] flex items-center gap-1.5">
                        <span>{entry.items.length} items</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#D4AF37]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#D4AF37]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[#2A2A2A] bg-[#0A0B0E]/60 divide-y divide-[#2A2A2A] text-left animate-in slide-in-from-top-1 duration-200">
                      {session.notes && (
                        <div className="p-3.5 px-4 bg-[#14161C]/40 border-b border-[#2A2A2A] text-xs text-gray-400 italic">
                          Notes: {session.notes}
                        </div>
                      )}
                      {entry.items.map((item: any) => {
                        return (
                          <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1 text-left">
                              <h5 className="text-sm font-serif font-bold uppercase italic tracking-wide text-gray-300">
                                <span>{item.brand}</span>
                                {item.flavor && (
                                  <span className="text-xs font-sans text-gray-500 ml-1.5 normal-case">
                                    ({item.flavor})
                                  </span>
                                )}
                              </h5>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-sm font-mono text-gray-300 bg-[#14161C] px-2.5 py-1 border border-[#2A2A2A] rounded-lg">
                                Qty: {item.quantity}
                              </div>
                              {onQuickOrder && (
                                <button
                                  type="button"
                                  onClick={() => onQuickOrder(item)}
                                  className="w-8 h-8 rounded-full bg-[#14161C] border border-[#2A2A2A] hover:border-[#D4AF37]/50 text-gray-400 hover:text-[#D4AF37] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md shrink-0"
                                  title="Quick Reorder"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onViewDetails(item)}
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
              );
            }
          })
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#2A2A2A] pt-4 mt-4 text-xs">
            <div className="text-gray-500">
              Showing <span className="text-gray-300 font-semibold">{startIndex + 1}</span> to{' '}
              <span className="text-gray-300 font-semibold">
                {Math.min(startIndex + itemsPerPage, filteredHistoryEntries.length)}
              </span>{' '}
              of <span className="text-gray-300 font-semibold">{filteredHistoryEntries.length}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-[#14161C] border border-[#2A2A2A] text-gray-300 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-1 font-mono text-gray-400">
                <span className="text-white font-bold">{currentPage}</span> / <span>{totalPages}</span>
              </div>
              <button
                onClick={() => setHistoryPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-[#14161C] border border-[#2A2A2A] text-gray-300 hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
