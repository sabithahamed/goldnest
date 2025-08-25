// src/app/admin/components/ConfirmDeleteModal.jsx
'use client';
import React from 'react';
import styles from './ConfirmDeleteModal.module.css';

const ConfirmDeleteModal = ({ onConfirm, onCancel, adminToDelete, isDeleting }) => {
  if (!adminToDelete) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.iconWrapper}>
            <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h3 className={styles.modalTitle}>Confirm Deletion</h3>
        <p className={styles.modalSubtitle}>
          Are you sure you want to permanently delete the admin account for 
          <span className={styles.adminName}> {adminToDelete.firstName} {adminToDelete.lastName}</span>?
          <br/>
          This action cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <button onClick={onCancel} className={styles.modalButtonCancel}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isDeleting} className={styles.modalButtonConfirmDelete}>
            {isDeleting ? 'Deleting...' : 'Confirm and Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;