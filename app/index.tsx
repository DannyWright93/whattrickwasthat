import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { analyzeTrick, TrickAnalysis } from '../services/claudeVision';
import { saveEntry } from '../storage/trickHistory';
import TrickResult from '../components/TrickResult';

type AnalysisState = 'idle' | 'picking' | 'scrubbing' | 'analyzing' | 'done' | 'error';

export default function HomeScreen() {
  const [state, setState] = useState<AnalysisState>('idle');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(10000); // ms
  const [selectedTime, setSelectedTime] = useState(500);    // ms
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TrickAnalysis | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function handlePickVideo() {
    setState('picking');
    setAnalysis(null);
    setErrorMessage('');

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to pick a video.');
      setState('idle');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
    });

    if (result.canceled || !result.assets?.[0]) {
      setState('idle');
      return;
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    const durationMs = asset.duration ?? 10000; // already in milliseconds

    setVideoUri(uri);
    setVideoDuration(durationMs);
    setSelectedTime(500);

    // Load initial preview frame
    try {
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 500, quality: 1 });
      setPreviewUri(thumbUri);
    } catch {
      setPreviewUri(null);
    }

    setState('scrubbing');
  }

  // Update time display while dragging (no thumbnail extraction — too slow)
  const handleSliderChange = useCallback((value: number) => {
    setSelectedTime(Math.round(value));
  }, []);

  // Update thumbnail only when finger lifts
  const handleSliderComplete = useCallback(async (value: number) => {
    const ms = Math.round(value);
    setSelectedTime(ms);
    if (!videoUri) return;
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: ms, quality: 1 });
      console.log('[Scrub] time:', ms, 'ms → uri:', uri);
      setPreviewUri(uri);
    } catch (e) {
      console.warn('[Scrub] thumbnail failed at', ms, 'ms:', e);
    }
  }, [videoUri]);

  async function handleAnalyze() {
    if (!videoUri) return;
    setState('analyzing');

    try {
      const result = await analyzeTrick(videoUri, selectedTime);
      setAnalysis(result);

      // Capture final thumbnail at the selected time for storage
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: selectedTime,
        quality: 1,
      });
      setThumbnailUri(thumbUri);
      await saveEntry(result, thumbUri, videoUri);
      setState('done');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  function handleReset() {
    setState('idle');
    setVideoUri(null);
    setPreviewUri(null);
    setAnalysis(null);
    setThumbnailUri(null);
    setErrorMessage('');
    setSelectedTime(500);
  }

  const isLoading = state === 'picking' || state === 'analyzing';

  function formatTime(ms: number) {
    const s = ms / 1000;
    return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>What Trick{'\n'}Was That?</Text>
        <Text style={styles.subtitle}>AI-powered skateboarding analyzer</Text>
      </View>

      {state === 'idle' && (
        <TouchableOpacity style={styles.primaryBtn} onPress={handlePickVideo} activeOpacity={0.8}>
          <Text style={styles.primaryBtnIcon}>🎬</Text>
          <Text style={styles.primaryBtnText}>Pick a Clip</Text>
        </TouchableOpacity>
      )}

      {isLoading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>
            {state === 'picking' ? 'Opening library…' : 'Analyzing trick…'}
          </Text>
        </View>
      )}

      {state === 'scrubbing' && previewUri !== undefined && (
        <View style={styles.scrubCard}>
          {previewUri ? (
            <Image key={previewUri} source={{ uri: previewUri }} style={styles.scrubPreview} resizeMode="cover" />
          ) : (
            <View style={[styles.scrubPreview, styles.scrubPreviewPlaceholder]}>
              <Text style={styles.placeholderText}>No preview</Text>
            </View>
          )}

          <View style={styles.scrubControls}>
            <View style={styles.scrubTimeRow}>
              <Text style={styles.scrubTimeLabel}>Frame</Text>
              <Text style={styles.scrubTimeValue}>{formatTime(selectedTime)}</Text>
              <Text style={styles.scrubTimeLabel}>{formatTime(videoDuration)}</Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={videoDuration}
              value={selectedTime}
              onValueChange={handleSliderChange}
              onSlidingComplete={handleSliderComplete}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="#333333"
              thumbTintColor="#FFFFFF"
            />

            <Text style={styles.scrubHint}>Drag to find the trick, then analyze</Text>
          </View>

          <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} activeOpacity={0.8}>
            <Text style={styles.analyzeBtnText}>Analyze This Frame</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rePickBtn} onPress={handlePickVideo} activeOpacity={0.7}>
            <Text style={styles.rePickBtnText}>Pick a Different Clip</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'error' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Analysis failed</Text>
          <Text style={styles.errorMsg}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleReset} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'done' && analysis && (
        <>
          <TrickResult analysis={analysis} thumbnailUri={thumbnailUri ?? undefined} />
          <TouchableOpacity style={styles.newClipBtn} onPress={handleReset} activeOpacity={0.8}>
            <Text style={styles.newClipBtnText}>Analyze Another Clip</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    letterSpacing: -1,
  },
  subtitle: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtnIcon: {
    fontSize: 24,
  },
  primaryBtnText: {
    color: '#0D0D0D',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loadingCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  // Scrubber
  scrubCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  scrubPreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#111',
  },
  scrubPreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#444',
    fontSize: 14,
  },
  scrubControls: {
    padding: 16,
    paddingBottom: 4,
  },
  scrubTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scrubTimeLabel: {
    color: '#555',
    fontSize: 12,
  },
  scrubTimeValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  scrubHint: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  analyzeBtn: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  analyzeBtnText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '800',
  },
  rePickBtn: {
    marginBottom: 16,
    alignItems: 'center',
  },
  rePickBtnText: {
    color: '#555',
    fontSize: 14,
  },
  // Error
  errorCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3A1A1A',
    gap: 8,
  },
  errorTitle: {
    color: '#FF6347',
    fontSize: 18,
    fontWeight: '700',
  },
  errorMsg: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#2A1A1A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6347',
  },
  retryBtnText: {
    color: '#FF6347',
    fontWeight: '700',
    fontSize: 15,
  },
  newClipBtn: {
    marginTop: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  newClipBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
