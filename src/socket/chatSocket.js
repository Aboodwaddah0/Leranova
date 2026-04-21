import jwt from 'jsonwebtoken';
import {
  listChatsForStudent,
  resolveStudentChatRoom,
  sendStudentChatTextMessage,
  markStudentChatMessagesSeen,
} from '../services/chatService.js';

const parseToken = (rawAuth) => {
  const auth = String(rawAuth || '').trim();
  if (!auth) {
    return null;
  }

  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth;
};

const emitTyping = (io, room, payload, senderSocketId) => {
  io.to(room).except(senderSocketId).emit('typing', payload);
};

const emitStopTyping = (io, room, payload, senderSocketId) => {
  io.to(room).except(senderSocketId).emit('stop_typing', payload);
};

export const initChatSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = parseToken(socket.handshake.auth?.token || socket.handshake.headers?.authorization);
      if (!token) {
        return next(new Error('Unauthorized: missing token'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = {
        id: Number(payload.id),
        role: String(payload.role || '').toUpperCase(),
        email: payload.email || null,
        name: payload.name || null,
      };

      return next();
    } catch (error) {
      return next(new Error('Unauthorized: invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user;

    if (user?.role !== 'STUDENT') {
      socket.emit('socket_error', { message: 'Only student socket mode is enabled.' });
      return;
    }

    try {
      const chats = await listChatsForStudent({ userId: user.id });
      chats.forEach((chat) => {
        if (chat.type === 'CLASS') {
          socket.join(`class_${chat.classId}`);
        } else if (chat.type === 'COURSE') {
          socket.join(`course_${chat.courseId}`);
        }
      });
    } catch (error) {
      socket.emit('socket_error', { message: error.message || 'Failed to initialize chat rooms.' });
    }

    socket.on('join_chat', async (payload = {}, ack) => {
      try {
        const chatId = Number(payload.chatId);
        if (!chatId || Number.isNaN(chatId)) {
          throw new Error('Invalid chat id');
        }

        const { room } = await resolveStudentChatRoom({ chatId, userId: user.id });
        socket.join(room);

        if (typeof ack === 'function') {
          ack({ ok: true, room });
        }
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ ok: false, message: error.message || 'Failed to join room' });
        }
      }
    });

    socket.on('send_message', async (payload = {}, ack) => {
      try {
        const chatId = Number(payload.chatId);
        const content = String(payload.content || '');
        const replyToMessageId = payload.replyToMessageId == null ? null : Number(payload.replyToMessageId);

        if (!chatId || Number.isNaN(chatId)) {
          throw new Error('Invalid chat id');
        }

        const { room } = await resolveStudentChatRoom({ chatId, userId: user.id });
        const message = await sendStudentChatTextMessage({
          chatId,
          userId: user.id,
          content,
          replyToMessageId,
        });

        io.to(room).emit('receive_message', {
          chatId,
          message,
        });

        if (typeof ack === 'function') {
          ack({ ok: true, data: message });
        }
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ ok: false, message: error.message || 'Failed to send message' });
        }
      }
    });

    socket.on('typing', async (payload = {}) => {
      try {
        const chatId = Number(payload.chatId);
        if (!chatId || Number.isNaN(chatId)) {
          return;
        }

        const { room } = await resolveStudentChatRoom({ chatId, userId: user.id });
        emitTyping(
          io,
          room,
          {
            chatId,
            userId: user.id,
            userName: user.name || null,
          },
          socket.id,
        );
      } catch {
        // Ignore typing failures to keep socket flow lightweight.
      }
    });

    socket.on('stop_typing', async (payload = {}) => {
      try {
        const chatId = Number(payload.chatId);
        if (!chatId || Number.isNaN(chatId)) {
          return;
        }

        const { room } = await resolveStudentChatRoom({ chatId, userId: user.id });
        emitStopTyping(
          io,
          room,
          {
            chatId,
            userId: user.id,
          },
          socket.id,
        );
      } catch {
        // Ignore typing failures to keep socket flow lightweight.
      }
    });

    socket.on('message_seen', async (payload = {}, ack) => {
      try {
        const chatId = Number(payload.chatId);
        if (!chatId || Number.isNaN(chatId)) {
          throw new Error('Invalid chat id');
        }

        const { room } = await resolveStudentChatRoom({ chatId, userId: user.id });
        const seen = await markStudentChatMessagesSeen({ chatId, userId: user.id });

        io.to(room).emit('message_seen', {
          chatId,
          userId: user.id,
          seenAt: seen.seenAt,
        });

        if (typeof ack === 'function') {
          ack({ ok: true, data: seen });
        }
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ ok: false, message: error.message || 'Failed to mark seen' });
        }
      }
    });
  });
};
