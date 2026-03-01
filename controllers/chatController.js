import 'dotenv/config';
import { searchPublishedFaqs } from '../models/chatModel.js';
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const threshold = 0.25;

// POST /faqs/chat
export async function getTopAnswer(req, res, next){
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') return res.status(400).json({ error: "User query is required and must be a string" });

        const userQuery = message.trim();
        if (userQuery.length > 500) return res.status(400).json({ error: "Invalid message" });
        
        const rows = await searchPublishedFaqs(userQuery);
        if (rows.length === 0 || !Array.isArray(rows)) {
            return res.status(200).json({
                answer: "I don't know based on the oficial FAQs.",
                sources: [],
                confidence: 0
            });
        }
        
        const best = rows[0];
        const systemPrompt = [
            "You are a friendly FAQ assistant for our bootcamp.",
            "Always acknowledge the user’s question in a natural way before sharing the answer.",
            "Use clear, conversational English—as if you’re chatting with a classmate.",
            "Keep the content grounded in the canonical answer. If the answer doesn’t cover something, say so.",
            "Be concise (3–4 sentences max)."
            ].join(' ');
        const userPrompt = [
            `User question: ${userQuery}`,
            `Canonical answer to rely on: ${best.answer}`
            ].join('\n');

        if (Number(best.score) < threshold){
            return res.status(200).json({
                answer: "I don't know based on the official FAQs.",
                sources: [],
                confidence: Number(best.score)
            });
        }

        let modelAnswer = best.answer;
        try {
            const response = await openai.responses.create({
                model: "gpt-5-nano",
                input: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            });

            modelAnswer = response.output_text.trim() || best.answer;
        } catch (err){
            console.log('OpenAI error:', err);
        }


        return res.status(200).json({
            answer: modelAnswer,
            sources: rows.map(row => ({ id: row.id, question: row.question, score: Number(row.score) })),
            confidence: Number(best.score)
        });

    } catch (err) {
        next(err);
    }
}
