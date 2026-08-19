import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protects routes using the 'jwt' passport strategy.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
