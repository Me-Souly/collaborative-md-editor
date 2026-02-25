import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@components/common/ui/icons';
import * as styles from '@components/common/ui/CustomSelect.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    options,
    onChange,
    placeholder = 'Select...',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={styles.selectContainer} ref={selectRef}>
            <button
                className={cn(styles.selectButton, isOpen && styles.selectButtonOpen)}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <span className={styles.selectValue}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDownIcon
                    className={cn(styles.selectIcon, isOpen && styles.selectIconOpen)}
                />
            </button>
            {isOpen && (
                <div className={styles.selectDropdown}>
                    {options.map((option) => (
                        <button
                            key={option.value}
                            className={cn(
                                styles.selectOption,
                                value === option.value && styles.selectOptionActive,
                            )}
                            onClick={() => handleSelect(option.value)}
                            type="button"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
