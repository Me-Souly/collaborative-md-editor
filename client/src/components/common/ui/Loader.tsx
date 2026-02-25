import React from 'react';
import * as styles from '@components/common/ui/Loader.module.css';

const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(' ');

export interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'spinner' | 'dots' | 'pulse';
    className?: string;
    fullScreen?: boolean;
    text?: string;
}

export const Loader: React.FC<LoaderProps> = ({
    size = 'md',
    variant = 'spinner',
    className,
    fullScreen = false,
    text,
}) => {
    if (fullScreen) {
        return (
            <div className={cn(styles.fullScreen, className)}>
                <div className={styles.fullScreenContent}>
                    {variant === 'spinner' && (
                        <div
                            className={cn(
                                styles.spinner,
                                styles[`spinner${size.charAt(0).toUpperCase() + size.slice(1)}`],
                            )}
                        />
                    )}
                    {variant === 'dots' && (
                        <div
                            className={cn(
                                styles.dots,
                                styles[`dots${size.charAt(0).toUpperCase() + size.slice(1)}`],
                            )}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    )}
                    {variant === 'pulse' && (
                        <div
                            className={cn(
                                styles.pulse,
                                styles[`pulse${size.charAt(0).toUpperCase() + size.slice(1)}`],
                            )}
                        />
                    )}
                    {text && <p className={styles.text}>{text}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className={cn(styles.container, className)}>
            {variant === 'spinner' && (
                <div
                    className={cn(
                        styles.spinner,
                        styles[`spinner${size.charAt(0).toUpperCase() + size.slice(1)}`],
                    )}
                />
            )}
            {variant === 'dots' && (
                <div
                    className={cn(
                        styles.dots,
                        styles[`dots${size.charAt(0).toUpperCase() + size.slice(1)}`],
                    )}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            )}
            {variant === 'pulse' && (
                <div
                    className={cn(
                        styles.pulse,
                        styles[`pulse${size.charAt(0).toUpperCase() + size.slice(1)}`],
                    )}
                />
            )}
            {text && <p className={styles.text}>{text}</p>}
        </div>
    );
};
