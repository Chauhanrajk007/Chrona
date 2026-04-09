// ============================================================
// priorityEngine.js — AI Priority Engine (ported from src/lib)
// Scoring, conflict detection, scheduling, rescheduling
// ============================================================

// Base weights for each category
const CATEGORY_WEIGHTS = {
  exam: 10,
  hackathon: 9,
  assignment: 8,
  meeting: 6,
  personal: 4,
  reminder: 2,
};

const SEVERITY_MULTIPLIERS = { low: 1.0, medium: 1.2, high: 1.5, critical: 2.0 };
const COMPLEXITY_BONUS = { low: 0, medium: 1, high: 2 };
const STUDY_HOURS = { exam: 3, hackathon: 4, assignment: 2 };

export function getCategoryWeight(category) {
  if (!category) return 3;
  return CATEGORY_WEIGHTS[category.toLowerCase().trim()] ?? 3;
}

export function getSeverityMultiplier(severity) {
  if (!severity) return 1.0;
  return SEVERITY_MULTIPLIERS[severity.toLowerCase().trim()] ?? 1.0;
}

export function getComplexityBonus(complexityScore) {
  if (!complexityScore) return 0;
  if (complexityScore <= 3) return COMPLEXITY_BONUS.low;
  if (complexityScore <= 6) return COMPLEXITY_BONUS.medium;
  return COMPLEXITY_BONUS.high;
}

export function getSeverityColor(severity) {
  const colors = {
    low: { bg: '#3ddc9720', border: '#3ddc97', text: '#3ddc97' },
    medium: { bg: '#4da3ff20', border: '#4da3ff', text: '#4da3ff' },
    high: { bg: '#ff9f4320', border: '#ff9f43', text: '#ff9f43' },
    critical: { bg: '#ff475720', border: '#ff4757', text: '#ff4757' },
  };
  const key = (severity || 'medium').toLowerCase().trim();
  return colors[key] || colors.medium;
}

// Urgency score: 8-tier curve
export function getUrgencyScore(eventDatetime) {
  const now = new Date();
  const eventTime = new Date(eventDatetime);
  const hoursRemaining = (eventTime - now) / 3600000;
  if (hoursRemaining <= 0) return 0;
  if (hoursRemaining < 1) return 12;
  if (hoursRemaining < 3) return 10;
  if (hoursRemaining < 6) return 8;
  if (hoursRemaining < 12) return 6;
  if (hoursRemaining < 24) return 4;
  if (hoursRemaining < 48) return 3;
  return 2;
}

export function getPriorityScore(event, onboardingProfile = null) {
  const baseScore = getCategoryWeight(event.category) + getUrgencyScore(event.event_datetime);
  const complexityBonus = getComplexityBonus(event.complexity_score);
  const severityMultiplier = getSeverityMultiplier(event.severity_level);

  let bonus = 0;
  if (onboardingProfile) {
    const focusMap = { exams: 'exam', projects: 'hackathon', work: 'meeting', personal: 'personal' };
    if (focusMap[onboardingProfile.primary_focus] === (event.category || '').toLowerCase()) {
      bonus += (onboardingProfile.priority_boost || 0) * 10;
    }
    const motiveMap = { study: ['exam', 'assignment'], build: ['hackathon'], exercise: ['personal'], chill: ['reminder'] };
    const motiveCategories = motiveMap[onboardingProfile.motivation_type] || [];
    if (motiveCategories.includes((event.category || '').toLowerCase())) {
      bonus += (onboardingProfile.motivation_weight || 0) * 10;
    }
    if (event.event_datetime && onboardingProfile.preferred_slot) {
      const hour = new Date(event.event_datetime).getHours();
      const eventSlot = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : hour >= 17 && hour < 21 ? 'evening' : 'night';
      if (eventSlot === onboardingProfile.preferred_slot) {
        bonus += (onboardingProfile.slot_weight || 0.5) * 3;
      }
    }
  }
  return Math.round((baseScore + complexityBonus + bonus) * severityMultiplier);
}

export function getPriorityColor(score) {
  if (score > 15) return { bg: '#ff475720', border: '#ff4757', text: '#ff4757', label: 'Critical' };
  if (score > 10) return { bg: '#ffa50220', border: '#ffa502', text: '#ffa502', label: 'High' };
  if (score > 5)  return { bg: '#3498db20', border: '#3498db', text: '#3498db', label: 'Medium' };
  return { bg: '#2ecc7120', border: '#2ecc71', text: '#2ecc71', label: 'Low' };
}

export function sortByPriority(events) {
  return [...events].sort((a, b) => {
    const scoreA = getPriorityScore(a);
    const scoreB = getPriorityScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(a.event_datetime) - new Date(b.event_datetime);
  });
}

// ============================================================
// NOTIFICATION ALERT ENGINE
// ============================================================

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getNotificationAlert(event) {
  const now = new Date();
  const eventTime = new Date(event.event_datetime);
  const hours = (eventTime - now) / 3600000;
  const minutes = Math.max(0, Math.round((eventTime - now) / 60000));

  if (hours <= 0) return { type: 'past', severity: 'info', title: 'Event has started or passed', message: `${event.title} was scheduled at ${fmtTime(event.event_datetime)}`, icon: '⏰', color: '#94a3b8' };
  if (hours <= 1) return { type: 'imminent', severity: 'critical', title: 'Starting very soon!', message: `${event.title} in ${minutes} min — final preparations!`, icon: '🚨', color: '#ff4757' };
  if (hours <= 2) return { type: 'arriving_soon', severity: 'warning', title: 'Arriving soon — prepare now!', message: `${event.title} in ~${minutes} min — start getting ready`, icon: '🔔', color: '#ffa502' };
  if (hours <= 3) return { type: 'heads_up', severity: 'notice', title: 'Less than 3 hours left', message: `${event.title} at ${fmtTime(event.event_datetime)} — wrap up current work`, icon: '📢', color: '#3498db' };
  return null;
}

// ============================================================
// ACTION CLAUSE ENGINE
// ============================================================

function formatTimeRemaining(hours) {
  if (hours <= 0) return 'now';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingH = Math.round(hours - days * 24);
  return remainingH > 0 ? `${days}d ${remainingH}h` : `${days}d`;
}

export function generateAction(event) {
  const now = new Date();
  const eventTime = new Date(event.event_datetime);
  const hours = (eventTime - now) / 3600000;
  const cat = (event.category || '').toLowerCase().trim();
  const severity = (event.severity_level || 'medium').toLowerCase().trim();
  const complexity = event.complexity_score || 5;
  const timeStr = formatTimeRemaining(hours);
  const timeLabel = fmtTime(event.event_datetime);
  let prepHours = event.estimated_prep_hours || STUDY_HOURS[cat] || 2;
  let action = '', recommendation = '', studyHours = null, icon = '📌';

  const pfx = { critical: '🚨 CRITICAL: ', high: '⚠️ URGENT: ', medium: '📌 ', low: '✓ ' };
  const sp = pfx[severity] || pfx.medium;

  if (cat === 'exam') {
    action = `Study for ${event.title}`; studyHours = prepHours; icon = '📖';
    if (hours <= 0) recommendation = 'Event has passed';
    else if (hours < 1) recommendation = `${sp}EXAM IN ${timeStr}! Final review only — focus on key formulas`;
    else if (hours < 3) recommendation = `${sp}${timeStr} left — intensive cram session NOW (${studyHours}h recommended)`;
    else if (hours < 6) recommendation = `${sp}${timeStr} until exam — study immediately (${studyHours}h recommended)`;
    else if (hours < 12) recommendation = `${sp}Exam at ${timeLabel} (${timeStr} left) — deep study session needed`;
    else if (hours < 24) recommendation = `${sp}Start preparation today — ${timeStr} remaining (${studyHours}h blocks)`;
    else if (hours < 48) recommendation = `${sp}Plan focused revision schedule — ${timeStr} until exam`;
    else recommendation = `${sp}Create study plan — you have ${timeStr} to prepare`;
  } else if (cat === 'hackathon') {
    action = `Work on project: ${event.title}`; studyHours = prepHours; icon = '🚀';
    if (hours <= 0) recommendation = 'Event has passed';
    else if (hours < 1) recommendation = `${sp}STARTS IN ${timeStr}! Finalize setup and team coordination`;
    else if (hours < 3) recommendation = `${sp}${timeStr} left — last prep window! Review tools & plan approach`;
    else if (hours < 12) recommendation = `${sp}Build core features now — ${timeStr} remaining (${studyHours}h block)`;
    else if (hours < 24) recommendation = `${sp}Focus on MVP today — ${timeStr} left until kickoff`;
    else recommendation = `${sp}Plan project milestones — ${timeStr} to prepare`;
  } else if (cat === 'assignment') {
    action = `Complete: ${event.title}`; studyHours = prepHours; icon = '✏️';
    if (hours <= 0) recommendation = 'Past deadline';
    else if (hours < 1) recommendation = `${sp}DUE IN ${timeStr}! Submit immediately if ready`;
    else if (hours < 3) recommendation = `${sp}${timeStr} to deadline — finish and submit NOW`;
    else if (hours < 6) recommendation = `${sp}Deadline approaching — ${timeStr} left, focus intensely`;
    else if (hours < 24) recommendation = `${sp}Allocate ${studyHours}h focused work today — ${timeStr} remaining`;
    else recommendation = `${sp}Schedule ${studyHours}h work block — ${timeStr} until deadline`;
  } else if (cat === 'meeting') {
    action = `Prepare for meeting: ${event.title}`; icon = '🤝';
    if (hours <= 0) recommendation = 'Meeting has passed';
    else if (hours < 0.5) recommendation = `${sp}MEETING IN ${timeStr}! Join now or head to venue`;
    else if (hours < 1) recommendation = `${sp}Starting in ${timeStr} — final agenda check, be ready to join`;
    else if (hours < 2) recommendation = `${sp}Meeting at ${timeLabel} (${timeStr}) — review agenda & prep notes`;
    else if (hours < 24) recommendation = `${sp}Prepare discussion points today — meeting in ${timeStr}`;
    else recommendation = `${sp}Review agenda in advance — meeting in ${timeStr}`;
  } else if (cat === 'personal') {
    action = `Prepare for: ${event.title}`; icon = '🎉';
    if (hours <= 0) recommendation = 'Event has passed';
    else if (hours < 1) recommendation = `${sp}EVENT IN ${timeStr}! Get ready and leave now!`;
    else if (hours < 2) recommendation = `${sp}Arriving soon! ${event.title} at ${timeLabel} — start getting ready`;
    else if (hours < 3) recommendation = `${sp}${timeStr} left — plan your travel / preparation time`;
    else if (hours < 24) recommendation = `${sp}Reminder: ${event.title} at ${timeLabel} today (${timeStr} away)`;
    else recommendation = `${sp}Reminder: ${new Date(event.event_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeLabel} — ${timeStr} away`;
  } else if (cat === 'reminder') {
    action = event.title; icon = '🔔';
    if (hours <= 0) recommendation = 'Past reminder';
    else if (hours < 1) recommendation = `${sp}Reminder in ${timeStr}!`;
    else recommendation = `${sp}Reminder at ${timeLabel} — ${timeStr} from now`;
  } else {
    action = event.title; icon = '📅';
    if (hours <= 0) recommendation = 'Event passed';
    else if (hours < 1) recommendation = `${sp}Coming up in ${timeStr}! Prepare now`;
    else if (hours < 3) recommendation = `${sp}${event.title} at ${timeLabel} — ${timeStr} left, get ready`;
    else recommendation = `${sp}Coming up at ${timeLabel} — ${timeStr} away`;
  }

  if (complexity >= 7 && hours > 1) recommendation += ` | Complexity: ${complexity}/10 — break into smaller tasks`;
  return { action, recommendation, studyHours, icon };
}

// ============================================================
// ENRICHMENT
// ============================================================

export function enrichEvent(event) {
  const score = getPriorityScore(event);
  const color = getPriorityColor(score);
  const severityColor = getSeverityColor(event.severity_level);
  const { action, recommendation, studyHours, icon } = generateAction(event);
  const alert = getNotificationAlert(event);
  return { ...event, priority_score: score, color, severityColor, action, recommendation, studyHours, actionIcon: icon, alert };
}

export function enrichAndSort(events) {
  return sortByPriority(events).map(enrichEvent);
}

export function enrichAndSortWithProfile(events, onboardingProfile) {
  return [...events]
    .map(event => {
      const score = getPriorityScore(event, onboardingProfile);
      const color = getPriorityColor(score);
      const severityColor = getSeverityColor(event.severity_level);
      const { action, recommendation, studyHours, icon } = generateAction(event);
      const alert = getNotificationAlert(event);
      return { ...event, priority_score: score, color, severityColor, action, recommendation, studyHours, actionIcon: icon, alert };
    })
    .sort((a, b) => {
      if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
      return new Date(a.event_datetime) - new Date(b.event_datetime);
    });
}

// ============================================================
// SCHEDULE GENERATION
// ============================================================

function isStudyCategory(category) {
  return ['exam', 'hackathon', 'assignment'].includes((category || '').toLowerCase().trim());
}

export function generateSchedule(events) {
  const now = new Date();
  const schedule = [];
  const futureEvents = events
    .filter(e => new Date(e.event_datetime) > now)
    .sort((a, b) => new Date(a.event_datetime) - new Date(b.event_datetime));

  if (futureEvents.length === 0) return [];

  let cursor = new Date(now);
  cursor.setSeconds(0, 0);

  const prioritized = sortByPriority(futureEvents);
  const allocatedStudy = new Map();

  for (const event of prioritized) {
    if (isStudyCategory(event.category)) {
      const score = getPriorityScore(event);
      let studyMinutes = event.estimated_prep_hours ? event.estimated_prep_hours * 60 : 0;
      if (!studyMinutes || studyMinutes <= 0) {
        if (score > 15) studyMinutes = 180;
        else if (score > 10) studyMinutes = 120;
        else if (score > 5) studyMinutes = 90;
        else studyMinutes = 60;
      }
      let subTasks = [];
      if (event.action_items?.length > 0) subTasks = event.action_items;
      else if (event.key_topics?.length > 0) subTasks = event.key_topics.map(t => `Review: ${t}`);
      else subTasks = [`Focused prep for ${event.title}`];
      allocatedStudy.set(event.id, { event, studyMinutes, allocated: 0, subTasks, subTaskIndex: 0 });
    }
  }

  for (let i = 0; i < futureEvents.length; i++) {
    const event = futureEvents[i];
    const eventTime = new Date(event.event_datetime);
    const availableUntilEvent = new Date(eventTime.getTime() - 30 * 60000);

    if (cursor < availableUntilEvent) {
      const studyEntries = [...allocatedStudy.values()]
        .filter(s => s.allocated < s.studyMinutes && new Date(s.event.event_datetime) > cursor)
        .sort((a, b) => getPriorityScore(b.event) - getPriorityScore(a.event));

      for (const study of studyEntries) {
        if (cursor >= availableUntilEvent) break;
        const remaining = study.studyMinutes - study.allocated;
        const availableMinutes = (availableUntilEvent - cursor) / 60000;
        const blockMinutes = Math.min(remaining, availableMinutes, 90);

        if (blockMinutes >= 15) {
          const { action, recommendation, icon } = generateAction(study.event);
          const currentSubTask = study.subTasks[study.subTaskIndex % study.subTasks.length];
          const isLastBlock = (study.allocated + blockMinutes) >= study.studyMinutes;
          if (!isLastBlock && blockMinutes >= 30) study.subTaskIndex++;

          schedule.push({
            id: `study-${study.event.id}-${study.allocated}`,
            type: 'study',
            title: `${action} ➔ ${currentSubTask}`,
            category: study.event.category,
            startTime: cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            endTime: new Date(cursor.getTime() + blockMinutes * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            startDate: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            duration: blockMinutes,
            priority: getPriorityScore(study.event) + (isLastBlock ? 5 : 0),
            action: `Task: ${currentSubTask}`,
            recommendation: isLastBlock ? 'Final review session — wrap it up!' : recommendation,
            actionIcon: icon,
          });
          cursor = new Date(cursor.getTime() + blockMinutes * 60000);
          study.allocated += blockMinutes;

          if (cursor < availableUntilEvent && (availableUntilEvent - cursor) > 30 * 60000) {
            schedule.push({
              id: `break-${cursor.getTime()}`,
              type: 'break',
              title: 'Break',
              startTime: cursor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              endTime: new Date(cursor.getTime() + 15 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              startDate: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              duration: 15,
              priority: 0,
              action: 'Take a break',
              recommendation: 'Rest and recharge',
              actionIcon: '☕',
            });
            cursor = new Date(cursor.getTime() + 15 * 60000);
          }
        }
      }
    }

    const { action, recommendation, icon } = generateAction(event);
    const eventAlert = getNotificationAlert(event);
    schedule.push({
      id: `event-${event.id}`,
      type: isStudyCategory(event.category) ? 'exam' : 'event',
      title: event.title,
      category: event.category,
      startTime: eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      endTime: new Date(eventTime.getTime() + 3600000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      startDate: eventTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      venue: event.venue,
      duration: 60,
      priority: getPriorityScore(event),
      action,
      recommendation,
      actionIcon: icon,
      alert: eventAlert,
    });
    cursor = new Date(eventTime.getTime() + 3600000);
  }
  return schedule;
}

// ============================================================
// RESCHEDULE & CONFLICT
// ============================================================

export function findNextFreeSlot(allEvents, excludeEventId = null, slotDurationMinutes = 60, workDayEndHour = 21) {
  const now = new Date();
  const coeff = 15 * 60000;
  let scanStart = new Date(Math.ceil(now.getTime() / coeff) * coeff);

  const occupiedRanges = allEvents
    .filter(e => e.id !== excludeEventId)
    .filter(e => new Date(e.event_datetime) > new Date(now.getTime() - 3600000))
    .map(e => {
      const start = new Date(e.event_datetime).getTime() - 30 * 60000;
      const end = new Date(e.event_datetime).getTime() + (60 + 30) * 60000;
      return { start, end };
    })
    .sort((a, b) => a.start - b.start);

  const maxScanEnd = new Date(now.getTime() + 2 * 24 * 3600000);
  maxScanEnd.setHours(workDayEndHour, 0, 0, 0);
  let candidate = new Date(scanStart);

  while (candidate < maxScanEnd) {
    const candidateHour = candidate.getHours();
    if (candidateHour < 7) { candidate.setHours(7, 0, 0, 0); continue; }
    if (candidateHour >= workDayEndHour) { candidate.setDate(candidate.getDate() + 1); candidate.setHours(7, 0, 0, 0); continue; }

    const slotEnd = candidate.getTime() + slotDurationMinutes * 60000;
    const slotEndDate = new Date(slotEnd);
    if (slotEndDate.getHours() >= workDayEndHour && slotEndDate.getDate() === candidate.getDate()) {
      candidate.setDate(candidate.getDate() + 1); candidate.setHours(7, 0, 0, 0); continue;
    }

    const hasConflict = occupiedRanges.some(range => candidate.getTime() < range.end && slotEnd > range.start);
    if (!hasConflict) return candidate.toISOString();

    candidate = new Date(candidate.getTime() + 15 * 60000);
  }
  return new Date(now.getTime() + 2 * 3600000).toISOString();
}

export function identifyReschedulingOpportunities(events) {
  const now = new Date();
  const opportunities = [];
  const criticalEvents = events.filter(event => {
    const hoursToEvent = (new Date(event.event_datetime) - now) / 3600000;
    return getPriorityScore(event) > 10 && hoursToEvent <= 24 && hoursToEvent > 0;
  });

  for (const criticalEvent of criticalEvents) {
    const criticalEventTime = new Date(criticalEvent.event_datetime);
    const conflictingTasks = events.filter(event => {
      const eventTime = new Date(event.event_datetime);
      return eventTime < criticalEventTime && getPriorityScore(event) < getPriorityScore(criticalEvent) && eventTime > now;
    });
    if (conflictingTasks.length > 0) {
      opportunities.push({
        criticalEvent,
        suggestedReschedulings: conflictingTasks.map(task => ({
          taskId: task.id, taskTitle: task.title, currentDateTime: task.event_datetime,
          priorityDifference: getPriorityScore(criticalEvent) - getPriorityScore(task)
        }))
      });
    }
  }
  return opportunities;
}

export function detectConflicts(events, thresholdMinutes = 30) {
  const now = new Date();
  const futureEvents = events
    .filter(e => new Date(e.event_datetime) > now)
    .sort((a, b) => new Date(a.event_datetime) - new Date(b.event_datetime));

  const conflicts = [];
  for (let i = 0; i < futureEvents.length; i++) {
    for (let j = i + 1; j < futureEvents.length; j++) {
      const diff = Math.abs(new Date(futureEvents[j].event_datetime) - new Date(futureEvents[i].event_datetime)) / 60000;
      if (diff <= thresholdMinutes) {
        conflicts.push({ eventA: futureEvents[i], eventB: futureEvents[j], overlapMinutes: thresholdMinutes - diff });
      }
    }
  }
  return conflicts;
}

export function generateRescheduleMessage(event, changeType, conflictingEvent = null) {
  const title = event.title || 'Untitled Event';
  const messages = {
    conflict_resolved: conflictingEvent
      ? `"${title}" was moved because it conflicted with "${conflictingEvent.title}". The higher-priority event kept its slot.`
      : `"${title}" was moved to resolve a time conflict.`,
    rescheduled: `"${title}" was rescheduled to a better time slot based on your preferences.`,
    auto_moved: `"${title}" was automatically moved by Chrona's AI to optimize your schedule.`,
    user_moved: `"${title}" was manually rescheduled by you.`,
    completed: `"${title}" was marked as completed.`,
    skipped: `"${title}" was skipped and may be rescheduled later.`,
  };
  return messages[changeType] || `"${title}" was modified.`;
}

export async function rescheduleEvent(eventId, newDateTime, supabaseClient) {
  const { data, error } = await supabaseClient
    .from('events')
    .update({ event_datetime: newDateTime })
    .eq('id', eventId)
    .select();
  if (error) throw error;
  return data[0];
}
