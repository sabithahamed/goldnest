// src/components/popups/ConfirmationModal.jsx
import React from 'react';
import styles from './ConfirmationModal.module.css'; // We will create this CSS file

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <i className={`fas fa-exclamation-triangle ${styles.warningIcon}`}></i>
          <h2 className={styles.modalTitle}>{title}</h2>
        </div>
        <div className={styles.modalBody}>
          <p>{message}</p>
        </div>
        <div className={styles.modalActions}>
          <button className={`${styles.modalButton} ${styles.cancelButton}`} onClick={onClose}>
            Cancel
          </button>
          <button className={`${styles.modalButton} ${styles.confirmButton}`} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmationModal;