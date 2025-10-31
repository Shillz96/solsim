import { PrismaClient } from "@prisma/client";
import { getTokenMeta } from "./src/services/tokenService.ts";
const prisma=new PrismaClient();
const mint="3YnKFVxvGMLKCtSK176roVo77WbsJSbWwM8YT8QUpump";
(async()=>{
  const meta:any = await getTokenMeta(mint);
  const logo = meta?.logoURI || null;
  console.log(mint.slice(0,8),"logo:",logo);
  if (logo) await prisma.tokenDiscovery.update({ where:{ mint }, data:{ logoURI: logo, lastUpdatedAt:new Date() }});
  await prisma.();
})();
