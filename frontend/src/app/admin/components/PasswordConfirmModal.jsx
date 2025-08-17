// src/app/admin/components/PasswordConfirmModal.jsx
'use client';
import React, { useState } from 'react';
import styles from './PasswordConfirmModal.module.css';

const PasswordConfirmModal = ({ onConfirm, onCancel, isConfirming }) => {
  const [password, setPassword] = useState('');

  const handleConfirmClick = () => {
    onConfirm(password);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Confirm Your Identity</h3>
        <p className={styles.modalSubtitle}>For your security, please enter your password to proceed with this action.</p>
        <div className={styles.formGroup}>
          <label htmlFor="confirmationPassword" className={styles.formLabel}>Your Password</label>
          <input
            type="password"
            id="confirmationPassword" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.formInput}
            autoFocus
          />
        </div>
        <div className={styles.modalActions}>
          <button onClick={onCancel} className={styles.modalButtonCancel}>Cancel</button>
          <button onClick={handleConfirmClick} disabled={!password || isConfirming} className={styles.modalButtonConfirm}>
            {isConfirming ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordConfirmModal;