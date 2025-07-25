'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Users, Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import type { User, ScheduleSuggestion } from '@/app/page';

interface ScheduleSuggestionsProps {
  suggestions: ScheduleSuggestion[];
  users: User[];
}

export function ScheduleSuggestions({ suggestions, users }: ScheduleSuggestionsProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

  const handleToggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(suggestionId)
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const getUsersByIds = (userIds: string[]) => {
    return users.filter(user => userIds.includes(user.id));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleScheduleSelected = () => {
    if (selectedSuggestions.length === 0) return;
    
    const selectedTimes = suggestions
      .filter(s => selectedSuggestions.includes(s.id))
      .map(s => format(s.startTime, 'M月d日 (EEEE) H:mm', { locale: ja }));
    
    alert(`選択された時間:\n${selectedTimes.join('\n')}\n\n全参加者にカレンダー招待が送信されます。`);
  };

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">提案がありません</p>
        <p className="text-xs">推奨事項を表示するにはチームメンバーを追加してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion, index) => {
        const availableUsers = getUsersByIds(suggestion.availableUsers);
        const conflictUsers = getUsersByIds(suggestion.conflictUsers);
        const isSelected = selectedSuggestions.includes(suggestion.id);
        
        return (
          <div
            key={suggestion.id}
            className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleToggleSuggestion(suggestion.id)}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggleSuggestion(suggestion.id)}
                className="mt-1"
              />
              
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    <h4 className="font-medium">
                      選択肢 {index + 1}
                    </h4>
                    <Badge className={`text-xs ${getScoreColor(suggestion.score)}`}>
                      {suggestion.score}% マッチ
                    </Badge>
                  </div>
                </div>
                
                {/* Time */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {format(suggestion.startTime, 'M月d日 (EEEE)', { locale: ja })}
                  </span>
                  <span>•</span>
                  <span>
                    {format(suggestion.startTime, 'H:mm')} - {format(suggestion.endTime, 'H:mm')}
                  </span>
                </div>
                
                {/* Available Users */}
                {availableUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Users className="h-4 w-4" />
                      <span>利用可能 ({availableUsers.length})</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {availableUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-[8px]">
                              {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Conflict Users */}
                {conflictUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-red-700">
                      <Users className="h-4 w-4" />
                      <span>競合 ({conflictUsers.length})</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {conflictUsers.map(user => (
                        <div
                          key={user.id}
                          className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-[8px]">
                              {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Action Buttons */}
      {selectedSuggestions.length > 0 && (
        <div className="pt-4 border-t">
          <Button 
            onClick={handleScheduleSelected}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            選択した時間をスケジュール ({selectedSuggestions.length})
          </Button>
        </div>
      )}
    </div>
  );
}