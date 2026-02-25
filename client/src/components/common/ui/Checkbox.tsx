import React from 'react';
import * as styles from '@components/common/ui/Checkbox.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    error?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, error, className, id, ...props }, ref) => {
        const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className={cn(styles.checkboxWrapper, className)}>
                <input
                    ref={ref}
                    type="checkbox"
                    id={checkboxId}
                    className={cn(styles.checkbox, error && styles.checkboxError)}
                    {...props}
                />
                {label && (
                    <label htmlFor={checkboxId} className={styles.checkboxLabel}>
                        {label}
                    </label>
                )}
            </div>
        );
    },
);

Checkbox.displayName = 'Checkbox';
