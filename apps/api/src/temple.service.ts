import {Injectable,ConflictException,BadRequestException,UnauthorizedException,ForbiddenException,NotFoundException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {PrismaService} from './prisma.service';
import {Frequency,ExpenseStatus,PaymentStatus,Prisma} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
@Injectable() export class TempleService {
 constructor(private db:PrismaService,private jwt:JwtService){}
 async registerMember(data:{name:string;mobile:string;village:string;familyId?:string;aadhaar?:string;password?:string}){
  const name=data.name?.trim(),mobile=data.mobile?.trim(),village=data.village?.trim(),familyId=data.familyId?.trim()||null;
  if(!name||name.length<2||!village||!/^\d{10}$/.test(mobile||''))throw new BadRequestException('सही नाम, गाँव और 10 अंकों का मोबाइल नंबर भरें');
  if(familyId&&(/\b\d{12}\b/.test(familyId)||/^[A-Z]{5}\d{4}[A-Z]$/.test(familyId.toUpperCase())))throw new BadRequestException('आधार/PAN की जगह परिवार का अपना गैर-सरकारी कोड दर्ज करें');
  const aadhaar=data.aadhaar?.trim()||'';
  if(aadhaar&&!/^\d{12}$/.test(aadhaar))throw new BadRequestException('आधार नंबर 12 अंकों का होना चाहिए');
  const aadhaarNumber=aadhaar||null;
  try{
   await this.db.$transaction(async tx=>{
    // Existing admin-created members need an administrator-assisted account link; never claim an existing number.
    const exists=await tx.member.findUnique({where:{mobile}});if(exists)throw new ConflictException('यह मोबाइल पहले से पंजीकृत है; खाता लिंक कराने के लिए व्यवस्थापक से संपर्क करें');
    const suppliedPassword = data.password?.trim();
    const initialPassword = suppliedPassword ? suppliedPassword : mobile;
    const passwordHash = await bcrypt.hash(initialPassword, 12);
    const user=await tx.user.create({data:{mobile,name,passwordHash,role:'MEMBER'}});
    await tx.member.create({data:{name,mobile,village,familyId,aadhaarNumber,userId:user.id}});
   });return {message:'पंजीकरण सफल। अब लॉगिन करें।'};
  }catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')throw new ConflictException('मोबाइल नंबर पहले से पंजीकृत है');throw e}
 }
 async memberLogin(mobile:string,password:string){const u=await this.db.user.findUnique({where:{mobile:mobile?.trim()}});if(!u||u.role!=='MEMBER'||!await bcrypt.compare(password,u.passwordHash))throw new UnauthorizedException('मोबाइल नंबर या पासवर्ड गलत है');return {accessToken:await this.jwt.signAsync({sub:u.id,role:'MEMBER'}),role:u.role,name:u.name}}
 async memberAuth(header?:string){const token=header?.startsWith('Bearer ')?header.slice(7):'';try{const payload=await this.jwt.verifyAsync(token);if(payload.role!=='MEMBER')throw new Error();const m=await this.db.member.findUnique({where:{userId:Number(payload.sub)}});if(!m)throw new Error();return m}catch{throw new UnauthorizedException('कृपया दोबारा लॉगिन करें')}}
 async memberProfile(header:string){const m=await this.memberAuth(header);return {id:m.id,name:m.name,mobile:m.mobile,village:m.village,familyId:m.familyId}}
 async memberContributions(header:string){const m=await this.memberAuth(header);return this.db.contribution.findMany({where:{memberId:m.id},orderBy:{id:'desc'}})}
 private validateContribution(d:{amount:number;frequency:Frequency;startDate:string}){if(!Number.isFinite(d.amount)||d.amount<=0||!['MONTHLY','YEARLY','ONE_TIME'].includes(d.frequency)||!d.startDate||isNaN(new Date(d.startDate).getTime()))throw new BadRequestException('सही राशि, अवधि और तारीख भरें')}
 async memberCreateContribution(header:string,d:{amount:number;frequency:Frequency;startDate:string;publicVisible?:boolean}){const m=await this.memberAuth(header);this.validateContribution(d);const result=await this.db.contribution.create({data:{memberId:m.id,amount:new Prisma.Decimal(d.amount),frequency:d.frequency,startDate:new Date(d.startDate),publicVisible:d.publicVisible===true}});await this.log(m.userId!,'CREATE','CONTRIBUTION',String(result.id));return result}
 async memberUpdateContribution(header:string,id:number,d:{amount:number;frequency:Frequency;startDate:string;publicVisible?:boolean}){const m=await this.memberAuth(header);this.validateContribution(d);const result=await this.db.$transaction(async tx=>{const r=await tx.contribution.updateMany({where:{id,memberId:m.id},data:{amount:new Prisma.Decimal(d.amount),frequency:d.frequency,startDate:new Date(d.startDate),...(d.publicVisible===undefined?{}:{publicVisible:d.publicVisible})}});if(!r.count)throw new NotFoundException('आपका सहयोग रिकॉर्ड नहीं मिला');await tx.auditLog.create({data:{actorId:m.userId,action:'UPDATE',entity:'CONTRIBUTION',entityId:String(id)}});return tx.contribution.findUnique({where:{id}})});return result}
 async updateContribution(id:number,d:{amount:number;frequency:Frequency;startDate:string;publicVisible?:boolean},actor:number){this.validateContribution(d);const result=await this.db.$transaction(async tx=>{const exists=await tx.contribution.findUnique({where:{id}});if(!exists)throw new NotFoundException('Contribution not found');const c=await tx.contribution.update({where:{id},data:{amount:new Prisma.Decimal(d.amount),frequency:d.frequency,startDate:new Date(d.startDate)}});await tx.auditLog.create({data:{actorId:actor,action:'UPDATE',entity:'CONTRIBUTION',entityId:String(id)}});return c});return result}
 async publicContributions(){const rows=await this.db.contribution.findMany({where:{active:true,publicVisible:true},select:{id:true,amount:true,frequency:true,member:{select:{name:true,mobile:true}}},orderBy:{createdAt:'desc'},take:100});return rows.map(c=>({id:c.id,name:c.member.name,amount:c.amount,frequency:c.frequency,mobile:c.member.mobile?c.member.mobile.slice(0,2)+'******'+c.member.mobile.slice(-2):'—'}))}
 async login(email:string,password:string){const u=await this.db.user.findUnique({where:{email}});if(!u||!await bcrypt.compare(password,u.passwordHash))throw new UnauthorizedException('Invalid credentials');return {accessToken:await this.jwt.signAsync({sub:u.id,role:u.role}),role:u.role,name:u.name}}
 async auth(header?:string){if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw new UnauthorizedException('JWT secret is not configured');const token=header?.startsWith('Bearer ')?header.slice(7):'';try{const data=await this.jwt.verifyAsync(token);if(!['SUPER_ADMIN','TREASURER','SECRETARY','AUDITOR'].includes(data.role))throw new Error();return data}catch{throw new UnauthorizedException('Login required')}}
 async writeAuth(header?:string){const u=await this.auth(header);if(u.role==='AUDITOR')throw new ForbiddenException('Read only');return u}
 async log(actorId:number,action:string,entity:string,entityId?:string){await this.db.auditLog.create({data:{actorId,action,entity,entityId}})}
 async publicSettings(){const rows=await this.db.setting.findMany();return Object.fromEntries(rows.map(s=>[s.key,s.value]))}
 async live(){const s=await this.publicSettings();let live=false;let videoId='';try{const u=new URL(s.youtubeUrl||'');videoId=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop()||'';if(!/^[a-zA-Z0-9_-]{11}$/.test(videoId))videoId='';}catch{}
 if(s.liveMode==='ON'&&videoId) live=true;
 else if(s.liveMode==='AUTO'&&videoId&&process.env.YOUTUBE_API_KEY){try{const r=await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`,{signal:AbortSignal.timeout(4000)});if(r.ok){const d:any=await r.json();live=d.items?.[0]?.snippet?.liveBroadcastContent==='live';}}catch{live=false}}
 return {live,videoId:live?videoId:null,fallbackImageUrl:s.fallbackImageUrl||null,mode:s.liveMode||'AUTO'} }
 async committee(){return this.db.committee.findMany({orderBy:[{current:'desc'},{startDate:'desc'}],include:{members:true}})}
 async members(){return this.db.member.findMany({include:{contributions:true,donations:true},orderBy:{id:'desc'}})}
 async memberByMobile(mobile:string){const m=mobile.trim();if(!/^\d{10}$/.test(m))throw new BadRequestException('Enter a 10 digit mobile number');const member=await this.db.member.findUnique({where:{mobile:m}});if(!member)throw new NotFoundException('No member found for this mobile number');return member}
 async contributions(){return this.db.contribution.findMany({include:{member:{select:{id:true,name:true,mobile:true}}},orderBy:{id:'desc'}})}
 async createMember(data:{name:string;mobile?:string;village?:string;email?:string;familyId?:string},actor:number){
  const mobile=data.mobile?.trim()||null;
  if(!mobile||!/^\d{10}$/.test(mobile))throw new BadRequestException('10 digit mobile number is required');
  const name=data.name?.trim();if(!name)throw new BadRequestException('Member name required');
  try{const m=await this.db.member.create({data:{name,mobile,village:data.village?.trim()||null,email:data.email?.trim()||null,familyId:data.familyId?.trim()||null}});await this.log(actor,'CREATE','MEMBER',String(m.id));return m}
  catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')throw new ConflictException('Mobile number already registered');throw e}
 }
 async updateMember(id:number,data:{name:string;mobile?:string;village?:string;email?:string;familyId?:string},actor:number){
  const existing=await this.db.member.findUnique({where:{id}});
  if(!existing)throw new NotFoundException('Member not found');
  const name=data.name?.trim();
  if(!name)throw new BadRequestException('Member name is required');
  const mobile=data.mobile?.trim()||null;if(!mobile||!/^\d{10}$/.test(mobile))throw new BadRequestException('10 digit mobile number is required');
  const clean={name,mobile,village:data.village?.trim()||null,email:data.email?.trim()||null,familyId:data.familyId?.trim()||null};
  try{const updated=await this.db.$transaction(async tx=>{
    const result=await tx.member.update({where:{id},data:clean});
    await tx.auditLog.create({data:{actorId:actor,action:'UPDATE',entity:'MEMBER',entityId:String(id),details:JSON.stringify({before:{name:existing.name,mobile:existing.mobile,village:existing.village,email:existing.email,familyId:existing.familyId},after:clean})}});
    return result;
  });
  return updated;
  }catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')throw new ConflictException('Mobile number already registered');throw e}
 }
 async createContribution(data:{memberId?:number;mobile?:string;amount:number;frequency:Frequency;startDate:string},actor:number){
  if(!(data.amount>0))throw new BadRequestException('Amount must be positive');
  const member=data.mobile?await this.memberByMobile(data.mobile):data.memberId?await this.db.member.findUnique({where:{id:data.memberId}}):null;
  if(!member)throw new BadRequestException('Select a registered member using mobile number');
  const c=await this.db.contribution.create({data:{memberId:member.id,amount:new Prisma.Decimal(data.amount),frequency:data.frequency,startDate:new Date(data.startDate)}});
  await this.log(actor,'CREATE','CONTRIBUTION',String(c.id));return c
 }
 async donations(){return this.db.donation.findMany({include:{member:true},orderBy:{id:'desc'}})}
 async createDonation(data:{memberId?:number;mobile?:string;donorName?:string;amount:number;method:string;purpose?:string;reference?:string},actor:number){
  if(!(data.amount>0))throw new BadRequestException('Amount must be positive');
  const member=data.mobile?await this.memberByMobile(data.mobile):data.memberId?await this.db.member.findUnique({where:{id:data.memberId}}):null;
  if((data.mobile||data.memberId)&&!member)throw new NotFoundException('Member not found');
  const donorName=member?.name||data.donorName?.trim();if(!donorName)throw new BadRequestException('Donor name required for guest donations');
  const d=await this.db.donation.create({data:{memberId:member?.id||null,donorName,amount:new Prisma.Decimal(data.amount),method:data.method||'CASH',purpose:data.purpose||'GENERAL',reference:data.reference||undefined,status:'PENDING'}});
  await this.log(actor,'CREATE','DONATION',String(d.id));return d
 }
 async confirmDonation(id:number,actor:number){const result=await this.db.$transaction(async tx=>{const d=await tx.donation.findUnique({where:{id}});if(!d)throw new NotFoundException();if(d.status!=='PENDING')throw new BadRequestException('Only pending donations can be confirmed');return tx.donation.update({where:{id},data:{status:'CONFIRMED',confirmedAt:new Date(),receiptNumber:`JKMW-${String(id).padStart(8,'0')}`}})});await this.log(actor,'CONFIRM','DONATION',String(id));return result}
 async expenses(){return this.db.expense.findMany({orderBy:{id:'desc'}})}
 async createExpense(data:{description:string;category:string;amount:number;vendor?:string;billUrl?:string},actor:number){if(!(data.amount>0))throw new BadRequestException('Amount must be positive');const x=await this.db.expense.create({data:{...data,amount:new Prisma.Decimal(data.amount),status:'SUBMITTED'}});await this.log(actor,'CREATE','EXPENSE',String(x.id));return x}
 async expenseStatus(id:number,status:ExpenseStatus,actor:number){const e=await this.db.expense.findUnique({where:{id}});if(!e)throw new NotFoundException();const allowed:Record<string,string[]>={SUBMITTED:['APPROVED','REJECTED'],APPROVED:['PAID']};if(!allowed[e.status]?.includes(status))throw new BadRequestException('Invalid status transition');const result=await this.db.expense.update({where:{id},data:{status,approvedAt:status==='APPROVED'?new Date():undefined}});await this.log(actor,status,'EXPENSE',String(id));return result}
 async updateSetting(key:string,value:string,actor:number){if(!['templeName','templeSubtitle','youtubeUrl','liveMode','fallbackImageUrl','templeHistory'].includes(key))throw new BadRequestException('Unknown setting');if(key==='liveMode'&&!['ON','OFF','AUTO'].includes(value))throw new BadRequestException('Invalid live mode');const s=await this.db.setting.upsert({where:{key},update:{value},create:{key,value}});await this.log(actor,'UPDATE','SETTING',key);return s}
 async createCommittee(data:{title:string;startDate:string;endDate?:string;current?:boolean},actor:number){const c=await this.db.$transaction(async tx=>{if(data.current)await tx.committee.updateMany({where:{current:true},data:{current:false}});return tx.committee.create({data:{title:data.title,startDate:new Date(data.startDate),endDate:data.endDate?new Date(data.endDate):undefined,current:!!data.current}})});await this.log(actor,'CREATE','COMMITTEE',String(c.id));return c}
 async addCommitteeMember(data:{committeeId:number;name:string;position:string;photoUrl?:string;description?:string},actor:number){const m=await this.db.committeeMember.create({data});await this.log(actor,'CREATE','COMMITTEE_MEMBER',String(m.id));return m}
 async summary(){const [members,donations,expenses]=await Promise.all([this.db.member.count(),this.db.donation.aggregate({where:{status:'CONFIRMED'},_sum:{amount:true}}),this.db.expense.aggregate({where:{status:'PAID'},_sum:{amount:true}})]);return {members,received:Number(donations._sum.amount||0),spent:Number(expenses._sum.amount||0)}}
}
