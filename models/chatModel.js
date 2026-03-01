import  { db }  from "../config/db.js";


export async function searchPublishedFaqs(userQuery){
    try {
        const rows = await db('faqs')
            .select(
                'id',
                'question',
                'answer',
                'category',
                db.raw("similarity(question, ?) as score", [userQuery])
            )
            .where('is_published', true)
            .orderByRaw("similarity(question, ?) DESC", [userQuery])
            .limit(3);
        return rows;
    } catch (err){
        throw new Error(`searchPublishedFaqs: ${err.message}`);
    }
}