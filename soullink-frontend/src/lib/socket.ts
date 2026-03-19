import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000';

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket?.connected) return;

        const token = localStorage.getItem('token');
        console.log('SocketService: Attempting connection with token:', token ? 'Present' : 'Missing');

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['polling', 'websocket'], // Use default order (polling first)
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
        });
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

    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }

    on(event: string, callback: (data: any) => void) {
        this.socket?.on(event, callback);
    }

    off(event: string, callback?: (data: any) => void) {
        this.socket?.off(event, callback);
    }
}

export const socketService = new SocketService();
