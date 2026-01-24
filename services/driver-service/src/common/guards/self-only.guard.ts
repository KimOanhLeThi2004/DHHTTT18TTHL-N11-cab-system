import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class SelfOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: string } | undefined;
    const driverId = request.params?.driverId as string | undefined;

    if (!driverId) {
      return true;
    }

    return !!user?.sub && user.sub === driverId;
  }
}
