'use client';

import React from 'react';
import { AuthenticatedLayout } from '../../components/AuthenticatedLayout';
import { SearchBar } from '../../components/SearchBar';
import { UserImageGallery } from '../../components/UserImageGallery';

export default function Creations() {
  const handleOpenGenerationPanel = (promptText: string, settings: any) => {
    // On creations page, generation should redirect to home page
    // Store the prompt and settings in localStorage or URL params
    localStorage.setItem('pending-generation', JSON.stringify({ prompt: promptText, settings }));
    window.location.href = '/';
  };

  return (
    <AuthenticatedLayout>
      {({ onOpenAuthModal }) => (
        /* Exact same layout as home page */
      <div className="flex flex-col min-h-screen bg-background">
        {/* Top Spacer - same as home */}
        <div className="h-16 min-h-16 self-stretch bg-background" />
        
        {/* Search/Navigation Bar - same as home */}
        <SearchBar onOpenGenerationPanel={handleOpenGenerationPanel} />
        
        {/* User Image Gallery - instead of public ImageGallery */}
          <UserImageGallery onOpenAuthModal={onOpenAuthModal} />
      </div>
      )}
    </AuthenticatedLayout>
  );
}