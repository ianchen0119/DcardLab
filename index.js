const Koa = require('koa');
const Router = require('koa-router');
const koaBody = require('koa-body');
const mongo = require('koa-mongo');

const app = new Koa();
const router = new Router();


const ratelimit = async (ctx, next)=>{
  const current_ip = ctx.ips.length > 0 ? ctx.ips[ctx.ips.length - 1] : ctx.ip;
      const hasIP = await ctx.db.collection('LimitIP').findOne({ip: current_ip});
      if(hasIP){
        // block
        if(new Date().getTime()<hasIP.time){
          ctx.status = 429;
          ctx.append('X-RateLimit-Remaining', hasIP.count);
          ctx.append('X-RateLimit-Reset', hasIP.time);
          ctx.append('X-RateLimit-Limit', 1000);
        }
        // reset
        else if(hasIP.count == 1){
          const resetTime = new Date().getTime() + 60 * 60 * 60 * 1000;
          ctx.status = 200;
          ctx.append('X-RateLimit-Remaining', hasIP.count);
          ctx.append('X-RateLimit-Reset', hasIP.time);
          ctx.append('X-RateLimit-Limit', 1000);
          ctx.db.collection('LimitIP').update({ip: current_ip},{
            ip: current_ip,
            time: resetTime,
            count: 1000
          });
        }
        // count - 1
        else{
          ctx.status = 200;
          ctx.append('X-RateLimit-Remaining', hasIP.count-1);
          ctx.append('X-RateLimit-Reset', hasIP.time);
          ctx.append('X-RateLimit-Limit', 1000);
          ctx.db.collection('LimitIP').update({ip: current_ip},{
            ip: current_ip,
            time: hasIP.time,
            count: hasIP.count-1
          });
        }
      }
      else{
        ctx.db.collection('LimitIP').insertOne({
          ip: current_ip,
          time: new Date().getTime(),
          count: 1000
      });
      }
  await next()
}

app.use(koaBody());
app.use(mongo({
  host: 'localhost',
  port: 27017,         // default port: 27017
  db: 'Dcard',          // db name
}));
app.use(ratelimit);
router
    .post('/dcard', async ctx => {
      ctx.body = "success!";
    })

app.use(router.routes());
console.log("Server is running...")
app.listen(3000);