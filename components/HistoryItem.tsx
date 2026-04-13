import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TrickEntry } from '../storage/trickHistory';
import { TrickStyle } from '../services/claudeVision';

interface Props {
  entry: TrickEntry;
  onDelete: (id: string) => void;
}

const STYLE_COLORS: Record<TrickStyle, string> = {
  Sketchy: '#FF8C00',
  Decent: '#FFD700',
  Clean: '#32CD32',
  Textbook: '#1E90FF',
  Gnarly: '#FF69B4',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryItem({ entry, onDelete }: Props) {
  const styleColor = STYLE_COLORS[entry.analysis.style] ?? '#888';

  function handleDelete() {
    Alert.alert('Delete Entry', 'Remove this trick from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(entry.id),
      },
    ]);
  }

  return (
    <View style={styles.row}>
      <Image
        source={{ uri: entry.thumbnailUri }}
        style={styles.thumb}
        resizeMode="cover"
      />

      <View style={styles.info}>
        <Text style={styles.trickName} numberOfLines={1}>
          {entry.analysis.trickName}
        </Text>
        <View style={[styles.badge, { backgroundColor: styleColor + '22', borderColor: styleColor }]}>
          <Text style={[styles.badgeText, { color: styleColor }]}>{entry.analysis.style}</Text>
        </View>
        <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} hitSlop={8}>
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  thumb: {
    width: 80,
    height: 80,
    backgroundColor: '#111',
  },
  info: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  trickName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  date: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    color: '#555',
    fontSize: 16,
    fontWeight: '700',
  },
});
