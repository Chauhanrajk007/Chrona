const { GoogleGenerativeAI } = require('@google/generative-ai');
const { requireAuth } = require('./lib/jwt');
const { supabaseInsert } = require('./lib/supabase-admin');
const { setCors, parseBody } = require('./lib/utils');

function getExtractionPrompt() {
    const today = new Date().toISOString().split('T')[0];
    return `You are an intelligent event extraction engine with priority analysis capabilities.

Analyze the input and extract event information along with severity and complexity metrics.

Return JSON in this exact format:
{
  "title": "",
  "category": "",
  "venue": "",
  "event_datetime": "",
  "severity_level": "",
  "complexity_score": 0,
  "estimated_prep_hours": 0,
  "key_topics": [],
  "action_items": []
}

Rules:
category must be one of: exam, hackathon, assignment, meeting, personal, reminder
severity_level must be one of: low, medium, high, critical
complexity_score is a number from 1-10
estimated_prep_hours: Estimate how many hours of preparation this event needs
key_topics: Extract 3-5 specific sub-topics or chapters to study
action_items: Extract 3-5 concrete actionable steps

Convert relative times using today's date (${today}):
  "today" → today's date
  "tomorrow" → tomorrow's date
  "next week" → 7 days from now

Convert datetime to ISO format: YYYY-MM-DDTHH:MM:SS
Return ONLY valid JSON. If a field is missing, return null.

Analyze context clues for severity:
  - Exams with "tomorrow", "final", "important" → high/critical
  - Close deadlines → high
  - Hackathons → high severity, high complexity
  - Routine meetings → low/medium`;
}

async function extractFromText(text) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `${getExtractionPrompt()}\n\nText to analyze:\n${text}`;
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
    });
    return JSON.parse(result.response.text());
}

module.exports = async function handler(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = requireAuth(req, res);
    if (!user) return;

    try {
        const body = await parseBody(req);
        const text = body.text || '';
        if (!text.trim()) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const extractedData = await extractFromText(text.trim());

        const ALLOWED_COLUMNS = ['title', 'category', 'venue', 'event_datetime', 'key_topics', 'action_items'];
        const cleanData = { user_id: user.user_id };
        for (const key of ALLOWED_COLUMNS) {
            if (extractedData[key] != null) cleanData[key] = extractedData[key];
        }
        if (!cleanData.title) throw new Error('Extracted event has no title');

        await supabaseInsert('events', cleanData);

        return res.status(200).json({
            success: true,
            message: 'Event processed successfully',
            event: { ...extractedData, user_id: user.user_id },
        });
    } catch (error) {
        console.error('Process event error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};
