'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock, Users, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO, setHours, setMinutes, startOfDay, addMinutes } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import type { User, CalendarEvent, ScheduleSuggestion, TimeRange } from '@/app/page';

interface CalendarSchedulerProps {
  users: User[];
  events: CalendarEvent[];
  timeRange: TimeRange;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  suggestions: ScheduleSuggestion[];
  isLoading: boolean;
}

interface TimeSlot {
  time: Date;
  availableUsers: number;
  totalUsers: number;
  events: CalendarEvent[];
  isSuggested: boolean;
  isFreeSlot: boolean; // New property to identify completely free slots
  freeSlotDuration?: number; // Duration of continuous free time
}

interface FreeSlotGroup {
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  slots: TimeSlot[];
}

export function CalendarScheduler({
  users,
  events,
  timeRange,
  selectedDate,
  onDateChange,
  suggestions,
  isLoading
}: CalendarSchedulerProps) {
  const [view, setView] = useState<'day' | 'week'>('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }));
  const [highlightFreeSlots, setHighlightFreeSlots] = useState(true);
  const [minFreeSlotDuration, setMinFreeSlotDuration] = useState(30); // Minimum duration to highlight

  useEffect(() => {
    setWeekStart(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  }, [selectedDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Helper function to find continuous free slots
  const findFreeSlotGroups = (slots: TimeSlot[]): FreeSlotGroup[] => {
    const freeGroups: FreeSlotGroup[] = [];
    let currentGroup: TimeSlot[] = [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      
      if (slot.availableUsers === slot.totalUsers && !slot.isSuggested) {
        currentGroup.push(slot);
      } else {
        if (currentGroup.length > 0) {
          const duration = currentGroup.length * 30; // 30 minutes per slot
          if (duration >= minFreeSlotDuration) {
            freeGroups.push({
              startTime: currentGroup[0].time,
              endTime: addMinutes(currentGroup[currentGroup.length - 1].time, 30),
              duration,
              slots: [...currentGroup]
            });
          }
        }
        currentGroup = [];
      }
    }

    // Handle last group
    if (currentGroup.length > 0) {
      const duration = currentGroup.length * 30;
      if (duration >= minFreeSlotDuration) {
        freeGroups.push({
          startTime: currentGroup[0].time,
          endTime: addMinutes(currentGroup[currentGroup.length - 1].time, 30),
          duration,
          slots: [...currentGroup]
        });
      }
    }

    return freeGroups;
  };

  const generateDaySlots = () => {
    const slots: TimeSlot[] = [];
    const startHour = parseInt(timeRange.start.split(':')[0]);
    const endHour = parseInt(timeRange.end.split(':')[0]);
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === endHour && minute > 0) break;
        
        const slotTime = setMinutes(setHours(selectedDate, hour), minute);
        const slotEvents = events.filter(event => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          return slotTime >= eventStart && slotTime < eventEnd;
        });
        
        const isSuggested = suggestions.some(suggestion => 
          suggestion.startTime.getTime() === slotTime.getTime()
        );

        const availableUsers = users.length - slotEvents.length;
        const isFreeSlot = availableUsers === users.length && users.length > 0;
        
        slots.push({
          time: slotTime,
          availableUsers,
          totalUsers: users.length,
          events: slotEvents,
          isSuggested,
          isFreeSlot
        });
      }
    }
    
    return slots;
  };

  const generateWeekSlots = () => {
    const slots: (TimeSlot & { day: Date })[] = [];
    const startHour = parseInt(timeRange.start.split(':')[0]);
    const endHour = parseInt(timeRange.end.split(':')[0]);
    
    weekDays.forEach(day => {
      for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === endHour && minute > 0) break;
          
          const slotTime = setMinutes(setHours(day, hour), minute);
          const slotEvents = events.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            return slotTime >= eventStart && slotTime < eventEnd;
          });
          
          const isSuggested = suggestions.some(suggestion => 
            suggestion.startTime.getTime() === slotTime.getTime()
          );

          const availableUsers = users.length - slotEvents.length;
          const isFreeSlot = availableUsers === users.length && users.length > 0;
          
          slots.push({
            time: slotTime,
            availableUsers,
            totalUsers: users.length,
            events: slotEvents,
            isSuggested,
            isFreeSlot,
            day
          });
        }
      }
    });
    
    return slots;
  };

  const timeSlots = useMemo(() => {
    if (view === 'day') {
      return generateDaySlots();
    } else {
      return generateWeekSlots();
    }
  }, [users, events, selectedDate, timeRange, suggestions, view, weekDays]);

  // Get free slot groups for the current view
  const freeSlotGroups = useMemo(() => {
    if (view === 'day') {
      return findFreeSlotGroups(timeSlots as TimeSlot[]);
    } else {
      // For week view, group by day
      const dayGroups: { [key: string]: FreeSlotGroup[] } = {};
      weekDays.forEach(day => {
        const daySlots = (timeSlots as (TimeSlot & { day: Date })[])
          .filter(slot => isSameDay(slot.day, day));
        dayGroups[format(day, 'yyyy-MM-dd')] = findFreeSlotGroups(daySlots);
      });
      return dayGroups;
    }
  }, [timeSlots, view, weekDays]);

  const getGridAvailabilityColor = (slot: TimeSlot & { day?: Date }) => {
    if (users.length === 0) return 'bg-gray-100';
    
    const availability = slot.availableUsers / slot.totalUsers;
    
    if (slot.isSuggested) {
      return 'bg-blue-400 border border-blue-600';
    }
    
    // Enhanced free slot highlighting
    if (highlightFreeSlots && slot.isFreeSlot) {
      return 'bg-green-500 border border-green-600 shadow-sm';
    }
    
    if (availability === 1) return 'bg-green-400';
    if (availability >= 0.75) return 'bg-green-300';
    if (availability >= 0.5) return 'bg-green-200';
    if (availability >= 0.25) return 'bg-green-100';
    if (availability > 0) return 'bg-yellow-100';
    return 'bg-red-200 border border-red-300';
  };

  const timeLabels = useMemo(() => {
    const startHour = parseInt(timeRange.start.split(':')[0]);
    const endHour = parseInt(timeRange.end.split(':')[0]);
    const labels = [];
    
    for (let hour = startHour; hour <= endHour; hour++) {
      labels.push(`${hour}:00`);
    }
    
    return labels;
  }, [timeRange]);

  const getAvailabilityColor = (slot: TimeSlot) => {
    if (users.length === 0) return 'bg-gray-100';
    
    const availability = slot.availableUsers / slot.totalUsers;
    
    if (slot.isSuggested) {
      return 'bg-blue-200 border-2 border-blue-400 shadow-sm';
    }
    
    // Enhanced free slot highlighting
    if (highlightFreeSlots && slot.isFreeSlot) {
      return 'bg-green-300 border-2 border-green-500 shadow-md';
    }
    
    if (availability === 1) return 'bg-green-200';
    if (availability >= 0.7) return 'bg-green-100';
    if (availability >= 0.5) return 'bg-yellow-100';
    if (availability > 0) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getAvailabilityText = (slot: TimeSlot) => {
    if (users.length === 0) return 'No users';
    if (slot.isFreeSlot && highlightFreeSlots) return '全員空き - 最適！';
    return `${slot.availableUsers}/${slot.totalUsers} available`;
  };

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">まだチームメンバーがいません</h3>
          <p className="text-sm">空き状況を確認するためにチームメンバーを追加してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header with Free Slot Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (view === 'day') {
                  onDateChange(subDays(selectedDate, 1));
                } else {
                  const newWeekStart = subWeeks(weekStart, 1);
                  setWeekStart(newWeekStart);
                  onDateChange(newWeekStart);
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold min-w-[200px] text-center">
              {view === 'day' 
                ? format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: ja })
                : `${format(weekStart, 'M月d日', { locale: ja })} - ${format(addDays(weekStart, 6), 'M月d日', { locale: ja })}`
              }
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (view === 'day') {
                  onDateChange(addDays(selectedDate, 1));
                } else {
                  const newWeekStart = addWeeks(weekStart, 1);
                  setWeekStart(newWeekStart);
                  onDateChange(newWeekStart);
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={highlightFreeSlots ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHighlightFreeSlots(!highlightFreeSlots)}
            className="text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            空き時間強調
          </Button>
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('day')}
          >
            日
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            週
          </Button>
        </div>
      </div>

      {/* Free Slot Summary */}
      {!isLoading && highlightFreeSlots && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">完全空き時間枠</span>
          </div>
          {view === 'day' ? (
            <div className="text-sm text-green-700">
              {(freeSlotGroups as FreeSlotGroup[]).length > 0 ? (
                <div className="space-y-1">
                  {(freeSlotGroups as FreeSlotGroup[]).map((group, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(group.startTime, 'H:mm')} - {format(group.endTime, 'H:mm')} 
                        ({group.duration}分間)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span>今日は完全な空き時間がありません</span>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-green-700">
              {weekDays.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayGroups = (freeSlotGroups as any)[dayKey] || [];
                return (
                  <div key={dayKey} className="p-2 bg-white rounded border">
                    <div className="font-medium">{format(day, 'EEE', { locale: ja })}</div>
                    <div>{dayGroups.length} 空き枠</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>カレンダーデータを読み込み中...</p>
          </div>
        </div>
      )}

      {/* Calendar Grid View */}
      {!isLoading && (
        <>
          {view === 'week' ? (
            <div className="bg-white rounded-lg border overflow-hidden">
              {/* Week Grid Header */}
              <div className="grid grid-cols-8 border-b bg-gray-50">
                <div className="p-3 text-sm font-medium text-gray-600 border-r">時間</div>
                {weekDays.map((day, index) => (
                  <div key={index} className="p-3 text-center border-r last:border-r-0">
                    <div className="text-sm font-medium text-gray-900">
                      {format(day, 'EEE', { locale: ja })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(day, 'M/d')}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Week Grid Body */}
              <div className="max-h-96 overflow-y-auto">
                {timeLabels.map((timeLabel, timeIndex) => (
                  <div key={timeIndex} className="grid grid-cols-8 border-b last:border-b-0">
                    <div className="p-2 text-xs text-gray-600 border-r bg-gray-50 flex items-center">
                      {timeLabel}
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const daySlots = timeSlots.filter(slot => 
                        (slot as any).day && isSameDay((slot as any).day, day) && 
                        format(slot.time, 'H:mm') === timeLabel
                      );
                      const slot = daySlots[0];
                      
                      return (
                        <div
                          key={dayIndex}
                          className={`h-8 border-r last:border-r-0 cursor-pointer hover:opacity-80 transition-all ${
                            slot ? getGridAvailabilityColor(slot as any) : 'bg-gray-50'
                          } ${slot?.isFreeSlot && highlightFreeSlots ? 'animate-pulse' : ''}`}
                          title={slot ? (slot.isFreeSlot ? '完全空き - 推奨時間！' : `${slot.availableUsers}/${slot.totalUsers} 利用可能`) : ''}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <div className="grid grid-cols-1 divide-y">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
                      slot.isSuggested ? 'bg-blue-50' : ''
                    } ${slot.isFreeSlot && highlightFreeSlots ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium min-w-[80px]">
                        {format(slot.time, 'H:mm')}
                      </div>
                      <div className={`w-4 h-4 rounded ${getAvailabilityColor(slot)}`} />
                      <span className={`text-sm ${slot.isFreeSlot && highlightFreeSlots ? 'font-medium text-green-700' : 'text-gray-600'}`}>
                        {getAvailabilityText(slot)}
                      </span>
                      {slot.isFreeSlot && highlightFreeSlots && (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          完全空き
                        </Badge>
                      )}
                      {slot.isSuggested && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          推奨
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {slot.events.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {slot.events.length} 競合
                        </Badge>
                      )}
                      <Button
                        variant={slot.isFreeSlot ? "default" : "outline"}
                        size="sm"
                        className={`text-xs ${slot.isFreeSlot ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        disabled={slot.availableUsers === 0}
                      >
                        {slot.isFreeSlot ? '最適選択' : '選択'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Enhanced Legend */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium mb-3">空き状況の凡例</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 border border-green-600 rounded shadow-sm" />
            <span className="text-xs font-medium">完全空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded" />
            <span className="text-xs">全員空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-300 rounded" />
            <span className="text-xs">ほぼ空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-200 rounded" />
            <span className="text-xs">半分空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 rounded" />
            <span className="text-xs">少し空き</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-200 border border-red-300 rounded" />
            <span className="text-xs">空きなし</span>
          </div>
        </div>
      </div>
    </div>
  );
}