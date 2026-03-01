// ------------ LIVE SITE ---------------
const manageBtn = document.getElementById("manage-faqs");
const publishTable = document.getElementById("published-faqs-table");
const publishFaqTableBody = publishTable.querySelector("tbody");
const searchInput = document.getElementById("faq-search");
const categoryFilter = document.getElementById("faq-category-filter");
const openChatBtn = document.getElementById("openChatBtn");
const dialogChat = document.getElementById("chat");
const closeChat = document.getElementById("closeChat");
const chatForm = document.getElementById("chatForm");
const chatBody = document.getElementById("chatBody");
const voiceToogle = document.getElementById("voiceToogle");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;


document.addEventListener('DOMContentLoaded', () => {
    loadPublishedFaqs().catch((err) => {
      console.error('Failed to load published FAQs:', err);
      // optionally show a simple message in the published table
    });
});

// ------------ LIVE SITE ---------------
manageBtn.addEventListener("click", () => {
    window.location.href = 'index.html';
});

let publishedFaqs = [];

async function loadPublishedFaqs() {
  const res = await fetch('/faqs/published');
  publishedFaqs = await res.json();
  const categories = new Set(publishedFaqs.map((faq) => faq.category));
  populateFilterOption(categories)
  renderPublishedRows(publishedFaqs);
}

function renderPublishedRows(faqs){
    publishFaqTableBody.innerHTML = "";
    const fragment = document.createDocumentFragment();

    faqs.forEach((faq, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>${index + 1}</td>
        <td>${faq.question}</td>
        <td>${faq.answer}</td>
        <td>${faq.category}</td>
        `;
        fragment.appendChild(row);
    });

    publishFaqTableBody.appendChild(fragment);
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = term
      ? publishedFaqs.filter((faq) =>
          `${faq.question} ${faq.answer}`.toLowerCase().includes(term)
        )
      : publishedFaqs;

    renderPublishedRows(filtered);
  });
}

function populateFilterOption(categories){
    if (!categoryFilter) return;
    categoryFilter.innerHTML = '<option value="">All categories</option>';

    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    categoryFilter.addEventListener('change', () => {
        const selected = categoryFilter.value;
        const visibleFaqs = selected ? publishedFaqs.filter((faq) => faq.category === selected) : publishedFaqs;
        renderPublishedRows(visibleFaqs);
    });
}

openChatBtn.addEventListener("click", () => {
    dialogChat.showModal();
})

closeChat.addEventListener("click", () => {
  dialogChat.close();
})


function appendMessage(userQuery, role) {
    const bubble = document.createElement('div');
    bubble.className = `chat-message ${role}`;
    bubble.textContent = userQuery;
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userQuery = msg.value.trim();
  if (!userQuery) return;

  appendMessage(userQuery, 'user');
  msg.value = '';
  msg.focus();

  try {
    const res = await fetch('/faqs/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userQuery })
    });
    const data = await res.json();
    appendMessage(data.answer ?? 'No answer found.', 'bot');
  } catch (err){
    appendMessage('Something went wrong.Try again', 'bot');
    console.log(err);
  }
});


// Speech recognition
let recognition;
let isListening = false;

if (SpeechRecognition && voiceToogle){
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.addEventListener('result', (e) => {
    const transcript = Array.from(e.results)
      .map(result => result[0]?.transcript ?? '')
      .join(' ')
      .trim();
    
    if (transcript){
      msg.value = transcript;
    }

    // auto stop once user stops speaking
    if (e.results[0]?.isFinal){
      toggleListening(false);
    }
  });

  recognition.addEventListener('error', (e) => {
    console.log('Speech recognition error:', e.error);
    toggleListening(false);
  });

  voiceToogle.addEventListener("click", () => {
    toggleListening(!isListening);
  });
} else if (voiceToogle){
  voiceToogle.disabled = true;
  voiceToogle.title = 'Voice input not supported in this browser'
}

function toggleListening(shouldListen){
  if (!recognition) return;
  if (shouldListen){
    recognition.start();
    isListening = true;
    voiceToogle.textContent = '⏹';
    voiceToogle.setAttribute('aria-pressed', 'true');
    voiceToogle.title = 'Stop listening';
  } else {
    recognition.stop();
    isListening = false;
    voiceToogle.textContent = '🎤';
    voiceToogle.setAttribute('aria-pressed', 'false');
    voiceToogle.title = 'Start voice input';
  }
}