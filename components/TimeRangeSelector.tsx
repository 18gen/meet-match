'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { TimeRange } from '@/app/page';

interface TimeRangeSelectorProps {
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  meetingDuration: number;
  onDurationChange: (duration: number) => void;
}

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30'
];

const formatTime12Hour = (time24: string) => {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

export function TimeRangeSelector({
  timeRange,
  onTimeRangeChange,
  meetingDuration,
  onDurationChange
}: TimeRangeSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Time Range */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">利用可能時間</Label>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">開始時間</Label>
            <Select
              value={timeRange.start}
              onValueChange={(start) => onTimeRangeChange({ ...timeRange, start })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.slice(0, -1).map(time => (
                  <SelectItem key={time} value={time}>
                    {formatTime12Hour(time)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">終了時間</Label>
            <Select
              value={timeRange.end}
              onValueChange={(end) => onTimeRangeChange({ ...timeRange, end })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.slice(1).map(time => (
                  <SelectItem key={time} value={time}>
                    {formatTime12Hour(time)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Meeting Duration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">会議時間</Label>
          <span className="text-sm text-gray-500">
            {meetingDuration} 分
          </span>
        </div>
        
        <Slider
          value={[meetingDuration]}
          onValueChange={([value]) => onDurationChange(value)}
          max={240}
          min={15}
          step={15}
          className="w-full"
        />
        
        <div className="flex justify-between text-xs text-gray-400">
          <span>15分</span>
          <span>4時間</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">クイック設定</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onTimeRangeChange({ start: '09:00', end: '17:00' })}
            className="text-xs p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            営業時間
          </button>
          <button
            onClick={() => onTimeRangeChange({ start: '08:00', end: '20:00' })}
            className="text-xs p-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            延長時間
          </button>
        </div>
      </div>
    </div>
  );
}