import { ConfigModule } from '@nestjs/config';

export const appConfig = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
});
