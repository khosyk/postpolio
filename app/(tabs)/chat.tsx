import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import io from 'socket.io-client';

const SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:4000';
const DEFAULT_ROOM_ID = 'lobby';

export default function ChatScreen() {
  const [roomId] = useState(DEFAULT_ROOM_ID);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ id: string; text: string; userId: string; createdAt: string }[]>([]);
  const socketRef = useRef<any>(null);

  const socket = useMemo(() => {
    const s = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = s;
    return s;
  }, []);

  useEffect(() => {
    function onConnect() {
      socket.emit('join', roomId);
    }
    function onMessage(payload: any) {
      setMessages((prev) => [...prev, payload]);
    }
    function onSystem(payload: any) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-system`, text: `${payload.userId} ${payload.type}`, userId: 'system', createdAt: new Date().toISOString() },
      ]);
    }

    socket.on('connect', onConnect);
    socket.on('message', onMessage);
    socket.on('system', onSystem);

    return () => {
      socket.off('connect', onConnect);
      socket.off('message', onMessage);
      socket.off('system', onSystem);
      socket.disconnect();
    };
  }, [socket, roomId]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    socket.emit('message', { roomId, text });
    setInput('');
  };

  const renderItem = ({ item }: any) => {
    const isSystem = item.userId === 'system';
    return (
      <View style={[styles.message, isSystem && styles.systemMsg]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Room: {roomId}</Text>
      </View>
      <FlatList
        style={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요"
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Text style={styles.sendText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 56, paddingBottom: 12, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  headerText: { fontSize: 16, fontWeight: '600' },
  list: { flex: 1 },
  message: { padding: 10, borderRadius: 8, backgroundColor: '#f2f2f7', marginBottom: 8 },
  systemMsg: { backgroundColor: '#e7f1ff' },
  messageText: { fontSize: 15 },
  inputBar: { flexDirection: 'row', padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd' },
  input: { flex: 1, height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8 },
  sendBtn: { marginLeft: 8, backgroundColor: '#007aff', paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
});
