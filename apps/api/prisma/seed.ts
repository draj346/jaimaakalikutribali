import {PrismaClient} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const db=new PrismaClient();
async function main(){
 const email=process.env.ADMIN_EMAIL; const pass=process.env.ADMIN_PASSWORD;
 if(!email || !pass || pass.length<12) throw new Error('Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ chars)');
 await db.user.upsert({where:{email},update:{},create:{email,name:'Temple Administrator',role:'SUPER_ADMIN',passwordHash:await bcrypt.hash(pass,12)}});
 for(const [key,value] of Object.entries({templeName:'जय माँ काली कुटरी वाली',templeSubtitle:'आस्था • सेवा • समर्पण',youtubeUrl:'',liveMode:'AUTO',fallbackImageUrl:'',templeHistory:'प्राचीन माँ काली मंदिर का इतिहास यहाँ अपडेट किया जाएगा।'})) await db.setting.upsert({where:{key},create:{key,value},update:{}});
 console.log('Seed finished; admin account created if not already present.');
}
main().finally(()=>db.$disconnect());
