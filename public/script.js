document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.querySelector(".chat-container");
  const chatMessages = document.getElementById("chatMessages");
  const initialInput = document.getElementById("userInput");
  const activeInput = document.getElementById("userInputActive");
  const sendButtons = document.querySelectorAll(
    "#sendButton, #sendButtonActive"
  );
  const scrollTopBtn = document.getElementById("scrollTopBtn");
  let isFirstMessage = true;

  function activateChat() {
    chatContainer.classList.add("active");
    isFirstMessage = false;
    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
  }

  function addMessage(text, isUser = true) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;

    if (isUser) {
      messageDiv.textContent = text;
    } else {
      messageDiv.innerHTML = text;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function sendMessage() {
    const question = initialInput.value.trim() || activeInput.value.trim();
    if (!question) return;

    if (isFirstMessage) activateChat();
    addMessage(question, true);
    initialInput.value = "";
    activeInput.value = "";
    sendButtons.forEach((btn) => (btn.disabled = true));

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message bot-message";
    loadingDiv.innerHTML = `<div class="loading-dots"><div></div><div></div><div></div><div></div></div>`;
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
      sendButtons.forEach((btn) => (btn.disabled = false));
      (activeInput || initialInput).focus();
    }
  }

  document.querySelectorAll(".suggestion-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const query = e.target.textContent.trim();
      if (isFirstMessage) {
        initialInput.value = query;
      } else {
        activeInput.value = query;
      }
      sendMessage();
    });
  });

  sendButtons.forEach((btn) => btn.addEventListener("click", sendMessage));

  [initialInput, activeInput].forEach((input) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  });

  chatMessages.addEventListener("scroll", () => {
    scrollTopBtn.classList.toggle("visible", chatMessages.scrollTop > 200);
  });

  scrollTopBtn.addEventListener("click", () => {
    chatMessages.scrollTo({ top: 0, behavior: "smooth" });
  });
});
