import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { screen } from '@testing-library/dom';
export const useProctoring = (sessionId, isActive = true, userId = null, assessmentId = null) => {
  const [violations, setViolations] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sessionViolations, setSessionViolations] = useState([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  // ✅ Save proctoring event directly to Firestore
  const saveProctoringEvent = async (eventData) => {
    try {
      console.log('📹 Saving proctoring event to Firestore:', eventData);
      
      const proctoringData = {
        userId: userId || 'anonymous',
        sessionId,
        assessmentId: assessmentId || null,
        type: eventData.type,
        description: eventData.description,
        severity: eventData.severity || 'medium',
        metadata: eventData.metadata || {},
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      // ✅ Save directly to Firestore production
      const docRef = await addDoc(collection(db, 'proctoring-events'), proctoringData);
      
      console.log('✅ Proctoring event saved:', docRef.id);
      
      return {
        success: true,
        eventId: docRef.id
      };
      
    } catch (error) {
      console.error('❌ Failed to save proctoring event:', error);
      throw error;
    }
  };

  const logViolation = async (type, description, severity = 'medium', metadata = {}) => {
    const violation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      severity,
      metadata,
      timestamp: new Date().toISOString()
    };

    try {
      // Save to Firestore
      await saveProctoringEvent(violation);
      
      // Update local state
      setViolations(prev => [...prev, violation]);
      setSessionViolations(prev => [...prev, violation]);
      
      console.log(`🚨 Proctoring violation logged: ${type}`);
      
    } catch (error) {
      console.error('Failed to log violation:', error);
      // Still add to local state even if save fails
      setViolations(prev => [...prev, violation]);
      setSessionViolations(prev => [...prev, violation]);
    }
  };

  // Tab visibility monitoring
  const handleVisibilityChange = () => {
    if (document.hidden && isActive) {
      logViolation(
        'tab_switch',
        'User switched away from the assessment tab',
        'high',
        { 
          timestamp: Date.now(),
          previousVisibility: !document.hidden
        }
      );
    }
  };

  // Window focus monitoring
  const handleWindowBlur = () => {
    if (isActive) {
      logViolation(
        'window_blur',
        'Assessment window lost focus',
        'medium',
        { 
          timestamp: Date.now(),
          windowInnerWidth: window.innerWidth,
          windowInnerHeight: window.innerHeight
        }
      );
    }
  };

  // Right-click prevention
  const handleContextMenu = (e) => {
    if (isActive) {
      e.preventDefault();
      logViolation(
        'right_click',
        'User attempted to right-click',
        'low',
        { 
          timestamp: Date.now(),
          elementTag: e.target.tagName,
          elementClass: e.target.className
        }
      );
    }
  };

  // Copy/paste prevention  
  const handleKeyDown = (e) => {
    if (isActive && (e.ctrlKey || e.metaKey)) {
      if (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 's') {
        e.preventDefault();
        logViolation(
          'keyboard_shortcut',
          `User attempted ${e.key === 'c' ? 'copy' : e.key === 'v' ? 'paste' : e.key === 'a' ? 'select all' : 'save'} shortcut`,
          'medium',
          { 
            key: e.key, 
            timestamp: Date.now(),
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey
          }
        );
      }
    }
    
    // Detect Alt+Tab (attempt to switch applications)
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      logViolation(
        'alt_tab',
        'User attempted to switch applications (Alt+Tab)',
        'high',
        { timestamp: Date.now() }
      );
    }
  };

  // Fullscreen monitoring
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && isActive) {
      logViolation(
        'fullscreen_exit',
        'User exited fullscreen mode',
        'high',
        { timestamp: Date.now() }
      );
    }
  };

  // Mouse leave detection (user moved mouse outside browser window)
  const handleMouseLeave = () => {
    if (isActive) {
      logViolation(
        'mouse_leave',
        'Mouse cursor left the browser window',
        'medium',
        { timestamp: Date.now() }
      );
    }
  };

  // Start monitoring
  const startMonitoring = async () => {
    if (!isActive || isMonitoring) return;

    try {
      setIsMonitoring(true);
      
      // Add event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('mouseleave', handleMouseLeave);

      // Log monitoring start
      await logViolation(
        'monitoring_start',
        'Proctoring monitoring started',
        'info',
        { 
          sessionId, 
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          screenWidth: screen.width,
          screenHeight: screen.height
        }
      );

      console.log('✅ Proctoring monitoring started');
      
    } catch (error) {
      console.error('Failed to start proctoring:', error);
      setIsMonitoring(false);
    }
  };

  // Stop monitoring
  const stopMonitoring = async () => {
    if (!isMonitoring) return;

    try {
      setIsMonitoring(false);
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mouseleave', handleMouseLeave);

      // Stop media recording if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Log monitoring stop
      await logViolation(
        'monitoring_stop',
        'Proctoring monitoring stopped',
        'info',
        { 
          sessionId, 
          timestamp: Date.now(),
          totalViolations: sessionViolations.length,
          sessionDuration: Date.now() - (sessionViolations[0]?.timestamp || Date.now())
        }
      );

      console.log('🛑 Proctoring monitoring stopped');
      
    } catch (error) {
      console.error('Failed to stop proctoring:', error);
    }
  };

  // ✅ Function to save session summary when assessment completes
  const saveSessionSummary = async (additionalData = {}) => {
    try {
      const summaryData = {
        userId: userId || 'anonymous',
        sessionId,
        assessmentId: assessmentId || null,
        type: 'session_summary',
        description: 'Assessment session completed - proctoring summary',
        severity: 'info',
        metadata: {
          totalViolations: sessionViolations.length,
          violationTypes: [...new Set(sessionViolations.map(v => v.type))],
          highSeverityViolations: sessionViolations.filter(v => v.severity === 'high').length,
          mediumSeverityViolations: sessionViolations.filter(v => v.severity === 'medium').length,
          lowSeverityViolations: sessionViolations.filter(v => v.severity === 'low').length,
          sessionDuration: Date.now() - (sessionViolations[0]?.timestamp || Date.now()),
          ...additionalData
        },
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'proctoring-sessions'), summaryData);
      
      console.log('✅ Proctoring session summary saved:', docRef.id);
      
      return {
        success: true,
        sessionSummaryId: docRef.id,
        totalViolations: sessionViolations.length
      };
      
    } catch (error) {
      console.error('❌ Failed to save session summary:', error);
      return {
        success: false,
        error: error.message,
        totalViolations: sessionViolations.length
      };
    }
  };

  // Initialize monitoring when component mounts
  useEffect(() => {
    if (isActive && userId) {
      startMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isActive, sessionId, userId, assessmentId]);

  return {
    violations,
    sessionViolations,
    isMonitoring,
    logViolation,
    startMonitoring,
    stopMonitoring,
    saveSessionSummary,
    saveProctoringEvent
  };
};
