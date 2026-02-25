import React, { useEffect, useRef } from 'react';
import * as styles from '@components/common/ui/Toast.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastProps {
    toast: ToastData;
    onRemove: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const remainingTimeRef = useRef<number>(toast.duration ?? 5000);
    const startTimeRef = useRef<number>(Date.now());

    const startTimer = React.useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        startTimeRef.current = Date.now();
        timerRef.current = setTimeout(() => {
            onRemove(toast.id);
        }, remainingTimeRef.current);
    }, [toast.id, onRemove]);

    const pauseTimer = React.useCallback(() => {
        if (timerRef.current) {
            const elapsed = Date.now() - startTimeRef.current;
            remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        // Reset remaining time when toast changes
        remainingTimeRef.current = toast.duration ?? 5000;
        startTimer();
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [toast.id, toast.duration, startTimer]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
                return 'ℹ';
            default:
                return '';
        }
    };

    return (
        <div
            className={cn(
                styles.toast,
                styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`],
            )}
            onClick={() => onRemove(toast.id)}
            onMouseEnter={pauseTimer}
            onMouseLeave={startTimer}
        >
            <div className={styles.toastIcon}>{getIcon()}</div>
            <div className={styles.toastMessage}>{toast.message}</div>
            <button className={styles.toastClose} onClick={() => onRemove(toast.id)}>
                ×
            </button>
        </div>
    );
};
