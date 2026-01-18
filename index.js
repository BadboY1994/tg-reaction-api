import fetch from "node-fetch"

const TOKEN="8586460757:AAGX9K3yT-44wXNkPHD5IEQ79UsqM7QG7m4"
const DB="https://tg-token-finder-default-rtdb.firebaseio.com"

const POS=["👍","❤","🔥","🥰","👏","😁","🎉","🤩","💯","⚡","😍","🙏","👌","🏆"]
const NEG=["👎","🤬","💔","🤮","💩","😡","😢","😭","🤡","🖕"]

const api=(t,m,d)=>fetch("https://api.telegram.org/bot"+t+"/"+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
const get=p=>fetch(DB+p+".json").then(r=>r.json())
const set=(p,d)=>fetch(DB+p+".json",{method:"PUT",body:JSON.stringify(d)})
const del=p=>fetch(DB+p+".json",{method:"DELETE"})
const pick=a=>a[Math.floor(Math.random()*a.length)]
const sleep=m=>new Promise(r=>setTimeout(r,m))

const react=(t,c,m,e)=>fetch("https://api.telegram.org/bot"+t+"/setMessageReaction",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:c,message_id:m,reaction:e.map(x=>({type:"emoji",emoji:x}))})})

const mainMenu={
 inline_keyboard:[
  [{text:"🎭 Reaction Mode",callback_data:"sec_mode"},{text:"⚙ Content Filters",callback_data:"sec_filter"}],
  [{text:"⏱ Timing Rules",callback_data:"sec_time"},{text:"🎯 Smart Logic",callback_data:"sec_smart"}],
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
  const rep=u.message.reply_to_message?.text||""

  if(txt==="/start"){
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>🤖 Advanced Reaction Bot Panel</b>\n\nControl automatic reactions with smart filters, timing rules and emoji logic.\n\nUse buttons below to configure.",reply_markup:mainMenu})
  }

  if(txt.startsWith("/add ")){
   const t=txt.split(" ")[1]
   if(t){
    await set("/bots/"+t.replace(/\W/g,""),{token:t})
    await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Bot Added Successfully</b>\n\nThis bot will now react automatically on channel posts."})
   }
  }

  if(txt.startsWith("/remove ")){
   const t=txt.split(" ")[1]
   if(t){
    await del("/bots/"+t.replace(/\W/g,""))
    await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>❌ Bot Removed</b>\n\nThe bot will no longer react on posts."})
   }
  }

  if(rep==="⏳ Enter reaction delay in seconds"){
   await set("/channels/"+c+"/delay",parseInt(txt)*1000)
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>✅ Delay Saved</b>\n\nReactions will now appear more natural.",reply_markup:mainMenu})
  }

  if(rep==="🌙 Enter night start hour (0-23)"){
   await set("/channels/"+c+"/night_start",parseInt(txt))
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"🌙 Enter night end hour (0-23)",reply_markup:{force_reply:true}})
  }

  if(rep==="🌙 Enter night end hour (0-23)"){
   await set("/channels/"+c+"/night_end",parseInt(txt))
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>🌙 Night Mode Activated</b>\n\nBot will stay silent during night hours.",reply_markup:mainMenu})
  }

  if(rep==="🎲 Enter reaction probability 0-100"){
   await set("/channels/"+c+"/prob",parseInt(txt))
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:mid,parse_mode:"HTML",text:"<b>🎯 Probability Updated</b>\n\nBot will react selectively.",reply_markup:mainMenu})
  }
 }

 if(u.callback_query){
  const q=u.callback_query
  const c=q.message.chat.id
  const m=q.message.message_id
  const d=q.data

  const back={inline_keyboard:[[ {text:"⬅ Back to Menu",callback_data:"back"} ]]}

  if(d==="back")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>🤖 Advanced Reaction Bot Panel</b>\n\nChoose a section below.",reply_markup:mainMenu})

  if(d==="sec_mode")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>🎭 Reaction Mode</b>\n\nSelect how the bot reacts emotionally.",reply_markup:{
   inline_keyboard:[
    [{text:"😊 Positive",callback_data:"mode_pos"},{text:"😈 Negative",callback_data:"mode_neg"}],
    [{text:"🎭 Mixed Reactions",callback_data:"mode_mix"}],
    [{text:"⬅ Back",callback_data:"back"}]
   ]
  }})

  if(d.startsWith("mode_")){
   await set("/channels/"+c+"/mode",d.split("_")[1])
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>✅ Reaction Mode Saved</b>\n\nBot behavior updated.",reply_markup:back})
  }

  if(d==="sec_filter")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>⚙ Content Filters</b>\n\nChoose what type of posts the bot reacts to.",reply_markup:{
   inline_keyboard:[
    [{text:"📝 Text Only",callback_data:"f_text"},{text:"🖼 Media Only",callback_data:"f_media"}],
    [{text:"📊 Skip Polls",callback_data:"f_poll"},{text:"🔁 Skip Forwards",callback_data:"f_fwd"}],
    [{text:"⬅ Back",callback_data:"back"}]
   ]
  }})

  if(d.startsWith("f_")){
   await set("/channels/"+c+"/"+d,true)
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>✅ Filter Enabled</b>\n\nRule applied successfully.",reply_markup:back})
  }

  if(d==="sec_time")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>⏱ Timing Rules</b>\n\nControl when reactions happen.",reply_markup:{
   inline_keyboard:[
    [{text:"⏳ Reaction Delay",callback_data:"set_delay"},{text:"🌙 Night Mode",callback_data:"set_night"}],
    [{text:"🎲 Probability Control",callback_data:"set_prob"}],
    [{text:"⬅ Back",callback_data:"back"}]
   ]
  }})

  if(d==="set_delay"){
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"⏳ Enter reaction delay in seconds",reply_markup:{force_reply:true}})
  }

  if(d==="set_night"){
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"🌙 Enter night start hour (0-23)",reply_markup:{force_reply:true}})
  }

  if(d==="set_prob"){
   await api(TOKEN,"sendMessage",{chat_id:c,reply_to_message_id:m,parse_mode:"HTML",text:"🎲 Enter reaction probability 0-100",reply_markup:{force_reply:true}})
  }

  if(d==="sec_smart")await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>🎯 Smart Reaction Logic</b>\n\nAdvanced automatic behavior.",reply_markup:{
   inline_keyboard:[
    [{text:"🔗 React on Links",callback_data:"s_link"},{text:"#️⃣ Hashtag Mode",callback_data:"s_hash"}],
    [{text:"📏 Text Length Logic",callback_data:"s_len"},{text:"📌 Pinned Boost",callback_data:"s_pin"}],
    [{text:"⬅ Back",callback_data:"back"}]
   ]
  }})

  if(d.startsWith("s_")){
   await set("/channels/"+c+"/"+d,true)
   await api(TOKEN,"editMessageText",{chat_id:c,message_id:m,parse_mode:"HTML",text:"<b>✅ Smart Rule Enabled</b>\n\nLogic applied.",reply_markup:back})
  }

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

  const h=new Date().getHours()
  if(cfg.night_start!==undefined && cfg.night_end!==undefined){
   if(h>=cfg.night_start && h<=cfg.night_end)return res.end("OK")
  }

  if(cfg.f_text && !p.text)return res.end("OK")
  if(cfg.f_media && !p.photo && !p.video)return res.end("OK")
  if(cfg.f_poll && p.poll)return res.end("OK")
  if(cfg.f_fwd && p.forward_from)return res.end("OK")
  if(cfg.prob && Math.random()*100>cfg.prob)return res.end("OK")

  let pack=cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
  if(cfg.s_link && /http/.test(txt))pack=["🔗","🌐"]
  if(cfg.s_hash && /#/.test(txt))pack=["🏷","🔥"]
  if(cfg.s_len && txt.length>200)pack=["📝","👀"]
  if(cfg.s_pin && p.pinned_message)pack.push("🚀")

  if(cfg.delay)await sleep(cfg.delay)

  await react(TOKEN,chat,msg,[pick(pack)])
  for(const k in bots)await react(bots[k].token,chat,msg,[pick(pack)])

  await set("/last",{chat,msg})
 }

 res.json({ok:true})
}
