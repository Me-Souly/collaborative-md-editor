import React from 'react';
import * as styles from '@components/common/ui/FormField.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export interface FormFieldProps {
    label?: string;
    htmlFor?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    htmlFor,
    error,
    hint,
    required,
    children,
    className,
}) => {
    return (
        <div className={cn(styles.field, className)}>
            {label && (
                <label htmlFor={htmlFor} className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}
            {children}
            {error && <span className={styles.error}>{error}</span>}
            {hint && !error && <span className={styles.hint}>{hint}</span>}
        </div>
    );
};
