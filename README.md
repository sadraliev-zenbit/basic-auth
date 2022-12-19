# HTTP Basic authentication
[About Basic Authentication](#theory)
[How to implement BASIC authentication in NestJS](#how-to-implement-basic-auth-in-nestjs)

In the context of an HTTP transaction, basic access authentication is a method for an HTTP user agent (e.g. a web browser) to provide a username and password when making a request.
For instance:

## Theory

### Server-side

When the server wants the user agent to authenticate itself towards the server after receiving an unauthenticated request, it must send a response with an HTTP 401 Unauthorized status line and a **WWW-Authenticate** header field.

> WWW-Authenticate: Basic <auth-parameters>

After giving <auth-parameters> from client-side, you can use the following code to extract the username and password

```typescript
const authorization = request.headers.authorization;
const scheme = authorization.split(' ')[0];
const authorizationParameters = authorization.split(' ')[1]; 
     
const [name, password] = Buffer.from(authorizationParameters, 'base64')
        .toString()
        .split(':');
```

### Client-side
When the user agent wants to send authentication credentials to the server, it may use the Authorization header field.
The Authorization header field is constructed as follows:
1. The username and password are combined with a single colon (:). This means that the username itself cannot contain a colon.
2. The resulting string is encoded into an octet sequence. The character set to use for this encoding is by default unspecified, as long as it is compatible with US-ASCII. Still, the server may suggest the use of UTF-8 by sending the charset parameter
3. The resulting string is encoded using a variant of Base64 (+/ and with padding).
4. The authorization method and a space (e.g. "Basic ") is then prepended to the encoded string.
For example, if the browser uses Aladdin as the username and open sesame as the password, then the field's value is the Base64 encoding of Aladdin:open sesame, or QWxhZGRpbjpvcGVuIHNlc2FtZQ==. Then the Authorization header field will appear as:


> Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==


Reference:
https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication
https://en.wikipedia.org/wiki/Basic_access_authentication


## How to implement BASIC AUTH in NestJS

### Preparation

#### Generate new project using nest cli
before you need to install global package nest and create new project.
```
npm i -g @nestjs/cli
nest new basic-auth
```
We got following file structure:
```bash
basic-auth/
├── node_modules/
├── src/
├── test/
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── nest-cli.json
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.build.md
└── tsconfig.json
```
Because basic authorization only works on the server side we need to apply an [MVC pattern](https://docs.nestjs.com/techniques/mvc#model-view-controller) to generate the views.

#### Install and setting template engine

```$ npm install --save hbs```

create new two folders:
- public
- views 

and update main.ts file

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/public/' });
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');
  app.set('view options', { layout: 'layout' });

  await app.listen(3000);
}
bootstrap();
```
the final version  file structure looks like this:
```bash
basic-auth/
├── node_modules/
├── public/ # for storing static assets (js, css, images files)
├── src/
├── test/
├── views/ # will contain templates
│ ├── admin/ # our protected page
│ │   └─ index.hbs
│ └── layout.hbs
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── nest-cli.json
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.build.md
└── tsconfig.json
```
All of this will come in handy later on.

Now, if you run your application, you need look message `hello world` in your main page.
![main page](./public/main_page_screenshot.png)

Let's update our controller.
```typescript
// src/app.controller.ts
import {
  Controller,
  Get,
  NotAcceptableException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('admin')
  async root(@Res() res: Response) {
    try {
      return res.render('admin/index', {
        title: 'admin panel',
        message: 'Welcome!',
      });
    } catch (error) {
      throw new NotAcceptableException(error.message);
    }
  }
}
```
and go to `localhost:3000/admin` you should see page like this:
![unsecure page](./public/unsecure_screenshot.png)

Great! Now let us protect our page. 
To do this, we need to create a guard.

```typescript
// src/guards/basic-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpandedRequestInterface } from 'shared/interfaces/expanded-request.interface';

@Injectable()
export default class BasicAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  canActivate(context: ExecutionContext) {
    try {
      const rootName = this.configService.get<string>('ADMIN_NAME');
      const rootPassword = this.configService.get<string>('ADMIN_PASSWORD');

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
      throw new HttpException(error, HttpStatus.BAD_REQUEST);
    }
  }
}
```
then we need to add the guard in our controller.
```typescript
// src/guards/basic-auth.guard.ts

      ... ...

@Get('admin')
@UseGuards(BasicAuthGuard)
async root(@Res() res: Response) {
  try {
      return res.render('admin/index', {
        title: 'admin panel',
        message: 'Welcome!',
      });
    } catch (error) {
      throw new NotAcceptableException(error.message);
    }
}

      ... ...

```
Ok, now try to open our the protected page - `localhost:3000/admin`.
You should see this:
and go to `localhost:3000/admin` you should see page like this:
![secure page](./public/secure_screenshot.png)

it happened, because we added **WWW-Authenticate: Basic** in header of response and specified **401 status code**. 
![unauthorized header](./public/unauthorized_screenshot.png)