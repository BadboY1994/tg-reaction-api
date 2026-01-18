import fetch from "node-fetch"

const TOKEN="8586460757:AAGX9K3yT-44wXNkPHD5IEQ79UsqM7QG7m4"
const DB="https://tg-token-finder-default-rtdb.firebaseio.com"

const POS=["👍","❤","🔥","🥰","👏","😁","🎉","🤩","💯","⚡","😍","🙏","👌","🏆"]
const NEG=["👎","🤬","💔","🤮","💩","😡","😢","😭","🤡","🖕"]

const api=(t,m,d)=>fetch("https://api.telegram.org/bot"+t+"/"+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
const get=p=>fetch(DB+p+".json").then(r=>r.json())
const set=(p,d)=>fetch(DB+p+".json",{method:"PATCH",body:JSON.stringify(d)})
const del=p=>fetch(DB+p+".json",{method:"DELETE"})
const pick=a=>a[Math.floor(Math.random()*a.length)]
const sleep=m=>new Promise(r=>setTimeout(r,m))

const react=(t,c,m,e)=>fetch("https://api.telegram.org/bot"+t+"/setMessageReaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:c,message_id:m,reaction:e.map(x=>({type:"emoji",emoji:x}))})})

const menu={
 inline_keyboard:[
  [{text:"🎭 Reaction Mode",callback_data:"mode"},{text:"⚙ Filters",callback_data:"filter"}],
  [{text:"⏱ Timing",callback_data:"time"},{text:"🔁 Control",callback_data:"control"}],
  [{text:"🧪 Test Reaction",callback_data:"test"}]
 ]
}

export default async(req,res)=>{
 if(req.method!=="POST")return res.end("OK")
 const u=req.body

 if(u.message){
  const c=u.message.chat.id
  const mid=u.message.message_id
  const txt=u.message.text||""
  const reply=u.message.reply_to_message?.text||""

  if(txt==="/start"){
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:
   "<b>🤖 Reaction Manager</b>\n\nAutomate professional looking reactions on channel posts.\n\nUse the control panel below 👇",reply_markup:menu})
  }

  if(txt.startsWith("/add ")){
   const t=txt.split(" ")[1]
   if(t)await set("/bots/"+t.replace(/\W/g,""),{token:t})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Bot added</b>\n\nThis bot will now react automatically."})
  }

  if(txt.startsWith("/remove ")){
   const t=txt.split(" ")[1]
   if(t)await del("/bots/"+t.replace(/\W/g,""))
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>❌ Bot removed</b>"})
  }

  if(reply==="⏳ Enter reaction delay (seconds)"){
   await set("/channels/"+c,{delay:parseInt(txt)*1000})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Delay saved</b>",reply_markup:menu})
  }

  if(reply==="🎲 Enter reaction probability (0-100)"){
   await set("/channels/"+c,{prob:parseInt(txt)})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Probability saved</b>",reply_markup:menu})
  }

  if(reply==="🌙 Night mode start hour"){
   await set("/channels/"+c,{night_start:parseInt(txt)})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"🌙 Night mode end hour",reply_markup:{force_reply:true}})
  }

  if(reply==="🌙 Night mode end hour"){
   await set("/channels/"+c,{night_end:parseInt(txt)})
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>🌙 Night mode enabled</b>",reply_markup:menu})
  }
 }

 if(u.callback_query){
  const q=u.callback_query
  const c=q.message.chat.id
  const m=q.message.message_id
  const d=q.data

  const back={inline_keyboard:[[ {text:"⬅ Back",callback_data:"back"} ]]}

  if(d==="back")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>🤖 Reaction Manager</b>\n\nChoose an option below.",reply_markup:menu})

  if(d==="mode")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:
   "<b>🎭 Reaction Type</b>\n\nChoose reaction emotion style.",reply_markup:{
    inline_keyboard:[
     [{text:"😊 Positive",callback_data:"mode_pos"},{text:"😈 Negative",callback_data:"mode_neg"}],
     [{text:"🎭 Mixed",callback_data:"mode_mix"}],
     [{text:"⬅ Back",callback_data:"back"}]
    ]
   }})

  if(d.startsWith("mode_")){
   await set("/channels/"+c,{mode:d.split("_")[1]})
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>✅ Mode saved</b>",reply_markup:back})
  }

  if(d==="filter")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:
   "<b>⚙ Content Filters</b>\n\nControl what posts get reactions.",reply_markup:{
    inline_keyboard:[
     [{text:"📝 Text only",callback_data:"f_text"},{text:"🖼 Media only",callback_data:"f_media"}],
     [{text:"📊 Skip polls",callback_data:"f_poll"}],
     [{text:"⬅ Back",callback_data:"back"}]
    ]
   }})

  if(d.startsWith("f_")){
   await set("/channels/"+c,{[d]:true})
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>✅ Filter enabled</b>",reply_markup:back})
  }

  if(d==="time")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:
   "<b>⏱ Timing Settings</b>\n\nMake reactions look natural.",reply_markup:{
    inline_keyboard:[
     [{text:"⏳ Reaction delay",callback_data:"set_delay"},{text:"🎲 Probability",callback_data:"set_prob"}],
     [{text:"🌙 Night mode",callback_data:"set_night"}],
     [{text:"⬅ Back",callback_data:"back"}]
    ]
   }})

  if(d==="set_delay")await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"⏳ Enter reaction delay (seconds)",reply_markup:{force_reply:true}})
  if(d==="set_prob")await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"🎲 Enter reaction probability (0-100)",reply_markup:{force_reply:true}})
  if(d==="set_night")await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"🌙 Night mode start hour",reply_markup:{force_reply:true}})

  if(d==="control")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:
   "<b>🔁 Reaction Control</b>\n\nPause or resume reactions.",reply_markup:{
    inline_keyboard:[
     [{text:"▶ Enable",callback_data:"enable"},{text:"⏸ Pause",callback_data:"pause"}],
     [{text:"⬅ Back",callback_data:"back"}]
    ]
   }})

  if(d==="enable"){await set("/channels/"+c,{enabled:true});await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>▶ Reactions enabled</b>",reply_markup:back})}
  if(d==="pause"){await set("/channels/"+c,{enabled:false});await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>⏸ Reactions paused</b>",reply_markup:back})}

  if(d==="test"){
   const l=await get("/last")
   const bots=await get("/bots")||{}
   if(l){
    await react(TOKEN,l.chat,l.msg,[pick(POS)])
    for(const k in bots)await react(bots[k].token,l.chat,l.msg,[pick(POS)])
   }
  }
 }

 if(u.channel_post){
  const p=u.channel_post
  const chat=p.chat.id
  const msg=p.message_id
  const cfg=await get("/channels/"+chat)||{}
  const bots=await get("/bots")||{}
  const txt=p.text||""

  if(cfg.enabled===false)return res.end("OK")
  if(cfg.f_text && !p.text)return res.end("OK")
  if(cfg.f_media && !p.photo && !p.video)return res.end("OK")
  if(cfg.f_poll && p.poll)return res.end("OK")
  if(cfg.prob && Math.random()*100>cfg.prob)return res.end("OK")

  if(cfg.night_start!==undefined && cfg.night_end!==undefined){
   const h=new Date().getHours()
   if(h>=cfg.night_start && h<=cfg.night_end)return res.end("OK")
  }

  let pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
  if(cfg.delay)await sleep(cfg.delay)

  await react(TOKEN,chat,msg,[pick(pack)])
  for(const k in bots)await react(bots[k].token,chat,msg,[pick(pack)])

  await set("/last",{chat,msg})
 }

 res.json({ok:true})
}
