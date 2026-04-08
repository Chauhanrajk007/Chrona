# Smart Schedule Repair System — Research & Architecture Document

## Purpose of this Document

This document summarizes the current concept and architecture of a **behavior-aware AI scheduling system**.
It captures the design ideas already discussed and defines areas that require **further research and improvement**.

This file should serve as a **research baseline** for deeper analysis by AI tools (Claude, GPT, etc.) and human contributors.

Claude (or any reviewing AI) should:

* analyze the system architecture
* evaluate feasibility
* suggest improvements
* propose alternative algorithms
* recommend modern AI / agentic patterns
* identify potential weaknesses

---

# 1. Core Product Idea

The system is an **AI-assisted schedule repair engine**.

Unlike traditional planners that only schedule tasks, this system focuses on **automatically repairing a user's schedule when disruptions occur**.

The system continuously answers:

> “Given the current reality of the day, what is the best possible schedule now?”

This approach emphasizes **adaptive planning rather than static planning**.

---

# 2. Core Problem

Most productivity tools fail because:

* schedules break constantly
* meetings extend
* tasks are skipped
* users delay work

Existing planners require the user to manually fix schedules.

This system solves that by **automatically recalculating the day**.

---

# 3. MVP Goal

The MVP should prove **one capability only**:

**Automatic schedule repair when disruptions occur.**

Everything else is secondary.

---

# 4. Core Features of MVP

The MVP should implement the following:

1. Task creation
2. Natural language task input
3. Automatic task scheduling
4. Conflict detection
5. Automatic rescheduling
6. Calendar visualization
7. Task completion tracking

---

# 5. System Architecture Overview

High level architecture:

User Interface
↓
AI Input Parser
↓
Scheduling Engine
↓
Repair Engine
↓
Database
↓
Calendar View

---

# 6. Frontend Architecture

Recommended stack:

* Next.js
* React
* TailwindCSS
* FullCalendar (calendar visualization)

Main UI components:

1. Chat input for natural language tasks
2. Calendar schedule view
3. Task list
4. Notifications
5. Schedule suggestions

Example user commands:

Schedule gym tomorrow evening
Move study to evening
Cancel meeting

---

# 7. AI Input Parser

Purpose:

Convert natural language input into structured task data.

Example input:

"Gym tomorrow evening for 1 hour"

Structured output:

{
title: "Gym",
duration: 60,
date: "2026-04-08",
time_preference: "evening",
priority: "medium"
}

Tools that may be used:

* OpenAI API
* Claude
* Local LLM
* Rule based NLP

Important rule:

The AI parser **only extracts structured data**.
It does not perform scheduling.

---

# 8. Scheduling Engine

The scheduling engine is the **core deterministic system**.

Responsibilities:

* Identify available time slots
* Sort tasks by priority
* Assign tasks into free slots
* Respect deadlines
* Respect task flexibility

Example scheduling steps:

Step 1: Identify free time slots.

Example day:

08:00–09:00 Meeting
12:00–13:00 Lunch
17:00–18:00 Gym

Available slots:

09:00–12:00
13:00–17:00

Step 2: Sort tasks by priority.

Priority levels:

1 Critical
2 Important
3 Normal
4 Optional

Step 3: Assign tasks to best slots.

---

# 9. Conflict Detection

Conflict occurs when a new event overlaps an existing scheduled task.

Example:

Study scheduled 10:00–12:00
New meeting added 10:30–11:30

Conflict detected.

Detection logic:

SELECT * FROM schedule
WHERE start_time < event_end
AND end_time > event_start

---

# 10. Schedule Repair Engine

When a disruption occurs, the repair engine executes.

Repair workflow:

Step 1
Identify affected tasks.

Step 2
Check if task is flexible.

Step 3
Find new time slot.

Step 4
Move task.

If no slot available:

Options:

Split task
Move to tomorrow
Ask user

---

# 11. User Behavior Learning

The system collects behavioral data to improve scheduling.

Collected signals:

Task completed
Task skipped
Task delayed
Task rescheduled

Example behavior log:

task_id
scheduled_time
actual_completion_time
delay_minutes
completed

Behavior metrics:

completion rate by time slot
average delay
task reliability

---

# 12. Cold Start Strategy

For new users the system has no behavior data.

Solution:

Use default behavioral models based on onboarding questions.

Example onboarding questions:

When are you most productive?

Morning
Afternoon
Evening

Work type:

Student
Developer
Manager
Freelancer

Task preference:

Long focus blocks
Short tasks

These initialize default weights.

---

# 13. Task Feedback System

To avoid incorrect learning, explicit user feedback is used.

After task completion notification:

Did you complete this task?

Yes
No

Follow-up:

Was it completed on time?

On time
Finished late
Finished early
Skipped

Optional chat input:

"What caused the delay?"

This reduces incorrect behavior learning.

---

# 14. Preventing False Delay Detection

Users may mark tasks completed later than actual completion.

To avoid misclassification:

Store multiple timestamps:

scheduled_start_time
scheduled_end_time
actual_completion_time
confirmation_time

Use grace windows:

If confirmation_time < scheduled_end + grace_period
→ treat as on-time completion.

Detect batch confirmation when multiple tasks are marked completed together.

---

# 15. Behavioral Learning Strategy

Instead of heavy ML, use statistical learning.

Example metric:

completion_rate(time_slot)

If evening completion rate is higher than morning:

Scheduler prioritizes evening slots.

Weight updates should be gradual.

---

# 16. Optional ML Enhancements

Lightweight ML may be used for:

Task completion probability prediction
Task duration estimation

Possible models:

Logistic Regression
LightGBM

Features may include:

time_of_day
task_type
duration
user_behavior_history

---

# 17. Agentic AI Integration

Agentic AI can assist with reasoning and explanations.

Suggested agents:

Input Parser Agent
Scheduling Reasoning Agent
Explanation Agent

Important constraint:

AI agents must **not directly control scheduling logic**.
Scheduling must remain deterministic.

---

# 18. Event Logging Architecture

User interactions should be logged.

Example event types:

task_completed
task_skipped
task_delayed
task_rescheduled

Event table:

event_id
user_id
event_type
timestamp
metadata

This enables future ML training.

---

# 19. Technology Stack

Frontend

Next.js
React
TailwindCSS

Backend

Python
FastAPI

Database

PostgreSQL

Caching

Redis

AI

OpenAI / Claude APIs

ML

scikit-learn
LightGBM

---

# 20. Key Research Questions

Claude should analyze and provide recommendations for:

1. Best scheduling algorithms for dynamic rescheduling
2. Whether constraint solvers should be used
3. Whether reinforcement learning could improve scheduling
4. Better behavior modeling approaches
5. Whether a time graph scheduling model would improve performance
6. Potential weaknesses in the architecture
7. Data privacy considerations
8. Scalability strategies for large user bases
9. Ways to differentiate from products like Motion or Reclaim
10. Opportunities to integrate agentic AI meaningfully

---

# 21. Existing Tools to Compare

Research should analyze:

Motion
Reclaim AI
Clockwise
Sunsama
Akiflow

Focus on:

scheduling algorithms
AI usage
behavior learning methods
architecture

---

# 22. Expected Output From Claude Research

Claude should expand this document with:

1. deeper architectural analysis
2. algorithmic recommendations
3. ML feasibility analysis
4. improvements for real-world scalability
5. advanced scheduling techniques
6. potential research directions

The goal is to refine this concept into a **production-grade intelligent scheduling system**.

---

End of research baseline.
