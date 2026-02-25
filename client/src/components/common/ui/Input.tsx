import React from 'react';
import * as styles from '@components/common/ui/Input.module.css';

const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(' ');

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ error, fullWidth, leftIcon, rightIcon, className, ...props }, ref) => {
        return (
            <div className={cn(styles.inputWrapper, fullWidth && styles.inputWrapperFullWidth)}>
                {leftIcon && <div className={styles.inputIconLeft}>{leftIcon}</div>}
                <input
                    ref={ref}
                    className={cn(
                        styles.input,
                        error && styles.inputError,
                        !!leftIcon && styles.inputWithLeftIcon,
                        !!rightIcon && styles.inputWithRightIcon,
                        className,
                    )}
                    {...props}
                />
                {rightIcon && <div className={styles.inputIconRight}>{rightIcon}</div>}
            </div>
        );
    },
);

Input.displayName = 'Input';
