// src/components/popups/GenericModal.jsx
import React from 'react';
import styles from './GenericModal.module.css';

const GenericModal = ({ isOpen, onClose, title, message, type }) => {
  if (!isOpen) return null;

  const getIconClass = () => {
    switch(type) {
      case 'success':
        return styles.successIcon;
      case 'error':
        return styles.errorIcon;
      case 'info':
        return styles.infoIcon;
      default:
        return '';
    }
  };

  const getIconContent = () => {
    switch(type) {
      case 'success':
        return '✓'; // You can use a Font Awesome icon here too
      case 'error':
        return '✕';
      case 'info':
        return 'i';
      default:
        return '';
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={`${styles.modalIcon} ${getIconClass()}`}>
            {getIconContent()}
          </div>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button onClick={onClose} className={styles.modalCloseButton}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <p>{message}</p>
        </div>
        {/* Add a button here that closes the modal */}
        <button className={styles.modalButton} onClick={onClose}>
            OK
        </button>
      </div>
    </div>
  );
};

export default GenericModal;