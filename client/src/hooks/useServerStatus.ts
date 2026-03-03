import { useState, useEffect, useRef } from 'react';
import { API_URL } from '@http';

const PING_INTERVAL = 30_000; // 30 секунд
const PING_TIMEOUT = 5_000;   // 5 секунд таймаут

async function pingServer(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT);
    try {
        const res = await fetch(`${API_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

export function useServerStatus(): boolean {
    const [isConnected, setIsConnected] = useState(true);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        let mounted = true;

        const check = async () => {
            const ok = await pingServer();
            if (mounted) setIsConnected(ok);
        };

        check();
        intervalRef.current = window.setInterval(check, PING_INTERVAL);

        return () => {
            mounted = false;
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return isConnected;
}
