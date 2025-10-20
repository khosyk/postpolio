import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import io from "socket.io-client";

const SERVER_URL =
  Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
const DEFAULT_ROOM_ID = "lobby";

export default function ChatScreen() {
  const tempUserId = useRef<string | null>(null);
  const [roomId] = useState(DEFAULT_ROOM_ID);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    {
      id: string;
      text: string;
      userId: string;
      displayName?: string;
      avatar?: string;
      createdAt: string;
      type?: string;
    }[]
  >([]);
  const socketRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // scroll/keyboard tracking
  const listHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const atBottomRef = useRef(true);
  const wasAtBottomBeforeKbRef = useRef(true);
  const BOTTOM_EPSILON = 24; // px threshold to consider as bottom

  const socket = useMemo(() => {
    const s = io(SERVER_URL, { transports: ["websocket"] });
    socketRef.current = s;
    return s;
  }, []);

  const computeAtBottom = () => {
    const visible = listHeightRef.current;
    const content = contentHeightRef.current;
    const offset = scrollOffsetRef.current;
    // if content smaller than visible, treat as bottom
    if (content <= visible) return true;
    return content - (offset + visible) <= BOTTOM_EPSILON;
  };

  const ensureScrollState = () => {
    const isAtBottom = computeAtBottom();
    atBottomRef.current = isAtBottom;
  };

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      wasAtBottomBeforeKbRef.current = atBottomRef.current;
      // keyboard will resize view; let next layout/content pass update atBottom
      // If user was already at bottom, keep auto-scroll behavior on next message
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      // after keyboard hides, recompute
      requestAnimationFrame(() => ensureScrollState());
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    function onConnect() {
      socket.emit("join", roomId);
    }

    function onJoined(payload: {
      roomId: string;
      userId: string;
      displayName?: string;
      avatar?: string;
      history?: any[];
    }) {
      tempUserId.current = payload.userId;
      if (Array.isArray(payload.history)) {
        setMessages(payload.history as any);
        // scroll to bottom after initial history render
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          atBottomRef.current = true;
          setHasNewMessages(false);
        }, 0);
      }
    }

    function onMessage(payload: any) {
      setMessages((prev) => [...prev, payload]);
    }

    function onSystem(payload: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${payload.userId}`,
          text: `${payload.displayName || payload.userId} ${payload.kind === 'join' ? '입장' : '퇴장'}`,
          userId: "system",
          displayName: payload.displayName,
          avatar: payload.avatar,
          createdAt: new Date().toISOString(),
          type: "system",
        },
      ]);
    }

    socket.on("connect", onConnect);
    socket.on("joined", onJoined);
    socket.on("message", onMessage);
    socket.on("system", onSystem);

    return () => {
      socket.off("connect", onConnect);
      socket.off("joined", onJoined);
      socket.off("message", onMessage);
      socket.off("system", onSystem);
      socket.disconnect();
    };
  }, [socket, roomId]);

  // react to new messages: auto-scroll only if user is at bottom
  useEffect(() => {
    if (messages.length === 0) return;
    const isAtBottom = computeAtBottom();
    if (isAtBottom) {
      // keep pinned to bottom
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
      setHasNewMessages(false);
    } else {
      setHasNewMessages(true);
    }
  }, [messages]);

  const onListLayout = (e: LayoutChangeEvent) => {
    listHeightRef.current = e.nativeEvent.layout.height;
    ensureScrollState();
  };

  const onContentSizeChange = (_w: number, h: number) => {
    contentHeightRef.current = h;
    ensureScrollState();
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
    const isAtBottom = computeAtBottom();
    atBottomRef.current = isAtBottom;
    if (isAtBottom && hasNewMessages) setHasNewMessages(false);
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    socket.emit("message", { roomId, text });
    setInput("");
  };

  const clearHistory = () => {
    socket.emit("clearHistory", { roomId });
  };

  const scrollToBottom = () => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
      setHasNewMessages(false);
      atBottomRef.current = true;
    }
  };

  const renderItem = ({ item }: any) => {
    const isSystem = item.userId === "system";
    const type = item.type;
    if (type === "system") {
      return (
        <View style={[styles.message, styles.systemMsg]}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }
    if (type === "message" || !type) {
      const isMe = item.userId === tempUserId.current;
      return (
        <View style={[styles.messageContainer, isMe ? styles.myMessageContainer : styles.yourMessageContainer]}>
          {!isMe && (
            <View style={styles.userInfo}>
              <Text style={styles.avatar}>{item.avatar || '👤'}</Text>
              <Text style={styles.displayName}>{item.displayName || item.userId}</Text>
            </View>
          )}
          <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.yourBubble]}>
            <Text style={[styles.messageText, isMe ? styles.myText : styles.yourText]}>
              {item.text}
            </Text>
            <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.yourTimestamp]}>
              {new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.message, styles.systemMsg]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  useEffect(() => {
    const onCleared = (_payload: any) => {
      setMessages([]);
      setHasNewMessages(false);
      atBottomRef.current = true;
    };
    socket.on("historyCleared", onCleared);
    return () => {
      socket.off("historyCleared", onCleared);
    };
  }, [socket]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Room: {roomId}</Text>
        <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
          <Text style={styles.clearText}>기록 삭제</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        style={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        onScroll={onScroll}
        onLayout={onListLayout}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={16}
      />
      {hasNewMessages && (
        <View style={styles.newMessageBar}>
          <TouchableOpacity
            style={styles.newMessageBtn}
            onPress={scrollToBottom}
          >
            <Text style={styles.newMessageText}>새 메시지 보기</Text>
          </TouchableOpacity>
        </View>
      )}
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
  container: { 
    flex: 1, 
    backgroundColor: "#F9FAFB" // Background (클린/모던)
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2C3E50", // Primary (신뢰/전문성)
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerText: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#F9FAFB" 
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1C40F", // Accent (강조/결과)
  },
  clearText: { 
    color: "#2C3E50", 
    fontWeight: "600", 
    fontSize: 12 
  },
  list: { 
    flex: 1, 
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  myMessageContainer: {
    alignItems: "flex-end",
  },
  yourMessageContainer: {
    alignItems: "flex-start",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 8,
  },
  avatar: {
    fontSize: 16,
    marginRight: 6,
  },
  displayName: {
    fontSize: 12,
    color: "#2C3E50",
    fontWeight: "600",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: "#2ECC71", // Secondary (평화/조화)
    borderBottomRightRadius: 4,
  },
  yourBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  messageText: { 
    fontSize: 16, 
    lineHeight: 22,
  },
  myText: { 
    color: "#FFFFFF" 
  },
  yourText: { 
    color: "#2C3E50" 
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  myTimestamp: {
    color: "#FFFFFF",
    textAlign: "right",
  },
  yourTimestamp: {
    color: "#6B7280",
    textAlign: "left",
  },
  systemMsg: { 
    alignItems: "center",
    marginVertical: 8,
  },
  systemText: { 
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  inputBar: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 24,
    backgroundColor: "#F9FAFB",
    fontSize: 16,
    color: "#2C3E50",
  },
  sendBtn: {
    marginLeft: 12,
    backgroundColor: "#2ECC71", // Secondary (평화/조화)
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: "center",
    shadowColor: "#2ECC71",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendText: { 
    color: "#FFFFFF", 
    fontWeight: "700", 
    fontSize: 16 
  },
  newMessageBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F1C40F", // Accent (강조/결과)
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  newMessageBtn: {
    backgroundColor: "#2C3E50", // Primary (신뢰/전문성)
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: "center",
    shadowColor: "#2C3E50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  newMessageText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
