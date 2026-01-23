import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private users: any[] = []; // 🔥 LƯU USER TẠM TRONG RAM

  constructor(private jwtService: JwtService) {}

  async register(email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: 'u-' + Date.now(),
      email,
      password: hashedPassword,
      role: 'customer',
    };

    this.users.push(user); // ✅ LƯU LẠI

    return {
      message: 'User registered',
      userId: user.id,
    };
  }

  async login(email: string, password: string) {
    const user = this.users.find(u => u.email === email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Wrong password');
    }

    const payload = {
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  //
}
