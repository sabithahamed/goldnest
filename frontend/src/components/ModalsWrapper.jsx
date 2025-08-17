// src/components/ModalsWrapper.jsx
'use client';

import React from 'react';
import { useModal } from '@/contexts/ModalContext';
import GenericModal from '@/components/popups/GenericModal';
import LoginModal from '@/components/LoginModal';
import ConfirmationModal from '@/components/popups/ConfirmationModal'; // Import the new modal

const ModalsWrapper = () => {
  const { 
    isLoginModalOpen, 
    isGenericModalOpen, 
    closeGenericModal, 
    modalContent,
    // NEW: Get confirmation modal state and functions
    isConfirmModalOpen,
    closeConfirmModal,
    handleConfirm,
    confirmContent
  } = useModal();

  return (
    <>
      {/* Login Modal */}
      {isLoginModalOpen && <LoginModal />}
      
      {/* Generic Info/Success/Error Modal */}
      <GenericModal
        isOpen={isGenericModalOpen}
        onClose={closeGenericModal}
        title={modalContent.title}
        message={modalContent.message}
        type={modalContent.type}
      />

      {/* NEW: Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal} // "Cancel" button action
        onConfirm={handleConfirm}   // "Confirm" button action
        title={confirmContent.title}
        message={confirmContent.message}
      />
    </>
  );
};

export default ModalsWrapper;