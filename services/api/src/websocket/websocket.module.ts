import { Module } from '@nestjs/common';
import { WebsocketGateway } from './gateway'; // FIXED: Changed from AppGateway

@Module({
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
