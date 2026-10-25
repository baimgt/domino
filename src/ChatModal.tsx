import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import './chat.css';

interface ChatMessage {
  id: string;
  username: string;
  avatar: string;
  vipLevel: number;
  message: string;
  timestamp: string;
}

interface Props {
  onClose: () => void;
  socket: Socket | null;
  onViewProfile?: (username: string) => void;
}

function Avatar({ src, name }: { src: string; name: string }) {
  const isImg = src && (src.startsWith('/') || src.startsWith('http') || src.startsWith('data:'));
  if (isImg) {
    return <img className="chat-avatar-img" src={src} alt={name} referrerPolicy="no-referrer" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
  }
  return <span className="chat-avatar-emoji">{src || name.charAt(0).toUpperCase()}</span>;
}

export default function ChatModal({ onClose, socket, onViewProfile }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myUsername = localStorage.getItem('domino_username') || '';

  useEffect(() => {
    if (!socket) return;
    
    socket.emit('join_global_chat');
    
    const handleReceive = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };
    
    socket.on('receive_global_msg', handleReceive);
    
    return () => {
      socket.off('receive_global_msg', handleReceive);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !socket || !myUsername) return;
    
    socket.emit('send_global_msg', {
      username: myUsername,
      message: inputMsg.trim()
    });
    
    setInputMsg('');
  };

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-header">
          <div className="chat-title">💬 CHAT GLOBAL</div>
          <button className="chat-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">Belum ada pesan. Jadilah yang pertama menyapa!</div>
          ) : (
            messages.map(msg => {
              const isMe = msg.username === myUsername;
              return (
                <div key={msg.id} className={`chat-msg-row ${isMe ? 'chat-me' : ''}`}>
                  {!isMe && (
                    <div className="chat-avatar" onClick={() => onViewProfile?.(msg.username)}>
                      <Avatar src={msg.avatar} name={msg.username} />
                    </div>
                  )}
                  <div className="chat-bubble-wrap">
                    {!isMe && (
                      <div className="chat-author">
                        <span onClick={() => onViewProfile?.(msg.username)} style={{ cursor: 'pointer' }}>{msg.username}</span> 
                        {msg.vipLevel > 0 && <span className="chat-vip">VIP {msg.vipLevel}</span>}
                      </div>
                    )}
                    <div className="chat-bubble">{msg.message}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form className="chat-input-area" onSubmit={handleSend}>
          <input 
            type="text" 
            className="chat-input" 
            placeholder="Tulis pesan..." 
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            maxLength={100}
          />
          <button type="submit" className="chat-send-btn" disabled={!inputMsg.trim()}>Kirim</button>
        </form>
      </div>
    </div>
  );
}
