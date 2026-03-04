import dayjs from 'dayjs'

const CATEGORY_WEIGHTS = {
    exam: 10,
    hackathon: 9,
    assignment: 8,
    meeting: 6,
    personal: 4,
    reminder: 2,
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
 * Calculate urgency score based on hours remaining.
 */
export function getUrgencyScore(eventDatetime) {
    const now = dayjs()
    const eventTime = dayjs(eventDatetime)
    const hoursRemaining = eventTime.diff(now, 'hour', true)

    if (hoursRemaining <= 0) return 0
    if (hoursRemaining < 6) return 10
    if (hoursRemaining < 12) return 8
    if (hoursRemaining < 24) return 6
    if (hoursRemaining < 48) return 4
    return 2
}

/**
 * Calculate priorityScore = category_weight + urgency_score
 */
export function getPriorityScore(event) {
    return getCategoryWeight(event.category) + getUrgencyScore(event.event_datetime)
}

/**
 * Get color based on priority score.
 */
export function getPriorityColor(score) {
    if (score > 15) return { bg: '#e8a83820', border: '#e8a838', text: '#e8a838', label: 'Critical' }
    if (score > 10) return { bg: '#3bbfa720', border: '#3bbfa7', text: '#3bbfa7', label: 'High' }
    if (score > 5) return { bg: '#5ce0c820', border: '#5ce0c8', text: '#5ce0c8', label: 'Medium' }
    return { bg: '#2d9f8f20', border: '#2d9f8f', text: '#2d9f8f', label: 'Low' }
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
// ACTION CLAUSE ENGINE
// ============================================================

/**
 * Generate an action and recommendation for an event based on
 * its category and how much time remains.
 */
export function generateAction(event) {
    const now = dayjs()
    const eventTime = dayjs(event.event_datetime)
    const hours = eventTime.diff(now, 'hour', true)
    const cat = (event.category || '').toLowerCase().trim()

    let action = ''
    let recommendation = ''
    let studyHours = null
    let icon = '📌'

    // ---- Category-based rules ----
    if (cat === 'exam') {
        action = `Study for ${event.title}`
        studyHours = STUDY_HOURS.exam
        icon = '📖'

        if (hours <= 0) {
            recommendation = 'Event has passed'
        } else if (hours < 6) {
            recommendation = `Cram session — study immediately (${studyHours}h recommended)`
        } else if (hours < 12) {
            recommendation = `Study immediately (${studyHours} hours recommended)`
        } else if (hours < 24) {
            recommendation = `Start preparation today (${studyHours} hours)`
        } else if (hours < 48) {
            recommendation = `Plan a focused revision schedule`
        } else {
            recommendation = `Create study plan — you have ${Math.floor(hours / 24)} days`
        }
    } else if (cat === 'hackathon') {
        action = `Work on project: ${event.title}`
        studyHours = STUDY_HOURS.hackathon
        icon = '🚀'

        if (hours <= 0) {
            recommendation = 'Event has passed'
        } else if (hours < 12) {
            recommendation = `Build core features now (${studyHours}h block)`
        } else if (hours < 24) {
            recommendation = `Focus on MVP today`
        } else {
            recommendation = `Plan project milestones`
        }
    } else if (cat === 'assignment') {
        action = `Complete: ${event.title}`
        studyHours = STUDY_HOURS.assignment
        icon = '✏️'

        if (hours <= 0) {
            recommendation = 'Past deadline'
        } else if (hours < 6) {
            recommendation = `Finish immediately — deadline approaching`
        } else if (hours < 24) {
            recommendation = `Allocate ${studyHours} hours of focused work today`
        } else {
            recommendation = `Schedule ${studyHours}h work block`
        }
    } else if (cat === 'meeting') {
        action = `Prepare for meeting: ${event.title}`
        icon = '🤝'

        if (hours <= 0) {
            recommendation = 'Meeting has passed'
        } else if (hours < 2) {
            recommendation = 'Review agenda — meeting soon'
        } else if (hours < 24) {
            recommendation = 'Prepare discussion points today'
        } else {
            recommendation = 'Review agenda in advance'
        }
    } else if (cat === 'personal') {
        action = `Prepare for: ${event.title}`
        icon = '🎉'

        if (hours <= 0) {
            recommendation = 'Event has passed'
        } else if (hours < 3) {
            recommendation = 'Get ready — event starting soon!'
        } else if (hours < 24) {
            recommendation = `Reminder: Attend at ${eventTime.format('h:mm A')}`
        } else {
            recommendation = `Reminder: ${eventTime.format('MMM D')} at ${eventTime.format('h:mm A')}`
        }
    } else if (cat === 'reminder') {
        action = event.title
        icon = '🔔'
        recommendation = hours <= 0 ? 'Past reminder' : `Reminder at ${eventTime.format('h:mm A')}`
    } else {
        action = event.title
        icon = '📅'
        recommendation = hours <= 0 ? 'Event passed' : `Coming up at ${eventTime.format('h:mm A')}`
    }

    return { action, recommendation, studyHours, icon }
}

/**
 * Build a full enriched event object with priority + action clauses.
 */
export function enrichEvent(event) {
    const score = getPriorityScore(event)
    const color = getPriorityColor(score)
    const { action, recommendation, studyHours, icon } = generateAction(event)

    return {
        ...event,
        priority_score: score,
        color,
        action,
        recommendation,
        studyHours,
        actionIcon: icon,
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

/**
 * Generate a recommended schedule from events.
 */
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
            let studyMinutes
            if (score > 15) studyMinutes = 180
            else if (score > 10) studyMinutes = 120
            else if (score > 5) studyMinutes = 90
            else studyMinutes = 60
            allocatedStudy.set(event.id, { event, studyMinutes, allocated: 0 })
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
                    schedule.push({
                        id: `study-${study.event.id}-${study.allocated}`,
                        type: 'study',
                        title: action,
                        category: study.event.category,
                        startTime: cursor.format('h:mm A'),
                        endTime: cursor.add(blockMinutes, 'minute').format('h:mm A'),
                        startDate: cursor.format('MMM D'),
                        duration: blockMinutes,
                        priority: getPriorityScore(study.event),
                        action,
                        recommendation,
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
        }
        schedule.push(eventEntry)

        cursor = eventTime.add(1, 'hour')
    }

    return schedule
}
