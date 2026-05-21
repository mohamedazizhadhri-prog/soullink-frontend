import React, { useState, useEffect } from 'react';
import styles from './AdminModal.module.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
    isSuccess?: boolean;
    isWarn?: boolean;
}

export function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDanger,
    isSuccess,
    isWarn
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    let btnClass = styles.confirmBtn;
    let icon = 'ℹ️';
    if (isDanger) { btnClass = styles.dangerBtn; icon = '⚠️'; }
    if (isSuccess) { btnClass = styles.successBtn; icon = '✅'; }
    if (isWarn) { btnClass = styles.warnBtn; icon = '🚧'; }

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modal}>
                <span className={styles.icon}>{icon}</span>
                <h2 id="modal-title" className={styles.title}>{title}</h2>
                <p className={styles.body}>{message}</p>
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onCancel}>{cancelText}</button>
                    <button className={btnClass} onClick={onConfirm} autoFocus>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

interface InputModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (val: string) => void;
    onCancel: () => void;
    isDanger?: boolean;
    inputType?: 'text' | 'textarea' | 'date';
}

export function InputModal({
    isOpen,
    title,
    message,
    placeholder = 'Type here...',
    confirmText = 'Submit',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDanger,
    inputType = 'text'
}: InputModalProps) {
    const [value, setValue] = useState('');

    useEffect(() => {
        if (isOpen) setValue('');
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!value.trim()) return;
        onConfirm(value.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputType !== 'textarea') {
            handleConfirm();
        }
    };

    let btnClass = isDanger ? styles.dangerBtn : styles.confirmBtn;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modal}>
                <h2 id="modal-title" className={styles.title}>{title}</h2>
                <p className={styles.body}>{message}</p>
                
                {inputType === 'textarea' ? (
                    <textarea 
                        className={styles.textarea}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                    />
                ) : (
                    <input 
                        type={inputType}
                        className={styles.input}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                )}

                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onCancel}>{cancelText}</button>
                    <button 
                        className={btnClass} 
                        onClick={handleConfirm}
                        disabled={!value.trim()}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
