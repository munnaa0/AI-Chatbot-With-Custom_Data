const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");

function addMessage(text, isUser = true) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;

  // For bot messages, use innerHTML to preserve <br> formatting.
  if (isUser) {
    messageDiv.textContent = text;
  } else {
    messageDiv.innerHTML = text;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const question = userInput.value.trim();
  if (!question) return;

  addMessage(question, true);
  userInput.value = "";
  sendButton.disabled = true;

  // Show loading state
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "message bot-message loading-dots";
  loadingDiv.textContent = "Processing your question...";
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question }),
    });

    const data = await response.json();
    chatMessages.removeChild(loadingDiv);

    if (!response.ok) {
      addMessage(data.answer || "Error processing request", false);
      return;
    }

    addMessage(data.answer, false);
  } catch (error) {
    chatMessages.removeChild(loadingDiv);
    addMessage("Connection error. Please try again.", false);
    console.error("Network Error:", error);
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
}

// Event listeners
sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// For Theme Switching
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

// Initialize theme
const savedTheme = localStorage.getItem("theme") || "light";
body.setAttribute("data-theme", savedTheme);

themeToggle.addEventListener("click", () => {
  const currentTheme = body.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  body.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  themeToggle.innerHTML =
    newTheme === "dark"
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
});

// Set initial icon
themeToggle.innerHTML =
  savedTheme === "dark"
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
