import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export default class BasicAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    try {
      // if you want to use environment variables, install ConfigModule.
      const rootName = 'admin';
      const rootPassword = 'admin password';

      const ctx = context.switchToHttp();
      const request = ctx.getRequest();
      const response = ctx.getResponse();
      const headerName = 'WWW-Authenticate';
      const authorizationScheme = 'Basic';

      const authorization = request.headers.authorization;
      response.setHeader(headerName, authorizationScheme);

      if (!authorization) {
        throw new UnauthorizedException();
      }

      const scheme = authorization.split(' ')[0];
      const authorizationParameters = authorization.split(' ')[1];

      if (scheme !== authorizationScheme) {
        throw new UnauthorizedException();
      }

      const [name, password] = Buffer.from(authorizationParameters, 'base64')
        .toString()
        .split(':');

      if (rootName !== name || rootPassword !== password) {
        throw new UnauthorizedException();
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
