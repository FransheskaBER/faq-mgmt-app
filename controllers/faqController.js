import { selectAllFaqs, insertFaq, changePublishStatus, listPublishedFaqs, updateFaqModel, deleteFaq } from "../models/faqModel.js";


// GET /faqs
export async function displayFaqs(req, res, next){
    try {
        const faqs = await selectAllFaqs();
        res.status(200).json(faqs);
    } catch (err){
        next(err);
    }
}

// POST /faqs
export async function addFaq(req, res, next){
    try {
        let { question, answer, category } = req.body;
        
        if (typeof question !== "string" || typeof answer !== "string" || typeof category !== "string") return res.status(400).json({ error: "Question, answer and category must be strings."});

        question = question.trim();
        answer = answer.trim();
        category = category.trim();

        if (!question || !answer || !category) return res.status(400).json({ error: "Question, answer and category are required."});
        if (question.length > 200 || answer.length > 500 || category.length > 100) return res.status(400).json({ error: "Question, answer or category too long."});
        if (question.length < 5 || answer.length < 5) return res.status(400).json({ error: "Question and answer should be at least 5 characters." });
    
        
        const addedRow = await insertFaq(question, answer, category);
        return res.status(201).json({ message: "FAQ successfully added!", faq: addedRow});
    } catch (err){
        next(err);
    }
} 

// PATCH /faqs/:id
export async function changePublish(req, res, next){
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const { is_published } = req.body;

        if (is_published === null) return res.status(400).json({ error: "Published status is required and must be a boolean" });

        const changedStatus = await changePublishStatus(id, is_published);
        if (!changedStatus) return res.status(404).json({ error: "FAQ not found" });

        const message = is_published ? "FAQ published" : "FAQ unpublished";
        return res.status(200).json({ message, faq: changedStatus });
    } catch (err){
        next(err);
    }
}

// GET /faqs/published
export async function displayPublishedFaqs(req, res, next){
    try {
        const publishedFaqs = await listPublishedFaqs();
        res.status(200).json(publishedFaqs);
    } catch (err){
        next(err);
    }
}

// PUT /faqs/:id
export async function updateFaq(req, res, next){
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const { question, answer, category } = req.body;
        let changes = {};
        if (question) changes.question = question.trim();
        if (answer) changes.answer = answer.trim();
        if (category) changes.category = category.trim();

        if(Object.keys(changes).length === 0) return res.status(400).json({ error: "No valid fields to update." });

        const updated = await updateFaqModel(id, changes);
        if (!updated) return res.status(404).json({ error: "FAQ Not Found" });

        return res.status(200).json({ message: "FAQ updated", faq: updated });
    } catch (err){
        next(err);
    }
}

// DELETE /faqs/:id
export async function removeFaq(req, res, next){
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const deleted = await deleteFaq(id);
        if (!deleted) return res.status(404).json({ error: "FAQ Not Found" });

        return res.status(200).json({ message: "FAQ deleted" });
    } catch (err){
        next(err);
    }
}