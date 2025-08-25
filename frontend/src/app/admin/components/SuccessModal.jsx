// src/app/admin/components/SuccessModal.jsx
'use client';
import React from 'react';
import styles from './SuccessModal.module.css'; // We will create this next

const SuccessModal = ({ onClose, title, message }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrapper}>
            <i className="fas fa-check-circle"></i>
        </div>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalSubtitle}>{message}</p>
        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.modalButtonConfirm}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;