import { useEffect, useRef, useState } from 'react';
import { createNoteConnection } from '@yjs/yjs-connector.js';
import { getToken as getTokenFromStorage } from '@utils/tokenStorage';

type ConnectionType = {
    doc: any;
    provider: any;
    text: any;
    fragment: any;
    destroy: () => void;
};

interface UseYjsConnectionProps {
    noteId: string;
    readOnly: boolean;
    getToken?: () => string | null;
    sharedConnection?: {
        doc: any;
        provider: any;
        text: any;
        fragment: any;
    };
    expectSharedConnection?: boolean;
    initialMarkdown?: string;
}

export const useYjsConnection = ({
    noteId,
    readOnly,
    getToken,
    sharedConnection,
    expectSharedConnection = false,
    initialMarkdown,
}: UseYjsConnectionProps) => {
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const connectionRef = useRef<ConnectionType | null>(null);
    const yTextRef = useRef<any>(null);
    const yFragmentRef = useRef<any>(null);

    // Стабилизируем функцию getToken с помощью useRef
    const getTokenRef = useRef(getToken);
    getTokenRef.current = getToken;

    // initialMarkdown должна применяться только один раз
    const initialMarkdownRef = useRef(initialMarkdown);
    const initialMarkdownApplied = useRef(false);

    useEffect(() => {
        let isMounted = true;
        setError(null);

        let connection: ConnectionType | null;
        let provider: any;
        let text: any;
        let shouldDestroyConnection = false;

        if (sharedConnection) {
            provider = sharedConnection.provider;
            text = sharedConnection.text;
            const fragment = sharedConnection.fragment;
            connection = {
                doc: sharedConnection.doc,
                provider,
                text,
                destroy: () => {
                    // Don't destroy shared connection
                },
            } as ConnectionType;
            connectionRef.current = connection;
            yTextRef.current = text;
            yFragmentRef.current = fragment;
        } else {
            // Используем getTokenRef.current для стабильности
            const token = getTokenRef.current ? getTokenRef.current() : getTokenFromStorage();
            if (!token && !readOnly) {
                setError('Token is required for editing');
                return;
            }
            console.log(process.env.REACT_APP_WS_URL);
            connection = createNoteConnection({
                noteId,
                token: token || '',
                wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:5000',
            }) as ConnectionType;

            connectionRef.current = connection;
            provider = connection.provider;
            text = connection.text;
            yTextRef.current = text;
            yFragmentRef.current = connection.fragment;
            shouldDestroyConnection = true;
        }

        // Применяем initialMarkdown только один раз
        if (
            !initialMarkdownApplied.current &&
            initialMarkdownRef.current &&
            yTextRef.current &&
            yTextRef.current.length === 0
        ) {
            try {
                yTextRef.current.insert(0, initialMarkdownRef.current);
                initialMarkdownApplied.current = true;
            } catch (e) {
                console.error('[useYjsConnection] Failed to set initialMarkdown into Y.Text', e);
            }
        }

        // Подписки на статус/ошибки
        let offStatus: (() => void) | undefined;
        let offError: (() => void) | undefined;

        if (provider && typeof provider.on === 'function') {
            const handleStatus = (event: { status: string }) => {
                if (!isMounted) return;
                setIsConnected(event.status === 'connected');
                if (event.status === 'connected') {
                    setError(null);
                }
            };
            const handleError = (err: Error) => {
                if (!isMounted) return;
                setError(err.message);
                setIsConnected(false);
            };

            provider.on('status', handleStatus);
            provider.on('connection-error', handleError);
            offStatus = () => provider.off?.('status', handleStatus);
            offError = () => provider.off?.('connection-error', handleError);
        }

        return () => {
            isMounted = false;
            offStatus?.();
            offError?.();
            yTextRef.current = null;

            if (connectionRef.current && shouldDestroyConnection) {
                connectionRef.current.destroy();
                connectionRef.current = null;
            }
        };
        // Убрали getToken, initialMarkdown, sharedConnection из зависимостей
        // чтобы избежать бесконечных переподключений. Используем useRef для стабильности.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId, readOnly, expectSharedConnection]);

    return {
        connection: connectionRef.current,
        yText: yTextRef.current,
        yFragment: yFragmentRef.current,
        error,
        isConnected,
    };
};
