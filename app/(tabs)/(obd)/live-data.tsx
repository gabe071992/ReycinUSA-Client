import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { theme } from '@/constants/theme';
import { Activity, Gauge, Thermometer, Battery, Zap, Wind, AlertCircle, Play, Pause, Download } from 'lucide-react-native';
import { useOBD } from '@/providers/OBDProvider';
import { getDatabase, ref, onValue, push, set } from 'firebase/database';
import { app } from '@/config/firebase';

interface LiveDataItem {
  label: string;
  value: string | number;
  unit: string;
  icon: any;
  color: string;
}

export default function LiveDataScreen() {
  const { connectionStatus, telemetry } = useOBD();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    const database = getDatabase(app);
    const sessionsRef = ref(database, 'reycinUSA/obd/sessions');
    const newSessionRef = await push(sessionsRef, {
      uid: 'user_demo',
      vehicleId: 'veh_f300_demo',
      startedAt: Date.now(),
      endedAt: null,
      profile: 'default',
      notes: 'Live data recording session',
    });
    
    if (newSessionRef.key) {
      setSessionId(newSessionRef.key);
      setIsRecording(true);
      
      // Start logging telemetry data
      intervalRef.current = setInterval(async () => {
        if (telemetry && newSessionRef.key) {
          const timestamp = `t_${Date.now()}`;
          const logRef = ref(database, `reycinUSA/obd/sessionLogs/${newSessionRef.key}/${timestamp}`);
          await set(logRef, telemetry);
        }
      }, 100); // Log every 100ms (10Hz)
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (sessionId) {
      const database = getDatabase(app);
      const sessionRef = ref(database, `reycinUSA/obd/sessions/${sessionId}`);
      const sessionData = await new Promise((resolve) => {
        onValue(sessionRef, (snapshot) => {
          resolve(snapshot.val());
        }, { onlyOnce: true });
      });
      
      await set(sessionRef, {
        ...(sessionData as any),
        endedAt: Date.now(),
        logSummary: {
          samples: Math.floor(recordingDuration * 10), // 10Hz sampling
          durationSec: recordingDuration,
        }
      });
    }
    
    setSessionId(null);
  };

  const liveDataItems: LiveDataItem[] = [
    {
      label: 'Engine Speed',
      value: telemetry?.rpm || 0,
      unit: 'RPM',
      icon: Gauge,
      color: theme.colors.white,
    },
    {
      label: 'Coolant Temp',
      value: telemetry?.ect_c || 0,
      unit: '°C',
      icon: Thermometer,
      color: telemetry?.ect_c && telemetry.ect_c > 95 ? theme.colors.error : theme.colors.white,
    },
    {
      label: 'Intake Air Temp',
      value: telemetry?.iat_c || 0,
      unit: '°C',
      icon: Wind,
      color: theme.colors.white,
    },
    {
      label: 'MAP Pressure',
      value: telemetry?.map_kpa || 0,
      unit: 'kPa',
      icon: Activity,
      color: theme.colors.white,
    },
    {
      label: 'Battery Voltage',
      value: telemetry?.vbat?.toFixed(1) || 0,
      unit: 'V',
      icon: Battery,
      color: telemetry?.vbat && telemetry.vbat < 12.5 ? theme.colors.warning : theme.colors.white,
    },
    {
      label: 'Throttle Position',
      value: (telemetry as any)?.throttle_pct || 0,
      unit: '%',
      icon: Zap,
      color: theme.colors.white,
    },
  ];

  if (connectionStatus !== 'connected') {
    return (
      <View style={styles.container}>
        <View style={styles.disconnectedContainer}>
          <AlertCircle size={48} color={theme.colors.textGray} />
          <Text style={styles.disconnectedTitle}>Not Connected</Text>
          <Text style={styles.disconnectedText}>
            Please connect to an OBD device to view live data
          </Text>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => {}}
          >
            <Text style={styles.connectButtonText}>CONNECT DEVICE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recording Status Bar */}
        <View style={[styles.recordingBar, isRecording && styles.recordingBarActive]}>
          <View style={styles.recordingInfo}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording</Text>
              </View>
            )}
            <Text style={styles.recordingDuration}>
              {isRecording ? formatDuration(recordingDuration) : 'Ready to record'}
            </Text>
          </View>
          
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.stopButton]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <Pause size={20} color={theme.colors.white} />
              ) : (
                <Play size={20} color={theme.colors.white} />
              )}
            </TouchableOpacity>
            
            {sessionId && (
              <TouchableOpacity style={styles.downloadButton}>
                <Download size={20} color={theme.colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Live Data Grid */}
        <View style={styles.dataGrid}>
          {liveDataItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <View key={index} style={styles.dataCard}>
                <View style={styles.dataHeader}>
                  <Icon size={20} color={item.color} />
                  <Text style={styles.dataLabel}>{item.label}</Text>
                </View>
                <View style={styles.dataValueContainer}>
                  <Text style={[styles.dataValue, { color: item.color }]}>
                    {item.value}
                  </Text>
                  <Text style={styles.dataUnit}>{item.unit}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Additional PIDs */}
        <View style={styles.additionalSection}>
          <Text style={styles.sectionTitle}>Additional Parameters</Text>
          <View style={styles.pidList}>
            <View style={styles.pidRow}>
              <Text style={styles.pidLabel}>Fuel System Status</Text>
              <Text style={styles.pidValue}>{(telemetry as any)?.fuel_status || 'N/A'}</Text>
            </View>
            <View style={styles.pidRow}>
              <Text style={styles.pidLabel}>Engine Load</Text>
              <Text style={styles.pidValue}>{(telemetry as any)?.engine_load || 0}%</Text>
            </View>
            <View style={styles.pidRow}>
              <Text style={styles.pidLabel}>Short Term Fuel Trim</Text>
              <Text style={styles.pidValue}>{(telemetry as any)?.stft || 0}%</Text>
            </View>
            <View style={styles.pidRow}>
              <Text style={styles.pidLabel}>Long Term Fuel Trim</Text>
              <Text style={styles.pidValue}>{(telemetry as any)?.ltft || 0}%</Text>
            </View>
            <View style={styles.pidRow}>
              <Text style={styles.pidLabel}>O2 Sensor Voltage</Text>
              <Text style={styles.pidValue}>{(telemetry as any)?.o2_voltage || 0}V</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  disconnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  disconnectedTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.white,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  disconnectedText: {
    fontSize: 14,
    color: theme.colors.textGray,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  connectButton: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  connectButtonText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  recordingBar: {
    backgroundColor: theme.colors.darkGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  recordingBarActive: {
    borderColor: theme.colors.error,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
  },
  recordingText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  recordingDuration: {
    color: theme.colors.white,
    fontSize: 14,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 12,
  },
  recordButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: theme.colors.error,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  dataCard: {
    width: '47%',
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  dataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  dataLabel: {
    fontSize: 12,
    color: theme.colors.textGray,
    flex: 1,
  },
  dataValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dataValue: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.white,
  },
  dataUnit: {
    fontSize: 14,
    color: theme.colors.textGray,
  },
  additionalSection: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  pidList: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  pidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  pidLabel: {
    fontSize: 14,
    color: theme.colors.textGray,
  },
  pidValue: {
    fontSize: 14,
    color: theme.colors.white,
    fontWeight: '500',
  },
});