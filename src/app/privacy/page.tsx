'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Eye, 
  Lock, 
  Database, 
  User, 
  Mail, 
  Phone,
  CreditCard,
  Globe,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';

interface PrivacySection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  lastUpdated: string;
}

export default function PrivacyPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const privacySections: PrivacySection[] = [
    {
      id: 'overview',
      title: 'Privacy Overview',
      icon: <Shield className="h-5 w-5" />,
      lastUpdated: 'January 15, 2025',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Your Privacy Matters</h3>
            </div>
            <p className="text-green-700">
              At Art Framer, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This privacy policy explains how we collect, use, and safeguard your data when you use our AI-powered art generation platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-background rounded-lg border">
              <Lock className="h-8 w-8 text-pink-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Secure by Design</h4>
              <p className="text-sm text-muted-foreground">End-to-end encryption and secure data handling</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <Eye className="h-8 w-8 text-pink-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Transparent Practices</h4>
              <p className="text-sm text-muted-foreground">Clear information about data collection and usage</p>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <User className="h-8 w-8 text-pink-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">User Control</h4>
              <p className="text-sm text-muted-foreground">Full control over your data and privacy settings</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-collection',
      title: 'Data We Collect',
      icon: <Database className="h-5 w-5" />,
      lastUpdated: 'January 15, 2025',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Email address and username
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Profile preferences and settings
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Account creation date and activity
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Subscription and billing information
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Generated Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    AI-generated images and prompts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Reference images you upload
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Frame selections and customizations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Order history and preferences
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-600" />
                  Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Website usage patterns and interactions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Feature usage and performance metrics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Device information and browser type
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    IP address and general location
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Billing address and payment method
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Transaction history and receipts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Shipping addresses and preferences
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Credit card information (encrypted)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">What We Don&apos;t Collect</h3>
            </div>
            <p className="text-blue-700">
              We do not collect sensitive personal information such as social security numbers, 
              government IDs, or other highly sensitive data unless absolutely necessary for service provision.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-usage',
      title: 'How We Use Your Data',
      icon: <Eye className="h-5 w-5" />,
      lastUpdated: 'January 15, 2025',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Service Provision</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Generate AI artwork based on your prompts</li>
                  <li>• Process and fulfill your orders</li>
                  <li>• Provide customer support and assistance</li>
                  <li>• Maintain your account and preferences</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-700">Platform Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Analyze usage patterns to improve features</li>
                  <li>• Optimize AI models and generation quality</li>
                  <li>• Enhance user experience and interface</li>
                  <li>• Develop new features and capabilities</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-purple-700">Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Send order confirmations and updates</li>
                  <li>• Provide important service notifications</li>
                  <li>• Share product updates and new features</li>
                  <li>• Respond to your inquiries and support requests</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-700">Security & Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Protect against fraud and abuse</li>
                  <li>• Ensure platform security and integrity</li>
                  <li>• Comply with legal requirements</li>
                  <li>• Maintain service quality and reliability</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">Important Note</h3>
            </div>
            <p className="text-yellow-700">
              We never sell your personal data to third parties. Your information is only shared 
              with trusted service providers who help us deliver our services, and only to the extent necessary.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-sharing',
      title: 'Data Sharing & Third Parties',
      icon: <Globe className="h-5 w-5" />,
      lastUpdated: 'January 15, 2025',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Trusted Service Providers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">Payment Processing</h4>
                    <p className="text-sm text-muted-foreground">Stripe for secure payment processing</p>
                  </div>
                  <div>
                    <h4 className="font-medium">AI Services</h4>
                    <p className="text-sm text-muted-foreground">Ideogram API for image generation</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Printing & Shipping</h4>
                    <p className="text-sm text-muted-foreground">Prodigi for order fulfillment</p>
                  </div>
                  <div>
                    <h4 className="font-medium">Cloud Infrastructure</h4>
                    <p className="text-sm text-muted-foreground">Supabase for data storage and management</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  Data Protection Measures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    All data transfers are encrypted
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Service providers are vetted for security
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Data sharing is limited to necessary purposes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Regular security audits and monitoring
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Legal Requirements</h3>
            </div>
            <p className="text-red-700">
              We may share your information if required by law, court order, or to protect our rights, 
              property, or safety, or that of our users or the public.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-security',
      title: 'Data Security & Protection',
      icon: <Lock className="h-5 w-5" />,
      lastUpdated: 'January 15, 2025',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Technical Safeguards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    End-to-end encryption for data transmission
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Encrypted storage of sensitive information
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Secure authentication and access controls
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Regular security updates and patches
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Infrastructure Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Secure cloud infrastructure (Supabase)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Regular backups and disaster recovery
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Network security and firewalls
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Monitoring and intrusion detection
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600" />
                  Access Controls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Role-based access permissions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Multi-factor authentication for staff
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Regular access reviews and audits
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Employee security training
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Incident Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    24/7 security monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Rapid incident response procedures
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    User notification of security incidents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Regular security assessments
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'your-rights',
      title: 'Your Privacy Rights',
      icon: <User className="h-5 w-5" />,
      lastUpdated: 'January 15, 2025',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Access & Portability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    View all your personal data
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Download your data in standard formats
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Transfer data to other services
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Access your account dashboard
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Correction & Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Update your profile information
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Correct inaccurate data
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Modify your preferences
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Update privacy settings
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  Deletion & Restriction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Delete your account and data
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Remove individual images or content
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Restrict data processing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Object to certain data uses
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  Communication Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Unsubscribe from marketing emails
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Control notification preferences
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Opt out of data analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Manage cookie preferences
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">How to Exercise Your Rights</h3>
            </div>
            <p className="text-blue-700 mb-3">
              You can exercise most of your privacy rights directly through your account settings. 
              For more complex requests or questions, contact our privacy team:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                privacy@artframer.com
              </Button>
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                1-800-ART-FRAME
              </Button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cookies',
      title: 'Cookies & Tracking',
      icon: <Globe className="h-5 w-5" />,
      lastUpdated: 'January 15, 2025',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Essential Cookies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Required for basic website functionality and security.
                </p>
                <ul className="space-y-1 text-sm">
                  <li>• Authentication and session management</li>
                  <li>• Security and fraud prevention</li>
                  <li>• Shopping cart and checkout process</li>
                  <li>• User preferences and settings</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Analytics Cookies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Help us understand how you use our platform (optional).
                </p>
                <ul className="space-y-1 text-sm">
                  <li>• Website usage and performance metrics</li>
                  <li>• Feature usage and optimization</li>
                  <li>• Error tracking and debugging</li>
                  <li>• User experience improvements</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  Marketing Cookies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Used for personalized advertising and marketing (optional).
                </p>
                <ul className="space-y-1 text-sm">
                  <li>• Personalized content and recommendations</li>
                  <li>• Targeted advertising and promotions</li>
                  <li>• Social media integration</li>
                  <li>• Cross-platform tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                  Cookie Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  You can control cookie preferences at any time.
                </p>
                <ul className="space-y-1 text-sm">
                  <li>• Browser cookie settings</li>
                  <li>• Account privacy preferences</li>
                  <li>• Cookie consent management</li>
                  <li>• Opt-out of non-essential cookies</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Cookie Consent</h3>
            </div>
            <p className="text-green-700">
              We use a cookie consent banner that allows you to choose which types of cookies to accept. 
              You can change your preferences at any time through your account settings or by clearing your browser cookies.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'updates',
      title: 'Policy Updates & Contact',
      icon: <FileText className="h-5 w-5" />,
      lastUpdated: 'January 15, 2025',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Policy Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We may update this privacy policy from time to time to reflect changes in our practices, 
                  technology, legal requirements, or other factors. When we make significant changes, we will:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Notify you via email or in-app notification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Update the &ldquo;Last Updated&rdquo; date at the top of this policy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Provide a summary of key changes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Give you time to review before changes take effect
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Privacy Team</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>privacy@artframer.com</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>1-800-ART-FRAME</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response Time</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• General inquiries: 24-48 hours</p>
                    <p>• Privacy requests: 30 days maximum</p>
                    <p>• Urgent security issues: Immediate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-r from-pink-primary/10 to-purple-600/10 border border-pink-primary/20 rounded-lg p-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-pink-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Questions About Your Privacy?</h3>
              <p className="text-muted-foreground mb-4">
                Our privacy team is here to help with any questions or concerns about how we handle your data.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button className="bg-pink-primary hover:bg-pink-primary/90">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Privacy Team
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Download Full Policy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Your privacy is important to us. This policy explains how Art Framer collects, 
            uses, and protects your personal information when you use our AI-powered art generation platform.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Last Updated: January 15, 2025
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              GDPR Compliant
            </Badge>
          </div>
        </div>

        {/* Privacy Sections */}
        <div className="space-y-4">
          {privacySections.map((section) => (
            <Card key={section.id} className="hover:shadow-md transition-shadow">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {section.icon}
                    <CardTitle className="text-xl">{section.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Updated: {section.lastUpdated}
                    </Badge>
                    {expandedSections.has(section.id) ? (
                      <span className="text-muted-foreground">−</span>
                    ) : (
                      <span className="text-muted-foreground">+</span>
                    )}
                  </div>
                </div>
              </CardHeader>
              {expandedSections.has(section.id) && (
                <CardContent className="pt-0">
                  {section.content}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            This privacy policy is effective as of January 15, 2025. 
            For questions about this policy, please contact us at privacy@artframer.com
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
