// models/faqModel.js
import { db } from "../config/db.js";


export async function selectAllFaqs() {
  try {
    const rows = await db('faqs').select('id', 'question', 'answer', 'category', 'is_published').orderBy('id', 'asc');
    return rows;
  } catch (err) {
    throw new Error(`selectAllFaqs failed: ${err.message}`);
  }
}

export async function insertFaq(question, answer, category){
    try {
        const [newRow] = await db('faqs').insert({ question, answer, category }).returning(['id', 'question', 'answer', 'category', 'is_published']);
        return newRow;
    } catch(err){
        throw new Error(`insertFaq failed: ${err.message}`);
    }
}

export async function changePublishStatus(id, is_published){
    try {
        const [newPublishRow] = await db('faqs').where({ id }).update({ is_published, updated_at: db.fn.now() }).returning('*');
        return newPublishRow || null;
    } catch (err){
        throw new Error(`changePublishStatus failed: ${err.message}`);
    }
}

export async function listPublishedFaqs(){
    try {
        const publishedFaqs = await db('faqs').select('id', 'question', 'answer', 'category', 'is_published').where({ is_published: true }).orderBy('id', 'asc');
        return publishedFaqs;
    } catch(err){
        throw new Error(`listPublishedFaqs failed: ${err.message}`);
    }
}

export async function updateFaqModel(id, changes){
    try {
        const [updatedFaq] = await db('faqs').where({ id }).update({ ...changes, updated_at: db.fn.now() }).returning('*'); // changes can be either updating the question or the answer or both
        return updatedFaq || null;
    } catch(err){
        throw new Error(`updateFaq failed: ${err.message}`);
    }
}

export async function deleteFaq(id) {
  try {
    const [deletedFaq] = await db('faqs').where({ id }).del().returning('*');
    return deletedFaq || null;
  } catch (err) {
    throw new Error(`deleteFaq failed: ${err.message}`);
  }
}



