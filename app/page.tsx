'use client';

import { useState, useEffect } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { CalendarScheduler } from '@/components/CalendarScheduler';
import { UserManager } from '@/components/UserManager';
import { ScheduleSuggestions } from '@/components/ScheduleSuggestions';
import { TimeRangeSelector } from '@/components/TimeRangeSelector';
import { ScheduleMatcher } from '@/lib/schedule-matcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Clock, CheckSquare } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  attendees?: string[];
}

export interface ScheduleSuggestion {
  id: string;
  startTime: Date;
  endTime: Date;
  availableUsers: string[];
  conflictUsers: string[];
  score: number;
}

export interface TimeRange {
  start: string; // HH:MM
  end: string;   // HH:MM
}

function HomeContent() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>({ start: '09:00', end: '22:00' });
  const [meetingDuration, setMeetingDuration] = useState(60); // minutes
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Add signed‑in user once session is ready
  useEffect(() => {
    if (session?.user?.email) {
      setUsers([{
        id: session.user.email,
        email: session.user.email,
        name: session.user.name || session.user.email
      }]);
    }
  }, [session]);

  // Parallelized fetch + session‑based tokens
  const refreshCalendarData = async () => {
    if (users.length === 0) return;
    setIsLoading(true);

    const dayStart = startOfDay(selectedDate);
    const dayEnd   = endOfDay(selectedDate);

    try {
      // 1) Kick off all requests in parallel
      const fetches = users.map(user =>
        fetch('/api/calendar/get-events', {
          method: 'POST',
          credentials: 'include', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString()
          })
        })
        .then(res => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then(data => ({ userId: user.id, events: data.events }))
      );

      // 2) Await them all at once
      const results = await Promise.all(fetches);

      // 3) Flatten into CalendarEvent[]
      const allEvents = results.flatMap(({ userId, events: evts }) =>
        evts.map((e: any) => ({
          id: e.id,
          summary: e.summary,
          start: new Date(e.start.dateTime),
          end:   new Date(e.end.dateTime),
          attendees: [ users.find(u => u.id === userId)!.email ]
        }))
      );

      setEvents(allEvents);

      // 4) Generate suggestions
      const suggestionsRaw = ScheduleMatcher.findOptimalTimeSlots(
        new Map(results.map(r => [ r.userId, r.events ])),
        meetingDuration,
        timeRange,
        selectedDate,
        5
      );

      setSuggestions(
        suggestionsRaw.map((s, i) => ({
          id: `suggestion-${i}`,
          startTime: s.startTime,
          endTime:   s.endTime,
          availableUsers: s.availableUsers,
          conflictUsers:  s.conflictUsers,
          score: s.score
        }))
      );
    } catch (error) {
      console.error('Failed to refresh calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-run when dependencies change
  useEffect(() => {
    refreshCalendarData();
  }, [users, selectedDate, timeRange, meetingDuration]);

  // ... (UI rendering unchanged) ...
  console.log('Rendering HomeContent with users:', users);
  console.log('Selected date:', selectedDate);
  console.log('Time range:', timeRange);
  console.log('Meeting duration:', meetingDuration);
  console.log('Events:', events);
  console.log('Suggestions:', suggestions);
  console.log('Is loading:', isLoading);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            スマートカレンダースケジューラー
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Googleカレンダーを接続して、全員にとって最適な会議時間を見つけましょう。
            インテリジェントマッチングが最適な空き時間を自動的に見つけます。
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="xl:col-span-1 space-y-6">
            {/* User Management */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> チームメンバー
                </CardTitle>
                <CardDescription>
                  相互の空き時間を見つけるためにチームメンバーを追加
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManager 
                  users={users}
                  onAddUser={u => setUsers(prev => [...prev, u])}
                  onRemoveUser={id => setUsers(prev => prev.filter(u => u.id !== id))}
                />
              </CardContent>
            </Card>

            {/* Time Range */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" /> 会議設定
                </CardTitle>
                <CardDescription>
                  会議の設定を構成
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeRangeSelector
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  meetingDuration={meetingDuration}
                  onDurationChange={setMeetingDuration}
                />
              </CardContent>
            </Card>

            {/* Suggestions */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" /> 最適な時間枠
                </CardTitle>
                <CardDescription>
                  推奨される上位5つの会議時間
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleSuggestions
                  suggestions={suggestions}
                  users={users}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-2">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> チーム空き状況
                </CardTitle>
                <CardDescription>
                  緑 = 全員空き、黄 = 一部競合、赤 = 利用不可
                </CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <CalendarScheduler
                  users={users}
                  events={events}
                  timeRange={timeRange}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  suggestions={suggestions}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <HomeContent />
    </SessionProvider>
  );
}
