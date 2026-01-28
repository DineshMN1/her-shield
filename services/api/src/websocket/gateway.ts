import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Clean up rooms
    this.rooms.forEach((users, roomId) => {
      if (users.has(client.id)) {
        users.delete(client.id);
        client.to(roomId).emit('user-left', { socketId: client.id });
      }
    });
  }

  // SOS Emergency alerts
  emitSOSAlert(data: any) {
    this.server.emit('sos:new', data);
  }

  // Video Call Signaling
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    client.join(data.roomId);

    if (!this.rooms.has(data.roomId)) {
      this.rooms.set(data.roomId, new Set());
    }
    this.rooms.get(data.roomId).add(client.id);

    // Notify others in room
    client.to(data.roomId).emit('user-joined', {
      userId: data.userId,
      socketId: client.id,
    });

    console.log(`User ${data.userId} joined room ${data.roomId}`);
    return { success: true, roomId: data.roomId };
  }

  @SubscribeMessage('webrtc-offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; offer: any },
  ) {
    console.log(`Offer from ${client.id} in room ${data.roomId}`);
    client.to(data.roomId).emit('webrtc-offer', {
      offer: data.offer,
      socketId: client.id,
    });
  }

  @SubscribeMessage('webrtc-answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; answer: any },
  ) {
    console.log(`Answer from ${client.id} in room ${data.roomId}`);
    client.to(data.roomId).emit('webrtc-answer', {
      answer: data.answer,
      socketId: client.id,
    });
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; candidate: any },
  ) {
    client.to(data.roomId).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      socketId: client.id,
    });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(data.roomId);

    if (this.rooms.has(data.roomId)) {
      this.rooms.get(data.roomId).delete(client.id);
    }

    client.to(data.roomId).emit('user-left', {
      socketId: client.id,
    });

    console.log(`User left room ${data.roomId}`);
  }
}
