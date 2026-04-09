import dayjs from 'dayjs'

// Base weights for each category
const CATEGORY_WEIGHTS = {
    exam: 10,
    hackathon: 9,
    assignment: 8,
    meeting: 6,
    personal: 4,
    reminder: 2,
}

// Severity level multipliers - affects final priority score
const SEVERITY_MULTIPLIERS = {
    low: 1.0,
    medium: 1.2,
    high: 1.5,
    critical: 2.0,
}

// Complexity score additions to priority
const COMPLEXITY_BONUS = {
    low: 0,      // 1-3: no bonus
    medium: 1,   // 4-6: +1 point
    high: 2,     // 7-10: +2 points
}

// Study time recommendations per category (in hours)
const STUDY_HOURS = {
    exam: 3,
    hackathon: 4,
    assignment: 2,
}

/**
 * Get the weight for a given category (case-insensitive).
 */
export function getCategoryWeight(category) {
    if (!category) return 3
    const key = category.toLowerCase().trim()
    return CATEGORY_WEIGHTS[key] ?? 3
}

/**
 * Get severity multiplier for priority calculation.
 */
export function getSeverityMultiplier(severity) {
    if (!severity) return 1.0
    const key = severity.toLowerCase().trim()
    return SEVERITY_MULTIPLIERS[key] ?? 1.0
}

/**
 * Get complexity bonus based on complexity score (1-10).
 */
export function getComplexityBonus(complexityScore) {
    if (!complexityScore) return 0
    if (complexityScore <= 3) return COMPLEXITY_BONUS.low
    if (complexityScore <= 6) return COMPLEXITY_BONUS.medium
    return COMPLEXITY_BONUS.high
}

/**
 * Get severity color for visual indicators.
 */
export function getSeverityColor(severity) {
    const colors = {
        low: { bg: '#3ddc9720', border: '#3ddc97', text: '#3ddc97' },
        medium: { bg: '#4da3ff20', border: '#4da3ff', text: '#4da3ff' },
        high: { bg: '#ff9f4320', border: '#ff9f43', text: '#ff9f43' },
        critical: { bg: '#ff475720', border: '#ff4757', text: '#ff4757' },
    }
    const key = (severity || 'medium').toLowerCase().trim()
    return colors[key] || colors.medium
}

/**
 * Calculate urgency score based on hours remaining.
 * Smoother 8-tier curve for finer priority transitions.
 */
export function getUrgencyScore(eventDatetime) {
    const now = dayjs()
    const eventTime = dayjs(eventDatetime)
    const hoursRemaining = eventTime.diff(now, 'hour', true)

    if (hoursRemaining <= 0) return 0   // Past
    if (hoursRemaining < 1) return 12   // Critical — imminent (ensures ALL categories turn red)
    if (hoursRemaining < 3) return 10   // Critical/High — very close
    if (hoursRemaining < 6) return 8    // High — approaching
    if (hoursRemaining < 12) return 6   // High
    if (hoursRemaining < 24) return 4   // Medium
    if (hoursRemaining < 48) return 3   // Medium-low
    return 2                            // Low — plenty of time
}

/**
 * Calculate priorityScore = (category_weight + urgency_score + complexity_bonus) * severity_multiplier
 * This creates a more nuanced priority system that considers:
 * - What type of event it is (category)
 * - How soon it's due (urgency)
 * - How complex/difficult it is (complexity)
 * - How severe the consequences are (severity)
 */
export function getPriorityScore(event, onboardingProfile = null) {
    const baseScore = getCategoryWeight(event.category) + getUrgencyScore(event.event_datetime)
    const complexityBonus = getComplexityBonus(event.complexity_score)
    const severityMultiplier = getSeverityMultiplier(event.severity_level)

    let bonus = 0
    if (onboardingProfile) {
        // Q1 boost: if event category matches primary_focus
        const focusMap = { exams: 'exam', projects: 'hackathon', work: 'meeting', personal: 'personal' }
        if (focusMap[onboardingProfile.primary_focus] === (event.category || '').toLowerCase()) {
            bonus += (onboardingProfile.priority_boost || 0) * 10
        }

        // Q2 motivation boost
        const motiveMap = { study: ['exam', 'assignment'], build: ['hackathon'], exercise: ['personal'], chill: ['reminder'] }
        const motiveCategories = motiveMap[onboardingProfile.motivation_type] || []
        if (motiveCategories.includes((event.category || '').toLowerCase())) {
            bonus += (onboardingProfile.motivation_weight || 0) * 10
        }

        // Q3 slot boost: if event falls in preferred_slot
        if (event.event_datetime && onboardingProfile.preferred_slot) {
            const hour = dayjs(event.event_datetime).hour()
            const eventSlot = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : hour >= 17 && hour < 21 ? 'evening' : 'night'
            if (eventSlot === onboardingProfile.preferred_slot) {
                bonus += (onboardingProfile.slot_weight || 0.5) * 3
            }
        }
    }

    return Math.round((baseScore + complexityBonus + bonus) * severityMultiplier)
}

/**
 * Get color based on priority score.
 */
export function getPriorityColor(score) {
    if (score > 15) return { bg: '#ff475720', border: '#ff4757', text: '#ff4757', label: 'Critical' }  // Red
    if (score > 10) return { bg: '#ffa50220', border: '#ffa502', text: '#ffa502', label: 'High' }      // Orange
    if (score > 5) return { bg: '#3498db20', border: '#3498db', text: '#3498db', label: 'Medium' }     // Blue
    return { bg: '#2ecc7120', border: '#2ecc71', text: '#2ecc71', label: 'Low' }                       // Green
}

/**
 * Calculate distance from center node based on priority.
 */
export function getNodeDistance(score) {
    return Math.max(100, 200 - score * 10)
}

/**
 * Sort events by priority (descending), then by datetime (ascending) for tiebreaker.
 */
export function sortByPriority(events) {
    return [...events].sort((a, b) => {
        const scoreA = getPriorityScore(a)
        const scoreB = getPriorityScore(b)
        if (scoreB !== scoreA) return scoreB - scoreA
        return dayjs(a.event_datetime).valueOf() - dayjs(b.event_datetime).valueOf()
    })
}

/**
 * Check if a category is a "study" type that generates study blocks.
 */
function isStudyCategory(category) {
    const studyCategories = ['exam', 'hackathon', 'assignment']
    return studyCategories.includes((category || '').toLowerCase().trim())
}

// ============================================================
// NOTIFICATION ALERT ENGINE
// ============================================================

/**
 * Get a notification alert for an event based on how close it is.
 * Returns null if no alert is needed, or an alert object.
 */
export function getNotificationAlert(event) {
    const now = dayjs()
    const eventTime = dayjs(event.event_datetime)
    const hours = eventTime.diff(now, 'hour', true)
    const minutes = Math.max(0, Math.round(eventTime.diff(now, 'minute', true)))

    // No alerts for past events or events > 3 hours away
    if (hours <= 0) {
        return {
            type: 'past',
            severity: 'info',
            title: 'Event has started or passed',
            message: `${event.title} was scheduled at ${eventTime.format('h:mm A')}`,
            icon: '⏰',
            color: '#94a3b8',
        }
    }

    if (hours <= 1) {
        return {
            type: 'imminent',
            severity: 'critical',
            title: 'Starting very soon!',
            message: `${event.title} in ${minutes} min — leave now / final preparations!`,
            icon: '🚨',
            color: '#ff4757',
        }
    }

    if (hours <= 2) {
        return {
            type: 'arriving_soon',
            severity: 'warning',
            title: 'Arriving soon — prepare now!',
            message: `${event.title} in ~${minutes} min — start getting ready`,
            icon: '🔔',
            color: '#ffa502',
        }
    }

    if (hours <= 3) {
        return {
            type: 'heads_up',
            severity: 'notice',
            title: 'Less than 3 hours left',
            message: `${event.title} at ${eventTime.format('h:mm A')} — wrap up current work`,
            icon: '📢',
            color: '#3498db',
        }
    }

    return null // No notification needed
}

// ============================================================
// HELPER: human-readable time remaining
// ============================================================

function formatTimeRemaining(hours) {
    if (hours <= 0) return 'now'
    if (hours < 1) {
        const mins = Math.round(hours * 60)
        return `${mins} min`
    }
    if (hours < 24) {
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    const days = Math.floor(hours / 24)
    const remainingH = Math.round(hours - days * 24)
    return remainingH > 0 ? `${days}d ${remainingH}h` : `${days}d`
}

// ============================================================
// ACTION CLAUSE ENGINE
// ============================================================

/**
 * Generate an action and recommendation for an event based on
 * its category, severity, complexity and how much time remains.
 */
export function generateAction(event) {
    const now = dayjs()
    const eventTime = dayjs(event.event_datetime)
    const hours = eventTime.diff(now, 'hour', true)
    const cat = (event.category || '').toLowerCase().trim()
    const severity = (event.severity_level || 'medium').toLowerCase().trim()
    const complexity = event.complexity_score || 5
    const timeStr = formatTimeRemaining(hours)
    const timeLabel = eventTime.format('h:mm A')

    // Use estimated_prep_hours from event if available, otherwise use defaults
    let prepHours = event.estimated_prep_hours || STUDY_HOURS[cat] || 2

    let action = ''
    let recommendation = ''
    let studyHours = null
    let icon = '📌'

    // Severity-based urgency prefixes
    const severityPrefix = {
        critical: '🚨 CRITICAL: ',
        high: '⚠️ URGENT: ',
        medium: '📌 ',
        low: '✓ ',
    }

    // ---- Category-based rules ----
    if (cat === 'exam') {
        action = `Study for ${event.title}`
        studyHours = prepHours
        icon = '📖'

        if (hours <= 0) {
            recommendation = 'Event has passed'
        } else if (hours < 1) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}EXAM IN ${timeStr}! Final review only — focus on key formulas`
        } else if (hours < 3) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}${timeStr} left — intensive cram session NOW (${studyHours}h recommended)`
        } else if (hours < 6) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}${timeStr} until exam — study immediately (${studyHours}h recommended)`
        } else if (hours < 12) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Exam at ${timeLabel} (${timeStr} left) — deep study session needed`
        } else if (hours < 24) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Start preparation today — ${timeStr} remaining (${studyHours}h blocks)`
        } else if (hours < 48) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Plan focused revision schedule — ${timeStr} until exam`
        } else {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Create study plan — you have ${timeStr} to prepare`
        }
    } else if (cat === 'hackathon') {
        action = `Work on project: ${event.title}`
        studyHours = prepHours
        icon = '🚀'

        if (hours <= 0) {
            recommendation = 'Event has passed'
        } else if (hours < 1) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}STARTS IN ${timeStr}! Finalize setup and team coordination`
        } else if (hours < 3) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}${timeStr} left — last prep window! Review tools & plan approach`
        } else if (hours < 12) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Build core features now — ${timeStr} remaining (${studyHours}h block)`
        } else if (hours < 24) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Focus on MVP today — ${timeStr} left until kickoff`
        } else {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Plan project milestones — ${timeStr} to prepare`
        }
    } else if (cat === 'assignment') {
        action = `Complete: ${event.title}`
        studyHours = prepHours
        icon = '✏️'

        if (hours <= 0) {
            recommendation = 'Past deadline'
        } else if (hours < 1) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}DUE IN ${timeStr}! Submit immediately if ready`
        } else if (hours < 3) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}${timeStr} to deadline — finish and submit NOW`
        } else if (hours < 6) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Deadline approaching — ${timeStr} left, focus intensely`
        } else if (hours < 24) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Allocate ${studyHours}h focused work today — ${timeStr} remaining`
        } else {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Schedule ${studyHours}h work block — ${timeStr} until deadline`
        }
    } else if (cat === 'meeting') {
        action = `Prepare for meeting: ${event.title}`
        icon = '🤝'

        if (hours <= 0) {
            recommendation = 'Meeting has passed'
        } else if (hours < 0.5) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}MEETING IN ${timeStr}! Join now or head to venue`
        } else if (hours < 1) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Starting in ${timeStr} — final agenda check, be ready to join`
        } else if (hours < 2) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Meeting at ${timeLabel} (${timeStr}) — review agenda & prep notes`
        } else if (hours < 24) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Prepare discussion points today — meeting in ${timeStr}`
        } else {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Review agenda in advance — meeting in ${timeStr}`
        }
    } else if (cat === 'personal') {
        action = `Prepare for: ${event.title}`
        icon = '🎉'

        if (hours <= 0) {
            recommendation = 'Event has passed'
        } else if (hours < 1) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}EVENT IN ${timeStr}! Get ready and leave now!`
        } else if (hours < 2) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Arriving soon! ${event.title} at ${timeLabel} — start getting ready`
        } else if (hours < 3) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}${timeStr} left — plan your travel / preparation time`
        } else if (hours < 24) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Reminder: ${event.title} at ${timeLabel} today (${timeStr} away)`
        } else {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Reminder: ${eventTime.format('MMM D')} at ${timeLabel} — ${timeStr} away`
        }
    } else if (cat === 'reminder') {
        action = event.title
        icon = '🔔'
        if (hours <= 0) {
            recommendation = 'Past reminder'
        } else if (hours < 1) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Reminder in ${timeStr}!`
        } else {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Reminder at ${timeLabel} — ${timeStr} from now`
        }
    } else {
        action = event.title
        icon = '📅'
        if (hours <= 0) {
            recommendation = 'Event passed'
        } else if (hours < 1) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Coming up in ${timeStr}! Prepare now`
        } else if (hours < 3) {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}${event.title} at ${timeLabel} — ${timeStr} left, get ready`
        } else {
            recommendation = `${severityPrefix[severity] || severityPrefix.medium}Coming up at ${timeLabel} — ${timeStr} away`
        }
    }

    // Add complexity note for high complexity events
    if (complexity >= 7 && hours > 1) {
        recommendation += ` | Complexity: ${complexity}/10 — break into smaller tasks`
    }

    return { action, recommendation, studyHours, icon }
}

/**
 * Build a full enriched event object with priority + action clauses + notification.
 */
export function enrichEvent(event) {
    const score = getPriorityScore(event)
    const color = getPriorityColor(score)
    const severityColor = getSeverityColor(event.severity_level)
    const { action, recommendation, studyHours, icon } = generateAction(event)
    const alert = getNotificationAlert(event)

    return {
        ...event,
        priority_score: score,
        color,
        severityColor,
        action,
        recommendation,
        studyHours,
        actionIcon: icon,
        alert,
    }
}

/**
 * Enrich and sort all events.
 */
export function enrichAndSort(events) {
    return sortByPriority(events).map(enrichEvent)
}

// ============================================================
// SCHEDULE GENERATION
// ============================================================

export function generateSchedule(events) {
    const now = dayjs()
    const schedule = []

    const futureEvents = events
        .filter((e) => dayjs(e.event_datetime).isAfter(now))
        .sort((a, b) => dayjs(a.event_datetime).valueOf() - dayjs(b.event_datetime).valueOf())

    if (futureEvents.length === 0) return []

    let cursor = now.startOf('minute')

    const prioritized = sortByPriority(futureEvents)
    const allocatedStudy = new Map()

    for (const event of prioritized) {
        if (isStudyCategory(event.category)) {
            const score = getPriorityScore(event)
            let studyMinutes = event.estimated_prep_hours ? event.estimated_prep_hours * 60 : 0
            if (!studyMinutes || studyMinutes <= 0) {
                if (score > 15) studyMinutes = 180
                else if (score > 10) studyMinutes = 120
                else if (score > 5) studyMinutes = 90
                else studyMinutes = 60
            }
            
            let subTasks = []
            if (event.action_items && event.action_items.length > 0) {
                subTasks = event.action_items
            } else if (event.key_topics && event.key_topics.length > 0) {
                subTasks = event.key_topics.map(t => `Review: ${t}`)
            } else {
                subTasks = [`Focused prep for ${event.title}`]
            }

            allocatedStudy.set(event.id, { event, studyMinutes, allocated: 0, subTasks, subTaskIndex: 0 })
        }
    }

    for (let i = 0; i < futureEvents.length; i++) {
        const event = futureEvents[i]
        const eventTime = dayjs(event.event_datetime)
        const bufferMinutes = 30
        const availableUntilEvent = eventTime.subtract(bufferMinutes, 'minute')

        if (cursor.isBefore(availableUntilEvent)) {
            const studyEntries = [...allocatedStudy.values()]
                .filter((s) => s.allocated < s.studyMinutes && dayjs(s.event.event_datetime).isAfter(cursor))
                .sort((a, b) => getPriorityScore(b.event) - getPriorityScore(a.event))

            for (const study of studyEntries) {
                if (!cursor.isBefore(availableUntilEvent)) break

                const remaining = study.studyMinutes - study.allocated
                const availableMinutes = availableUntilEvent.diff(cursor, 'minute')
                const blockMinutes = Math.min(remaining, availableMinutes, 90)

                if (blockMinutes >= 15) {
                    const { action, recommendation, icon } = generateAction(study.event)
                    
                    const currentSubTask = study.subTasks[study.subTaskIndex % study.subTasks.length];
                    const isLastBlock = (study.allocated + blockMinutes) >= study.studyMinutes;
                    
                    if (!isLastBlock && blockMinutes >= 30) {
                        study.subTaskIndex++; 
                    }

                    schedule.push({
                        id: `study-${study.event.id}-${study.allocated}`,
                        type: 'study',
                        title: `${action} ➔ ${currentSubTask}`,
                        category: study.event.category,
                        startTime: cursor.format('h:mm A'),
                        endTime: cursor.add(blockMinutes, 'minute').format('h:mm A'),
                        startDate: cursor.format('MMM D'),
                        duration: blockMinutes,
                        priority: getPriorityScore(study.event) + (isLastBlock ? 5 : 0),
                        action: `Task: ${currentSubTask}`,
                        recommendation: isLastBlock ? "Final review session — wrap it up!" : recommendation,
                        actionIcon: icon,
                    })
                    cursor = cursor.add(blockMinutes, 'minute')
                    study.allocated += blockMinutes

                    if (cursor.isBefore(availableUntilEvent) && availableUntilEvent.diff(cursor, 'minute') > 30) {
                        const breakDuration = 15
                        schedule.push({
                            id: `break-${cursor.valueOf()}`,
                            type: 'break',
                            title: 'Break',
                            startTime: cursor.format('h:mm A'),
                            endTime: cursor.add(breakDuration, 'minute').format('h:mm A'),
                            startDate: cursor.format('MMM D'),
                            duration: breakDuration,
                            priority: 0,
                            action: 'Take a break',
                            recommendation: 'Rest and recharge',
                            actionIcon: '☕',
                        })
                        cursor = cursor.add(breakDuration, 'minute')
                    }
                }
            }
        }

        const { action, recommendation, icon } = generateAction(event)
        const eventAlert = getNotificationAlert(event)
        const eventEntry = {
            id: `event-${event.id}`,
            type: isStudyCategory(event.category) ? 'exam' : 'event',
            title: event.title,
            category: event.category,
            startTime: eventTime.format('h:mm A'),
            endTime: eventTime.add(1, 'hour').format('h:mm A'),
            startDate: eventTime.format('MMM D'),
            venue: event.venue,
            duration: 60,
            priority: getPriorityScore(event),
            action,
            recommendation,
            actionIcon: icon,
            alert: eventAlert,
        }
        schedule.push(eventEntry)

        cursor = eventTime.add(1, 'hour')
    }

    return schedule
}

/**
 * Reschedule an event to a new time based on priority and availability
 */
export async function rescheduleEvent(eventId, newDateTime, supabaseClient) {
    try {
        // Update the event's datetime in the database
        const { data, error } = await supabaseClient
            .from('events')
            .update({ event_datetime: newDateTime })
            .eq('id', eventId)
            .select()

        if (error) throw error

        return data[0]
    } catch (error) {
        console.error('Reschedule event error:', error)
        throw error
    }
}

/**
 * Find the next free time slot for an event, avoiding conflicts with existing events.
 * Scans from now until end-of-work (21:00 today, or tomorrow if past 21:00).
 * Returns an ISO string for the best available slot.
 *
 * @param {Array} allEvents - all current events (to check for conflicts)
 * @param {string} excludeEventId - event ID to exclude from conflict check (the event being rescheduled)
 * @param {number} slotDurationMinutes - required slot duration (default 60)
 * @param {number} workDayEndHour - hour that the work day ends (default 21 = 9 PM)
 * @returns {string} ISO datetime string for the next free slot
 */
export function findNextFreeSlot(allEvents, excludeEventId = null, slotDurationMinutes = 60, workDayEndHour = 21) {
    const now = dayjs()
    const bufferMinutes = 30

    // Start scanning from now (rounded up to next 15-min mark)
    let scanStart = now.minute(Math.ceil(now.minute() / 15) * 15).second(0).millisecond(0)
    if (scanStart.minute() >= 60) {
        scanStart = scanStart.add(1, 'hour').minute(0)
    }

    // Collect occupied time ranges from other events (exclude the one being rescheduled)
    const occupiedRanges = allEvents
        .filter(e => e.id !== excludeEventId)
        .filter(e => dayjs(e.event_datetime).isAfter(now.subtract(1, 'hour')))
        .map(e => {
            const start = dayjs(e.event_datetime).subtract(bufferMinutes, 'minute')
            const end = dayjs(e.event_datetime).add(60 + bufferMinutes, 'minute')
            return { start, end }
        })
        .sort((a, b) => a.start.valueOf() - b.start.valueOf())

    // Scan up to 2 days ahead in 15-minute increments
    const maxScanEnd = now.add(2, 'day').hour(workDayEndHour).minute(0)
    let candidate = scanStart

    while (candidate.isBefore(maxScanEnd)) {
        const candidateHour = candidate.hour()

        // Skip sleeping hours (before 7 AM)
        if (candidateHour < 7) {
            candidate = candidate.hour(7).minute(0)
            continue
        }

        // Skip past work day end — jump to next morning
        if (candidateHour >= workDayEndHour) {
            candidate = candidate.add(1, 'day').hour(7).minute(0)
            continue
        }

        // Check if slot end would exceed work day
        const slotEnd = candidate.add(slotDurationMinutes, 'minute')
        if (slotEnd.hour() >= workDayEndHour && slotEnd.date() === candidate.date()) {
            candidate = candidate.add(1, 'day').hour(7).minute(0)
            continue
        }

        // Check for conflicts with occupied ranges
        const hasConflict = occupiedRanges.some(range => {
            return candidate.isBefore(range.end) && slotEnd.isAfter(range.start)
        })

        if (!hasConflict) {
            return candidate.toISOString()
        }

        // Move to next 15-min increment
        candidate = candidate.add(15, 'minute')
    }

    // Fallback: if no slot found, return +2 hours from now
    return now.add(2, 'hour').toISOString()
}

/**
 * Identify events that are approaching a critical deadline (e.g., exam tomorrow)
 * and suggest rescheduling lower priority tasks to accommodate preparation
 */
export function identifyReschedulingOpportunities(events) {
    const now = dayjs()
    const opportunities = []

    // Find high priority events (like exams) happening soon
    const criticalEvents = events.filter(event => {
        const eventTime = dayjs(event.event_datetime)
        const hoursToEvent = eventTime.diff(now, 'hour', true)
        const priorityScore = getPriorityScore(event)

        // Look for high priority events happening within 24 hours
        return priorityScore > 10 && hoursToEvent <= 24 && hoursToEvent > 0
    })

    // For each critical event, find lower priority tasks that could be rescheduled
    for (const criticalEvent of criticalEvents) {
        const criticalEventTime = dayjs(criticalEvent.event_datetime)

        // Find tasks that occur before the critical event and have lower priority
        const conflictingTasks = events.filter(event => {
            const eventTime = dayjs(event.event_datetime)
            const isBeforeCritical = eventTime.isBefore(criticalEventTime)
            const hasLowerPriority = getPriorityScore(event) < getPriorityScore(criticalEvent)
            const isFuture = eventTime.isAfter(now)

            return isBeforeCritical && hasLowerPriority && isFuture
        })

        opportunities.push({
            criticalEvent,
            suggestedReschedulings: conflictingTasks.map(task => ({
                taskId: task.id,
                taskTitle: task.title,
                currentDateTime: task.event_datetime,
                priorityDifference: getPriorityScore(criticalEvent) - getPriorityScore(task)
            }))
        })
    }

    return opportunities
}

// ============================================================
// CONFLICT DETECTION ENGINE
// ============================================================

/**
 * Detect schedule conflicts: events overlapping within 30 minutes.
 * Returns array of { eventA, eventB, overlapMinutes }.
 */
export function detectConflicts(events, thresholdMinutes = 30) {
    const now = dayjs()
    const futureEvents = events
        .filter((e) => dayjs(e.event_datetime).isAfter(now))
        .sort((a, b) => dayjs(a.event_datetime).valueOf() - dayjs(b.event_datetime).valueOf())

    const conflicts = []
    for (let i = 0; i < futureEvents.length; i++) {
        for (let j = i + 1; j < futureEvents.length; j++) {
            const timeA = dayjs(futureEvents[i].event_datetime)
            const timeB = dayjs(futureEvents[j].event_datetime)
            const diffMinutes = Math.abs(timeB.diff(timeA, 'minute'))

            if (diffMinutes <= thresholdMinutes) {
                conflicts.push({
                    eventA: futureEvents[i],
                    eventB: futureEvents[j],
                    overlapMinutes: thresholdMinutes - diffMinutes,
                })
            }
        }
    }
    return conflicts
}

/**
 * Generate a human-readable explanation for a schedule change.
 */
export function generateRescheduleMessage(event, changeType, conflictingEvent = null) {
    const title = event.title || 'Untitled Event'
    const messages = {
        conflict_resolved: conflictingEvent
            ? `"${title}" was moved because it conflicted with "${conflictingEvent.title}". The higher-priority event kept its slot.`
            : `"${title}" was moved to resolve a time conflict.`,
        rescheduled: `"${title}" was rescheduled to a better time slot based on your preferences.`,
        auto_moved: `"${title}" was automatically moved by Chrona's AI to optimize your schedule.`,
        user_moved: `"${title}" was manually rescheduled by you.`,
        completed: `"${title}" was marked as completed.`,
        skipped: `"${title}" was skipped and may be rescheduled later.`,
    }
    return messages[changeType] || `"${title}" was modified.`
}

/**
 * Apply onboarding profile boosts to a list of events.
 * Returns enriched + sorted events with boosted scores.
 */
export function enrichAndSortWithProfile(events, onboardingProfile = null) {
    return [...events]
        .map((event) => {
            const score = getPriorityScore(event, onboardingProfile)
            const color = getPriorityColor(score)
            const severityColor = getSeverityColor(event.severity_level)
            const { action, recommendation, studyHours, icon } = generateAction(event)
            const alert = getNotificationAlert(event)
            return {
                ...event,
                priority_score: score,
                color,
                severityColor,
                action,
                recommendation,
                studyHours,
                actionIcon: icon,
                alert,
            }
        })
        .sort((a, b) => {
            if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score
            return dayjs(a.event_datetime).valueOf() - dayjs(b.event_datetime).valueOf()
        })
}
