'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, Palette, ShoppingCart } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCreating: () => void;
}

export function WelcomeModal({ isOpen, onClose, onStartCreating }: WelcomeModalProps) {
  // Mark that user has seen the welcome modal
  React.useEffect(() => {
    if (isOpen) {
      localStorage.setItem('art-framer-welcome-seen', 'true');
    }
  }, [isOpen]);

  const steps = [
    {
      icon: <Sparkles className="w-4 h-4 text-pink-primary" />,
      text: "Generate AI art with simple prompts"
    },
    {
      icon: <Palette className="w-4 h-4 text-pink-primary" />,
      text: "Choose your perfect frame style"
    },
    {
      icon: <ShoppingCart className="w-4 h-4 text-pink-primary" />,
      text: "Order and get it delivered to your door"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left side - Text content */}
          <div className="flex-1 space-y-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-bold text-foreground">
                Welcome to Art Framer!
              </DialogTitle>
              <p className="text-base text-muted-foreground mt-2">
                Create stunning AI art and order it framed to your house in just 3 simple steps:
              </p>
            </DialogHeader>
            
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {step.icon}
                  </div>
                  <span className="text-sm text-foreground">
                    {step.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2">✨ What makes us special:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Unlimited free art generation</li>
                  <li>• Your creations stay private</li>
                  <li>• High-quality frames delivered worldwide</li>
                  <li>• No subscription required to start</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={onStartCreating}
                className="flex-1 bg-pink-primary hover:bg-pink-primary/90 text-white font-semibold py-2.5"
              >
                Start Creating Now
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('/pricing', '_blank')}
                className="flex-1 border-border text-foreground hover:bg-muted font-semibold py-2.5"
              >
                View Plans
              </Button>
            </div>
          </div>

          {/* Right side - Video/Demo placeholder */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md aspect-video bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center p-6">
              <Play className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground text-center">
                Demo video coming soon!<br />
                Watch how easy it is to create and frame your art
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
