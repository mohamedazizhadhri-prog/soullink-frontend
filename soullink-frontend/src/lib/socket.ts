import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket?.connected) return;

        const token = localStorage.getItem('sl_token');

        // No token = user is not logged in. Don't attempt connection.
        if (!token) return;

        console.log('SocketService: Attempting connection with token: Present');

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('SocketService: Connected with ID:', this.socket?.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('SocketService: Disconnected. Reason:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('SocketService: Connection error:', error.message);

            // Auth errors mean the stored token is invalid/expired — stop retrying
            // and redirect to login so the user gets a fresh token.
            const isAuthError =
                error.message.includes('Invalid token') ||
                error.message.includes('No token provided') ||
                error.message.includes('Invalid user') ||
                error.message.includes('Authentication error');

            if (isAuthError) {
                console.warn('SocketService: Auth failed — clearing stale token and redirecting to login.');
                if (this.socket) this.socket.io.opts.reconnection = false; // stop reconnection loop
                this.socket?.disconnect();
                this.socket = null;
                localStorage.removeItem('sl_token');
                localStorage.removeItem('sl_user');
                // Remove cookie as well
                document.cookie = 'sl_token=; Max-Age=0; path=/';
                // Only redirect if not already on an auth page (prevents redirect loops)
                const onAuthPage = window.location.pathname.startsWith('/login') ||
                    window.location.pathname.startsWith('/signup');
                if (!onAuthPage) {
                    window.location.href = '/login';
                }
            }
        });
    }

    /**
     * Call this after a fresh login to reconnect with the new token
     * without needing a full page reload.
     */
    updateToken(newToken: string) {
        this.disconnect();
        localStorage.setItem('sl_token', newToken);
        this.connect();
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    getUserId(): string | null {
        const token = localStorage.getItem('sl_token');
        if (!token) return null;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            return payload.userId || payload.id || null;
        } catch (e) {
            console.error("SocketService: Failed to decode token:", e);
            return null;
        }
    }

    emit(event: string, data: any) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
        } else {
            // Buffer the emit if not connected yet
            if (!this.socket) this.connect();
            this.socket?.once('connect', () => {
                this.socket?.emit(event, data);
            });
        }
    }

    on(event: string, callback: (data: any) => void) {
        if (!this.socket) this.connect();
        this.socket?.on(event, callback);
    }

    off(event: string, callback?: (data: any) => void) {
        this.socket?.off(event, callback);
    }
}

export const socketService = new SocketService();
