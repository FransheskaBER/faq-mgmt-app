// DOM
const faqTable = document.getElementById("faq-table");
const faqTableBody = faqTable.querySelector("tbody");
const addFaqBtn = document.getElementById("open-create-modal");
const dialogFaq = document.getElementById('faq-modal');
const newFaqForm = document.getElementById('faq-form');
const saveNewFaq = document.getElementById('faq-save');
const cancelBtn = document.getElementById('faq-cancel');
const faqCategories = document.getElementById('faq-categories');
const faqModalTitle = document.getElementById('faq-modal-title');
const liveBtn = document.getElementById("see-published-faqs");

liveBtn.addEventListener("click", () => {
    window.location.href = 'live.html';
});

// category dropdown helper function:
function populateCategoriesDropdown(dropDownCategories){
    faqCategories.innerHTML = '';
    dropDownCategories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        faqCategories.appendChild(option);
    })
};

// Helper funciton that reset dialog:
function resetDialogState() {
  newFaqForm.reset();
  delete newFaqForm.dataset.mode;
  delete newFaqForm.dataset.faqId;
  delete newFaqForm.dataset.originalFaq;
  faqModalTitle.textContent = 'Create FAQ';
  saveNewFaq.textContent = 'Save';
}

function renderEmptyState(message){
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = message;
    row.appendChild(cell);
    faqTableBody.appendChild(row);
}


document.addEventListener('DOMContentLoaded', () => {
    loadFaqs().catch((err) => {
      console.error('Failed to load FAQs:', err);
      renderEmptyState('Unable to load FAQs right now');
    });
});


async function loadFaqs(){
    faqTableBody.innerHTML = '';

    const res = await fetch("/faqs");
    if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
    }

    const faqs = await res.json();
    if (!Array.isArray(faqs) || faqs.length === 0){
        renderEmptyState("No FAQs found");
        populateCategoriesDropdown(new Set()); // empty the datalist
        return;
    }

    const fragment = document.createDocumentFragment();

    const dropDownCategories = new Set();

    faqs.forEach((faq, index) => {
        const row = document.createElement('tr');
        row.dataset.faqId = faq.id;
        row.dataset.faqQuestion = faq.question;
        row.dataset.faqAnswer = faq.answer;
        row.dataset.faqCategory = faq.category;
        row.dataset.faqPublished = String(faq.is_published);

        const numberCell = document.createElement('td');
        numberCell.textContent = index + 1

        const idCell = document.createElement('td');
        idCell.className = 'is-hidden';
        idCell.textContent = faq.id;

        const questionCell = document.createElement('td');
        questionCell.textContent = faq.question;

        const answerCell = document.createElement('td');
        answerCell.textContent = faq.answer;

        const categoryCell = document.createElement('td');
        categoryCell.textContent = faq.category;

        // populate category dropdown in dialog:
        if (faq.category) dropDownCategories.add(faq.category);

        const publishedCell = document.createElement('td');
        const publishToggle = document.createElement('input');
        publishToggle.type = 'checkbox';
        publishToggle.className = 'faq-toggle';
        publishToggle.checked = Boolean(faq.is_published);
        publishToggle.disabled = false;
        publishedCell.appendChild(publishToggle);

        const actionsCell = document.createElement('td');
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'faq-edit';
        editBtn.textContent = 'Update';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'faq-delete';
        deleteBtn.textContent = 'Delete'

        actionsCell.append(editBtn, deleteBtn);

        row.append(numberCell, idCell, questionCell, answerCell, categoryCell, publishedCell, actionsCell);
        fragment.appendChild(row);
    });

    populateCategoriesDropdown(dropDownCategories);
    faqTableBody.appendChild(fragment);
}


faqTableBody.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest('.faq-delete');
    if (!deleteBtn) return;

    const row = deleteBtn.closest('tr');
    if (!row) return;

    const faqId = row.dataset.faqId;
    if (!faqId) return;

    const confirmed = window.confirm("Delete this FAQ permanently?");
    if (!confirmed) return;

    try {
        const res = await fetch(`/faqs/${faqId}`, { method: 'DELETE' });

        if (!res.ok) {
            const errorBody = await res.text();
            window.alert(errorBody || `Failed with ${res.status}`);
            return;
        }

        const payload = await res.json();
        if (payload) window.alert(payload.message);
        row.remove();
    } catch (err){
        console.log("Deleting FAQ failed:", err);
        window.alert('Network error while deleting FAQ.');
    }
});

addFaqBtn.addEventListener("click", () => {
    resetDialogState()
    dialogFaq.showModal();
});

cancelBtn.addEventListener("click", () => {
    resetDialogState()
    dialogFaq.close();
});

newFaqForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(newFaqForm);
    const payload = {
        question: formData.get('question').trim(),
        answer: formData.get('answer').trim(),
        category: formData.get('category').trim(),
    };

    try {

        if (newFaqForm.dataset.mode === "update"){
            const faqId = newFaqForm.dataset.faqId;
            const original = JSON.parse(newFaqForm.dataset.originalFaq || '{}');

            const changes = Object.fromEntries(
                Object.entries(payload).filter(([key, value]) => value !== original[key])
            );

            if(Object.keys(changes).length === 0){
                dialogFaq.close();
                resetDialogState();
                return;
            }

            const res = await fetch(`/faqs/${faqId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(changes),
            });

            if (!res.ok){
                const errorBody = await res.text();
                window.alert(errorBody || `Failed with ${res.status}`);
                return;
            }

            const data = await res.json();
            window.alert(data.message || "FAQ updated!")
        } else {
            const res = await fetch("/faqs", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorBody = await res.text();
                window.alert(errorBody || `Failed with ${res.status}`);
                return;
            }

            const data = await res.json();
            window.alert(data.message || 'FAQ created!');
        }

        await loadFaqs(); // refresh table with new faq
        dialogFaq.close();
        resetDialogState();

    } catch (err){
        console.log("Adding FAQ failed:", err);
        window.alert('Network error while adding FAQ.');
    }
});

faqTableBody.addEventListener('click', (event) => {
  const editBtn = event.target.closest('.faq-edit');
  if (!editBtn) return;

  const row = editBtn.closest('tr');
  if (!row) return;
  
  const original = {
    question: row.dataset.faqQuestion,
    answer: row.dataset.faqAnswer,
    category: row.dataset.faqCategory,
  };

  newFaqForm.dataset.mode = "update";
  newFaqForm.dataset.faqId = row.dataset.faqId;
  newFaqForm.dataset.originalFaq = JSON.stringify(original);

  document.getElementById("faq-modal-title").textContent = "Update FAQ";
  saveNewFaq.textContent = "Save Changes"
  document.getElementById("faq-question").value = row.dataset.faqQuestion;
  document.getElementById("faq-answer").value = row.dataset.faqAnswer;
  document.getElementById('faq-category').value = row.dataset.faqCategory;
  dialogFaq.showModal();

});

faqTableBody.addEventListener("change", async (e) => {
    const toggle = e.target.closest('.faq-toggle');
    if (!toggle) return;

    const row = toggle.closest('tr');
    if(!row) return;

    const faqId = row.dataset.faqId;
    const previous = row.dataset.faqPublished === 'true';
    const nextValue = toggle.checked;

    toggle.disabled = true;
    
    try {
        const res = await fetch(`/faqs/${faqId}`, {
            method: "PATCH",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_published: nextValue }),
        });

        if(!res.ok){
            const errorBody = await res.text();
            window.alert(errorBody || `Failed with ${res.status}`);
            toggle.checked = previous;
            return;
        }

        const { message } = await res.json();
        row.dataset.faqPublished = String(nextValue);
        if (message) window.alert(message);

    } catch (err) {
        console.error('Updating publish status failed:', err);
        window.alert('Network error while updating publish status.');
        toggle.checked = previous;            // revert on network error
    } finally {
        toggle.disabled = false;
    }
});
