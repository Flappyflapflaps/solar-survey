/**
 * FrimbleChat - Chat component for Survey Solar
 * Connects to moltbot-server which bridges to clawd bot (Frimble)
 *
 * Uses WebSocket for local development (HTTP)
 * Uses HTTP API for production (HTTPS on Vercel)
 */

class FrimbleChat {
    constructor() {
        this.ws = null;
        this.isOpen = false;
        this.isConnected = false;
        this.sessionId = this.getSessionId();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;

        // Detect if we need to use HTTP API (for HTTPS pages) or WebSocket
        const isSecure = window.location.protocol === 'https:';
        const vpsHost = '91.99.72.158';

        // Use HTTP API for production, WebSocket for local dev
        this.useHttpApi = isSecure;
        this.wsUrl = `ws://${vpsHost}:3456/ws`;
        this.apiUrl = isSecure ? '/api/chat' : `http://${vpsHost}:3456/api/chat`;

        this.elements = {
            toggleBtn: document.getElementById('chatToggleBtn'),
            panel: document.getElementById('chatPanel'),
            closeBtn: document.getElementById('chatCloseBtn'),
            messages: document.getElementById('chatMessages'),
            input: document.getElementById('chatInput'),
            sendBtn: document.getElementById('chatSendBtn'),
            statusDot: document.getElementById('chatStatusDot'),
            statusText: document.getElementById('chatStatusText')
        };

        this.init();
    }

    init() {
        if (!this.elements.toggleBtn) {
            console.warn('FrimbleChat: Elements not found, deferring init');
            return;
        }

        this.bindEvents();
        this.connect();
    }

    getSessionId() {
        let sessionId = localStorage.getItem('frimble_session_id');
        if (!sessionId) {
            sessionId = 'survey-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('frimble_session_id', sessionId);
        }
        return sessionId;
    }

    bindEvents() {
        this.elements.toggleBtn.addEventListener('click', () => this.toggle());
        this.elements.closeBtn.addEventListener('click', () => this.close());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

        this.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.elements.panel.classList.add('open');
        this.elements.toggleBtn.classList.add('active');
        this.elements.input.focus();

        if (!this.isConnected) {
            this.connect();
        }
    }

    close() {
        this.isOpen = false;
        this.elements.panel.classList.remove('open');
        this.elements.toggleBtn.classList.remove('active');
    }

    connect() {
        this.updateStatus('connecting', 'Connecting...');

        if (this.useHttpApi) {
            // For HTTPS, we use HTTP API - connection is stateless
            this.isConnected = true;
            this.updateStatus('online', 'Online');
            this.enableInput(true);
            this.clearMessages();
            this.addMessage('system', 'Connected to Frimble 🦊');
        } else {
            // For HTTP/local, use WebSocket
            this.connectWebSocket();
        }
    }

    connectWebSocket() {
        const url = `${this.wsUrl}?sessionId=${this.sessionId}`;

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('FrimbleChat: WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateStatus('online', 'Online');
                this.enableInput(true);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.error('FrimbleChat: Parse error', e);
                }
            };

            this.ws.onclose = () => {
                console.log('FrimbleChat: WebSocket disconnected');
                this.isConnected = false;
                this.updateStatus('offline', 'Disconnected');
                this.enableInput(false);
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('FrimbleChat: WebSocket error', error);
                this.updateStatus('error', 'Connection error');
            };
        } catch (e) {
            console.error('FrimbleChat: Failed to connect', e);
            this.updateStatus('error', 'Failed to connect');
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.useHttpApi) return; // No reconnect needed for HTTP API

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.updateStatus('error', 'Unable to connect');
            this.addMessage('system', 'Unable to connect to Frimble. Please check your connection.');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        this.updateStatus('connecting', `Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            if (!this.isConnected) {
                this.connectWebSocket();
            }
        }, delay);
    }

    handleMessage(data) {
        switch (data.type) {
            case 'connected':
                this.clearMessages();
                this.addMessage('system', data.message || 'Connected to Frimble 🦊');
                break;
            case 'response':
                this.hideTyping();
                this.addMessage('bot', data.message);
                break;
            case 'error':
                this.hideTyping();
                this.addMessage('error', data.message || 'An error occurred');
                break;
            case 'typing':
                this.showTyping();
                break;
            default:
                console.log('FrimbleChat: Unknown message type', data);
        }
    }

    async sendMessage() {
        const text = this.elements.input.value.trim();
        if (!text || !this.isConnected) return;

        // Add user message to chat
        this.addMessage('user', text);
        this.elements.input.value = '';
        this.showTyping();

        if (this.useHttpApi) {
            // Send via HTTP API
            await this.sendViaApi(text);
        } else {
            // Send via WebSocket
            this.sendViaWebSocket(text);
        }
    }

    async sendViaApi(text) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: text,
                    sessionId: this.sessionId
                })
            });

            const data = await response.json();
            this.handleMessage(data);
        } catch (error) {
            console.error('FrimbleChat: API error', error);
            this.hideTyping();
            this.addMessage('error', 'Failed to send message. Please try again.');
        }
    }

    sendViaWebSocket(text) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'chat',
                message: text,
                sessionId: this.sessionId
            }));
        }
    }

    addMessage(type, text) {
        const msgEl = document.createElement('div');
        msgEl.className = `chat-message ${type}`;

        if (type === 'bot') {
            msgEl.innerHTML = this.formatMessage(text);
        } else {
            msgEl.textContent = text;
        }

        this.elements.messages.appendChild(msgEl);
        this.scrollToBottom();
    }

    formatMessage(text) {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^- (.+)$/gm, '• $1')
            .replace(/\n/g, '<br>');
    }

    clearMessages() {
        this.elements.messages.innerHTML = '';
    }

    showTyping() {
        if (document.getElementById('typingIndicator')) return;

        const typingEl = document.createElement('div');
        typingEl.id = 'typingIndicator';
        typingEl.className = 'chat-typing';
        typingEl.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;
        this.elements.messages.appendChild(typingEl);
        this.scrollToBottom();
    }

    hideTyping() {
        const typingEl = document.getElementById('typingIndicator');
        if (typingEl) typingEl.remove();
    }

    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    updateStatus(state, text) {
        const dot = this.elements.statusDot;
        dot.className = 'chat-status-dot';

        if (state === 'connecting') dot.classList.add('connecting');
        if (state === 'error' || state === 'offline') dot.classList.add('error');

        this.elements.statusText.textContent = text;
    }

    enableInput(enabled) {
        this.elements.input.disabled = !enabled;
        this.elements.sendBtn.disabled = !enabled;
        this.elements.input.placeholder = enabled ? 'Type a message...' : 'Connecting...';
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.frimbleChat = new FrimbleChat();
    });
} else {
    window.frimbleChat = new FrimbleChat();
}

export default FrimbleChat;
