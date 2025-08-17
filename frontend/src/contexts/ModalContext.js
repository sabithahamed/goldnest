// src/contexts/ModalContext.js
'use client';

import React, { createContext, useState, useContext, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  // --- Existing Generic Modal State ---
  const [isGenericModalOpen, setIsGenericModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '', type: 'info' });

  // --- NEW: Confirmation Modal State ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmContent, setConfirmContent] = useState({
    title: '',
    message: '',
    onConfirm: () => {}, // The function to run on confirmation
  });

  // --- Existing Generic Modal Functions ---
  const openGenericModal = (title, message, type = 'info') => {
    setModalContent({ title, message, type });
    setIsGenericModalOpen(true);
  };
  const closeGenericModal = () => {
    setIsGenericModalOpen(false);
    // No need to reset here, it's reset on open
  };

  // --- NEW: Confirmation Modal Functions ---
  const openConfirmModal = useCallback((title, message, onConfirmAction) => {
    setConfirmContent({ title, message, onConfirm: onConfirmAction });
    setIsConfirmModalOpen(true);
  }, []);

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    // Resetting content after close is good practice
    setConfirmContent({ title: '', message: '', onConfirm: () => {} });
  };

  const handleConfirm = () => {
    // Execute the stored callback function
    if (typeof confirmContent.onConfirm === 'function') {
      confirmContent.onConfirm();
    }
    closeConfirmModal(); // Close modal after action is executed
  };
  
  // Existing Login Modal State (if you still need it)
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
        
        // NEW: Confirmation Modal
        isConfirmModalOpen,
        openConfirmModal,
        closeConfirmModal,
        handleConfirm, // The action for the "Confirm" button
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