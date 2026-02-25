import React from 'react';
import * as styles from '@components/common/ui/Button.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    loading?: boolean;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled,
    className,
    children,
    ...props
}) => {
    return (
        <button
            className={cn(
                styles.button,
                styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
                styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
                fullWidth && styles.buttonFullWidth,
                loading && styles.buttonLoading,
                className,
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <span className={styles.spinner} />}
            {children}
        </button>
    );
};
