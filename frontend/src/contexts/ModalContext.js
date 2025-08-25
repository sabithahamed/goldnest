// src/contexts/ModalContext.js
'use client';

import React, { createContext, useState, useContext, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  // --- Generic Modal State ---
  const [isGenericModalOpen, setIsGenericModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', type: 'info' });
  // --- NEW: State to hold the function to run when the modal is closed ---
  const [onModalCloseAction, setOnModalCloseAction] = useState(null);

  // --- Confirmation Modal State ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmContent, setConfirmContent] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- UPDATED: Generic Modal Functions ---
  const openGenericModal = (title, message, type = 'info', onCloseCallback = null) => {
    setModalContent({ title, message, type });
    // Store the callback function so 'closeGenericModal' can use it.
    // We wrap it in a function to ensure we're setting the state correctly.
    setOnModalCloseAction(() => onCloseCallback); 
    setIsGenericModalOpen(true);
  };

  const closeGenericModal = () => {
    setIsGenericModalOpen(false);
    // --- NEW: After closing, check if there's a stored action to run ---
    if (typeof onModalCloseAction === 'function') {
      onModalCloseAction();
    }
    // Reset the callback to null for the next time
    setOnModalCloseAction(null);
  };

  // --- Confirmation Modal Functions (unchanged) ---
  const openConfirmModal = useCallback((title, message, onConfirmAction) => {
    setConfirmContent({ title, message, onConfirm: onConfirmAction });
    setIsConfirmModalOpen(true);
  }, []);

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmContent({ title: '', message: '', onConfirm: () => {} });
  };

  const handleConfirm = () => {
    if (typeof confirmContent.onConfirm === 'function') {
      confirmContent.onConfirm();
    }
    closeConfirmModal();
  };
  
  // Login Modal State (unchanged)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <ModalContext.Provider 
      value={{ 
        // Generic Modal
        isGenericModalOpen, 
        openGenericModal, 
        closeGenericModal,
        modalContent,
        
        // Confirmation Modal
        isConfirmModalOpen,
        openConfirmModal,
        closeConfirmModal,
        handleConfirm,
        confirmContent,

        // Login Modal
        isLoginModalOpen, 
        openLoginModal, 
        closeLoginModal, 
      }}>
      {children}
    </ModalContext.Provider>
  );
};