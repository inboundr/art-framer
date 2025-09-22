'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone,
  Clock,
  Shield,
  Truck,
  CreditCard,
  Palette,
  Frame,
  Package
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

const faqData: FAQItem[] = [
  // General Questions
  {
    id: '1',
    question: 'What is Art Framer?',
    answer: 'Art Framer is an AI-powered platform that helps you create stunning framed artwork. You can generate unique images using AI, customize frames, and have them professionally printed and shipped to your door.',
    category: 'General',
    tags: ['about', 'platform', 'ai']
  },
  {
    id: '2',
    question: 'How does the AI image generation work?',
    answer: 'Our AI uses advanced machine learning models to create unique artwork based on your text prompts. Simply describe what you want to see, and our AI will generate high-quality images that you can then frame and order.',
    category: 'General',
    tags: ['ai', 'generation', 'prompts']
  },
  {
    id: '3',
    question: 'Do I need to create an account?',
    answer: 'Yes, creating an account is free and allows you to save your generated images, track orders, and access your creation history. You can start generating images immediately after signing up.',
    category: 'General',
    tags: ['account', 'signup', 'free']
  },

  // Pricing & Plans
  {
    id: '4',
    question: 'How much does it cost to generate images?',
    answer: 'New users get 50 free credits per month. Each image generation costs 1 credit. Additional credits can be purchased, and premium plans offer unlimited generation and priority processing.',
    category: 'Pricing',
    tags: ['cost', 'credits', 'free', 'premium']
  },
  {
    id: '5',
    question: 'What are the frame prices?',
    answer: 'Frame prices vary by size and material. Small frames start at $29.99, medium at $39.99, large at $49.99, and extra-large at $59.99. Premium materials like gold and silver frames have additional costs.',
    category: 'Pricing',
    tags: ['frames', 'pricing', 'sizes', 'materials']
  },
  {
    id: '6',
    question: 'Are there any hidden fees?',
    answer: 'No hidden fees! The price you see includes the frame, printing, and basic shipping. Tax is calculated at checkout, and express shipping options are available for an additional fee.',
    category: 'Pricing',
    tags: ['fees', 'transparency', 'shipping', 'tax']
  },

  // Orders & Shipping
  {
    id: '7',
    question: 'How long does shipping take?',
    answer: 'Standard shipping takes 5-7 business days within the US, 7-14 days internationally. Express shipping options are available for faster delivery. You\'ll receive tracking information once your order ships.',
    category: 'Shipping',
    tags: ['shipping', 'delivery', 'tracking', 'international']
  },
  {
    id: '8',
    question: 'Can I track my order?',
    answer: 'Yes! Once your order is processed and shipped, you\'ll receive a tracking number via email. You can also track your orders in your account dashboard under the "Orders" section.',
    category: 'Shipping',
    tags: ['tracking', 'orders', 'dashboard', 'email']
  },
  {
    id: '9',
    question: 'What if my order is damaged or incorrect?',
    answer: 'We offer a 30-day satisfaction guarantee. If your order arrives damaged or incorrect, contact our support team with photos, and we\'ll arrange a replacement or full refund.',
    category: 'Shipping',
    tags: ['damage', 'refund', 'guarantee', 'support']
  },

  // Technical
  {
    id: '10',
    question: 'What image formats do you support?',
    answer: 'We support high-resolution images in various formats. Our AI generates images at 1024x1024 pixels, which are perfect for printing and framing. You can also upload your own reference images.',
    category: 'Technical',
    tags: ['formats', 'resolution', 'upload', 'quality']
  },
  {
    id: '11',
    question: 'Can I use my own images?',
    answer: 'Yes! You can upload reference images to guide the AI generation process. This helps create more personalized and accurate results based on your specific vision.',
    category: 'Technical',
    tags: ['upload', 'reference', 'custom', 'personalization']
  },
  {
    id: '12',
    question: 'How do I get the best results from AI generation?',
    answer: 'Be specific in your prompts, use descriptive language, and include style preferences. You can also use our magic prompt feature to enhance your descriptions automatically.',
    category: 'Technical',
    tags: ['prompts', 'tips', 'magic prompt', 'optimization']
  },

  // Frames & Customization
  {
    id: '13',
    question: 'What frame sizes are available?',
    answer: 'We offer four sizes: Small (8" x 10"), Medium (12" x 16"), Large (16" x 20"), and Extra Large (20" x 24"). Each size is optimized for different spaces and preferences.',
    category: 'Frames',
    tags: ['sizes', 'dimensions', 'options', 'spaces']
  },
  {
    id: '14',
    question: 'What frame materials and styles are available?',
    answer: 'We offer frames in wood, metal, and composite materials. Styles include black, white, natural wood, gold, and silver finishes. Each material has different durability and aesthetic qualities.',
    category: 'Frames',
    tags: ['materials', 'styles', 'finishes', 'durability']
  },
  {
    id: '15',
    question: 'Can I preview how my framed artwork will look?',
    answer: 'Yes! Our frame preview feature shows you exactly how your artwork will look in the selected frame, including realistic wall context and proper proportions.',
    category: 'Frames',
    tags: ['preview', 'visualization', 'wall context', 'proportions']
  },

  // Account & Privacy
  {
    id: '16',
    question: 'Is my artwork private?',
    answer: 'By default, your generated images are public and can be viewed by others. With Art Framer Plus, you can generate private images and have full control over your content visibility.',
    category: 'Privacy',
    tags: ['privacy', 'public', 'private', 'visibility']
  },
  {
    id: '17',
    question: 'Can I delete my generated images?',
    answer: 'Yes, you can delete individual images from your creations gallery. Deleted images are permanently removed from our servers and cannot be recovered.',
    category: 'Privacy',
    tags: ['delete', 'gallery', 'permanent', 'recovery']
  },
  {
    id: '18',
    question: 'How do I update my account information?',
    answer: 'You can update your profile, email, and preferences in your account settings. Click on your avatar in the sidebar to access your profile and settings.',
    category: 'Account',
    tags: ['profile', 'settings', 'update', 'information']
  }
];

const categories = ['All', 'General', 'Pricing', 'Shipping', 'Technical', 'Frames', 'Privacy', 'Account'];

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General': return <HelpCircle className="h-4 w-4" />;
      case 'Pricing': return <CreditCard className="h-4 w-4" />;
      case 'Shipping': return <Truck className="h-4 w-4" />;
      case 'Technical': return <Palette className="h-4 w-4" />;
      case 'Frames': return <Frame className="h-4 w-4" />;
      case 'Privacy': return <Shield className="h-4 w-4" />;
      case 'Account': return <Package className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about Art Framer, our AI image generation, 
            framing options, shipping, and more.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="flex items-center gap-2"
                >
                  {getCategoryIcon(category)}
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4 mb-12">
          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No FAQs found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or category filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleExpanded(item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(item.category)}
                      <CardTitle className="text-lg">{item.question}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.category}</Badge>
                      {expandedItems.has(item.id) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                {expandedItems.has(item.id) && (
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {item.answer}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Contact Support */}
        <Card className="bg-gradient-to-r from-pink-primary/10 to-purple-600/10 border-pink-primary/20">
          <CardContent className="p-8">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-pink-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Our support team is here to help! Get in touch with us through any of the channels below.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg">
                  <Mail className="h-6 w-6 text-pink-primary mb-2" />
                  <h4 className="font-medium mb-1">Email Support</h4>
                  <p className="text-sm text-muted-foreground">support@artframer.com</p>
                  <p className="text-xs text-muted-foreground mt-1">Response within 24 hours</p>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-pink-primary mb-2" />
                  <h4 className="font-medium mb-1">Live Chat</h4>
                  <p className="text-sm text-muted-foreground">Available 9 AM - 6 PM EST</p>
                  <p className="text-xs text-muted-foreground mt-1">Instant responses</p>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-background/50 rounded-lg">
                  <Phone className="h-6 w-6 text-pink-primary mb-2" />
                  <h4 className="font-medium mb-1">Phone Support</h4>
                  <p className="text-sm text-muted-foreground">1-800-ART-FRAME</p>
                  <p className="text-xs text-muted-foreground mt-1">Mon-Fri 9 AM - 6 PM EST</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
