import type { CalendarEvent } from '@/app/page';

// Schedule matching algorithm
export class ScheduleMatcher {
  static findOptimalTimeSlots(
    userEvents: Map<string, CalendarEvent[]>,
    duration: number, // in minutes
    timeRange: { start: string; end: string },
    targetDate: Date,
    maxSuggestions: number = 5
  ): Array<{
    startTime: Date;
    endTime: Date;
    availableUsers: string[];
    conflictUsers: string[];
    score: number;
  }> {
    const suggestions: Array<{
      startTime: Date;
      endTime: Date;
      availableUsers: string[];
      conflictUsers: string[];
      score: number;
    }> = [];

    const startHour = parseInt(timeRange.start.split(':')[0]);
    const startMinute = parseInt(timeRange.start.split(':')[1]);
    const endHour = parseInt(timeRange.end.split(':')[0]);
    const endMinute = parseInt(timeRange.end.split(':')[1]);

    // Generate 15-minute time slots within the range
    for (let hour = startHour; hour <= endHour; hour++) {
      const maxMinute = hour === endHour ? endMinute : 60;
      for (let minute = hour === startHour ? startMinute : 0; minute < maxMinute; minute += 15) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Skip if slot extends beyond time range
        if (slotEnd.getHours() > endHour || 
           (slotEnd.getHours() === endHour && slotEnd.getMinutes() > endMinute)) {
          continue;
        }

        const availableUsers: string[] = [];
        const conflictUsers: string[] = [];

        // Check each user's availability
        for (const [userId, events] of userEvents.entries()) {
          const hasConflict = events.some(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            
            return (slotStart < eventEnd && slotEnd > eventStart);
          });

          if (hasConflict) {
            conflictUsers.push(userId);
          } else {
            availableUsers.push(userId);
          }
        }

        // Calculate score based on availability
        const totalUsers = userEvents.size;
        const score = totalUsers > 0 ? (availableUsers.length / totalUsers) * 100 : 0;

        suggestions.push({
          startTime: new Date(slotStart),
          endTime: new Date(slotEnd),
          availableUsers,
          conflictUsers,
          score,
        });
      }
    }

    // Sort by score (descending) and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  }
}