'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, CheckCircle, AlertCircle } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string, placeDetails?: any) => void;
  onAddressSelect?: (address: {
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    countryCode: string;
    lat: number;
    lng: number;
    formattedAddress: string;
  }) => void;
  required?: boolean;
  className?: string;
  error?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export function GooglePlacesAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  onAddressSelect,
  required = false,
  className = '',
  error,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | null>(null);

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    if (!window.initGoogleMaps) {
      window.initGoogleMaps = () => {
        setIsLoaded(true);
      };
    }

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Enhanced autocomplete initialization with comprehensive error handling
  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      try {
        console.log('🗺️ Initializing Google Places Autocomplete');
        
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { 
            country: ['us', 'ca', 'gb', 'au', 'de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'pt', 'ie', 'fi', 'lu', 'jp', 'kr', 'sg', 'hk', 'ch', 'se', 'no', 'dk', 'pl', 'cz', 'hu', 'mx', 'br', 'in', 'nz'] 
          },
          fields: [
            'address_components',
            'formatted_address',
            'geometry',
            'name',
            'place_id',
            'types'
          ],
          strictBounds: false,
        });

        if (autocompleteRef.current) {
          // Enhanced event listeners
          autocompleteRef.current.addListener('place_changed', () => {
            console.log('📍 Place changed event triggered');
            handlePlaceSelect();
          });

          // Handle input changes for better UX
          autocompleteRef.current.addListener('input', () => {
            setValidationStatus(null);
          });

          console.log('✅ Google Places Autocomplete initialized successfully');
        }
      } catch (error) {
        console.error('❌ Error initializing Google Places Autocomplete:', error);
      }
    }

    return () => {
      try {
        if (autocompleteRef.current && window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
          console.log('🧹 Google Places Autocomplete cleaned up');
        }
      } catch (error) {
        console.error('❌ Error cleaning up Google Places Autocomplete:', error);
      }
    };
  }, [isLoaded]);

  const handlePlaceSelect = async () => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    
    console.log('🔍 Google Places place selected:', {
      place_id: place.place_id,
      formatted_address: place.formatted_address,
      has_components: !!place.address_components,
      has_geometry: !!place.geometry,
      component_count: place.address_components?.length || 0
    });
    
    if (!place.address_components || !place.geometry) {
      console.warn('❌ Invalid place data:', { place });
      setValidationStatus('invalid');
      return;
    }

    setIsValidating(true);
    setValidationStatus(null);

    try {
      // Enhanced address parsing with fallbacks
      const addressComponents = place.address_components;
      const addressData = {
        address1: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        countryCode: '',
        lat: place.geometry.location?.lat() || 0,
        lng: place.geometry.location?.lng() || 0,
        formattedAddress: place.formatted_address || '',
      };

      // Enhanced component parsing with multiple fallbacks
      for (const component of addressComponents) {
        const types = component.types;
        
        // Street address parsing with fallbacks
        if (types.includes('street_number')) {
          addressData.address1 = component.long_name + ' ';
        } else if (types.includes('route')) {
          addressData.address1 += component.long_name;
        } else if (types.includes('premise')) {
          // Fallback for building names
          if (!addressData.address1) {
            addressData.address1 = component.long_name;
          }
        }
        
        // City parsing with multiple fallbacks
        if (types.includes('locality')) {
          addressData.city = component.long_name;
        } else if (types.includes('sublocality') && !addressData.city) {
          addressData.city = component.long_name;
        } else if (types.includes('administrative_area_level_2') && !addressData.city) {
          addressData.city = component.long_name;
        }
        
        // State parsing with fallbacks
        if (types.includes('administrative_area_level_1')) {
          addressData.state = component.short_name;
        } else if (types.includes('administrative_area_level_2') && !addressData.state) {
          addressData.state = component.short_name;
        }
        
        // ZIP code parsing
        if (types.includes('postal_code')) {
          addressData.zip = component.long_name;
        }
        
        // Country parsing
        if (types.includes('country')) {
          addressData.country = component.long_name;
          addressData.countryCode = component.short_name;
        }
      }

      // Enhanced validation with better error messages
      const validationErrors = [];
      
      if (!addressData.address1 || addressData.address1.trim().length < 3) {
        validationErrors.push('Street address is required');
      }
      
      if (!addressData.city || addressData.city.trim().length < 2) {
        validationErrors.push('City is required');
      }
      
      if (!addressData.countryCode || addressData.countryCode.length !== 2) {
        validationErrors.push('Country is required');
      }
      
      // ZIP code is optional for some countries, but validate if present
      if (addressData.zip && addressData.zip.length < 3) {
        validationErrors.push('ZIP code is too short');
      }

      console.log('📍 Parsed address data:', addressData);
      console.log('🔍 Validation errors:', validationErrors);

      if (validationErrors.length === 0) {
        setValidationStatus('valid');
        onChange(place.formatted_address || '', place);
        onAddressSelect?.(addressData);
        console.log('✅ Address validation successful');
      } else {
        setValidationStatus('invalid');
        console.warn('❌ Address validation failed:', validationErrors);
      }
    } catch (error) {
      console.error('❌ Error processing place selection:', error);
      setValidationStatus('invalid');
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setValidationStatus(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={`google-places-${label}`} className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id={`google-places-${label}`}
          placeholder={isLoaded ? placeholder : 'Loading Google Maps...'}
          value={value}
          onChange={handleInputChange}
          disabled={!isLoaded}
          className={`pr-10 ${error ? 'border-red-500' : ''} ${
            validationStatus === 'valid' ? 'border-green-500' : ''
          } ${validationStatus === 'invalid' ? 'border-red-500' : ''}`}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isValidating ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : validationStatus === 'valid' ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : validationStatus === 'invalid' ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : null}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      
      {validationStatus === 'valid' && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Address verified with Google Maps
        </p>
      )}
      
      {validationStatus === 'invalid' && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Please select a valid address from the dropdown
        </p>
      )}
      
      {!isLoaded && (
        <p className="text-sm text-muted-foreground">
          Loading Google Maps for address validation...
        </p>
      )}
    </div>
  );
}
