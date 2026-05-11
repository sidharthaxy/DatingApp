import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Plus, Trash2 } from 'lucide-react-native';
import { apiGet, apiPost, apiDelete } from '@/src/lib/api';

export default function PromptsScreen() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New prompt state
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const res = await apiGet('/api/v1/social/prompts');
      const json = await res.json();
      if (json.success) {
        setPrompts(json.data.prompts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrompt = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      return Alert.alert('Error', 'Please fill out both question and answer.');
    }
    setLoading(true);
    try {
      const res = await apiPost('/api/v1/social/prompts', {
        question: newQuestion,
        answer: newAnswer
      });
      const json = await res.json();
      if (json.success) {
        setIsAdding(false);
        setNewQuestion('');
        setNewAnswer('');
        fetchPrompts();
      } else {
        Alert.alert('Error', json.error?.message || 'Failed to add prompt');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Prompt', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiDelete(`/api/v1/social/prompts/${id}`);
          fetchPrompts();
        } catch (err) {}
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <VStack style={styles.header}>
          <HStack style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={28} color="#e6b800" />
            <Heading style={styles.title}>Profile Prompts</Heading>
          </HStack>
          <Text style={styles.subtitle}>Show off your personality (Max 3).</Text>
        </VStack>

        {loading && prompts.length === 0 ? (
          <ActivityIndicator color="#414BEA" size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {prompts.map((prompt) => (
              <VStack key={prompt.id} style={styles.promptCard}>
                <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text style={styles.questionText}>{prompt.question}</Text>
                  <TouchableOpacity onPress={() => handleDelete(prompt.id)} style={{ padding: 4 }}>
                    <Trash2 size={16} color="#ff3b30" />
                  </TouchableOpacity>
                </HStack>
                <Text style={styles.answerText}>{prompt.answer}</Text>
              </VStack>
            ))}

            {prompts.length < 3 && !isAdding && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setIsAdding(true)}>
                <Plus size={20} color="#414BEA" />
                <Text style={styles.addBtnText}>Add a Prompt</Text>
              </TouchableOpacity>
            )}

            {isAdding && (
              <VStack style={styles.formCard}>
                <Text style={styles.formLabel}>Prompt / Question</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., A shower thought I recently had..."
                  value={newQuestion}
                  onChangeText={setNewQuestion}
                />
                <Text style={styles.formLabel}>Your Answer</Text>
                <TextInput
                  style={[styles.input, { minHeight: 80 }]}
                  placeholder="Type your answer here"
                  multiline
                  value={newAnswer}
                  onChangeText={setNewAnswer}
                />
                <HStack style={{ justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setIsAdding(false)} style={{ padding: 12 }}>
                    <Text style={{ color: '#5c5b5b', fontFamily: 'SpaceGrotesk_700Bold' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddPrompt} style={styles.saveBtn}>
                    <Text style={{ color: '#fff', fontFamily: 'SpaceGrotesk_700Bold' }}>Save Prompt</Text>
                  </TouchableOpacity>
                </HStack>
              </VStack>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f6f5' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', color: '#2f2f2e' },
  subtitle: { fontSize: 14, color: '#5c5b5b', fontFamily: 'Manrope_400Regular' },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#e6b800'
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#afadac',
  },
  answerText: {
    fontSize: 18,
    fontFamily: 'Manrope_400Regular',
    color: '#2f2f2e',
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#414BEA30',
    borderStyle: 'dashed',
    marginTop: 8
  },
  addBtnText: {
    color: '#414BEA',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
    marginBottom: 8,
    marginTop: 8
  },
  input: {
    backgroundColor: '#f9f6f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: '#2f2f2e',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveBtn: {
    backgroundColor: '#414BEA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  }
});
