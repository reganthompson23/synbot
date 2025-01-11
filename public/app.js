document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
    const chatWidget = document.getElementById('chat-widget');

    // Chat widget minimize/maximize functionality
    minimizeBtn.addEventListener('click', () => {
        chatWidget.classList.toggle('minimized');
        minimizeBtn.textContent = chatWidget.classList.contains('minimized') ? '+' : '−';
    });

    // Function to add a message to the chat
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user' : 'bot');
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to send message to backend
    async function sendMessage(message) {
        try {
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error:', error);
            return 'Sorry, I encountered an error. Please try again later.';
        }
    }

    // Handle send button click
    async function handleSend() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';
            userInput.disabled = true;
            sendButton.disabled = true;

            // Add loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.classList.add('message', 'bot');
            loadingDiv.textContent = 'Typing...';
            chatMessages.appendChild(loadingDiv);

            const response = await sendMessage(message);
            chatMessages.removeChild(loadingDiv);
            addMessage(response);

            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    // Event listeners
    sendButton.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });

    // Focus input on load
    userInput.focus();
});
