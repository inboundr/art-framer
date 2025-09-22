/**
 * Dynamic animations hook for adaptive UI interactions
 * Provides context-aware animations that respect user preferences and device capabilities
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDynamicLayout } from './useDynamicLayout';

export interface AnimationConfig {
  duration?: number;
  easing?: string;
  delay?: number;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

export interface TransitionConfig {
  property?: string;
  duration?: number;
  easing?: string;
  delay?: number;
}

export interface AnimationPreset {
  name: string;
  keyframes: Keyframe[];
  config: AnimationConfig;
}

export interface SpringConfig {
  tension?: number;
  friction?: number;
  mass?: number;
}

export interface AnimationState {
  isAnimating: boolean;
  progress: number;
  direction: 'forward' | 'reverse';
  iteration: number;
}

const defaultAnimationConfig: Required<AnimationConfig> = {
  duration: 300,
  easing: 'ease-out',
  delay: 0,
  iterations: 1,
  direction: 'normal',
  fillMode: 'forwards',
};

const defaultTransitionConfig: Required<TransitionConfig> = {
  property: 'all',
  duration: 200,
  easing: 'ease-out',
  delay: 0,
};

/**
 * Predefined animation presets optimized for different contexts
 */
const animationPresets: Record<string, AnimationPreset> = {
  fadeIn: {
    name: 'fadeIn',
    keyframes: [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    config: { duration: 400, easing: 'ease-out' },
  },
  fadeOut: {
    name: 'fadeOut',
    keyframes: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-10px)' },
    ],
    config: { duration: 300, easing: 'ease-in' },
  },
  slideInLeft: {
    name: 'slideInLeft',
    keyframes: [
      { transform: 'translateX(-100%)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    config: { duration: 400, easing: 'ease-out' },
  },
  slideInRight: {
    name: 'slideInRight',
    keyframes: [
      { transform: 'translateX(100%)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    config: { duration: 400, easing: 'ease-out' },
  },
  slideUp: {
    name: 'slideUp',
    keyframes: [
      { transform: 'translateY(100%)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    config: { duration: 500, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
  },
  scaleIn: {
    name: 'scaleIn',
    keyframes: [
      { transform: 'scale(0.8)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    config: { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  },
  scaleOut: {
    name: 'scaleOut',
    keyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.8)', opacity: 0 },
    ],
    config: { duration: 200, easing: 'ease-in' },
  },
  bounce: {
    name: 'bounce',
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-10px)', offset: 0.5 },
      { transform: 'translateY(0)' },
    ],
    config: { duration: 600, easing: 'ease-out' },
  },
  pulse: {
    name: 'pulse',
    keyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.05)', opacity: 0.8 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    config: { duration: 1000, iterations: Infinity, direction: 'alternate' },
  },
  shake: {
    name: 'shake',
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(0)' },
    ],
    config: { duration: 400, easing: 'ease-out' },
  },
  spin: {
    name: 'spin',
    keyframes: [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(360deg)' },
    ],
    config: { duration: 1000, iterations: Infinity, easing: 'linear' },
  },
  float: {
    name: 'float',
    keyframes: [
      { transform: 'translateY(0px)' },
      { transform: 'translateY(-6px)' },
      { transform: 'translateY(0px)' },
    ],
    config: { duration: 3000, iterations: Infinity, easing: 'ease-in-out' },
  },
  morphIn: {
    name: 'morphIn',
    keyframes: [
      { 
        transform: 'scale(0.8) rotate(-5deg)', 
        opacity: 0,
        filter: 'blur(4px)',
      },
      { 
        transform: 'scale(1) rotate(0deg)', 
        opacity: 1,
        filter: 'blur(0px)',
      },
    ],
    config: { duration: 600, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
  },
};

/**
 * Hook for dynamic animations with performance optimization
 */
export function useDynamicAnimations() {
  const { reducedMotion, isMobile, density } = useDynamicLayout();
  const [animationStates, setAnimationStates] = useState<Map<string, AnimationState>>(new Map());

  /**
   * Get optimized animation config based on device capabilities and user preferences
   */
  const getOptimizedConfig = useCallback((
    baseConfig: AnimationConfig
  ): Required<AnimationConfig> => {
    const config = { ...defaultAnimationConfig, ...baseConfig };

    // Respect reduced motion preference
    if (reducedMotion) {
      return {
        ...config,
        duration: 0,
        delay: 0,
      };
    }

    // Optimize for mobile devices
    if (isMobile) {
      config.duration = Math.max(150, config.duration * 0.8);
    }

    // Optimize for high-density displays
    if (density > 2) {
      config.duration = Math.max(100, config.duration * 0.9);
    }

    return config as Required<AnimationConfig>;
  }, [reducedMotion, isMobile, density]);

  /**
   * Get optimized transition config
   */
  const getOptimizedTransition = useCallback((
    baseConfig: TransitionConfig
  ): Required<TransitionConfig> => {
    const config = { ...defaultTransitionConfig, ...baseConfig };

    if (reducedMotion) {
      return {
        ...config,
        duration: 0,
        delay: 0,
      };
    }

    if (isMobile) {
      config.duration = Math.max(100, config.duration * 0.8);
    }

    return config as Required<TransitionConfig>;
  }, [reducedMotion, isMobile]);

  /**
   * Create CSS transition string
   */
  const createTransition = useCallback((
    configs: TransitionConfig | TransitionConfig[]
  ): string => {
    const configArray = Array.isArray(configs) ? configs : [configs];
    
    return configArray
      .map(config => {
        const optimized = getOptimizedTransition(config);
        return `${optimized.property} ${optimized.duration}ms ${optimized.easing} ${optimized.delay}ms`;
      })
      .join(', ');
  }, [getOptimizedTransition]);

  /**
   * Animate element with Web Animations API
   */
  const animate = useCallback((
    element: Element,
    keyframes: Keyframe[],
    config: AnimationConfig = {},
    id?: string
  ): Animation | null => {
    if (!element || reducedMotion) return null;

    const optimizedConfig = getOptimizedConfig(config);
    
    try {
      const animation = element.animate(keyframes, {
        duration: optimizedConfig.duration,
        easing: optimizedConfig.easing,
        delay: optimizedConfig.delay,
        iterations: optimizedConfig.iterations,
        direction: optimizedConfig.direction,
        fill: optimizedConfig.fillMode,
      });

      // Track animation state if ID provided
      if (id) {
        setAnimationStates(prev => new Map(prev.set(id, {
          isAnimating: true,
          progress: 0,
          direction: 'forward',
          iteration: 0,
        })));

        animation.addEventListener('finish', () => {
          setAnimationStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
        });
      }

      return animation;
    } catch (error) {
      console.warn('Animation failed:', error);
      return null;
    }
  }, [reducedMotion, getOptimizedConfig]);

  /**
   * Animate using preset
   */
  const animatePreset = useCallback((
    element: Element,
    presetName: keyof typeof animationPresets,
    configOverrides: AnimationConfig = {},
    id?: string
  ): Animation | null => {
    const preset = animationPresets[presetName];
    if (!preset) {
      console.warn(`Animation preset "${presetName}" not found`);
      return null;
    }

    const mergedConfig = { ...preset.config, ...configOverrides };
    return animate(element, preset.keyframes, mergedConfig, id);
  }, [animate]);

  /**
   * Create staggered animations for multiple elements
   */
  const staggeredAnimate = useCallback((
    elements: Element[],
    keyframes: Keyframe[],
    config: AnimationConfig = {},
    staggerDelay: number = 100
  ): Animation[] => {
    if (reducedMotion) return [];

    return elements.map((element, index) => {
      const staggeredConfig = {
        ...config,
        delay: (config.delay || 0) + (index * staggerDelay),
      };
      return animate(element, keyframes, staggeredConfig);
    }).filter(Boolean) as Animation[];
  }, [animate, reducedMotion]);

  /**
   * Create spring-based animation
   */
  const createSpringAnimation = useCallback((
    from: number,
    to: number,
    springConfig: SpringConfig = {}
  ): { keyframes: Keyframe[]; config: AnimationConfig } => {
    const {
      tension = 170,
      friction = 26,
      mass = 1,
    } = springConfig;

    // Simplified spring calculation
    const steps = 60;
    const keyframes: Keyframe[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const springValue = calculateSpringValue(progress, tension, friction, mass);
      const value = from + (to - from) * springValue;
      
      keyframes.push({
        transform: `translateY(${value}px)`,
        offset: progress,
      });
    }

    return {
      keyframes,
      config: {
        duration: Math.sqrt(mass / tension) * 1000,
        easing: 'linear',
      },
    };
  }, []);

  /**
   * Get CSS animation string for use in stylesheets
   */
  const getCSSAnimation = useCallback((
    presetName: keyof typeof animationPresets,
    configOverrides: AnimationConfig = {}
  ): string => {
    const preset = animationPresets[presetName];
    if (!preset) return '';

    const config = getOptimizedConfig({ ...preset.config, ...configOverrides });
    
    return `${preset.name} ${config.duration}ms ${config.easing} ${config.delay}ms ${config.iterations === Infinity ? 'infinite' : config.iterations} ${config.direction} ${config.fillMode}`;
  }, [getOptimizedConfig]);

  /**
   * Check if animation is currently running
   */
  const isAnimating = useCallback((id: string): boolean => {
    return animationStates.get(id)?.isAnimating || false;
  }, [animationStates]);

  /**
   * Get all available animation presets
   */
  const getAvailablePresets = useCallback(() => {
    return Object.keys(animationPresets);
  }, []);

  /**
   * Create performance-optimized transform animations
   */
  const createTransformAnimation = useCallback((
    transforms: Record<string, string | number>
  ): Keyframe[] => {
    const transformString = Object.entries(transforms)
      .map(([key, value]) => {
        if (typeof value === 'number') {
          return `${key}(${value}px)`;
        }
        return `${key}(${value})`;
      })
      .join(' ');

    return [
      { transform: 'none' },
      { transform: transformString },
    ];
  }, []);

  // Memoized values for performance
  const memoizedValues = useMemo(() => ({
    presets: animationPresets,
    defaultConfig: defaultAnimationConfig,
    defaultTransition: defaultTransitionConfig,
  }), []);

  return {
    ...memoizedValues,
    animate,
    animatePreset,
    staggeredAnimate,
    createTransition,
    createSpringAnimation,
    createTransformAnimation,
    getCSSAnimation,
    isAnimating,
    getAvailablePresets,
    getOptimizedConfig,
    getOptimizedTransition,
    reducedMotion,
    animationStates,
  };
}

/**
 * Simplified spring calculation for animations
 */
function calculateSpringValue(
  progress: number,
  tension: number,
  friction: number,
  mass: number
): number {
  const dampingRatio = friction / (2 * Math.sqrt(tension * mass));
  const angularFreq = Math.sqrt(tension / mass);
  
  if (dampingRatio < 1) {
    // Underdamped
    const dampedFreq = angularFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
    return 1 - Math.exp(-dampingRatio * angularFreq * progress) * 
           Math.cos(dampedFreq * progress);
  } else if (dampingRatio === 1) {
    // Critically damped
    return 1 - Math.exp(-angularFreq * progress) * (1 + angularFreq * progress);
  } else {
    // Overdamped
    const r1 = -angularFreq * (dampingRatio + Math.sqrt(dampingRatio * dampingRatio - 1));
    const r2 = -angularFreq * (dampingRatio - Math.sqrt(dampingRatio * dampingRatio - 1));
    const c1 = 1 / (r1 - r2);
    const c2 = -c1;
    return 1 - (c1 * Math.exp(r1 * progress) + c2 * Math.exp(r2 * progress));
  }
}

/**
 * Hook for intersection-based animations
 */
export function useIntersectionAnimation(
  presetName: keyof typeof animationPresets,
  config: AnimationConfig = {},
  options: IntersectionObserverInit = {}
) {
  const { animatePreset } = useDynamicAnimations();
  const [ref, setRef] = useState<Element | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!ref || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            animatePreset(entry.target, presetName, config);
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(ref);

    return () => {
      observer.disconnect();
    };
  }, [ref, hasAnimated, animatePreset, presetName, config, options]);

  return { ref: setRef, hasAnimated };
}
