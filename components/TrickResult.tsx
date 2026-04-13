import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { TrickAnalysis, TrickStyle, ConfidenceLevel } from '../services/claudeVision';

interface Props {
  analysis: TrickAnalysis;
  thumbnailUri?: string;
}

const STYLE_COLORS: Record<TrickStyle, string> = {
  Sketchy: '#FF8C00',
  Decent: '#FFD700',
  Clean: '#32CD32',
  Textbook: '#1E90FF',
  Gnarly: '#FF69B4',
};

const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
};

const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = {
  high: '#32CD32',
  medium: '#FFD700',
  low: '#FF6347',
};

export default function TrickResult({ analysis, thumbnailUri }: Props) {
  const styleColor = STYLE_COLORS[analysis.style] ?? '#888';
  const confidenceColor = CONFIDENCE_COLOR[analysis.confidence] ?? '#888';

  return (
    <View style={styles.card}>
      {thumbnailUri && (
        <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} resizeMode="cover" />
      )}

      <View style={styles.body}>
        <Text style={styles.trickName}>{analysis.trickName}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: styleColor + '22', borderColor: styleColor }]}>
            <Text style={[styles.badgeText, { color: styleColor }]}>{analysis.style}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: confidenceColor + '22', borderColor: confidenceColor }]}>
            <Text style={[styles.badgeText, { color: confidenceColor }]}>
              {CONFIDENCE_LABEL[analysis.confidence]}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{analysis.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginTop: 24,
  },
  thumbnail: {
    width: '100%',
    height: 220,
    backgroundColor: '#111',
  },
  body: {
    padding: 20,
  },
  trickName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  description: {
    color: '#BBBBBB',
    fontSize: 15,
    lineHeight: 22,
  },
});
