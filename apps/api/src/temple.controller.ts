import {Controller,Get,Post,Patch,Body,Param,Headers,ParseIntPipe} from '@nestjs/common';
import {IsEmail,IsString,IsNumber,IsOptional,IsBoolean,IsIn,Min,IsInt,IsDateString,MinLength,Matches} from 'class-validator';
import {Frequency,ExpenseStatus} from '@prisma/client';
import {TempleService} from './temple.service';
class PublicRegisterDto {
 @IsString() @MinLength(2) name!:string;
 @IsString() @Matches(/^\d{10}$/) mobile!:string;
 @IsString() @MinLength(2) village!:string;
 @IsOptional() @IsString() familyId?:string;
 @IsOptional() @IsString() @Matches(/^\d{12}$/, {message:'आधार नंबर 12 अंकों का होना चाहिए'}) aadhaar?:string;
 @IsOptional() @IsString() password?:string;
}
class MemberLoginDto {@IsString() mobile!:string;@IsString() password!:string}
class UpdateContributionDto {@IsOptional() @IsBoolean() publicVisible?:boolean;@IsNumber() @Min(1) amount!:number;@IsIn(['MONTHLY','YEARLY','ONE_TIME']) frequency!:Frequency;@IsDateString() startDate!:string}
class LoginDto {@IsEmail() email!:string;@IsString() password!:string}
class MemberDto {@IsString() name!:string;@IsOptional() @IsString() mobile?:string;@IsOptional() @IsString() village?:string;@IsOptional() @IsEmail() email?:string;@IsOptional() @IsString() familyId?:string}
class ContributionDto {@IsOptional() @IsInt() memberId?:number;@IsOptional() @IsString() mobile?:string;@IsNumber() @Min(1) amount!:number;@IsIn(['MONTHLY','YEARLY','ONE_TIME']) frequency!:Frequency;@IsDateString() startDate!:string}
class DonationDto {@IsOptional() @IsInt() memberId?:number;@IsOptional() @IsString() mobile?:string;@IsOptional() @IsString() donorName?:string;@IsNumber() @Min(1) amount!:number;@IsString() method!:string;@IsOptional() @IsString() purpose?:string;@IsOptional() @IsString() reference?:string}
class ExpenseDto {@IsString() description!:string;@IsString() category!:string;@IsNumber() @Min(1) amount!:number;@IsOptional() @IsString() vendor?:string;@IsOptional() @IsString() billUrl?:string}
class StatusDto {@IsIn(['APPROVED','REJECTED','PAID']) status!:ExpenseStatus}
class SettingDto {@IsString() value!:string}
class CommitteeDto {@IsString() title!:string;@IsDateString() startDate!:string;@IsOptional() @IsDateString() endDate?:string;@IsOptional() @IsBoolean() current?:boolean}
class CommitteeMemberDto {@IsInt() committeeId!:number;@IsString() name!:string;@IsString() position!:string;@IsOptional() @IsString() photoUrl?:string;@IsOptional() @IsString() description?:string}
@Controller('api')export class TempleController {constructor(private s:TempleService){}
 @Get('health') health(){return {ok:true}}
 @Get('public/settings') settings(){return this.s.publicSettings()}
 @Get('public/live') live(){return this.s.live()}
 @Get('public/committees') committee(){return this.s.committee()}
 @Post('auth/register') register(@Body() d:PublicRegisterDto){return this.s.registerMember(d)}
 @Post('auth/member-login') memberLogin(@Body() d:MemberLoginDto){return this.s.memberLogin(d.mobile,d.password)}
 @Get('member/me') async memberMe(@Headers('authorization') h:string){return this.s.memberProfile(h)}
 @Get('member/contributions') async ownContributions(@Headers('authorization') h:string){return this.s.memberContributions(h)}
 @Post('member/contributions') async ownCreateContribution(@Headers('authorization') h:string,@Body() d:UpdateContributionDto){return this.s.memberCreateContribution(h,d)}
 @Patch('member/contributions/:id') async ownEditContribution(@Headers('authorization') h:string,@Param('id',ParseIntPipe) id:number,@Body() d:UpdateContributionDto){return this.s.memberUpdateContribution(h,id,d)}
 @Get('public/contributions') publicContributions(){return this.s.publicContributions()}
 @Patch('admin/contributions/:id') async adminEditContribution(@Headers('authorization') h:string,@Param('id',ParseIntPipe) id:number,@Body() d:UpdateContributionDto){const u=await this.s.writeAuth(h);return this.s.updateContribution(id,d,u.sub)}
 @Post('auth/login') login(@Body() d:LoginDto){return this.s.login(d.email,d.password)}
 @Get('admin/summary') async summary(@Headers('authorization') h?:string){await this.s.auth(h);return this.s.summary()}
 @Get('admin/members') async members(@Headers('authorization') h?:string){await this.s.auth(h);return this.s.members()}
 @Patch('admin/members/:id') async updateMember(@Headers('authorization') h:string,@Param('id',ParseIntPipe) id:number,@Body() d:MemberDto){const u=await this.s.writeAuth(h);return this.s.updateMember(id,d,u.sub)}
 @Post('admin/members') async createMember(@Headers('authorization') h:string,@Body() d:MemberDto){const u=await this.s.writeAuth(h);return this.s.createMember(d,u.sub)}
 @Get('admin/contributions') async contributions(@Headers('authorization') h?:string){await this.s.auth(h);return this.s.contributions()}
 @Post('admin/contributions') async createContribution(@Headers('authorization') h:string,@Body() d:ContributionDto){const u=await this.s.writeAuth(h);return this.s.createContribution(d,u.sub)}
 @Get('admin/donations') async donations(@Headers('authorization') h?:string){await this.s.auth(h);return this.s.donations()}
 @Post('admin/donations') async createDonation(@Headers('authorization') h:string,@Body() d:DonationDto){const u=await this.s.writeAuth(h);return this.s.createDonation(d,u.sub)}
 @Patch('admin/donations/:id/confirm') async confirm(@Headers('authorization') h:string,@Param('id',ParseIntPipe) id:number){const u=await this.s.writeAuth(h);return this.s.confirmDonation(id,u.sub)}
 @Get('admin/expenses') async expenses(@Headers('authorization') h?:string){await this.s.auth(h);return this.s.expenses()}
 @Post('admin/expenses') async expense(@Headers('authorization') h:string,@Body() d:ExpenseDto){const u=await this.s.writeAuth(h);return this.s.createExpense(d,u.sub)}
 @Patch('admin/expenses/:id/status') async status(@Headers('authorization') h:string,@Param('id',ParseIntPipe) id:number,@Body() d:StatusDto){const u=await this.s.writeAuth(h);return this.s.expenseStatus(id,d.status,u.sub)}
 @Patch('admin/settings/:key') async setting(@Headers('authorization') h:string,@Param('key') key:string,@Body() d:SettingDto){const u=await this.s.writeAuth(h);return this.s.updateSetting(key,d.value,u.sub)}
 @Post('admin/committees') async createCommittee(@Headers('authorization') h:string,@Body() d:CommitteeDto){const u=await this.s.writeAuth(h);return this.s.createCommittee(d,u.sub)}
 @Post('admin/committee-members') async committeeMember(@Headers('authorization') h:string,@Body() d:CommitteeMemberDto){const u=await this.s.writeAuth(h);return this.s.addCommitteeMember(d,u.sub)}
}
