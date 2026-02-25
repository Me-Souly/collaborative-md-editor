import React, { useState } from 'react';
import { Input, InputProps } from '@components/common/ui/Input';
import { EyeIcon, EyeOffIcon } from '@components/common/ui/icons';
import * as styles from '@components/common/ui/PasswordInput.module.css';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
    showToggle?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ showToggle = true, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        const togglePassword = () => {
            setShowPassword(!showPassword);
        };

        return (
            <Input
                ref={ref}
                type={showPassword ? 'text' : 'password'}
                rightIcon={
                    showToggle ? (
                        <button
                            type="button"
                            onClick={togglePassword}
                            className={styles.toggleButton}
                            tabIndex={-1}
                            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                            {showPassword ? (
                                <EyeOffIcon className={styles.toggleIcon} />
                            ) : (
                                <EyeIcon className={styles.toggleIcon} />
                            )}
                        </button>
                    ) : undefined
                }
                {...props}
            />
        );
    },
);

PasswordInput.displayName = 'PasswordInput';
