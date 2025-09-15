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
      icon: <Star className="w-5 h-5 text-yellow-500" />,
      title: "Enjoy credits in the fast queue",
      description: "Create professional-quality artwork for free! Skip the wait and generate even more with an Art Framer plan."
    },
    {
      icon: <Globe className="w-5 h-5 text-blue-500" />,
      title: "Generations are public by default",
      description: "You can generate in private or delete individual images with Art Framer Plus."
    },
    {
      icon: <Zap className="w-5 h-5 text-purple-500" />,
      title: "Get premium features with a subscription",
      description: "Learn about our advanced features like Upscale, Image Upload, and more in our Docs or Pricing page."
    },
    {
      icon: <Palette className="w-5 h-5 text-pink-500" />,
      title: "Advanced customization options",
      description: "Control aspect ratios, models, styles, colors, and magic prompts for perfect results."
    },
    {
      icon: <ImageIcon className="w-5 h-5 text-green-500" />,
      title: "Image attachment support",
      description: "Upload reference images to guide your AI generation and get more accurate results."
    },
    {
      icon: <Sparkles className="w-5 h-5 text-orange-500" />,
      title: "Magic prompt enhancement",
      description: "Let AI enhance your prompts automatically for better, more creative results."
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Welcome to Art Framer!
          </DialogTitle>
          <p className="text-lg text-gray-600 mt-2">
            Get to know your free plan:
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          <Button 
            onClick={onStartCreating}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3"
          >
            Start Creating
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.open('/pricing', '_blank')}
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3"
          >
            See Our Plans
          </Button>
        </div>

        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            Your free plan includes 50 credits per month
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
