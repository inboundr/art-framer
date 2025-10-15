'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Globe, Zap, Sparkles, Palette, Image as ImageIcon } from 'lucide-react';

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

  const features = [
    {
      icon: <Star className="w-5 h-5 text-pink-primary" />,
      title: "Enjoy credits in the fast queue",
      description: "Create professional-quality artwork for free! Skip the wait and generate even more with an Art Framer plan."
    },
    {
      icon: <Globe className="w-5 h-5 text-primary" />,
      title: "Your generations are private",
      description: "All your generated images are private to you. The home page shows curated public images for inspiration."
    },
    {
      icon: <Zap className="w-5 h-5 text-pink-primary" />,
      title: "Get premium features with a subscription",
      description: "Learn about our advanced features like Upscale, Image Upload, and more in our Docs or Pricing page."
    },
    {
      icon: <Palette className="w-5 h-5 text-primary" />,
      title: "Advanced customization options",
      description: "Control aspect ratios, models, styles, colors, and magic prompts for perfect results."
    },
    {
      icon: <ImageIcon className="w-5 h-5 text-pink-primary" />,
      title: "Image attachment support",
      description: "Upload reference images to guide your AI generation and get more accurate results."
    },
    {
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      title: "Magic prompt enhancement",
      description: "Let AI enhance your prompts automatically for better, more creative results."
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-3xl font-bold text-foreground">
            Welcome to Art Framer!
          </DialogTitle>
          <p className="text-lg text-muted-foreground mt-2">
            Create AI art and order it framed to your house. Get to know your free plan:
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {features.map((feature, index) => (
            <Card key={index} className="border border-border bg-card hover:bg-muted/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
          <Button 
            onClick={onStartCreating}
            className="flex-1 bg-pink-primary hover:bg-pink-primary/90 text-white font-semibold py-3"
          >
            Start Creating
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.open('/pricing', '_blank')}
            className="flex-1 border-border text-foreground hover:bg-muted font-semibold py-3"
          >
            See Our Plans
          </Button>
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Your free plan includes 50 credits per month
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
