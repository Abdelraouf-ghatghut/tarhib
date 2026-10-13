import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { CommandesModule } from './commandes/commandes.module';
import { QuotasModule } from './quotas/quotas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UtilisateursModule,
    CatalogueModule,
    CommandesModule,
    QuotasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
